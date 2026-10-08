// Run only against an isolated, migrated test database:
// TEST_DATABASE_URL=postgresql://... node test/topicos-17-20.integration.js
const assert = require('node:assert/strict');
const { once } = require('node:events');
const releaseValidation = process.argv.includes('--release-validation');
const url = releaseValidation ? process.env.DATABASE_URL : process.env.TEST_DATABASE_URL;
if (releaseValidation && (!process.env.GOPLAY_VALIDATE_COMMIT || process.env.GOPLAY_VALIDATE_COMMIT !== process.env.RENDER_GIT_COMMIT)) throw new Error('Release validation requires an explicitly configured matching commit.');
if (!releaseValidation && (!url || !/^postgresql:\/\/[^@]+@(?:127\.0\.0\.1|localhost):/.test(url))) throw new Error('Use TEST_DATABASE_URL with an isolated localhost database.');
process.env.DATABASE_URL = url;
process.env.AUTH_SECRET = 'integration-secret-local-only';
// Exercise persistent notifications, while excluding the external mail transport.
require('../src/notificationMailer').sendNotificationEmail = async () => ({ skipped: true });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const express = require('express');
const app = express(); app.use(express.json()); app.use(require('../src/routes'));
const server = app.listen(0, '127.0.0.1');
let checks = 0;
const fixtureUserIds = [];
async function cleanupFixtures() {
  if (!fixtureUserIds.length) return;
  await prisma.campeonato.deleteMany({where:{organizadorId:{in:fixtureUserIds}}});
  await prisma.usuario.deleteMany({where:{id:{in:fixtureUserIds}}});
}

async function request(path, actor, method='GET', body, expected=200, extra={}) {
  const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {method, headers:{'Content-Type':'application/json',...(actor ? {Authorization:`Bearer ${actor.token}`} : {}),...extra}, ...(body!==undefined ? {body:JSON.stringify(body)} : {})});
  if(path.endsWith('.pdf')) { assert.equal(res.status,expected,path);assert.equal(res.headers.get('content-type'),'application/pdf');const b=Buffer.from(await res.arrayBuffer());assert.equal(b.subarray(0,4).toString(),'%PDF');checks++;return b; }
  const json = await res.json(); assert.equal(res.status,expected,`${method} ${path}: ${JSON.stringify(json)}`); checks++;return json;
}
const auth=require('../src/auth');
const stamp=Date.now();
async function user(name,tipo='PLAYER',isSocioGoPlay=false) {
 const u=await prisma.usuario.create({data:{nome:name,email:`${stamp}-${name.replaceAll(' ','')}@example.invalid`,senha:'local-test-hash',tipo,isSocioGoPlay}});
 fixtureUserIds.push(u.id);
 return {...u,token:auth.createToken({kind:'USER',id:u.id})};
}
(async()=>{
 await once(server,'listening');
 const ownerA=await user('OwnerA','DONO_TIME'), ownerB=await user('OwnerB','DONO_TIME'), venueOwner=await user('VenueOwner','DONO_SOCIETY'), outsider=await user('Outsider'), partner=await user('Partner','PLAYER',true), organizer=await user('Organizer','ORGANIZADOR_COMPETICAO'), publicOrg=await user('PublicOrg','ORGAO_PUBLICO');
 const society=await prisma.society.create({data:{nome:`Integration ${stamp}`,usuarioId:venueOwner.id,cidade:'Pedreira'}});
 const otherSociety=await prisma.society.create({data:{nome:`Other ${stamp}`,usuarioId:ownerB.id}});
 const campo=await prisma.campo.create({data:{nome:'Court',societyId:society.id,valorAvulso:100}});
 for(let diaSemana=0;diaSemana<7;diaSemana++)await prisma.societyHorarioFuncionamento.create({data:{societyId:society.id,diaSemana,ativo:true,horaInicio:'08:00',horaFim:'00:00'}});
 const teamA=await request('/time',ownerA,'POST',{nome:`TeamA ${stamp}`,societyId:society.id,donoId:ownerA.id},201);
 const teamB=await request('/time',ownerB,'POST',{nome:`TeamB ${stamp}`,societyId:otherSociety.id,donoId:ownerB.id},201);
 assert.equal(teamA.maxJogadores,20);
 await prisma.time.updateMany({where:{id:{in:[teamA.id,teamB.id]}},data:{statusVinculo:'APROVADO'}});
 await request(`/time/${teamA.id}`,ownerA,'PUT',{maxJogadores:25});
 await request(`/time/${teamA.id}`,outsider,'PUT',{maxJogadores:100},403);
 const players=[];for(let i=0;i<26;i++)players.push(await user(`Player${i}`));
 await prisma.usuario.updateMany({where:{id:{in:players.slice(0,24).map(p=>p.id)}},data:{timeRelacionadoId:teamA.id}});
 const joins=[];for(const p of players.slice(24))joins.push(await request(`/time/${teamA.id}/solicitar-entrada`,p,'POST',{},201));
 await request(`/time/solicitacoes/${joins[0].solicitacao.id}/responder`,ownerA,'POST',{status:'APROVADA'});
 await request(`/time/solicitacoes/${joins[1].solicitacao.id}/responder`,ownerA,'POST',{status:'APROVADA'},409);
 await request(`/time/${teamA.id}`,ownerA,'PUT',{maxJogadores:24},409);
 await request('/time/entrar',players[25],'POST',{timeId:teamA.id},409);
 await assert.rejects(prisma.usuario.update({where:{id:players[25].id},data:{timeRelacionadoId:teamA.id}}),/GOPLAY_TEAM_FULL/);checks++;
 await prisma.$disconnect();
 await assert.rejects(prisma.time.update({where:{id:teamA.id},data:{maxJogadores:24}}),/GOPLAY_TEAM_LIMIT/);checks++;
 await prisma.$disconnect();
 await prisma.usuario.update({where:{id:outsider.id},data:{timeRelacionadoId:teamB.id}});
 await request('/usuarios',null,'POST',{nome:'BadPartner',email:`bad-${stamp}@example.invalid`,senha:'test123',tipo:'SOCIO_GOPLAY'},403);
 const normal=await request('/usuarios',null,'POST',{nome:'Normal',email:`normal-${stamp}@example.invalid`,senha:'test123',tipo:'PLAYER',isSocioGoPlay:true},201);assert.equal(normal.isSocioGoPlay,false);fixtureUserIds.push(normal.id);
 await request(`/usuarios/${ownerA.id}`,null,'PUT',{nome:'Unauthorized'},401);
 await request(`/usuarios/${ownerA.id}`,outsider,'PUT',{nome:'Unauthorized'},403);
 await request(`/usuarios/${outsider.id}`,outsider,'PUT',{isSocioGoPlay:true},403);
 await request('/plataforma/dashboard',null,'GET',undefined,401);
 await request('/plataforma/dashboard',outsider,'GET',undefined,403);
 const dashboard=await request('/plataforma/dashboard',partner);assert.equal(dashboard.financeiro.assinaturas.implementado,false);
 assert((await request('/plataforma/usuarios?q=OwnerA',partner)).some(x=>x.id===ownerA.id));
 assert((await request('/plataforma/societies?q=Pedreira',partner)).some(x=>x.id===society.id));
 await request('/plataforma/saude',partner);
 await request('/plataforma/usuarios?tipo=INVALID',partner,'GET',undefined,400);
 await request('/plataforma/societies?take=NaN',partner,'GET',undefined,400);
 const dateKey='2035-10-08';const at=hour=>`${dateKey}T${hour}:00:00-03:00`;
 const base={timeAId:teamA.id,timeBId:teamB.id,dataHora:at('10'),duracaoMinutos:90,societyId:society.id,campoId:campo.id};
 await request('/amistosos',players[0],'POST',base,403);
 await request('/amistosos',ownerB,'POST',base,403);
 await request('/amistosos',ownerA,'POST',{...base,duracaoMinutos:'x'},400);
 await request('/amistosos',ownerA,'POST',{...base,campoId:null},400);
 await request('/amistosos',ownerA,'POST',{...base,dataHora:at('07')},409);
 let a=await request('/amistosos',ownerA,'POST',base,201);assert.equal(a.status,'PENDENTE_ADVERSARIO');
 assert.equal(await prisma.agendamento.count({where:{amistoso:{id:a.id}}}),0);
 await request(`/amistosos/${a.id}`,partner);await request(`/amistosos/${a.id}`,players[0],'GET',undefined,403);
 await request(`/amistosos/${a.id}/responder-society`,venueOwner,'POST',{acao:'APROVAR'},409);
 await request(`/amistosos/${a.id}/responder-adversario`,ownerA,'POST',{acao:'ACEITAR'},403);
 a=await request(`/amistosos/${a.id}/responder-adversario`,ownerB,'POST',{acao:'ACEITAR'});assert.equal(a.status,'PENDENTE_SOCIETY');
 await request(`/amistosos/${a.id}/responder-society`,ownerB,'POST',{acao:'APROVAR'},403);
 a=await request(`/amistosos/${a.id}/responder-society`,venueOwner,'POST',{acao:'APROVAR'});assert.equal(a.status,'CONFIRMADO');assert(a.agendamentoId);assert(a.jogo.id);assert.equal(a.presencas.length,26);
 const reservation=await prisma.agendamento.findUnique({where:{id:a.agendamentoId}});assert.equal(reservation.horaInicio,'10:00');assert.equal(reservation.horaFim,'11:30');
 const slots=await request(`/agendamentos/disponiveis?campoId=${campo.id}&data=${dateKey}`,null);assert.equal(slots.find(x=>x.horaInicio==='10:00').disponivel,false);assert.equal(slots.find(x=>x.horaInicio==='11:00').disponivel,false);
 await request(`/amistosos/${a.id}/presenca`,players[0],'POST',{status:'VOU'});
 await request(`/amistosos/${a.id}/presenca`,outsider,'POST',{status:'NAO_VOU'});
 const own=await request(`/amistosos/${a.id}`,players[0]);assert.equal(own.presencas.length,1);assert.equal(own.presencas[0].usuarioId,players[0].id);assert.equal(own.timeA.jogadores,undefined);
 const myRows=await request('/amistosos/meus',players[0]);assert.equal(myRows.find(x=>x.id===a.id).presencas.length,1);
 const ownerRows=await request('/amistosos/meus',ownerA);assert(ownerRows.find(x=>x.id===a.id).presencas.some(p=>p.usuarioId===players[0].id&&p.status==='VOU'));
 await request(`/agendamentos/${a.agendamentoId}/cancelar`,ownerA,'POST',{},409);
 await request(`/agendamentos/${a.agendamentoId}/remarcar`,venueOwner,'PUT',{data:dateKey,horaInicio:'14:00'},409);
 await request('/amistosos',venueOwner,'POST',{...base,dataHora:at('11')},409);
 const mesa=await request(`/jogo/${a.jogo.id}/mesa/configurar`,venueOwner,'POST',{mesarioNome:'Integration'});
 const publicGame=await request(`/jogo/${a.jogo.id}`,null);assert(!JSON.stringify(publicGame).includes('local-test-hash'));assert.equal(publicGame.jogo.campeonato,null);
 await request(`/jogo/${a.jogo.id}/mesa`,players[0],'GET',undefined,403);
 await request(`/jogo/${a.jogo.id}/mesa`,null,'GET',undefined,200,{'X-Mesa-Token':mesa.mesaToken});
 await request(`/jogo/${a.jogo.id}/escalacao`,null,'POST',{timeId:teamA.id,jogadorId:players[0].id},200,{'X-Mesa-Token':mesa.mesaToken});
 await request(`/jogo/${a.jogo.id}/evento`,null,'POST',{tipo:'GOL',timeId:teamA.id,jogadorId:players[0].id,minuto:1},200,{'X-Mesa-Token':mesa.mesaToken});
 await request(`/jogo/${a.jogo.id}/cronometro`,null,'POST',{acao:'INICIAR'},200,{'X-Mesa-Token':mesa.mesaToken});
 await request(`/amistosos/${a.id}/cancelar`,ownerA,'POST',{},409);
 const tableWhere={timeId:{in:[teamA.id,teamB.id]}};const tableBefore=await prisma.tabelaCampeonato.count({where:tableWhere});
 await request(`/jogo/${a.jogo.id}/finalizar`,null,'POST',{golsA:1,golsB:0},200,{'X-Mesa-Token':mesa.mesaToken});
 assert.equal((await prisma.amistoso.findUnique({where:{id:a.id}})).status,'REALIZADO');assert.equal(await prisma.tabelaCampeonato.count({where:tableWhere}),tableBefore);
 await request(`/jogo/${a.jogo.id}/sumula.pdf`,null,'GET',undefined,200,{'X-Mesa-Token':mesa.mesaToken});
 await request(`/amistosos/${a.id}/cancelar`,ownerA,'POST',{},409);
 await request(`/jogo/${a.jogo.id}/stats`,venueOwner,'PUT',{timeId:teamA.id,chutes:8},409);
 await request(`/jogo/${a.jogo.id}/escalacao`,venueOwner,'POST',{timeId:teamA.id,jogadorId:players[1].id},409);
 await request(`/jogo/${a.jogo.id}/evento/ultimo`,venueOwner,'DELETE',undefined,409);
 const direct=await request('/amistosos',venueOwner,'POST',{...base,dataHora:at('14')},201);assert.equal(direct.status,'CONFIRMADO');
 await request(`/amistosos/${direct.id}/cancelar`,venueOwner,'POST',{});
 assert.equal((await prisma.agendamento.findUnique({where:{id:direct.agendamentoId}})).status,'CANCELADO');assert.equal(await prisma.jogo.findUnique({where:{id:direct.jogo.id}}),null);
 const independent=await request('/amistosos',ownerA,'POST',{...base,dataHora:at('16'),societyId:null,campoId:null},201);
 const accepted=await request(`/amistosos/${independent.id}/responder-adversario`,ownerB,'POST',{acao:'ACEITAR'});assert.equal(accepted.status,'CONFIRMADO');assert.equal(accepted.agendamentoId,null);
 await request(`/jogo/${accepted.jogo.id}/mesa/configurar`,ownerA,'POST',{});
 await request(`/jogo/${accepted.jogo.id}/finalizar`,ownerA,'POST',{golsA:0,golsB:0});
 for(const manager of [organizer,publicOrg]) {
   const c=await request('/campeonato',manager,'POST',{nome:`Independent ${manager.id}`,maxTimes:2},201);assert.equal(c.societyId,null);assert.equal(c.organizadorId,manager.id);
   await request('/campeonato',manager,'POST',{nome:'UnauthorizedVenue',maxTimes:2,societyId:society.id},403);
   await request(`/campeonato/${c.id}`,outsider,'PUT',{nome:'Unauthorized'},403);
   const own=await request('/campeonato/organizador/meus',manager);assert(own.some(x=>x.id===c.id));
   for(const team of [teamA,teamB]) {
     await request(`/campeonato/${c.id}/add-time`,manager,'POST',{timeId:team.id},201);
     const inv=await prisma.conviteCampeonatoTime.findUnique({where:{campeonatoId_timeId:{campeonatoId:c.id,timeId:team.id}}});
     await request(`/convites-campeonato/time/${inv.id}/responder`,team.id===teamA.id?ownerA:ownerB,'POST',{acao:'ACEITAR',jogadorIds:[team.id===teamA.id?players[0].id:outsider.id]});
     await request(`/convites-campeonato/time/${inv.id}/responder`,team.id===teamA.id?ownerA:ownerB,'POST',{acao:'RECUSAR'},409);
   }
   await request(`/campeonato/${c.id}/generate-league`,manager,'POST',{});
   await request(`/campeonato/${c.id}`,null);
   const games=await prisma.jogo.findMany({where:{campeonatoId:c.id}});assert(games.length>=2);
   await request(`/jogo/${games[0].id}/mesa/configurar`,manager,'POST',{});
   for(const g of games) await request(`/jogo/${g.id}/finalizar`,manager,'POST',{golsA:2,golsB:0});
   const final=await prisma.jogo.findFirst({where:{campeonatoId:c.id,tipoJogo:'MATA_MATA'}});
   assert(final);await request(`/jogo/${final.id}/finalizar`,manager,'POST',{golsA:1,golsB:1,penaltisA:4,penaltisB:3});
   assert.equal((await prisma.campeonato.findUnique({where:{id:c.id}})).status,'FINALIZADO');
   await request(`/campeonato/${c.id}/ranking`,null);
   await request(`/jogo/${games[0].id}/sumula.pdf`,manager);
 }
 const refused=await request('/amistosos',ownerA,'POST',{...base,dataHora:at('18')},201);
 await request(`/amistosos/${refused.id}/responder-adversario`,ownerB,'POST',{acao:'RECUSAR'});
 await request(`/amistosos/${refused.id}/responder-adversario`,ownerB,'POST',{acao:'ACEITAR'},409);
 const deniedVenue=await request('/amistosos',ownerA,'POST',{...base,dataHora:at('19')},201);
 await request(`/amistosos/${deniedVenue.id}/responder-adversario`,ownerB,'POST',{acao:'ACEITAR'});
 await request(`/amistosos/${deniedVenue.id}/responder-society`,venueOwner,'POST',{acao:'RECUSAR'});
 assert.equal(await prisma.agendamento.count({where:{amistoso:{id:deniedVenue.id}}}),0);
 const racePlayers=[await user('RacePlayerA'),await user('RacePlayerB')];
 const raceTeam=await request('/time',ownerA,'POST',{nome:`Race ${stamp}`,societyId:society.id,donoId:ownerA.id,maxJogadores:1},201);
 await prisma.time.update({where:{id:raceTeam.id},data:{statusVinculo:'APROVADO'}});
 const raceJoins=[];for(const p of racePlayers)raceJoins.push(await request(`/time/${raceTeam.id}/solicitar-entrada`,p,'POST',{},201));
 const raceResponses=await Promise.all(raceJoins.map(j=>fetch(`http://127.0.0.1:${server.address().port}/time/solicitacoes/${j.solicitacao.id}/responder`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${ownerA.token}`},body:JSON.stringify({status:'APROVADA'})})));
 assert.deepEqual(raceResponses.map(r=>r.status).sort(),[200,409]);checks+=2;
 assert.equal(await prisma.usuario.count({where:{timeRelacionadoId:raceTeam.id}}),1);
 const bookingRace=await Promise.all([1,2].map(()=>fetch(`http://127.0.0.1:${server.address().port}/amistosos`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${venueOwner.token}`},body:JSON.stringify({...base,dataHora:at('20'),duracaoMinutos:30})})));
 assert.deepEqual(bookingRace.map(r=>r.status).sort(),[201,409]);checks+=2;
 assert.equal(await prisma.amistoso.count({where:{societyId:society.id,dataHora:new Date(at('20'))}}),1);
 const midnight=await request('/amistosos' ,venueOwner,'POST',{...base,dataHora:at('23'),duracaoMinutos:60},201);assert.equal((await prisma.agendamento.findUnique({where:{id:midnight.agendamentoId}})).horaFim,'00:00');
 assert(await prisma.notificacao.count({where:{usuarioId:players[0].id,titulo:'Você vai jogar este amistoso?'}})>0);
 await cleanupFixtures();
 console.log(`PASS: ${checks} API/database checks (${releaseValidation ? 'production database; isolated fixtures removed' : 'isolated local database; fixtures removed'}).`);
 await prisma.$disconnect();server.close();process.exit(0);
})().catch(async e=>{console.error(e);try{await cleanupFixtures();}catch(cleanupError){console.error('Fixture cleanup failed:',cleanupError);}await prisma.$disconnect();server.close();process.exit(1);});
