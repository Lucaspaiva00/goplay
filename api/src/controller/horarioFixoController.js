const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { notifyUsuario, notifyStaff } = require('../notifications');
const { emitHorario } = require('../horarioRealtime');

const id = v => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const dateOnly = s => { const [y,m,d] = String(s||'').split('-').map(Number); return y&&m&&d ? new Date(y,m-1,d) : null; };
const keyDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const ptDate = d => new Date(d).toLocaleDateString('pt-BR');

async function actorCanManageGroup(actor, group) {
  if (!actor || !group) return false;
  if (actor.kind === 'USER') {
    if (Number(group.organizadorId) === Number(actor.id)) return true;
    if (actor.tipo === 'DONO_SOCIETY') {
      return !!(await prisma.society.findFirst({ where: { id: group.societyId, usuarioId: actor.id }, select: { id: true } }));
    }
  }
  return actor.kind === 'STAFF' && Number(actor.societyId) === Number(group.societyId) && ['ADMIN','RECEPCAO'].includes(actor.funcao);
}

async function actorCanSeeGroup(actor, groupId) {
  const group = await prisma.grupoHorario.findUnique({ where: { id: Number(groupId) } });
  if (!group || !actor) return { ok:false, group };
  if (await actorCanManageGroup(actor, group)) return { ok:true, group };
  if (actor.kind === 'STAFF' && Number(actor.societyId) === Number(group.societyId) && ['ADMIN','RECEPCAO','CAIXA'].includes(actor.funcao)) return { ok:true, group };
  if (actor.kind === 'USER') {
    const member = await prisma.grupoHorarioMembro.findFirst({ where: { grupoId: group.id, usuarioId: actor.id, ativo:true }, select:{id:true} });
    return { ok: !!member, group };
  }
  return { ok:false, group };
}

async function ensureOrganizerMember(tx, group) {
  await tx.grupoHorarioMembro.upsert({
    where: { grupoId_usuarioId: { grupoId: group.id, usuarioId: group.organizadorId } },
    create: { grupoId: group.id, usuarioId: group.organizadorId, ativo:true },
    update: { ativo:true }
  });
}

async function createGroup(req,res){
  try{
    if(req.actor?.kind!=='USER') return res.status(403).json({error:'Apenas usuários podem organizar um horário fixo.'});
    const societyId=id(req.body.societyId); const nome=String(req.body.nome||'').trim();
    const maxJogadores=Math.max(2,Math.min(100,Number(req.body.maxJogadores||20)));
    if(!societyId||!nome) return res.status(400).json({error:'Empresa e nome do grupo são obrigatórios.'});
    const society=await prisma.society.findUnique({where:{id:societyId},select:{id:true,nome:true,usuarioId:true}});
    if(!society) return res.status(404).json({error:'Empresa não encontrada.'});
    const group=await prisma.$transaction(async tx=>{
      const g=await tx.grupoHorario.create({data:{societyId,organizadorId:req.actor.id,nome,descricao:req.body.descricao?String(req.body.descricao).trim():null,maxJogadores}});
      await ensureOrganizerMember(tx,g); return g;
    });
    await notifyUsuario(prisma,req.actor.id,'Grupo de jogo criado',`${nome} foi criado em ${society.nome}.`,`horario-grupo.html?grupoId=${group.id}`);
    if(Number(society.usuarioId)!==Number(req.actor.id)) await notifyUsuario(prisma,society.usuarioId,'Novo grupo recorrente',`${req.actor.nome} criou o grupo ${nome} na sua empresa.`,`horario-grupo.html?grupoId=${group.id}`);
    res.status(201).json(group);
  }catch(e){console.error(e);res.status(500).json({error:'Erro ao criar grupo de horário.'});}
}

async function myGroups(req,res){
  try{
    if(req.actor.kind!=='USER') return res.json([]);
    const rows=await prisma.grupoHorario.findMany({
      where:{ativo:true,OR:[{organizadorId:req.actor.id},{membros:{some:{usuarioId:req.actor.id,ativo:true}}}]},
      include:{society:{select:{id:true,nome:true,imagem:true,cidade:true}},membros:{where:{ativo:true},select:{id:true}},horariosFixos:{where:{ativo:true},include:{campo:{select:{id:true,nome:true}}},orderBy:{createdAt:'desc'}}},
      orderBy:{updatedAt:'desc'}
    });
    const now=new Date();
    const ids=rows.map(x=>x.id);
    const upcoming=ids.length?await prisma.agendamento.findMany({where:{grupoHorarioId:{in:ids},data:{gte:new Date(now.getFullYear(),now.getMonth(),now.getDate())},status:{not:'CANCELADO'}},include:{presencas:true},orderBy:[{data:'asc'},{horaInicio:'asc'}]}):[];
    res.json(rows.map(g=>({...g,proximo:upcoming.find(a=>a.grupoHorarioId===g.id)||null,euOrganizo:g.organizadorId===req.actor.id})));
  }catch(e){console.error(e);res.status(500).json({error:'Erro ao carregar seus horários.'});}
}

async function listSociety(req,res){
  try{
    const societyId=id(req.params.societyId);
    const groups=await prisma.grupoHorario.findMany({where:{societyId,ativo:true},include:{organizador:{select:{id:true,nome:true,fotoUrl:true}},membros:{where:{ativo:true},select:{id:true}},horariosFixos:{where:{ativo:true},include:{campo:{select:{id:true,nome:true}}}}},orderBy:{nome:'asc'}});
    const now=new Date(); const gids=groups.map(g=>g.id);
    const apps=gids.length?await prisma.agendamento.findMany({where:{grupoHorarioId:{in:gids},data:{gte:new Date(now.getFullYear(),now.getMonth(),now.getDate())},status:{not:'CANCELADO'}},include:{presencas:true,campo:true},orderBy:[{data:'asc'},{horaInicio:'asc'}]}):[];
    res.json(groups.map(g=>({...g,proximo:apps.find(a=>a.grupoHorarioId===g.id)||null})));
  }catch(e){console.error(e);res.status(500).json({error:'Erro ao listar horários fixos.'});}
}

async function readGroup(req,res){
  try{
    const groupId=id(req.params.id); const access=await actorCanSeeGroup(req.actor,groupId);
    if(!access.group) return res.status(404).json({error:'Grupo não encontrado.'});
    if(!access.ok) return res.status(403).json({error:'Você não possui acesso a este grupo.'});
    const group=await prisma.grupoHorario.findUnique({where:{id:groupId},include:{society:{select:{id:true,nome:true,pixChave:true,pixTitular:true}},organizador:{select:{id:true,nome:true,email:true,fotoUrl:true}},membros:{where:{ativo:true},include:{usuario:{select:{id:true,nome:true,email:true,fotoUrl:true,posicaoCampo:true,disponivelParaConvites:true}}},orderBy:{convidadoEm:'asc'}},horariosFixos:{where:{ativo:true},include:{campo:true},orderBy:{createdAt:'desc'}}}});
    const apps=await prisma.agendamento.findMany({where:{grupoHorarioId:groupId,status:{not:'CANCELADO'}},include:{campo:true,presencas:{include:{usuario:{select:{id:true,nome:true,fotoUrl:true}}}}},orderBy:[{data:'asc'},{horaInicio:'asc'}],take:30});
    res.json({...group,agendamentos:apps,podeGerenciar:await actorCanManageGroup(req.actor,access.group),podeAprovarHorario:await actorIsCompanyManager(req.actor,group.societyId)});
  }catch(e){console.error(e);res.status(500).json({error:'Erro ao carregar grupo.'});}
}

async function inviteMember(req,res){
  try{
    const groupId=id(req.params.id); const group=await prisma.grupoHorario.findUnique({where:{id:groupId},include:{society:true}});
    if(!group) return res.status(404).json({error:'Grupo não encontrado.'});
    if(!(await actorCanManageGroup(req.actor,group))) return res.status(403).json({error:'Somente o organizador ou a empresa pode convidar.'});
    let user=null; const userId=id(req.body.usuarioId); const email=String(req.body.email||'').trim().toLowerCase();
    if(userId) user=await prisma.usuario.findUnique({where:{id:userId}}); else if(email) user=await prisma.usuario.findUnique({where:{email}});
    if(!user) return res.status(404).json({error:'Jogador não encontrado. Ele precisa ter uma conta GoPlay.'});
    const activeCount=await prisma.grupoHorarioMembro.count({where:{grupoId,ativo:true}});
    const existing=await prisma.grupoHorarioMembro.findUnique({where:{grupoId_usuarioId:{grupoId,usuarioId:user.id}}});
    if(!existing && activeCount>=group.maxJogadores) return res.status(400).json({error:'O grupo já atingiu o limite de jogadores.'});
    await prisma.$transaction(async tx=>{
      await tx.grupoHorarioMembro.upsert({where:{grupoId_usuarioId:{grupoId,usuarioId:user.id}},create:{grupoId,usuarioId:user.id,ativo:true},update:{ativo:true}});
      const future=await tx.agendamento.findMany({where:{grupoHorarioId:groupId,data:{gte:new Date()},status:{not:'CANCELADO'}},select:{id:true}});
      for(const a of future) await tx.presencaHorario.upsert({where:{agendamentoId_usuarioId:{agendamentoId:a.id,usuarioId:user.id}},create:{agendamentoId:a.id,usuarioId:user.id},update:{}});
    });
    const next=await prisma.agendamento.findFirst({where:{grupoHorarioId:groupId,data:{gte:new Date()},status:{not:'CANCELADO'}},orderBy:{data:'asc'}});
    const url=next?`confirmar-presenca.html?agendamentoId=${next.id}`:`horario-grupo.html?grupoId=${groupId}`;
    await notifyUsuario(prisma,user.id,`Convite: ${group.nome}`,`${group.organizadorId===user.id?'Seu grupo':'Você foi convidado'} para jogar em ${group.society.nome}.`,url);
    res.json({ok:true,usuario:{id:user.id,nome:user.nome,email:user.email}});
  }catch(e){console.error(e);res.status(500).json({error:'Erro ao convidar jogador.'});}
}

async function removeMember(req,res){
  try{
    const groupId=id(req.params.id), userId=id(req.params.userId); const group=await prisma.grupoHorario.findUnique({where:{id:groupId}});
    if(!group) return res.status(404).json({error:'Grupo não encontrado.'});
    if(!(await actorCanManageGroup(req.actor,group))) return res.status(403).json({error:'Sem permissão.'});
    if(userId===group.organizadorId) return res.status(400).json({error:'O organizador não pode ser removido do próprio grupo.'});
    await prisma.grupoHorarioMembro.updateMany({where:{grupoId,usuarioId:userId},data:{ativo:false}});
    const future=await prisma.agendamento.findMany({where:{grupoHorarioId:groupId,data:{gte:new Date()}},select:{id:true}});
    if(future.length) await prisma.presencaHorario.deleteMany({where:{usuarioId:userId,agendamentoId:{in:future.map(x=>x.id)}}});
    res.json({ok:true});
  }catch(e){console.error(e);res.status(500).json({error:'Erro ao remover jogador.'});}
}

function nextWeekday(start, weekday){
  const d=new Date(start); d.setHours(0,0,0,0); const diff=(weekday-d.getDay()+7)%7; d.setDate(d.getDate()+diff); return d;
}
function overlaps(aStart,aEnd,bStart,bEnd){ return aStart < bEnd && aEnd > bStart; }

async function actorIsCompanyManager(actor, societyId){
  societyId=Number(societyId);
  if(actor?.kind==='STAFF') return Number(actor.societyId)===societyId && ['ADMIN','RECEPCAO'].includes(actor.funcao);
  if(actor?.kind==='USER' && actor.tipo==='DONO_SOCIETY') return !!(await prisma.society.findFirst({where:{id:societyId,usuarioId:Number(actor.id)},select:{id:true}}));
  return false;
}

function datesFromFixed(hf){
  const dates=[]; let d=nextWeekday(hf.dataInicio,Number(hf.diaSemana)); const end=hf.dataFim?new Date(hf.dataFim):null;
  for(let i=0;i<Number(hf.quantidadeSemanas||12);i++){ if(end&&d>end)break; dates.push(new Date(d)); d=new Date(d); d.setDate(d.getDate()+7); }
  return dates;
}

async function validateFixedConflicts(hf){
  const dates=datesFromFixed(hf);
  if(!dates.length) return {ok:false,error:'Nenhuma data foi gerada para o período informado.',dates};
  const conflicts=await prisma.agendamento.findMany({where:{campoId:hf.campoId,data:{in:dates},status:{not:'CANCELADO'}},select:{id:true,data:true,horaInicio:true,horaFim:true}});
  const bad=conflicts.find(c=>overlaps(hf.horaInicio,hf.horaFim,c.horaInicio,c.horaFim));
  return bad?{ok:false,error:`Conflito em ${ptDate(bad.data)} (${bad.horaInicio}-${bad.horaFim}).`,dates}:{ok:true,dates};
}

async function generateFixedOccurrences(hf, group){
  const validation=await validateFixedConflicts(hf); if(!validation.ok) throw Object.assign(new Error(validation.error),{status:409});
  const members=await prisma.grupoHorarioMembro.findMany({where:{grupoId:group.id,ativo:true},select:{usuarioId:true}});
  const ids=[...new Set([group.organizadorId,...members.map(m=>m.usuarioId)])];
  const apps=await prisma.$transaction(async tx=>{
    await ensureOrganizerMember(tx,group);
    const out=[];
    for(const dt of validation.dates){
      const ag=await tx.agendamento.create({data:{societyId:group.societyId,campoId:hf.campoId,timeId:null,data:dt,horaInicio:hf.horaInicio,horaFim:hf.horaFim,valor:hf.tipoCobranca==='MENSAL'?Number(hf.valorMensal||0):Number(hf.valorPorJogo||0),status:'CONFIRMADO',grupoHorarioId:group.id,horarioFixoId:hf.id,organizadorId:group.organizadorId}});
      if(ids.length) await tx.presencaHorario.createMany({data:ids.map(usuarioId=>({agendamentoId:ag.id,usuarioId})),skipDuplicates:true});
      out.push(ag);
    }
    await tx.horarioFixo.update({where:{id:hf.id},data:{status:'APROVADO'}});
    return out;
  });
  return {apps,members};
}

async function createFixed(req,res){
  try{
    const groupId=id(req.params.id); const group=await prisma.grupoHorario.findUnique({where:{id:groupId},include:{society:true}});
    if(!group) return res.status(404).json({error:'Grupo não encontrado.'});
    if(!(await actorCanManageGroup(req.actor,group))) return res.status(403).json({error:'Sem permissão para solicitar horário fixo.'});
    const campoId=id(req.body.campoId); const campo=await prisma.campo.findUnique({where:{id:campoId}});
    if(!campo||campo.societyId!==group.societyId) return res.status(400).json({error:'Quadra inválida para esta empresa.'});
    const diaSemana=Number(req.body.diaSemana), horaInicio=String(req.body.horaInicio||'').slice(0,5), horaFim=String(req.body.horaFim||'').slice(0,5);
    const start=dateOnly(req.body.dataInicio), end=req.body.dataFim?dateOnly(req.body.dataFim):null, semanas=Math.max(1,Math.min(52,Number(req.body.semanas||12)));
    if(!Number.isInteger(diaSemana)||diaSemana<0||diaSemana>6||!/^\d{2}:\d{2}$/.test(horaInicio)||!/^\d{2}:\d{2}$/.test(horaFim)||!start) return res.status(400).json({error:'Dados do horário fixo inválidos.'});
    if(horaFim<=horaInicio) return res.status(400).json({error:'Horário final deve ser maior que o inicial.'});
    const tipo=String(req.body.tipoCobranca||'POR_JOGO')==='MENSAL'?'MENSAL':'POR_JOGO';
    const valorPorJogo=Number(req.body.valorPorJogo ?? campo.valorAvulso ?? 0)||null, valorMensal=Number(req.body.valorMensal ?? campo.valorMensal ?? 0)||null;
    if(tipo==='POR_JOGO'&&(!valorPorJogo||valorPorJogo<=0)) return res.status(400).json({error:'Informe o valor por jogo.'});
    if(tipo==='MENSAL'&&(!valorMensal||valorMensal<=0)) return res.status(400).json({error:'Informe o valor mensal.'});
    const autoApprove=await actorIsCompanyManager(req.actor,group.societyId);
    const hf=await prisma.horarioFixo.create({data:{grupoId,societyId:group.societyId,campoId,organizadorId:group.organizadorId,diaSemana,horaInicio,horaFim,dataInicio:start,dataFim:end,tipoCobranca:tipo,status:autoApprove?'APROVADO':'PENDENTE',quantidadeSemanas:semanas,valorPorJogo,valorMensal,dividirValor:req.body.dividirValor!==false,ativo:true}});
    if(!autoApprove){
      const current=await validateFixedConflicts(hf); if(!current.ok){await prisma.horarioFixo.update({where:{id:hf.id},data:{status:'RECUSADO',ativo:false}});return res.status(409).json({error:current.error});}
      if(Number(group.society.usuarioId)!==Number(group.organizadorId)) await notifyUsuario(prisma,group.society.usuarioId,'Solicitação de horário fixo',`${group.nome} solicitou ${horaInicio}-${horaFim} por ${semanas} semana(s).`,`horario-grupo.html?grupoId=${groupId}`);
      await notifyStaff(prisma,group.societyId,'Aprovar horário fixo',`${group.nome} solicitou ${horaInicio}-${horaFim}.`,['ADMIN','RECEPCAO'],`horario-grupo.html?grupoId=${groupId}`);
      return res.status(201).json({horarioFixo:hf,agendamentos:[],pendenteAprovacao:true});
    }
    const generated=await generateFixedOccurrences(hf,group); const first=generated.apps[0];
    for(const m of generated.members){ if(m.usuarioId!==group.organizadorId) await notifyUsuario(prisma,m.usuarioId,`Novo jogo: ${group.nome}`,`${ptDate(first.data)} às ${horaInicio} em ${group.society.nome}. Confirme se você vai.`,`confirmar-presenca.html?agendamentoId=${first.id}`); }
    await notifyStaff(prisma,group.societyId,'Novo horário fixo',`${group.nome}: ${generated.apps.length} ocorrências reservadas.`,['ADMIN','RECEPCAO'],`horario-grupo.html?grupoId=${groupId}`);
    res.status(201).json({horarioFixo:{...hf,status:'APROVADO'},agendamentos:generated.apps,pendenteAprovacao:false});
  }catch(e){console.error(e);res.status(e.status||500).json({error:e.message||'Erro ao criar horário fixo.'});}
}

async function approveFixed(req,res){
  try{
    const hfId=id(req.params.id); const hf=await prisma.horarioFixo.findUnique({where:{id:hfId},include:{grupo:{include:{society:true}}}}); if(!hf)return res.status(404).json({error:'Horário fixo não encontrado.'});
    if(!(await actorIsCompanyManager(req.actor,hf.societyId))) return res.status(403).json({error:'Somente a empresa pode aprovar este horário.'});
    if(hf.status==='APROVADO') return res.status(400).json({error:'Horário já aprovado.'});
    if(hf.status==='RECUSADO') return res.status(400).json({error:'Horário recusado. Crie uma nova solicitação.'});
    const generated=await generateFixedOccurrences(hf,hf.grupo); const first=generated.apps[0];
    await notifyUsuario(prisma,hf.organizadorId,'Horário fixo aprovado',`${hf.grupo.nome} foi aprovado. Primeiro encontro: ${ptDate(first.data)} às ${hf.horaInicio}.`,`confirmar-presenca.html?agendamentoId=${first.id}`);
    for(const m of generated.members){ if(m.usuarioId!==hf.organizadorId) await notifyUsuario(prisma,m.usuarioId,`Novo jogo: ${hf.grupo.nome}`,`${ptDate(first.data)} às ${hf.horaInicio}. Confirme sua presença.`,`confirmar-presenca.html?agendamentoId=${first.id}`); }
    res.json({ok:true,agendamentos:generated.apps});
  }catch(e){console.error(e);res.status(e.status||500).json({error:e.message||'Erro ao aprovar horário.'});}
}

async function rejectFixed(req,res){
  try{
    const hfId=id(req.params.id); const hf=await prisma.horarioFixo.findUnique({where:{id:hfId},include:{grupo:true}}); if(!hf)return res.status(404).json({error:'Horário fixo não encontrado.'});
    if(!(await actorIsCompanyManager(req.actor,hf.societyId))) return res.status(403).json({error:'Somente a empresa pode recusar este horário.'});
    if(hf.status==='APROVADO') return res.status(400).json({error:'Um horário já aprovado deve ser tratado pela agenda, não recusado.'});
    await prisma.horarioFixo.update({where:{id:hfId},data:{status:'RECUSADO',ativo:false}});
    await notifyUsuario(prisma,hf.organizadorId,'Horário fixo não aprovado',`${hf.grupo.nome}: a empresa recusou a solicitação. Ajuste o horário e tente novamente.`,`horario-grupo.html?grupoId=${hf.grupoId}`);
    res.json({ok:true});
  }catch(e){console.error(e);res.status(500).json({error:'Erro ao recusar horário.'});}
}

async function detailOccurrence(req,res){
  try{
    const agendamentoId=id(req.params.id);
    const ag=await prisma.agendamento.findUnique({where:{id:agendamentoId},include:{society:{select:{id:true,nome:true,pixChave:true,pixTitular:true,usuarioId:true}},campo:true,grupoHorario:{include:{organizador:{select:{id:true,nome:true,fotoUrl:true}},membros:{where:{ativo:true},select:{usuarioId:true}}}},horarioFixo:true,presencas:{include:{usuario:{select:{id:true,nome:true,fotoUrl:true,posicaoCampo:true}}},orderBy:{usuario:{nome:'asc'}}}}});
    if(!ag||!ag.grupoHorarioId) return res.status(404).json({error:'Encontro de horário fixo não encontrado.'});
    const access=await actorCanSeeGroup(req.actor,ag.grupoHorarioId); if(!access.ok) return res.status(403).json({error:'Sem acesso a este encontro.'});
    const counts={vou:ag.presencas.filter(p=>p.status==='VOU').length,naoVou:ag.presencas.filter(p=>p.status==='NAO_VOU').length,pendentes:ag.presencas.filter(p=>p.status==='PENDENTE').length,total:ag.presencas.length};
    const share=ag.horarioFixo?.dividirValor&&counts.vou?Number(ag.valor||0)/counts.vou:null;
    const my=req.actor.kind==='USER'?ag.presencas.find(p=>p.usuarioId===req.actor.id)||null:null;
    res.json({...ag,resumoPresenca:counts,valorPorConfirmado:share,minhaPresenca:my,podeGerenciar:await actorCanManageGroup(req.actor,access.group)});
  }catch(e){console.error(e);res.status(500).json({error:'Erro ao carregar encontro.'});}
}

async function recalcShare(agendamentoId){
  const ag=await prisma.agendamento.findUnique({where:{id:agendamentoId},include:{horarioFixo:true,presencas:true}}); if(!ag)return;
  const yes=ag.presencas.filter(p=>p.status==='VOU'); const each=ag.horarioFixo?.dividirValor&&yes.length?Number(ag.valor||0)/yes.length:null;
  await prisma.presencaHorario.updateMany({where:{agendamentoId},data:{valorRateio:null}});
  if(each!=null&&yes.length) await prisma.presencaHorario.updateMany({where:{agendamentoId,status:'VOU'},data:{valorRateio:each}});
}

async function respond(req,res){
  try{
    if(req.actor.kind!=='USER') return res.status(403).json({error:'Somente jogadores respondem presença.'});
    const agendamentoId=id(req.params.id); const status=String(req.body.status||'').toUpperCase(); if(!['VOU','NAO_VOU'].includes(status)) return res.status(400).json({error:'Resposta inválida.'});
    const ag=await prisma.agendamento.findUnique({where:{id:agendamentoId},include:{grupoHorario:{include:{society:true}},campo:true}}); if(!ag?.grupoHorario) return res.status(404).json({error:'Horário não encontrado.'});
    const member=await prisma.grupoHorarioMembro.findFirst({where:{grupoId:ag.grupoHorarioId,usuarioId:req.actor.id,ativo:true}}); if(!member) return res.status(403).json({error:'Você não faz parte deste grupo.'});
    const p=await prisma.presencaHorario.upsert({where:{agendamentoId_usuarioId:{agendamentoId,usuarioId:req.actor.id}},create:{agendamentoId,usuarioId:req.actor.id,status,respondidoEm:new Date()},update:{status,respondidoEm:new Date()}});
    await recalcShare(agendamentoId);
    const text=status==='VOU'?'👍 vai jogar':'👎 não vai jogar';
    if(ag.grupoHorario.organizadorId!==req.actor.id) await notifyUsuario(prisma,ag.grupoHorario.organizadorId,`${req.actor.nome} respondeu`,`${req.actor.nome} ${text} em ${ptDate(ag.data)} às ${ag.horaInicio}.`,`confirmar-presenca.html?agendamentoId=${agendamentoId}`);
    if(ag.grupoHorario.society.usuarioId!==req.actor.id&&ag.grupoHorario.society.usuarioId!==ag.grupoHorario.organizadorId) await notifyUsuario(prisma,ag.grupoHorario.society.usuarioId,'Presença atualizada',`${req.actor.nome} ${text} em ${ag.grupoHorario.nome}.`,`confirmar-presenca.html?agendamentoId=${agendamentoId}`);
    await notifyStaff(prisma,ag.societyId,'Presença atualizada',`${req.actor.nome} ${text} em ${ag.grupoHorario.nome}.`,['ADMIN','RECEPCAO'],`confirmar-presenca.html?agendamentoId=${agendamentoId}`);
    emitHorario(agendamentoId,{tipo:'PRESENCA'}); res.json(p);
  }catch(e){console.error(e);res.status(500).json({error:'Erro ao registrar presença.'});}
}

async function remindPending(req,res){
  try{
    const agendamentoId=id(req.params.id); const ag=await prisma.agendamento.findUnique({where:{id:agendamentoId},include:{grupoHorario:true,presencas:{where:{status:'PENDENTE'},select:{usuarioId:true}}}}); if(!ag?.grupoHorario)return res.status(404).json({error:'Horário não encontrado.'});
    if(!(await actorCanManageGroup(req.actor,ag.grupoHorario))) return res.status(403).json({error:'Sem permissão.'});
    for(const p of ag.presencas) await notifyUsuario(prisma,p.usuarioId,`Confirme presença: ${ag.grupoHorario.nome}`,`${ptDate(ag.data)} às ${ag.horaInicio}. Você vai jogar?`,`confirmar-presenca.html?agendamentoId=${agendamentoId}`);
    res.json({ok:true,enviados:ag.presencas.length});
  }catch(e){console.error(e);res.status(500).json({error:'Erro ao enviar lembretes.'});}
}

async function generateSplit(req,res){
  try{
    const agendamentoId=id(req.params.id); const ag=await prisma.agendamento.findUnique({where:{id:agendamentoId},include:{grupoHorario:true,horarioFixo:true,presencas:{where:{status:'VOU'},include:{usuario:true}},society:true,campo:true}}); if(!ag?.grupoHorario)return res.status(404).json({error:'Horário não encontrado.'});
    if(!(await actorCanManageGroup(req.actor,ag.grupoHorario))) return res.status(403).json({error:'Sem permissão.'});
    if(!ag.presencas.length)return res.status(400).json({error:'Nenhum jogador confirmou presença.'});
    const each=Number(ag.valor||0)/ag.presencas.length; const descBase=`Rateio ${ag.grupoHorario.nome} - ${keyDate(new Date(ag.data))} - agendamento ${ag.id}`;
    let created=0;
    for(const p of ag.presencas){
      await prisma.presencaHorario.update({where:{id:p.id},data:{valorRateio:each}});
      let payment=await prisma.pagamento.findFirst({where:{usuarioId:p.usuarioId,societyId:ag.societyId,descricao:descBase,status:{not:'CANCELADO'}}});
      if(!payment){ payment=await prisma.pagamento.create({data:{usuarioId:p.usuarioId,societyId:ag.societyId,campoId:ag.campoId,tipo:'AVULSO',valor:each,forma:'PIX',status:'PENDENTE',descricao:descBase}}); created++; }
      await notifyUsuario(prisma,p.usuarioId,'Valor do jogo dividido',`${ag.grupoHorario.nome}: sua parte ficou em R$ ${each.toFixed(2).replace('.',',')}.`,`pagamentos.html?pagamentoId=${payment.id}`);
    }
    emitHorario(agendamentoId,{tipo:'RATEIO'}); res.json({ok:true,valorPorPessoa:each,cobrancasCriadas:created});
  }catch(e){console.error(e);res.status(500).json({error:'Erro ao gerar rateio.'});}
}

async function generateMonthly(req,res){
  try{
    const groupId=id(req.params.id); const group=await prisma.grupoHorario.findUnique({where:{id:groupId},include:{horariosFixos:{where:{ativo:true,tipoCobranca:'MENSAL',status:'APROVADO'},include:{campo:true}},society:true}}); if(!group)return res.status(404).json({error:'Grupo não encontrado.'});
    if(!(await actorCanManageGroup(req.actor,group)))return res.status(403).json({error:'Sem permissão.'});
    const hf=group.horariosFixos[0]; if(!hf?.valorMensal)return res.status(400).json({error:'Este grupo não possui mensalidade configurada.'});
    const ref=String(req.body.referencia||'').match(/^\d{4}-\d{2}$/)?req.body.referencia:new Date().toISOString().slice(0,7); const desc=`Mensalidade ${group.nome} - ${ref}`;
    const existing=await prisma.pagamento.findFirst({where:{usuarioId:group.organizadorId,societyId:group.societyId,descricao:desc,status:{not:'CANCELADO'}}}); if(existing)return res.json(existing);
    const p=await prisma.pagamento.create({data:{usuarioId:group.organizadorId,societyId:group.societyId,campoId:hf.campoId,tipo:'MENSALISTA',valor:hf.valorMensal,forma:'PIX',status:'PENDENTE',descricao:desc}});
    await notifyUsuario(prisma,group.organizadorId,'Mensalidade do horário fixo',`${desc}: R$ ${Number(hf.valorMensal).toFixed(2).replace('.',',')}.`,`pagamentos.html?pagamentoId=${p.id}`);
    res.status(201).json(p);
  }catch(e){console.error(e);res.status(500).json({error:'Erro ao gerar mensalidade.'});}
}

async function setAvailability(req,res){
  try{ if(req.actor.kind!=='USER')return res.status(403).json({error:'Disponibilidade é exclusiva de jogadores.'}); const value=!!req.body.disponivel; const u=await prisma.usuario.update({where:{id:req.actor.id},data:{disponivelParaConvites:value},select:{id:true,disponivelParaConvites:true}}); res.json(u); }
  catch(e){console.error(e);res.status(500).json({error:'Erro ao atualizar disponibilidade.'});}
}

async function availablePlayers(req,res){
  try{
    const groupId=id(req.params.id); const group=await prisma.grupoHorario.findUnique({where:{id:groupId}}); if(!group)return res.status(404).json({error:'Grupo não encontrado.'});
    if(!(await actorCanManageGroup(req.actor,group)))return res.status(403).json({error:'Sem permissão.'});
    const memberIds=(await prisma.grupoHorarioMembro.findMany({where:{grupoId,ativo:true},select:{usuarioId:true}})).map(x=>x.usuarioId);
    const q=String(req.query.q||'').trim(); const users=await prisma.usuario.findMany({where:{disponivelParaConvites:true,id:{notIn:memberIds},...(q?{OR:[{nome:{contains:q,mode:'insensitive'}},{email:{contains:q,mode:'insensitive'}}]}:{})},select:{id:true,nome:true,email:true,fotoUrl:true,posicaoCampo:true},orderBy:{nome:'asc'},take:50}); res.json(users);
  }catch(e){console.error(e);res.status(500).json({error:'Erro ao buscar jogadores disponíveis.'});}
}

module.exports={createGroup,myGroups,listSociety,readGroup,inviteMember,removeMember,createFixed,approveFixed,rejectFixed,detailOccurrence,respond,remindPending,generateSplit,generateMonthly,setAvailability,availablePlayers};
