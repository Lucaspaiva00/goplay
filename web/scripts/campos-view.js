const BASE_URL = "https://goplay-dzlr.onrender.com";
const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
if (!usuarioLogado?.id) location.href = "login.html";

function el(id){ return document.getElementById(id); }
function esc(v){ return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function q(name){ return new URL(location.href).searchParams.get(name); }
function money(v){ const n=Number(v); return Number.isFinite(n)?n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}):"-"; }
async function api(url,options={}){ const r=await fetch(url,options); const t=await r.text().catch(()=>""); let d={}; try{d=t?JSON.parse(t):{};}catch{} if(!r.ok) throw new Error(d?.error||d?.message||t||`HTTP ${r.status}`); return d; }

let empresaAtual=null;
let campos=[];
let times=[];
let campoSelecionado=null;
let horarioSelecionado=null;
let horaPreferida=q("hora");
const podeReservar=usuarioLogado.tipo==="DONO_TIME";

function getSocietyId(){
  const fromUrl=Number(q("societyId")||0);
  const fromLS=Number(localStorage.getItem("societyId")||0);
  return fromUrl||fromLS||null;
}

async function carregarEmpresa(){
  const societyId=getSocietyId();
  if(!societyId) return null;
  empresaAtual=await api(`${BASE_URL}/society/${societyId}`);
  localStorage.setItem("societyId",String(empresaAtual.id));
  localStorage.setItem("societyContextName",empresaAtual.nome||"Empresa");
  el("quadrasEmpresaNome").textContent=empresaAtual.nome||"Quadras da Empresa";
  el("reservaPixChave").textContent=String(empresaAtual.pixChave||"").trim()||"Não cadastrado";
  el("reservaPixTitular").textContent=String(empresaAtual.pixTitular||"").trim()||"-";
  return empresaAtual;
}

async function carregarTimes(){
  if(!podeReservar) return [];
  try{
    times=await api(`${BASE_URL}/time/dono/${usuarioLogado.id}`);
  }catch{ times=[]; }
  const select=el("reservaTime");
  if(!times.length){
    select.innerHTML='<option value="">Você precisa administrar um time para reservar</option>';
    select.disabled=true;
    return times;
  }
  select.disabled=false;
  select.innerHTML='<option value="">Selecione seu time</option>'+times.map(t=>`<option value="${t.id}">${esc(t.nome)}</option>`).join('');
  const preferred=Number(q("timeId")||0);
  const pre=times.find(t=>Number(t.id)===preferred)||(times.length===1?times[0]:null);
  if(pre) select.value=String(pre.id);
  return times;
}

function renderCampos(){
  const wrap=el("listaCampos");
  if(!campos.length){ wrap.innerHTML='<div style="color:#6b7280;">Esta empresa ainda não possui quadras cadastradas.</div>'; return; }
  wrap.innerHTML=campos.map(c=>`
    <div class="campo-card" style="padding:20px;border-radius:16px;background:#fff;box-shadow:0 4px 14px rgba(0,0,0,.08);margin-bottom:16px;border:1px solid #e5e7eb;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;">
        <div style="flex:1;min-width:250px;">
          <div style="font-weight:800;font-size:24px;color:#111827;margin-bottom:10px;">${esc(c.nome||"-")}</div>
          <div style="color:#111827;line-height:1.8;font-size:15px;">
            <div><b>Dimensões:</b> ${esc(c.dimensoes||"-")}</div>
            <div><b>Gramado:</b> ${esc(c.gramado||"-")}</div>
            <div><b>Reserva avulsa:</b> ${money(c.valorAvulso)}</div>
            <div><b>Mensalidade de referência:</b> ${money(c.valorMensal)}</div>
          </div>
          <div class="quadra-actions">
            ${podeReservar?`<button class="btn green" type="button" onclick="abrirReserva(${Number(c.id)})"><i class="fa-solid fa-calendar-check"></i> Reservar esta quadra</button>`:""}
          </div>
        </div>
        ${c.fotoUrl?`<div style="width:280px;max-width:100%;"><img src="${esc(c.fotoUrl)}" alt="Foto da quadra" style="width:100%;border-radius:14px;object-fit:cover;border:1px solid #e5e7eb;" /></div>`:""}
      </div>
    </div>`).join('');
}

async function listarCampos(){
  const societyId=getSocietyId();
  if(!societyId){
    el("listaCampos").innerHTML='<div style="color:#ef4444;font-weight:800;">Empresa não selecionada.</div><div style="margin-top:10px;color:#374151;">Use <b>Explorar Empresas</b> ou o seletor <b>Empresa atual</b>.</div>';
    return;
  }
  await carregarEmpresa();
  campos=await api(`${BASE_URL}/campos/society/${societyId}`);
  renderCampos();
}

window.abrirReserva=function(campoId){
  const c=campos.find(x=>Number(x.id)===Number(campoId));
  if(!c) return;
  campoSelecionado=c;
  horarioSelecionado=null;
  el("reservaQuadraResumo").innerHTML=`<strong>${esc(c.nome)}</strong> • reserva avulsa ${money(c.valorAvulso)} • ${esc(empresaAtual?.nome||"")}`;
  el("reservaHorariosWrap").style.display="none";
  el("reservaConfirmacao").style.display="none";
  el("reservaMensagem").style.display="none";
  el("reservaPanel").style.display="block";
  el("reservaPanel").scrollIntoView({behavior:"smooth",block:"start"});
};

function fecharReserva(){
  campoSelecionado=null;horarioSelecionado=null;
  el("reservaPanel").style.display="none";
}

function renderHorarios(horarios){
  const wrap=el("reservaHorarios");
  el("reservaHorariosWrap").style.display="block";
  el("reservaConfirmacao").style.display="none";
  horarioSelecionado=null;
  if(!Array.isArray(horarios)||!horarios.length){
    wrap.innerHTML='<div style="grid-column:1/-1;color:#6b7280;">A empresa está fechada neste dia ou não há horários disponíveis.</div>';
    return;
  }
  wrap.innerHTML=horarios.map((h,i)=>`<button type="button" class="reserva-slot ${h.disponivel?'':'ocupado'}" ${h.disponivel?`onclick="selecionarHorario(${i}, this)"`:'disabled'}>${esc(h.horaInicio)} - ${esc(h.horaFim)}</button>`).join('');
  window.__horariosReserva=horarios;
  if(horaPreferida){
    const idx=horarios.findIndex(h=>h.disponivel&&String(h.horaInicio)===String(horaPreferida));
    if(idx>=0){ const buttons=wrap.querySelectorAll('.reserva-slot'); selecionarHorario(idx,buttons[idx]); }
    horaPreferida=null;
  }
}

window.selecionarHorario=function(index,button){
  const h=window.__horariosReserva?.[index];
  if(!h?.disponivel) return;
  horarioSelecionado=h;
  document.querySelectorAll('.reserva-slot').forEach(b=>b.classList.remove('selected'));
  button?.classList.add('selected');
  el("reservaConfirmacao").style.display="block";
};

async function buscarHorarios(){
  const data=el("reservaData").value;
  const timeId=Number(el("reservaTime").value||0);
  if(!campoSelecionado) return alert("Escolha uma quadra para reservar.");
  if(!data) return alert("Escolha a data.");
  if(!timeId) return alert("Selecione o time que fará a reserva.");
  try{
    const horarios=await api(`${BASE_URL}/agendamentos/disponiveis?campoId=${campoSelecionado.id}&data=${encodeURIComponent(data)}`);
    renderHorarios(horarios);
  }catch(e){ alert(e.message||"Erro ao buscar horários."); }
}

async function confirmarReserva(){
  const data=el("reservaData").value;
  const timeId=Number(el("reservaTime").value||0);
  if(!campoSelecionado||!horarioSelecionado||!data||!timeId) return alert("Selecione data, time e horário.");
  const btn=el("btnConfirmarReserva");
  btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Reservando...';
  try{
    const ag=await api(`${BASE_URL}/agendamentos`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({societyId:empresaAtual.id,campoId:Number(campoSelecionado.id),timeId,data,horaInicio:horarioSelecionado.horaInicio})});
    await api(`${BASE_URL}/pagamentos/agendamento`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({usuarioId:usuarioLogado.id,societyId:empresaAtual.id,timeId,campoId:Number(campoSelecionado.id),agendamentoId:ag.id,forma:"PIX",recorrente:false})});
    const msg=el("reservaMensagem");msg.className="reserva-status";msg.style.display="block";msg.innerHTML=`<strong>Reserva criada com sucesso.</strong><br>${esc(campoSelecionado.nome)} • ${new Date(data+'T00:00:00').toLocaleDateString('pt-BR')} • ${esc(horarioSelecionado.horaInicio)}<br><br><a href="meus-agendamentos.html" style="font-weight:900;color:#0b678f;">Ver Minhas Reservas →</a>`;
    el("reservaConfirmacao").style.display="none";
    el("reservaHorariosWrap").style.display="none";
  }catch(e){
    const msg=el("reservaMensagem");msg.className="reserva-status error";msg.style.display="block";msg.textContent=e.message||"Erro ao criar reserva.";
  }finally{btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-circle-check"></i> Reservar e gerar pagamento';}
}

document.addEventListener("DOMContentLoaded",async()=>{
  try{
    const hoje=new Date();
    const localHoje=new Date(hoje.getTime()-hoje.getTimezoneOffset()*60000).toISOString().slice(0,10);
    el("reservaData").min=localHoje;
    el("reservaData").value=q("data")||localHoje;
    await Promise.all([listarCampos(),carregarTimes()]);
    el("btnFecharReserva").onclick=fecharReserva;
    el("btnBuscarReserva").onclick=buscarHorarios;
    el("btnConfirmarReserva").onclick=confirmarReserva;
    const campoUrl=Number(q("campoId")||0);
    if(campoUrl&&campos.some(c=>Number(c.id)===campoUrl)){
      abrirReserva(campoUrl);
      if(q("data")&&horaPreferida) await buscarHorarios();
    }
  }catch(e){console.error(e);el("listaCampos").innerHTML=`<div style="color:#b91c1c;font-weight:800;">${esc(e.message||"Erro ao carregar quadras.")}</div>`;}
});
