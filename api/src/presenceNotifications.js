const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { notifyUsuario } = require('./notifications');

const LEAD_DAYS = Math.max(1, Math.min(14, Number(process.env.PRESENCA_LEAD_DAYS || 7)));
const ptDate = d => new Date(d).toLocaleDateString('pt-BR');
const monthRef = d => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`;
};

async function ensureTeamPresences(agendamentoId, timeId){
  if(!timeId) return [];
  const jogadores = await prisma.usuario.findMany({
    where:{ timeRelacionadoId:Number(timeId) },
    select:{ id:true }
  });
  if(jogadores.length){
    await prisma.presencaHorario.createMany({
      data:jogadores.map(j=>({agendamentoId:Number(agendamentoId),usuarioId:j.id})),
      skipDuplicates:true
    });
  }
  return jogadores.map(j=>j.id);
}

async function ensureMonthlyPayment(ag){
  const hf=ag.horarioFixo;
  if(!hf || hf.tipoCobranca!=='MENSAL' || !hf.valorMensal || !ag.grupoHorario) return null;
  const ref=monthRef(ag.data);
  const desc=`Mensalidade ${ag.grupoHorario.nome} - ${ref}`;
  let payment=await prisma.pagamento.findFirst({
    where:{usuarioId:ag.grupoHorario.organizadorId,societyId:ag.societyId,descricao:desc,status:{not:'CANCELADO'}}
  });
  if(!payment){
    payment=await prisma.pagamento.create({data:{
      usuarioId:ag.grupoHorario.organizadorId,
      societyId:ag.societyId,
      campoId:ag.campoId,
      timeId:ag.timeId||null,
      tipo:'MENSALISTA',
      valor:Number(hf.valorMensal),
      forma:'PIX',
      status:'PENDENTE',
      descricao:desc
    }});
    await notifyUsuario(prisma,ag.grupoHorario.organizadorId,'Mensalidade do horário fixo',`${desc}: R$ ${Number(hf.valorMensal).toFixed(2).replace('.',',')}.`,`pagamentos.html?pagamentoId=${payment.id}`);
  }
  return payment;
}

async function ensurePerGamePayment(ag){
  const hf=ag.horarioFixo;
  if(!hf || hf.tipoCobranca!=='POR_JOGO' || hf.dividirValor || !ag.grupoHorario || !ag.valor || ag.valor<=0) return null;
  let payment=await prisma.pagamento.findUnique({where:{agendamentoId:ag.id}});
  if(!payment){
    payment=await prisma.pagamento.create({data:{
      usuarioId:ag.grupoHorario.organizadorId, societyId:ag.societyId, timeId:ag.timeId||null, campoId:ag.campoId, agendamentoId:ag.id,
      tipo:'AVULSO', valor:Number(ag.valor), forma:'PIX', status:'PENDENTE',
      descricao:`Horário fixo ${ag.grupoHorario.nome} - ${ptDate(ag.data)} ${ag.horaInicio}`
    }});
    await notifyUsuario(prisma,ag.grupoHorario.organizadorId,'Pagamento do próximo jogo',`${ag.grupoHorario.nome}: ${ptDate(ag.data)} às ${ag.horaInicio}, R$ ${Number(ag.valor).toFixed(2).replace('.',',')}.`,`pagamentos.html?pagamentoId=${payment.id}`);
  }
  return payment;
}

async function dispatchDuePresenceNotifications(){
  const now=new Date();
  const horizon=new Date(now);
  horizon.setDate(horizon.getDate()+LEAD_DAYS);
  const rows=await prisma.agendamento.findMany({
    where:{
      status:{not:'CANCELADO'},
      presencaNotificadaEm:null,
      data:{lte:horizon},
      OR:[{grupoHorarioId:{not:null}},{timeId:{not:null}}]
    },
    include:{
      society:{select:{nome:true}},
      campo:{select:{nome:true}},
      time:{select:{id:true,nome:true,donoId:true}},
      grupoHorario:{select:{id:true,nome:true,organizadorId:true}},
      horarioFixo:true,
      presencas:{select:{usuarioId:true}}
    },
    orderBy:{data:'asc'},
    take:100
  });

  for(const ag of rows){
    try{
      if(ag.timeId) await ensureTeamPresences(ag.id,ag.timeId);
      let targets=await prisma.presencaHorario.findMany({where:{agendamentoId:ag.id},select:{usuarioId:true}});
      // Rotinas antigas sem time continuam usando os membros do grupo.
      if(!targets.length && ag.grupoHorarioId){
        const members=await prisma.grupoHorarioMembro.findMany({where:{grupoId:ag.grupoHorarioId,ativo:true},select:{usuarioId:true}});
        if(members.length){
          await prisma.presencaHorario.createMany({data:members.map(m=>({agendamentoId:ag.id,usuarioId:m.usuarioId})),skipDuplicates:true});
          targets=members;
        }
      }
      const nome=ag.grupoHorario?.nome || ag.time?.nome || 'Seu time';
      for(const p of targets){
        await notifyUsuario(prisma,p.usuarioId,`Você vai jogar? • ${nome}`,`${ptDate(ag.data)} às ${ag.horaInicio}, ${ag.campo?.nome||'quadra'} em ${ag.society?.nome||'GoPlay'}. Confirme 👍 ou 👎.`,`confirmar-presenca.html?agendamentoId=${ag.id}`);
      }
      if(ag.horarioFixo?.tipoCobranca==='MENSAL') await ensureMonthlyPayment(ag);
      if(ag.horarioFixo?.tipoCobranca==='POR_JOGO') await ensurePerGamePayment(ag);
      await prisma.agendamento.update({where:{id:ag.id},data:{presencaNotificadaEm:new Date()}});
    }catch(e){
      console.error('dispatchDuePresenceNotifications agendamento',ag.id,e.message);
    }
  }
  return rows.length;
}

function startPresenceNotificationJob(){
  setTimeout(()=>dispatchDuePresenceNotifications().catch(e=>console.error('presence job startup',e)),10000);
  const timer=setInterval(()=>dispatchDuePresenceNotifications().catch(e=>console.error('presence job',e)),15*60*1000);
  if(timer.unref) timer.unref();
}

module.exports={dispatchDuePresenceNotifications,startPresenceNotificationJob,ensureTeamPresences,ensureMonthlyPayment,ensurePerGamePayment};
