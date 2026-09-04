async function notifyUsuario(prisma, usuarioId, titulo, mensagem, url = null){
  if(!usuarioId) return;
  try{ await prisma.notificacao.create({data:{usuarioId:Number(usuarioId),titulo:String(titulo),mensagem:String(mensagem),url:url?String(url):null}}); }catch(e){ console.error('notifyUsuario',e.message); }
}
async function notifyStaff(prisma, societyId, titulo, mensagem, funcoes=['ADMIN','CAIXA','RECEPCAO'], url = null){
  if(!societyId) return;
  try{
    const staff=await prisma.funcionario.findMany({where:{societyId:Number(societyId),ativo:true,funcao:{in:funcoes}},select:{id:true}});
    if(staff.length) await prisma.notificacaoFuncionario.createMany({data:staff.map(f=>({funcionarioId:f.id,titulo:String(titulo),mensagem:String(mensagem),url:url?String(url):null}))});
  }catch(e){ console.error('notifyStaff',e.message); }
}
module.exports={notifyUsuario,notifyStaff};
