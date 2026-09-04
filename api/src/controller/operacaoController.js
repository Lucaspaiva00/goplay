const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseDateOnly(str){
  const m=String(str||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return null;
  return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
}
async function dashboard(req,res){
  try{
    const societyId=Number(req.params.societyId);
    const data=parseDateOnly(req.query.data)||new Date();
    data.setHours(0,0,0,0);
    const [reservas,comandas,pagamentos,jogos,funcionarios]=await Promise.all([
      prisma.agendamento.findMany({where:{societyId,data,status:{not:'CANCELADO'}},include:{campo:true,time:true,pagamento:true,grupoHorario:{select:{id:true,nome:true}},presencas:{select:{status:true}}},orderBy:{horaInicio:'asc'}}),
      prisma.comanda.findMany({where:{societyId,status:{in:['ABERTA','FECHADA']}},include:{usuario:{select:{id:true,nome:true}},itens:true},orderBy:{updatedAt:'desc'}}),
      prisma.pagamento.findMany({where:{societyId,status:'PENDENTE'},include:{usuario:{select:{nome:true}},time:{select:{nome:true}}},orderBy:{createdAt:'asc'}}),
      prisma.jogo.findMany({where:{campeonato:{societyId},statusOperacao:{in:['AO_VIVO','INTERVALO']}},include:{timeA:{select:{nome:true}},timeB:{select:{nome:true}},campeonato:{select:{nome:true}}}}),
      prisma.funcionario.count({where:{societyId,ativo:true}})
    ]);
    const totalAberto=comandas.reduce((s,c)=>s+Number(c.total||0),0),pendente=pagamentos.reduce((s,p)=>s+Number(p.valor||0),0);
    res.json({data:data.toISOString().slice(0,10),resumo:{reservasHoje:reservas.length,comandasAbertas:comandas.filter(c=>c.status==='ABERTA').length,aguardandoPagamento:comandas.filter(c=>c.status==='FECHADA').length,pagamentosPendentes:pagamentos.length,jogosAoVivo:jogos.length,funcionariosAtivos:funcionarios,totalComandas:totalAberto,totalPendente:pendente},reservas,comandas,pagamentos,jogos});
  }catch(e){console.error(e);res.status(500).json({error:'Erro ao carregar operação.'});}
}
module.exports={dashboard};
