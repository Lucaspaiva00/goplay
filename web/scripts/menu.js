if (!window.menuLoaded) {
  window.menuLoaded = true;
  const BASE_URL = "https://goplay-dzlr.onrender.com";
  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
  const isSocioGoPlay = usuarioLogado?.tipo === "SOCIO_GOPLAY" || usuarioLogado?.isSocioGoPlay === true;
  const menu = document.getElementById("menuDynamic");
  if (!usuarioLogado?.id) window.location.href = "login.html";

  const esc = v => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  async function api(url, options={}){const r=await fetch(url,options),t=await r.text().catch(()=>"");let d=null;try{d=t?JSON.parse(t):null}catch{}if(!r.ok)throw new Error(d?.error||t||`HTTP ${r.status}`);return d;}
  function localEmpresa(){const id=Number(localStorage.getItem("societyId")||0),nome=localStorage.getItem("societyContextName")||"";return id?{id,nome}:null;}
  function saveEmpresa(e){if(!e?.id){localStorage.removeItem("societyId");localStorage.removeItem("societyContextName");return;}localStorage.setItem("societyId",String(e.id));localStorage.setItem("societyContextName",e.nome||"Empresa");}
  window.getEmpresaSelecionada=localEmpresa;
  window.exigirEmpresaSelecionada=function(){const e=localEmpresa();if(e)return e;alert("Selecione uma empresa primeiro.");return null;};
  window.navegarComEmpresa=function(p){if(window.exigirEmpresaSelecionada())location.href=p;};
  window.abrirMinhaEmpresaMenu=function(){const e=window.exigirEmpresaSelecionada();if(e)location.href=`society-detalhe.html?societyId=${e.id}`;};
  window.sairSistema=function(){["usuarioLogado","funcionarioLogado","authToken","societyId","societyContextName","societyOwnerId"].forEach(k=>localStorage.removeItem(k));location.href="login.html";};

  const section=t=>`<li class="menu-section-label">${esc(t)}</li>`;
  const item=(i,t,a)=>`<li onclick="${a}"><i class="fa ${i}"></i><span>${esc(t)}</span></li>`;
  let html=item("fa-house","Início",usuarioLogado.tipo==="FUNCIONARIO"?"location.href='operacao.html'":"location.href='home.html'");

  if(usuarioLogado.tipo==="DONO_SOCIETY"){
    html+=section("OPERAÇÃO")+item("fa-gauge-high","Operação de Hoje","navegarComEmpresa('operacao.html')")+item("fa-calendar","Agenda","navegarComEmpresa('horarios.html')")+item("fa-rotate","Horários Fixos","navegarComEmpresa('horarios-fixos-empresa.html')")+item("fa-cash-register","Caixa & Bar","navegarComEmpresa('caixa-bar.html')");
    html+=section("ESPORTES")+item("fa-trophy","Campeonatos","navegarComEmpresa('campeonatos.html')")+item("fa-handshake","Amistosos","location.href='amistosos.html'")+item("fa-users","Times","navegarComEmpresa('times.html')");
    html+=section("FINANCEIRO")+item("fa-credit-card","Recebimentos","navegarComEmpresa('recebimentos.html')")+item("fa-chart-line","Visão Gerencial","navegarComEmpresa('society-dashboard.html')");
    html+=section("EMPRESA")+item("fa-user-shield","Funcionários","navegarComEmpresa('funcionarios.html')")+item("fa-building","Minha Empresa","abrirMinhaEmpresaMenu()")+item("fa-futbol","Quadras","navegarComEmpresa('campos.html')")+item("fa-utensils","Cardápio","navegarComEmpresa('cardapio.html')")+item("fa-plus","Cadastrar Empresa","location.href='society-create.html'");
  }
  if(usuarioLogado.tipo==="FUNCIONARIO"){
    const f=usuarioLogado.funcao;
    html+=section("OPERAÇÃO");
    if(["ADMIN","CAIXA","BAR","RECEPCAO","MESARIO"].includes(f)) html+=item("fa-gauge-high","Operação de Hoje","location.href='operacao.html'");
    if(["ADMIN","CAIXA","RECEPCAO"].includes(f)) html+=item("fa-calendar","Agenda","location.href='horarios.html'")+item("fa-rotate","Horários Fixos","location.href='horarios-fixos-empresa.html'");
    if(["ADMIN","CAIXA","BAR","RECEPCAO"].includes(f)) html+=item("fa-cash-register",f==="BAR"?"Bar / Comandas":"Caixa & Comandas","location.href='caixa-bar.html'");
    if(["ADMIN","CAIXA"].includes(f)) html+=item("fa-credit-card","Recebimentos","location.href='recebimentos.html'");
    if(["ADMIN","MESARIO"].includes(f)) html+=section("ESPORTES")+item("fa-trophy","Campeonatos","location.href='campeonatos.html'")+item("fa-handshake","Amistosos","location.href='amistosos.html'");
    if(f==="ADMIN") html+=section("EMPRESA")+item("fa-user-shield","Funcionários","location.href='funcionarios.html'")+item("fa-futbol","Quadras","location.href='campos.html'")+item("fa-utensils","Cardápio","location.href='cardapio.html'");
  }
  if(["DONO_TIME","PLAYER"].includes(usuarioLogado.tipo)){
    const owner=usuarioLogado.tipo==="DONO_TIME";
    html+=section("MINHA CONTA")
      +item("fa-receipt","Minha comanda","location.href='comanda.html'")
      +item("fa-money-bill","Meus pagamentos","location.href='meus-pagamentos.html'");
    html+=section("COMUNIDADE")
      +item("fa-user-group","Encontrar jogadores","location.href='jogadores-comunidade.html'")
      +item("fa-building","Perfil da Society","abrirMinhaEmpresaMenu()")
      +item("fa-play","Assistir partidas","location.href='acompanhar.html'")
      +item("fa-trophy","Campeonatos","location.href='campeonatos-view.html'")
      +item("fa-building","Explorar Societies","location.href='societies.html'");
    html+=section("MEU FUTEBOL")
      +item("fa-user","Meu perfil público",`location.href='jogador-perfil.html?usuarioId=${Number(usuarioLogado.id)}'`)
      +item("fa-shield-halved",owner?"Meus times":"Meu time",owner?"location.href='times.html'":"location.href='meu-time.html'")
      +item("fa-thumbs-up",owner?"Jogos do time":"Confirmar presença","location.href='meus-horarios.html'")
      +item("fa-handshake",owner?"Marcar / gerenciar amistosos":"Meus amistosos","location.href='amistosos.html'")
      +item("fa-envelope-open-text","Convites de campeonato","location.href='convites-campeonato.html'");
    if(owner)html+=item("fa-plus","Criar time","location.href='times.html#blocoCriacaoTime'");
    html+=section("RESERVAS E SERVIÇOS")
      +item("fa-futbol",owner?"Reservar quadra":"Ver quadras","navegarComEmpresa('campos-view.html')")
      +item("fa-users","Encontrar times",owner?"navegarComEmpresa('times.html?view=empresa')":"navegarComEmpresa('times.html')")
      +item("fa-list",owner?"Minhas reservas":"Agenda do time","location.href='meus-agendamentos.html'");
    if(!document.getElementById('communityStyles')){const css=document.createElement('link');css.id='communityStyles';css.rel='stylesheet';css.href='../css/comunidade.css?v=20261009-conta';document.head.appendChild(css);}
    const nav=document.createElement('nav');nav.className='sport-bottom-nav';nav.setAttribute('aria-label','Navegação principal');
    nav.innerHTML=`<a href="home.html"><i class="fa fa-house"></i>Feed</a><a href="acompanhar.html"><i class="fa fa-play"></i>Partidas</a><a href="meus-horarios.html"><i class="fa fa-calendar-check"></i>Meus jogos</a><a href="${owner?'times.html':'meu-time.html'}"><i class="fa fa-shield-halved"></i>Meu time</a>`;
    for(const a of nav.querySelectorAll('a'))if(a.getAttribute('href').split('?')[0]===location.pathname.split('/').pop())a.setAttribute('aria-current','page');
    document.body.appendChild(nav);document.body.classList.add('sport-experience');
  }
  if(["ORGANIZADOR_COMPETICAO","ORGAO_PUBLICO"].includes(usuarioLogado.tipo)){
    html+=section("COMPETIÇÕES")
      +item("fa-trophy","Campeonatos","location.href='campeonatos.html'")
      +item("fa-user","Perfil","location.href='perfil.html'");
  }
  if(isSocioGoPlay){
    html+=section("GOPLAY")
      +item("fa-chart-pie","Painel dos Sócios","location.href='plataforma-admin.html'")
      +item("fa-handshake","Todos os Amistosos","location.href='amistosos.html'");
  }
  html+=section("CONTA");
  if(usuarioLogado.tipo!=="FUNCIONARIO") html+=item("fa-user","Perfil","location.href='perfil.html'");
  html+=`<li id="btnSairMenu"><i class="fa fa-sign-out-alt"></i><span>Sair</span></li>`;
  if(menu)menu.innerHTML=html;document.getElementById("btnSairMenu")?.addEventListener("click",window.sairSistema);

  function installStyles(){if(document.getElementById("goplayContextStyles"))return;const st=document.createElement("style");st.id="goplayContextStyles";st.textContent=`.empresa-context-box{margin:0 14px 14px;padding:12px;border:1px solid rgba(255,255,255,.16);border-radius:14px;background:rgba(255,255,255,.07)}.empresa-context-box label{display:block;color:#b9c9d8;font-size:10px;font-weight:900;letter-spacing:.08em;margin:0 0 7px;text-transform:uppercase}.empresa-context-box select{width:100%;padding:9px 10px;border:1px solid rgba(255,255,255,.18);border-radius:10px;background:#fff;color:#052845;font-size:13px;font-weight:700}.empresa-context-hint{color:#d8e3ec;font-size:11px;line-height:1.35;margin-top:7px}.menu-section-label{padding:15px 22px 5px!important;color:#7fa0b9!important;font-size:10px!important;font-weight:900!important;letter-spacing:.12em!important;cursor:default!important}.menu-section-label:hover{background:transparent!important}.topbar-empresa-chip{margin-left:auto;max-width:260px;padding:7px 11px;border-radius:999px;background:#eef6fb;color:#052845;font-size:12px;font-weight:800}.notif-btn{position:relative;border:0;background:#eef6fb;color:#052845;border-radius:999px;width:38px;height:38px;margin-left:8px;cursor:pointer}.notif-count{position:absolute;right:-3px;top:-4px;background:#d33;color:#fff;font-size:10px;border-radius:999px;min-width:17px;height:17px;display:grid;place-items:center}.notif-panel{position:fixed;right:18px;top:68px;width:min(380px,calc(100vw - 28px));max-height:480px;overflow:auto;background:#fff;border:1px solid #dfe7ee;border-radius:15px;box-shadow:0 18px 50px rgba(5,40,69,.22);z-index:9999;padding:12px}.notif-row{padding:11px;border-bottom:1px solid #edf1f4;cursor:pointer}.notif-row.unread{background:#f2f9fd}.notif-row strong{display:block;color:#052845}.notif-row small{color:#71808b}.notif-head{display:flex;justify-content:space-between;align-items:center;padding:5px}.notif-head-actions{display:flex;align-items:center;gap:8px}.notif-head button{border:0;background:none;color:#0b678f;font-weight:800;cursor:pointer}.notif-close{width:30px;height:30px;border-radius:999px!important;background:#eef3f6!important;color:#052845!important;font-size:17px!important}@media(max-width:640px){.topbar-empresa-chip{max-width:120px;font-size:10px}}`;document.head.appendChild(st);}
  function renderContext(list,selected){installStyles();const sidebar=document.getElementById("sidebar");if(!sidebar||!menu)return;let box=document.getElementById("empresaContextBox");if(!box){box=document.createElement("div");box.id="empresaContextBox";box.className="empresa-context-box";sidebar.insertBefore(box,menu);}const locked=usuarioLogado.tipo==="FUNCIONARIO";const hint=locked?'Seu acesso está vinculado a esta empresa.':usuarioLogado.tipo==="DONO_SOCIETY"?'Agenda, caixa e gestão usam a empresa selecionada aqui.':(usuarioLogado.tipo==='PLAYER'?'Escolha sua comunidade para consultar times, quadras e comanda.':'Quadras, times, comanda e reservas usam a empresa selecionada aqui.');box.innerHTML=`<label><i class="fa fa-location-dot"></i> Empresa atual</label><select id="empresaContextSelect" ${locked?'disabled':''}><option value="">Selecione</option>${list.map(e=>`<option value="${e.id}" ${Number(e.id)===Number(selected?.id)?'selected':''}>${esc(e.nome)}</option>`).join('')}</select><div class="empresa-context-hint">${hint}</div>`;document.getElementById("empresaContextSelect")?.addEventListener("change",ev=>{if(locked)return;const e=list.find(x=>Number(x.id)===Number(ev.target.value));saveEmpresa(e||null);location.reload();});const top=document.querySelector(".topbar");if(top){let chip=document.getElementById("topbarEmpresaChip");if(!chip){chip=document.createElement("div");chip.id="topbarEmpresaChip";chip.className="topbar-empresa-chip";top.appendChild(chip);}chip.textContent=selected?`📍 ${selected.nome}`:"📍 Selecione a empresa";}}
  async function context(){if(["ORGANIZADOR_COMPETICAO","ORGAO_PUBLICO"].includes(usuarioLogado.tipo)){window.GOPLAY_EMPRESAS=[];window.GOPLAY_EMPRESA_ATUAL=null;return{empresas:[],empresa:null};}try{let list=[];if(usuarioLogado.tipo==="FUNCIONARIO"){const e=await api(`${BASE_URL}/society/${usuarioLogado.societyId}`);list=e?[e]:[];}else if(usuarioLogado.tipo==="DONO_SOCIETY")list=await api(`${BASE_URL}/society/owner/${usuarioLogado.id}`);else list=await api(`${BASE_URL}/society`);if(!Array.isArray(list))list=[];let id=Number(localStorage.getItem("societyId")||0);if(usuarioLogado.tipo==="FUNCIONARIO")id=Number(usuarioLogado.societyId);let selected=list.find(e=>Number(e.id)===id)||null;if(!selected&&usuarioLogado.tipo==="DONO_SOCIETY"&&list.length===1)selected=list[0];if(selected)saveEmpresa(selected);renderContext(list,selected);window.GOPLAY_EMPRESAS=list;window.GOPLAY_EMPRESA_ATUAL=selected;return{empresas:list,empresa:selected};}catch(e){console.error(e);renderContext([],null);return{empresas:[],empresa:null,error:e};}}
  window.GoPlayEmpresaContextReady=context();

  async function notifications(){if(!localStorage.getItem("authToken"))return;installStyles();const top=document.querySelector(".topbar");if(!top)return;let btn=document.getElementById("notifBtn");if(!btn){btn=document.createElement("button");btn.id="notifBtn";btn.className="notif-btn";btn.innerHTML='<i class="fa fa-bell"></i><span id="notifCount" class="notif-count" style="display:none">0</span>';top.appendChild(btn);}async function load(){try{const d=await api(`${BASE_URL}/notificacoes`);const c=document.getElementById("notifCount");c.textContent=d.naoLidas||0;c.style.display=d.naoLidas?'grid':'none';window.__notifData=d;}catch(e){console.error(e);}}btn.onclick=async()=>{document.getElementById("notifPanel")?.remove();await load();const d=window.__notifData||{itens:[]};const p=document.createElement("div");p.id="notifPanel";p.className="notif-panel";p.innerHTML=`<div class="notif-head"><strong>Notificações</strong><div class="notif-head-actions"><button id="markAllNotif">Marcar todas como lidas</button><button id="closeNotif" class="notif-close" aria-label="Fechar">×</button></div></div>${d.itens.length?d.itens.map(n=>`<div class="notif-row ${n.lido?'':'unread'}" data-id="${n.id}" data-url="${esc(n.url||'')}"><strong>${esc(n.titulo)}</strong><div>${esc(n.mensagem)}</div><small>${new Date(n.createdAt).toLocaleString('pt-BR')}${n.url?' • abrir':''}</small></div>`).join(''):'<div class="notif-row">Nenhuma notificação.</div>'}`;document.body.appendChild(p);p.querySelectorAll('[data-id]').forEach(r=>r.onclick=async()=>{await api(`${BASE_URL}/notificacoes/${r.dataset.id}/lida`,{method:'POST'});r.classList.remove('unread');load();const u=r.dataset.url;if(u)location.href=u;});p.querySelector('#markAllNotif').onclick=async()=>{await api(`${BASE_URL}/notificacoes/lidas/todas`,{method:'POST'});p.remove();load();};p.querySelector('#closeNotif').onclick=()=>p.remove();};await load();const timer=setInterval(load,15000);window.addEventListener('beforeunload',()=>clearInterval(timer),{once:true});}
  notifications();
}
