const BASE_URL = "https://goplay-dzlr.onrender.com";
const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
const homeContent = document.getElementById("homeContent");
if (!usuarioLogado?.id) window.location.href = "login.html";

const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
function getEmpresaAtual(){const id=Number(localStorage.getItem("societyId")||0),nome=localStorage.getItem("societyContextName")||"";return id?{id,nome}:null;}
function money(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
async function api(url,opt={}){const r=await fetch(url,opt),t=await r.text().catch(()=>"");let d=null;try{d=t?JSON.parse(t):null}catch{}if(!r.ok)throw new Error(d?.error||t||`HTTP ${r.status}`);return d;}
function dateKey(v){const m=String(v||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}`:"";}
function dateBR(v){const k=dateKey(v);if(!k)return "—";const [y,m,d]=k.split("-");return `${d}/${m}/${y}`;}
function todayKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function currentMonth(){return todayKey().slice(0,7);}
function resposta(a){return (a.presencas||[]).find(p=>Number(p.usuarioId)===Number(usuarioLogado.id))?.status||"PENDENTE";}

async function votarHome(id,status,btn){
  try{
    if(btn){btn.disabled=true;btn.textContent="Salvando...";}
    await api(`${BASE_URL}/encontros-horario/${id}/presenca`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});
    await carregarHomeEsportiva();
  }catch(e){alert(e.message);}
}
window.votarHome=votarHome;

function cardJogo(a){
  const st=resposta(a);
  const podeResponder=usuarioLogado.tipo==="PLAYER"||(a.presencas||[]).some(p=>Number(p.usuarioId)===Number(usuarioLogado.id));
  return `<article class="home-game-card">
    <div class="home-game-date"><strong>${dateBR(a.data)}</strong><span>${esc(a.horaInicio)}–${esc(a.horaFim)}</span></div>
    <div class="home-game-body"><strong>${esc(a.grupoHorario?.nome||a.time?.nome||"Jogo")}</strong><small>${esc(a.campo?.nome||"Quadra")} • ${esc(a.society?.nome||"")}</small></div>
    <div class="home-presence-actions">
      ${podeResponder?`<button class="home-vote yes ${st==="VOU"?"active":""}" onclick="votarHome(${a.id},'VOU',this)">👍 Vou</button>
      <button class="home-vote no ${st==="NAO_VOU"?"active":""}" onclick="votarHome(${a.id},'NAO_VOU',this)">👎 Não vou</button>`:`<a class="home-game-watch" href="confirmar-presenca.html?agendamentoId=${a.id}">Ver presenças</a>`}
    </div>
    <button class="home-game-more" onclick="location.href='confirmar-presenca.html?agendamentoId=${a.id}'" aria-label="Abrir detalhes">›</button>
  </article>`;
}
async function jogosDoTime(timeId){
  const rows=await api(`${BASE_URL}/agendamentos/time/${timeId}`);
  const hoje=todayKey();
  const futuros=(rows||[]).filter(a=>a.status!=="CANCELADO"&&dateKey(a.data)>=hoje);
  const mes=futuros.filter(a=>dateKey(a.data).slice(0,7)===currentMonth());
  return (mes.length?mes:futuros.slice(0,6)).sort((a,b)=>dateKey(a.data).localeCompare(dateKey(b.data))||String(a.horaInicio).localeCompare(String(b.horaInicio)));
}

async function votarAmistosoHome(id,status,btn){
  try{
    if(btn){btn.disabled=true;btn.textContent="Salvando...";}
    await api(`${BASE_URL}/amistosos/${id}/presenca`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});
    await carregarHomeEsportiva();
  }catch(e){alert(e.message);}
}
window.votarAmistosoHome=votarAmistosoHome;

function cardAmistoso(a){
  const p=(a.presencas||[]).find(x=>Number(x.usuarioId)===Number(usuarioLogado.id));
  const player=["PLAYER","DONO_TIME"].includes(usuarioLogado.tipo);
  const active=["AO_VIVO","PAUSADA","INTERVALO"].includes(a.jogo?.statusOperacao);
  return `<article class="home-game-card">
    <div class="home-game-date"><strong>${new Date(a.dataHora).toLocaleDateString("pt-BR")}</strong><span>${new Date(a.dataHora).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span></div>
    <div class="home-game-body"><strong>🤝 ${esc(a.timeA?.nome)} × ${esc(a.timeB?.nome)}</strong><small>${esc(a.society?.nome||"Local a definir")}${a.campo?.nome?` • ${esc(a.campo.nome)}`:""}</small></div>
    <div class="home-presence-actions">
      ${player&&p&&a.status==="CONFIRMADO"?`<button class="home-vote yes ${p.status==="VOU"?"active":""}" onclick="votarAmistosoHome(${a.id},'VOU',this)">👍 Vou</button><button class="home-vote no ${p.status==="NAO_VOU"?"active":""}" onclick="votarAmistosoHome(${a.id},'NAO_VOU',this)">👎 Não vou</button>`:`<span class="chip">${a.status==="CONFIRMADO"?"Confirmado":a.status.replaceAll("_"," ")}</span>`}
    </div>
    ${a.jogo?.id?`<a class="home-game-watch" href="jogo-detalhe.html?jogoId=${a.jogo.id}">${active?'🔴 Assistir ao vivo':'▶ Acompanhar'}</a>`:''}
    <button class="home-game-more" onclick="location.href='amistosos.html?amistosoId=${a.id}'" aria-label="Abrir amistoso">›</button>
  </article>`;
}

async function amistososDoUsuario(timeId=null){
  const list=await api(`${BASE_URL}/amistosos/meus`).catch(()=>[]);
  const now=Date.now();
  return (list||[]).filter(a=>{
    if(!["CONFIRMADO","PENDENTE_ADVERSARIO","PENDENTE_SOCIETY"].includes(a.status))return false;
    if(new Date(a.dataHora).getTime()<now&&!(["AO_VIVO","PAUSADA","INTERVALO"].includes(a.jogo?.statusOperacao)&&!a.jogo.finalizado))return false;
    if(timeId&&![Number(a.timeAId),Number(a.timeBId)].includes(Number(timeId))&&!(a.presencas||[]).some(p=>Number(p.usuarioId)===Number(usuarioLogado.id)))return false;
    return true;
  }).sort((a,b)=>new Date(a.dataHora)-new Date(b.dataHora)).slice(0,6);
}

async function renderDonoTime(){
  const times=await api(`${BASE_URL}/time/dono/${usuarioLogado.id}`);
  if(!times.length)return guestMatchesHtml(await amistososDoUsuario())+`<section class="action-card"><h3>Seu primeiro time</h3><p>Crie um time para começar a organizar jogos e reservas.</p><button class="btn green" onclick="location.href='times.html#blocoCriacaoTime'">Criar time</button></section>`;
  let selected=Number(localStorage.getItem("homeTimeId")||0);
  if(!times.some(t=>Number(t.id)===selected))selected=Number(times[0].id);
  localStorage.setItem("homeTimeId",String(selected));
  const time=times.find(t=>Number(t.id)===selected);
  const [jogos,amistosos]=await Promise.all([jogosDoTime(selected),amistososDoUsuario(selected)]);
  const selector=times.length>1?`<select id="homeTimeSelect" class="home-team-select">${times.map(t=>`<option value="${t.id}" ${Number(t.id)===selected?"selected":""}>${esc(t.nome)}</option>`).join("")}</select>`:`<strong class="home-team-name">⚽ ${esc(time.nome)}</strong>`;
  return `<section class="home-team-head"><div><span class="home-eyebrow">MEU TIME</span>${selector}</div><button class="home-link-btn" onclick="location.href='times.html'">Gerenciar</button></section>
  <section class="action-card home-games-section"><div class="home-section-head"><div><h3>Próximos jogos</h3><p>Acompanhe a agenda e as confirmações do elenco.</p></div><button class="home-link-btn" onclick="location.href='meus-horarios.html'">Organizar jogos</button></div>
    <div class="home-games-strip">${jogos.length?jogos.map(cardJogo).join(""):'<div class="home-empty">Nenhum próximo jogo marcado para este time.</div>'}</div>
  </section>
  <section class="action-card home-games-section"><div class="home-section-head"><div><h3>Amistosos</h3><p>Convites e próximos amistosos deste time.</p></div><button class="home-link-btn" onclick="location.href='amistosos.html'">Gerenciar</button></div>
    <div class="home-games-strip">${amistosos.length?amistosos.map(cardAmistoso).join(""):'<div class="home-empty">Nenhum amistoso próximo.</div>'}</div>
  </section>
  <details class="sport-services"><summary>Reservas e serviços <span>Quadras, comanda e gestão</span></summary><section class="home-quick-grid">
    <button onclick="location.href='campos-view.html'"><i class="fa fa-futbol"></i><span>Reservar quadra</span></button>
    <button onclick="location.href='meus-agendamentos.html'"><i class="fa fa-calendar-check"></i><span>Minhas reservas</span></button>
    <button onclick="location.href='comanda.html'"><i class="fa fa-receipt"></i><span>Comanda</span></button>
    <button onclick="location.href='campeonatos-view.html'"><i class="fa fa-trophy"></i><span>Campeonatos</span></button>
  </section></details>`;
}
function guestMatchesHtml(matches){return matches.length?`<section class="action-card home-games-section"><h3>Você foi convidado para jogar</h3><p>Responda sua presença mesmo sem fazer parte de um time.</p><div class="home-games-strip">${matches.map(cardAmistoso).join("")}</div></section>`:"";}
async function renderPlayer(){
  let time=null;try{const data=await api(`${BASE_URL}/time/details/by-player/${usuarioLogado.id}`);time=data.time??(data.id?data:null);}catch{}
  const amistosos=await amistososDoUsuario();
  if(!time?.id)return guestMatchesHtml(amistosos)+`<section class="action-card"><h3>Encontre seu time</h3><p>Escolha uma empresa e solicite entrada em um time. Depois da aprovação, seus jogos aparecem aqui.</p><button class="btn green" onclick="location.href='times.html'">Ver times</button></section>`;
  const jogos=await jogosDoTime(time.id);
  return `<section class="home-team-head"><div><span class="home-eyebrow">MEU TIME</span><strong class="home-team-name">⚽ ${esc(time.nome)}</strong></div></section>
  <section class="action-card home-games-section"><div class="home-section-head"><div><h3>Seus próximos jogos</h3><p>É só responder se você vai ou não.</p></div></div>
    <div class="home-games-strip">${jogos.length?jogos.map(cardJogo).join(""):'<div class="home-empty">Nenhum próximo jogo marcado.</div>'}</div>
  </section>
  <section class="action-card home-games-section"><div class="home-section-head"><div><h3>Seus amistosos</h3><p>Confirme sua presença aqui mesmo.</p></div><button class="home-link-btn" onclick="location.href='amistosos.html'">Ver todos</button></div>
    <div class="home-games-strip">${amistosos.length?amistosos.map(cardAmistoso).join(""):'<div class="home-empty">Nenhum amistoso confirmado.</div>'}</div>
  </section>
  <details class="sport-services"><summary>Reservas e serviços <span>Quadras, comanda e gestão</span></summary><section class="home-quick-grid">
    <button onclick="location.href='comanda.html'"><i class="fa fa-receipt"></i><span>Minha comanda</span></button>
    <button onclick="location.href='times.html'"><i class="fa fa-users"></i><span>Times da empresa</span></button>
    <button onclick="location.href='campeonatos-view.html'"><i class="fa fa-trophy"></i><span>Campeonatos</span></button>
    <button onclick="location.href='societies.html'"><i class="fa fa-building"></i><span>Empresas</span></button>
  </section></details>`;
}
async function carregarHomeEsportiva(){
  const box=document.getElementById("homeEsportiva");if(!box)return;
  try{
    box.innerHTML='<div class="home-loading">Carregando seus jogos...</div>';
    box.innerHTML=usuarioLogado.tipo==="DONO_TIME"?await renderDonoTime():await renderPlayer();
    document.getElementById("homeTimeSelect")?.addEventListener("change",e=>{localStorage.setItem("homeTimeId",e.target.value);carregarHomeEsportiva();});
  }catch(e){console.error(e);box.innerHTML='<div class="home-empty">Não foi possível carregar seus jogos agora.</div>';}
}
async function renderHome(){
  if(window.GoPlayEmpresaContextReady)await window.GoPlayEmpresaContextReady;
  const empresa=getEmpresaAtual();
  const esportivo=["PLAYER","DONO_TIME"].includes(usuarioLogado.tipo);
  if(esportivo)document.body.classList.add("sport-home");
  let html=`<section class="welcome-card"><h2>👋 Bem-vindo, ${esc(usuarioLogado.nome||"usuário")}!</h2><p>${empresa?`Empresa atual: <strong>${esc(empresa.nome||"Selecionada")}</strong>`:"Selecione uma empresa quando quiser usar uma estrutura."}</p></section>`;
  if(esportivo){
    const owner=usuarioLogado.tipo==="DONO_TIME";
    html=`<section class="sport-profile-hero"><div class="sport-profile-avatar">${esc((usuarioLogado.nome||'G').slice(0,2).toUpperCase())}</div><div><span class="sport-eyebrow">BEM-VINDO À SUA COMUNIDADE</span><h1>Bom jogo, ${esc((usuarioLogado.nome||'Jogador').split(' ')[0])}!</h1><p>Sua galera, seus jogos e o futebol acontecendo agora.</p></div><a href="jogador-perfil.html?usuarioId=${usuarioLogado.id}" aria-label="Abrir meu perfil público"><i class="fa fa-user"></i></a></section>
    <nav class="sport-finance-shortcuts" aria-label="Comanda e pagamentos"><a href="comanda.html"><span class="sport-finance-icon"><i class="fa fa-receipt"></i></span><span><strong>Minha comanda</strong><small>Consumos e conta da sua visita</small></span><span aria-hidden="true">↗</span></a><a href="meus-pagamentos.html"><span class="sport-finance-icon"><i class="fa fa-wallet"></i></span><span><strong>Meus pagamentos</strong><small>Consulte valores e pendências</small></span><span aria-hidden="true">↗</span></a></nav>
    <nav class="social-discovery" aria-label="Perfis da comunidade"><a href="${empresa?'society-detalhe.html?societyId='+empresa.id:'societies.html'}"><i class="fa fa-building"></i><span><strong>${empresa?esc(empresa.nome||'Society selecionada'):'Explorar Societies'}</strong><small>Abrir o perfil da comunidade →</small></span></a><a href="jogadores-comunidade.html"><i class="fa fa-user-group"></i><span><strong>Encontrar jogadores</strong><small>Ver perfis e seguir sua galera →</small></span></a><a href="jogador-perfil.html?usuarioId=${usuarioLogado.id}"><i class="fa fa-user"></i><span><strong>Meu perfil público</strong><small>Seguidores e quem você segue →</small></span></a></nav>
    <nav class="sport-shortcuts" aria-label="Ações rápidas"><a href="acompanhar.html"><i class="fa fa-play"></i> Assistir partidas</a><a href="meus-horarios.html"><i class="fa fa-thumbs-up"></i> Confirmar presença</a><a href="${owner?'amistosos.html':'meu-time.html'}"><i class="fa ${owner?'fa-handshake':'fa-shield-halved'}"></i> ${owner?'Marcar amistoso':'Meu time'}</a>${owner?'<a href="times.html#blocoCriacaoTime"><i class="fa fa-plus"></i> Criar time</a>':''}</nav>
    <div class="sport-home-layout"><div><div id="homeComunidade"></div></div><aside class="sport-personal"><div class="sport-section-head"><div><span class="sport-eyebrow">SEU VESTIÁRIO</span><h2>Minha agenda</h2><p>Presenças, convites e seu time.</p></div></div><div id="homeEsportiva"></div></aside></div>`;
  }
  if(["ORGANIZADOR_COMPETICAO","ORGAO_PUBLICO"].includes(usuarioLogado.tipo)){
    html+=`<section class="action-card"><h3>Gestão de Competições</h3><p>Seu perfil pode criar e administrar competições sem possuir uma Society.</p><button class="btn green" onclick="location.href='campeonato-create.html'"><i class="fa fa-plus"></i> Criar campeonato</button><button class="btn navy" onclick="location.href='campeonatos.html'"><i class="fa fa-trophy"></i> Meus campeonatos</button></section>`;
  }
  if(usuarioLogado?.isSocioGoPlay===true||usuarioLogado.tipo==="SOCIO_GOPLAY"){
    html+=`<section class="action-card"><h3>Painel GoPlay</h3><p>Visão gerencial da plataforma para os sócios.</p><button class="btn green" onclick="location.href='plataforma-admin.html'"><i class="fa fa-chart-pie"></i> Abrir Painel dos Sócios</button></section>`;
  }
  if(usuarioLogado.tipo==="DONO_SOCIETY"){
    if(!empresa)html+=`<section class="action-card"><h3>Selecione a empresa que deseja administrar</h3><p>Use o seletor “Empresa atual” no menu.</p><button class="btn green" onclick="location.href='society-create.html'">Cadastrar Empresa</button></section>`;
    else html+=`<section class="action-card"><h3>Painel — ${esc(empresa.nome||"Empresa")}</h3>
      <div class="dashboard-grid">
        <button class="dashboard-card dashboard-card-link" onclick="location.href='times.html'"><span class="dashboard-label">Times</span><strong id="totalTimes">—</strong><small>Ver times →</small></button>
        <button class="dashboard-card dashboard-card-link" onclick="location.href='horarios.html'"><span class="dashboard-label">Reservas</span><strong id="totalAgendamentos">—</strong><small>Ver agenda →</small></button>
        <button class="dashboard-card dashboard-card-link" onclick="location.href='recebimentos.html?status=PAGO'"><span class="dashboard-label">Recebido</span><strong id="valorPago">—</strong><small>Ver recebimentos →</small></button>
        <button class="dashboard-card dashboard-card-link" onclick="location.href='recebimentos.html?status=PENDENTE'"><span class="dashboard-label">Pendente</span><strong id="valorPendente">—</strong><small>Resolver →</small></button>
      </div>
      <button class="btn green" onclick="location.href='society-dashboard.html'"><i class="fa fa-chart-line"></i> Visão Gerencial</button>
      <button class="btn navy" onclick="location.href='horarios.html'"><i class="fa fa-calendar"></i> Agenda</button>
      <button class="btn navy" onclick="location.href='caixa-bar.html'"><i class="fa fa-cash-register"></i> Caixa & Bar</button>
      <button class="btn navy" onclick="location.href='campeonatos.html'"><i class="fa fa-trophy"></i> Campeonatos</button>
    </section>`;
  }
  homeContent.innerHTML=html;
  if(esportivo){window.GoPlayPartidas?.mount(document.getElementById("homeComunidade"),{compact:true,take:12});await carregarHomeEsportiva();}
  if(usuarioLogado.tipo==="DONO_SOCIETY"&&empresa)await carregarResumo(empresa.id);
}
async function carregarResumo(societyId){
  try{
    const [times,agendamentos,pagamentos]=await Promise.all([api(`${BASE_URL}/time/society/${societyId}`),api(`${BASE_URL}/agendamentos/society/${societyId}`),api(`${BASE_URL}/pagamentos/society/${societyId}`)]);
    document.getElementById("totalTimes").textContent=Array.isArray(times)?times.length:0;
    document.getElementById("totalAgendamentos").textContent=Array.isArray(agendamentos)?agendamentos.filter(a=>a.status!=="CANCELADO").length:0;
    const pago=Array.isArray(pagamentos)?pagamentos.filter(p=>p.status==="PAGO").reduce((s,p)=>s+Number(p.valor||0),0):0;
    const pend=Array.isArray(pagamentos)?pagamentos.filter(p=>p.status==="PENDENTE").reduce((s,p)=>s+Number(p.valor||0),0):0;
    document.getElementById("valorPago").textContent=money(pago);document.getElementById("valorPendente").textContent=money(pend);
  }catch(e){console.error(e);}
}
document.addEventListener("DOMContentLoaded",renderHome);
