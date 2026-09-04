const BASE_URL = "https://goplay-dzlr.onrender.com";
const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
const homeContent = document.getElementById("homeContent");
if (!usuarioLogado?.id) window.location.href = "login.html";

function getEmpresaAtual(){
  const id=Number(localStorage.getItem("societyId")||0);
  const nome=localStorage.getItem("societyContextName")||"";
  return id?{id,nome}:null;
}
function money(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}

async function renderHome(){
  if(window.GoPlayEmpresaContextReady) await window.GoPlayEmpresaContextReady;
  const empresa=getEmpresaAtual();
  let html=`
    <section class="welcome-card">
      <h2>👋 Bem-vindo, ${usuarioLogado.nome || "usuário"}!</h2>
      <p>${empresa?`Empresa atual: <strong>${empresa.nome||"Selecionada"}</strong>`:"Escolha uma empresa no menu quando uma ação depender de localização."}</p>
    </section>`;

  if(usuarioLogado.tipo==="PLAYER"){
    html+=`<section id="proximoHorarioHome"></section><section class="action-card"><h3>O que deseja fazer?</h3>
      ${empresa?`<div style="padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:16px"><strong>📍 ${empresa.nome||"Empresa selecionada"}</strong><br><small>Comandas e cardápio usarão este estabelecimento.</small></div>`:""}
      <button class="btn green" onclick="location.href='societies.html'"><i class="fa fa-building"></i> Explorar Empresas</button>
      <button class="btn navy" onclick="location.href='comanda.html'"><i class="fa fa-receipt"></i> Minha Comanda</button>
      <button class="btn navy" onclick="location.href='meus-horarios.html'"><i class="fa fa-thumbs-up"></i> Meus Horários</button>
      <button class="btn navy" onclick="location.href='meu-time.html'"><i class="fa fa-futbol"></i> Meu Time</button>
      <button class="btn navy" onclick="location.href='campeonatos-view.html'"><i class="fa fa-trophy"></i> Campeonatos</button>
    </section>`;
  }

  if(usuarioLogado.tipo==="DONO_TIME"){
    html+=`<section id="proximoHorarioHome"></section><section class="action-card"><h3>Jogar e organizar</h3>
      ${empresa?`<div style="padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:16px"><strong>📍 ${empresa.nome||"Empresa selecionada"}</strong><br><small>Você pode trocar de empresa no seletor do menu.</small></div>`:`<div style="padding:12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;margin-bottom:16px">Selecione onde deseja jogar pelo menu ou em Explorar Empresas.</div>`}
      <button class="btn green" onclick="location.href='time-agendamento.html'"><i class="fa fa-calendar"></i> Agendar Horário</button>
      <button class="btn navy" onclick="location.href='meus-horarios.html'"><i class="fa fa-thumbs-up"></i> Meus Horários / Peladas</button>
      <button class="btn navy" onclick="location.href='comanda.html'"><i class="fa fa-receipt"></i> Minha Comanda</button>
      <button class="btn navy" onclick="location.href='meus-agendamentos.html'"><i class="fa fa-list"></i> Meus Agendamentos</button>
      <button class="btn navy" onclick="location.href='times.html'"><i class="fa fa-users"></i> Meus Times</button>
      <button class="btn navy" onclick="location.href='societies.html'"><i class="fa fa-building"></i> Explorar Empresas</button>
    </section>`;
  }

  if(usuarioLogado.tipo==="DONO_SOCIETY"){
    if(!empresa){
      html+=`<section class="action-card"><h3>Selecione a empresa que deseja administrar</h3><p class="subtitle">Use o seletor “Empresa atual” no menu. O GoPlay não vai mais escolher uma empresa sozinho.</p><button class="btn green" onclick="location.href='society-create.html'"><i class="fa fa-plus"></i> Cadastrar Empresa</button></section>`;
    }else{
      html+=`<section class="action-card"><h3>Painel — ${empresa.nome||"Empresa"}</h3>
        <div class="dashboard-grid"><div class="dashboard-card"><span class="dashboard-label">Times</span><strong id="totalTimes">—</strong></div><div class="dashboard-card"><span class="dashboard-label">Reservas</span><strong id="totalAgendamentos">—</strong></div><div class="dashboard-card"><span class="dashboard-label">Recebido</span><strong id="valorPago">—</strong></div><div class="dashboard-card"><span class="dashboard-label">Pendente</span><strong id="valorPendente">—</strong></div></div>
        <button class="btn green" onclick="location.href='society-dashboard.html'"><i class="fa fa-chart-line"></i> Visão Geral e Configuração</button>
        <button class="btn navy" onclick="location.href='horarios.html'"><i class="fa fa-calendar"></i> Agenda</button>
        <button class="btn navy" onclick="location.href='comanda-admin.html'"><i class="fa fa-receipt"></i> Comandas</button>
        <button class="btn navy" onclick="location.href='campeonatos.html'"><i class="fa fa-trophy"></i> Campeonatos</button>
        <button class="btn navy" onclick="abrirMinhaEmpresa()"><i class="fa fa-building"></i> Configurar Empresa</button>
      </section>`;
    }
  }
  homeContent.innerHTML=html;
  if(["PLAYER","DONO_TIME"].includes(usuarioLogado.tipo)) await carregarProximoHorario();
  if(usuarioLogado.tipo==="DONO_SOCIETY"&&empresa) await carregarResumo(empresa.id);
}

async function carregarProximoHorario(){
  const box=document.getElementById("proximoHorarioHome");if(!box)return;
  try{
    const r=await fetch(`${BASE_URL}/grupos-horario/meus`);const groups=await r.json();if(!r.ok||!Array.isArray(groups))return;
    const candidates=groups.filter(g=>g.proximo).sort((a,b)=>new Date(a.proximo.data)-new Date(b.proximo.data));const g=candidates[0];if(!g){box.innerHTML='';return;}
    const a=g.proximo,p=(a.presencas||[]).find(x=>Number(x.usuarioId)===Number(usuarioLogado.id));const st=p?.status||'PENDENTE';
    box.innerHTML=`<section class="action-card" style="border:1px solid #dce9f1"><h3>⚽ Próximo horário</h3><p><strong>${g.nome}</strong> • ${new Date(a.data).toLocaleDateString('pt-BR')} às ${a.horaInicio}<br><span style="color:#6b7280">${g.society?.nome||''}</span></p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn green" onclick="location.href='confirmar-presenca.html?agendamentoId=${a.id}'">${st==='VOU'?'👍 Você vai':st==='NAO_VOU'?'👎 Você não vai':'Responder 👍 / 👎'}</button><button class="btn navy" onclick="location.href='horario-grupo.html?grupoId=${g.id}'">Ver grupo</button></div></section>`;
  }catch(e){console.error(e);}
}

window.abrirMinhaEmpresa=function(){const e=getEmpresaAtual();if(!e)return alert("Selecione uma empresa no menu.");location.href=`society-detalhe.html?societyId=${e.id}`;};

async function carregarResumo(societyId){
  try{
    const [times,agendamentos,pagamentos]=await Promise.all([
      fetch(`${BASE_URL}/time/society/${societyId}`).then(r=>r.json()),
      fetch(`${BASE_URL}/agendamentos/society/${societyId}`).then(r=>r.json()),
      fetch(`${BASE_URL}/pagamentos/society/${societyId}`).then(r=>r.json())]);
    document.getElementById("totalTimes").textContent=Array.isArray(times)?times.length:0;
    document.getElementById("totalAgendamentos").textContent=Array.isArray(agendamentos)?agendamentos.length:0;
    const pago=Array.isArray(pagamentos)?pagamentos.filter(p=>p.status==="PAGO").reduce((s,p)=>s+Number(p.valor||0),0):0;
    const pend=Array.isArray(pagamentos)?pagamentos.filter(p=>p.status==="PENDENTE").reduce((s,p)=>s+Number(p.valor||0),0):0;
    document.getElementById("valorPago").textContent=money(pago);document.getElementById("valorPendente").textContent=money(pend);
  }catch(e){console.error(e);}
}

document.addEventListener("DOMContentLoaded",renderHome);
