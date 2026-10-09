const { sendNotificationEmail } = require('./notificationMailer');
const { isPlatformAdmin } = require('./auth');
const error = (message, status) => Object.assign(new Error(message), { status });
const toId = v => Number.isInteger(Number(v)) && Number(v)>0 && Number(v)<=2147483647 ? Number(v) : null;
function canInvite(actor,a,timeId) {
  return isPlatformAdmin(actor) || (actor?.kind==='STAFF' && actor.funcao==='ADMIN' && actor.societyId===a.societyId) ||
    (actor?.kind==='USER' && (actor.id===a.society?.usuarioId || actor.id===(timeId===a.timeAId?a.timeA.donoId:a.timeB.donoId)));
}
async function invite(prisma,{amistosoId,timeId,usuarioIds,actor,roster=false,automatic=false}) {
  const result=await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "Amistoso" WHERE id=${amistosoId} FOR UPDATE`;
    const a=await tx.amistoso.findUnique({where:{id:amistosoId},include:{timeA:true,timeB:true,society:{select:{usuarioId:true}},jogo:{select:{finalizado:true}}}});
    if(!a)throw error('Amistoso não encontrado.',404);
    if(![a.timeAId,a.timeBId].includes(timeId))throw error('Time não participa deste amistoso.',400);
    if(!automatic&&!canInvite(actor,a,timeId))throw error('Sem permissão para convidar jogadores deste time.',403);
    if(a.status!=='CONFIRMADO'||a.jogo?.finalizado)throw error('Convites estão disponíveis somente para amistosos confirmados e não encerrados.',409);
    const targets=await tx.usuario.findMany({where:{tipo:{in:['PLAYER','DONO_TIME']},...(roster?{timesJogador:{some:{id:timeId}}}:{id:{in:usuarioIds}})},select:{id:true,nome:true,email:true,timeRelacionadoId:true}});
    if(!roster&&targets.length!==usuarioIds.length)throw error('Selecione jogadores válidos.',400);
    const sent=[],skipped=[];
    for(const player of targets){
      const key={amistosoId_usuarioId:{amistosoId,usuarioId:player.id}};
      const existing=await tx.presencaAmistoso.findUnique({where:key});
      if(existing&&existing.timeId!==timeId){if(roster){skipped.push(player.id);continue;}throw error('Este jogador já está convidado pelo outro time.',409);}
      // Synchronizing the roster never overwrites an answer or sends duplicate invitations.
      if(roster&&existing){skipped.push(player.id);continue;}
      if(existing?.notificadoEm&&Date.now()-existing.notificadoEm.getTime()<60000){skipped.push(player.id);continue;}
      const data={notificadoEm:new Date(),convidadoAvulso:!await require("./teamMembership").belongs(tx,player.id,timeId)};
      if(existing)await tx.presencaAmistoso.update({where:key,data});
      else await tx.presencaAmistoso.create({data:{amistosoId,usuarioId:player.id,timeId,...data}});
      const titulo='Você vai jogar este amistoso?';
      const mensagem=`${a.timeA.nome} × ${a.timeB.nome} • ${new Date(a.dataHora).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}. Você foi convidado pelo ${timeId===a.timeAId?a.timeA.nome:a.timeB.nome}. Confirme 👍 Vou ou 👎 Não vou no GoPlay.`;
      const url=`amistosos.html?amistosoId=${a.id}`;
      await tx.notificacao.create({data:{usuarioId:player.id,titulo,mensagem,url}});
      sent.push({player,titulo,mensagem,url});
    }
    return {sent,skipped};
  });
  for(const entry of result.sent)if(entry.player.email)sendNotificationEmail({to:entry.player.email,nome:entry.player.nome,titulo:entry.titulo,mensagem:entry.mensagem,url:entry.url}).catch(e=>console.error('email convite amistoso',e.message));
  return {notificados:result.sent.length,ignorados:result.skipped.length};
}
async function syncJoinedPlayer(prisma,usuarioId,timeId){
  const matches=await prisma.amistoso.findMany({where:{status:'CONFIRMADO',dataHora:{gte:new Date()},OR:[{timeAId:timeId},{timeBId:timeId}],jogo:{finalizado:false}},select:{id:true}});
  for(const a of matches)try{await invite(prisma,{amistosoId:a.id,timeId,usuarioIds:[usuarioId],roster:false,automatic:true});}catch(e){if(e.status!==409)throw e;}
}
module.exports={invite,syncJoinedPlayer,toId};
