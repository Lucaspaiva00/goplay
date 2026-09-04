const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function list(req,res){
  try{
    const a=req.actor;
    const rows=a.kind==='STAFF'
      ? await prisma.notificacaoFuncionario.findMany({where:{funcionarioId:a.id},orderBy:{createdAt:'desc'},take:50})
      : await prisma.notificacao.findMany({where:{usuarioId:a.id},orderBy:{createdAt:'desc'},take:50});
    res.json({naoLidas:rows.filter(n=>!n.lido).length,itens:rows});
  }catch(e){console.error(e);res.status(500).json({error:'Erro ao carregar notificações.'});}
}
async function markRead(req,res){
  try{
    const a=req.actor,id=Number(req.params.id);
    if(a.kind==='STAFF') await prisma.notificacaoFuncionario.updateMany({where:{id,funcionarioId:a.id},data:{lido:true}});
    else await prisma.notificacao.updateMany({where:{id,usuarioId:a.id},data:{lido:true}});
    res.json({ok:true});
  }catch(e){console.error(e);res.status(500).json({error:'Erro ao marcar notificação.'});}
}
async function markAll(req,res){
  try{const a=req.actor;if(a.kind==='STAFF')await prisma.notificacaoFuncionario.updateMany({where:{funcionarioId:a.id,lido:false},data:{lido:true}});else await prisma.notificacao.updateMany({where:{usuarioId:a.id,lido:false},data:{lido:true}});res.json({ok:true});}
  catch(e){console.error(e);res.status(500).json({error:'Erro ao marcar notificações.'});}
}
module.exports={list,markRead,markAll};
