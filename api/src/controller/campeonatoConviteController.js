const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { notifyUsuario, notifyStaff } = require('../notifications');

const idNum=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};

async function meusConvites(req,res){
  try{
    if(req.actor?.kind!=='USER') return res.status(403).json({error:'Acesso disponível apenas para usuários.'});
    const uid=Number(req.actor.id);
    const comoDono=await prisma.conviteCampeonatoTime.findMany({
      where:{time:{donoId:uid}},
      include:{campeonato:{include:{society:{select:{id:true,nome:true,imagem:true}}}},time:{include:{jogadores:{select:{id:true,nome:true,fotoUrl:true,posicaoCampo:true}}}},jogadores:{include:{usuario:{select:{id:true,nome:true,fotoUrl:true}},},orderBy:{convidadoEm:'asc'}}},
      orderBy:{convidadoEm:'desc'}
    });
    const comoJogador=await prisma.conviteCampeonatoJogador.findMany({
      where:{usuarioId:uid},
      include:{conviteTime:{include:{campeonato:{include:{society:{select:{id:true,nome:true}}}},time:{select:{id:true,nome:true,brasao:true}}}}},
      orderBy:{convidadoEm:'desc'}
    });
    return res.json({comoDono,comoJogador});
  }catch(e){console.error(e);return res.status(500).json({error:'Erro ao carregar convites de campeonato.'});}
}

async function responderTime(req,res){
  try{
    const id=idNum(req.params.id); const acao=String(req.body.acao||'').toUpperCase();
    if(!id||!['ACEITAR','RECUSAR'].includes(acao)) return res.status(400).json({error:'Resposta inválida.'});
    if(req.actor?.kind!=='USER') return res.status(403).json({error:'Acesso negado.'});
    const convite=await prisma.conviteCampeonatoTime.findUnique({where:{id},include:{time:{include:{jogadores:{select:{id:true,nome:true}}}},campeonato:{include:{society:true,times:true}}}});
    if(!convite) return res.status(404).json({error:'Convite não encontrado.'});
    if(Number(convite.time.donoId)!==Number(req.actor.id)) return res.status(403).json({error:'Somente o dono do time pode responder.'});
    if(acao==='RECUSAR'){
      const out=await prisma.conviteCampeonatoTime.update({where:{id},data:{status:'RECUSADO',respondidoEm:new Date()}});
      await notifyUsuario(prisma, convite.campeonato.society.usuarioId, 'Convite recusado', `${convite.time.nome} recusou participar de ${convite.campeonato.nome}.`, `campeonato-detalhe.html?campeonatoId=${convite.campeonatoId}`);
      return res.json(out);
    }
    if(convite.campeonato.times.length>=convite.campeonato.maxTimes) return res.status(409).json({error:'O campeonato já atingiu o limite de times.'});
    const idsPermitidos=new Set(convite.time.jogadores.map(j=>j.id));
    const jogadorIds=[...new Set((Array.isArray(req.body.jogadorIds)?req.body.jogadorIds:[]).map(Number).filter(x=>idsPermitidos.has(x)))];
    const out=await prisma.$transaction(async tx=>{
      await tx.timeCampeonato.upsert({where:{campeonatoId_timeId:{campeonatoId:convite.campeonatoId,timeId:convite.timeId}},create:{campeonatoId:convite.campeonatoId,timeId:convite.timeId},update:{}});
      await tx.tabelaCampeonato.upsert({where:{campeonatoId_timeId:{campeonatoId:convite.campeonatoId,timeId:convite.timeId}},create:{campeonatoId:convite.campeonatoId,timeId:convite.timeId},update:{}});
      const c=await tx.conviteCampeonatoTime.update({where:{id},data:{status:'ACEITO',respondidoEm:new Date()}});
      for(const usuarioId of jogadorIds){
        await tx.conviteCampeonatoJogador.upsert({where:{conviteTimeId_usuarioId:{conviteTimeId:id,usuarioId}},create:{conviteTimeId:id,usuarioId,status:'PENDENTE'},update:{status:'PENDENTE',convidadoEm:new Date(),respondidoEm:null}});
      }
      return c;
    });
    for(const usuarioId of jogadorIds){
      await notifyUsuario(prisma,usuarioId,'Convite para jogar campeonato',`${convite.time.nome} vai disputar ${convite.campeonato.nome}. Você quer participar?`,'convites-campeonato.html');
    }
    await notifyUsuario(prisma, convite.campeonato.society.usuarioId, 'Time aceitou o campeonato', `${convite.time.nome} confirmou participação em ${convite.campeonato.nome}.`, `campeonato-detalhe.html?campeonatoId=${convite.campeonatoId}`);
    await notifyStaff(prisma,convite.campeonato.societyId,'Time confirmado',`${convite.time.nome} aceitou participar de ${convite.campeonato.nome}.`,['ADMIN'],`campeonato-detalhe.html?campeonatoId=${convite.campeonatoId}`);
    return res.json({ok:true,convite:out,jogadoresConvidados:jogadorIds.length});
  }catch(e){console.error(e);return res.status(500).json({error:'Erro ao responder convite do time.'});}
}

async function responderJogador(req,res){
  try{
    const id=idNum(req.params.id); const acao=String(req.body.acao||'').toUpperCase();
    if(!id||!['ACEITAR','RECUSAR'].includes(acao)) return res.status(400).json({error:'Resposta inválida.'});
    if(req.actor?.kind!=='USER') return res.status(403).json({error:'Acesso negado.'});
    const convite=await prisma.conviteCampeonatoJogador.findUnique({where:{id},include:{conviteTime:{include:{time:true,campeonato:true}}}});
    if(!convite) return res.status(404).json({error:'Convite não encontrado.'});
    if(Number(convite.usuarioId)!==Number(req.actor.id)) return res.status(403).json({error:'Este convite não pertence a você.'});
    const status=acao==='ACEITAR'?'ACEITO':'RECUSADO';
    const out=await prisma.conviteCampeonatoJogador.update({where:{id},data:{status,respondidoEm:new Date()}});
    await notifyUsuario(prisma,convite.conviteTime.time.donoId,'Resposta de jogador',`Um jogador ${status==='ACEITO'?'confirmou':'recusou'} participação em ${convite.conviteTime.campeonato.nome}.`,'convites-campeonato.html');
    return res.json(out);
  }catch(e){console.error(e);return res.status(500).json({error:'Erro ao responder convite.'});}
}

module.exports={meusConvites,responderTime,responderJogador};
