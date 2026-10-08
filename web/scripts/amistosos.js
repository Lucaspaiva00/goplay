const BASE_URL="https://goplay-dzlr.onrender.com";
const user=JSON.parse(localStorage.getItem("usuarioLogado")||"null");
const staff=JSON.parse(localStorage.getItem("funcionarioLogado")||"null");
const actor=user||staff;
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
let allTeams=[],ownTeams=[],societies=[],rows=[];

async function api(url,opt={}){const r=await fetch(url,opt),t=await r.text().catch(()=>"");let d=null;try{d=t?JSON.parse(t):null}catch{}if(!r.ok)throw new Error(d?.error||t||`HTTP ${r.status}`);return d;}
function statusLabel(s){return({PENDENTE_ADVERSARIO:"Aguardando adversário",PENDENTE_SOCIETY:"Aguardando empresa",CONFIRMADO:"Confirmado",RECUSADO:"Recusado",CANCELADO:"Cancelado",REALIZADO:"Realizado"})[s]||s;}
function dt(v){try{return new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(v))}catch{return "-"}}
function isSocio(){return user?.tipo==="SOCIO_GOPLAY"||user?.isSocioGoPlay===true}
function currentSociety(){return Number(localStorage.getItem("societyId")||staff?.societyId||0)||null}
function myPresence(a){return (a.presencas||[]).find(p=>Number(p.usuarioId)===Number(user?.id));}
function ownerOf(time){return Number(time?.dono?.id||time?.donoId)===Number(user?.id)}
function canSocietyRespond(a){return a.status==="PENDENTE_SOCIETY"&&(isSocio()||(user?.tipo==="DONO_SOCIETY"&&Number(a.society?.usuarioId)===Number(user.id))||(staff?.funcao==="ADMIN"&&Number(staff.societyId)===Number(a.societyId)))}
function canOpenMesa(a){return !!a.jogo?.id&&(isSocio()||(user?.tipo==="DONO_SOCIETY"&&Number(a.society?.usuarioId)===Number(user.id))||(staff&&Number(staff.societyId)===Number(a.societyId)&&["ADMIN","MESARIO"].includes(staff.funcao))||(!a.societyId&&Number(a.criadoPorId)===Number(user?.id)))}

async function loadOptions(){
  allTeams=(await api(`${BASE_URL}/time`).catch(()=>[])).filter(t=>String(t.statusVinculo||"").toUpperCase()==="APROVADO");
  societies=await api(`${BASE_URL}/society`).catch(()=>[]);
  if(user?.tipo==="DONO_TIME"&&!isSocio()) ownTeams=(await api(`${BASE_URL}/time/dono/${user.id}`).catch(()=>[])).filter(t=>String(t.statusVinculo||"").toUpperCase()==="APROVADO");
  if(user?.tipo==="DONO_SOCIETY"||isSocio()){
    ownTeams=allTeams;
  }
  renderCreateOptions();
}
function renderCreateOptions(){
  const canCreate=user&&(["DONO_TIME","DONO_SOCIETY"].includes(user.tipo)||isSocio());
  $("createPanel").style.display=canCreate?"block":"none";
  if(!canCreate)return;

  $("replaceBookingsPanel").hidden=!(user?.tipo==="DONO_SOCIETY"||isSocio());
  const sid=currentSociety();
  $("timeA").innerHTML='<option value="">Selecione</option>'+ownTeams.map(t=>`<option value="${t.id}">${esc(t.nome)}</option>`).join("");
  $("timeB").innerHTML='<option value="">Selecione</option>'+allTeams.map(t=>`<option value="${t.id}">${esc(t.nome)} • ${esc(t.society?.nome||"")}</option>`).join("");
  $("societyId").innerHTML='<option value="">Sem estrutura definida</option>'+societies.map(s=>`<option value="${s.id}" ${Number(s.id)===sid?"selected":""}>${esc(s.nome)}</option>`).join("");
  if(user?.tipo==="DONO_SOCIETY"&&!isSocio()){
    $("societyId").disabled=true;
    $("createTitle").textContent="Criar amistoso na sua estrutura";
    $("createHelp").textContent="Escolha os dois times, quadra e horário. O amistoso será confirmado diretamente.";
  }else if(user?.tipo==="DONO_TIME"&&!isSocio()){
    $("createTitle").textContent="Solicitar amistoso";
    $("createHelp").textContent="Seu time envia o convite ao adversário. Se houver uma Society, ela aprova a estrutura depois.";
  }
  $("timeA").onchange=()=>filterOpponent();
  $("societyId").onchange=loadFields;
  filterOpponent();
  loadFields();
}
function filterOpponent(){
  const a=Number($("timeA").value||0);
  const current=Number($("timeB").value||0);
  $("timeB").innerHTML='<option value="">Selecione</option>'+allTeams.filter(t=>Number(t.id)!==a).map(t=>`<option value="${t.id}" ${Number(t.id)===current?"selected":""}>${esc(t.nome)} • ${esc(t.society?.nome||"")}</option>`).join("");
}
async function loadFields(){
  const sid=Number($("societyId").value||0);
  $("campoId").innerHTML='<option value="">Sem quadra definida</option>';
  if(!sid)return;
  const campos=await api(`${BASE_URL}/campos/society/${sid}`).catch(()=>[]);
  $("campoId").innerHTML='<option value="">Selecione a quadra</option>'+campos.map(c=>`<option value="${c.id}">${esc(c.nome)}</option>`).join("");
}
async function criar(){
  try{
    const body={
      timeAId:Number($("timeA").value||0),
      timeBId:Number($("timeB").value||0),
      societyId:Number($("societyId").value||0)||null,
      campoId:Number($("campoId").value||0)||null,
      dataHora:$("dataHora").value?new Date($("dataHora").value).toISOString():null,
      duracaoMinutos:Number($("duracao").value||60),
      observacao:$("observacao").value.trim()||null
    };
    if(!body.timeAId||!body.timeBId)return alert("Selecione os dois times.");
    if(!body.dataHora)return alert("Informe data e horário.");
    if(body.societyId&&!body.campoId)return alert("Selecione a quadra desta empresa.");
    $("btnCriar").disabled=true;
    if(!$("replaceBookingsPanel").hidden&&$("substituirReservas").checked){
      const preview=await api(`${BASE_URL}/amistosos/conflitos`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const conflicts=preview.reservas||[];
      if(conflicts.some(r=>r.bloqueada))return alert("Este horário possui uma partida em andamento ou encerrada e não pode ser liberado.");
      if(conflicts.length){
        const lines=conflicts.map(r=>`• ${r.horaInicio}–${r.horaFim}: ${r.nome}${r.horarioFixo?' (somente esta data do horário fixo)':''}${r.pagamentoPago?' — pagamento recebido será preservado':''}`).join('\n');
        if(!confirm(`Criar o amistoso em ${dt(body.dataHora)} e cancelar estas reservas?\n\n${lines}\n\nOs responsáveis serão avisados. Cobranças pendentes deste encontro serão canceladas. Pagamentos recebidos exigem acerto com a empresa.`))return;
      }
      body.substituirReservas=true;
      body.reservasConfirmadasIds=conflicts.map(r=>r.id);
    }
    const d=await api(`${BASE_URL}/amistosos`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    alert(d.status==="CONFIRMADO"?"Amistoso criado e confirmado.":"Solicitação enviada ao dono do time adversário.");
    $("observacao").value="";
    $("substituirReservas").checked=false;
    await loadRows();
  }catch(e){alert(e.message);}
  finally{$("btnCriar").disabled=false;}
}
async function respondOpponent(id,acao){
  const motivo=acao==="RECUSAR"?(prompt("Motivo da recusa (opcional):")||""):"";
  try{await api(`${BASE_URL}/amistosos/${id}/responder-adversario`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({acao,motivo})});await loadRows();}catch(e){alert(e.message);}
}
async function respondSociety(id,acao){
  const motivo=acao==="RECUSAR"?(prompt("Motivo da recusa (opcional):")||""):"";
  try{await api(`${BASE_URL}/amistosos/${id}/responder-society`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({acao,motivo})});await loadRows();}catch(e){alert(e.message);}
}
async function presence(id,status){
  try{await api(`${BASE_URL}/amistosos/${id}/presenca`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});await loadRows();}catch(e){alert(e.message);}
}
async function openMesa(id){
  try{
    const a=rows.find(x=>Number(x.id)===Number(id));
    if(!a?.jogo?.id)return alert("A partida ainda não possui Mesa.");
    const nome=user?.nome||staff?.nome||"Mesário";
    if(!confirm(`Abrir a Mesa de ${a.timeA.nome} × ${a.timeB.nome} como ${nome}?`))return;
    const d=await api(`${BASE_URL}/jogo/${a.jogo.id}/mesa/configurar`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mesarioNome:nome})});
    location.href=`mesa-jogo.html?jogoId=${a.jogo.id}&token=${encodeURIComponent(d.mesaToken)}`;
  }catch(e){alert(e.message);}
}
async function cancelar(id){
  if(!confirm("Cancelar este amistoso? A reserva vinculada também será cancelada."))return;
  try{await api(`${BASE_URL}/amistosos/${id}/cancelar`,{method:"POST"});await loadRows();}catch(e){alert(e.message);}
}
function presencesHtml(a){
  if(user?.tipo==="PLAYER"&&!isSocio()){
    const p=myPresence(a);
    if(!p||a.status!=="CONFIRMADO")return "";
    return `<div class="presence-vote"><button class="${p.status==="VOU"?"active-yes":""}" onclick="presence(${a.id},'VOU')">👍 Vou</button><button class="${p.status==="NAO_VOU"?"active-no":""}" onclick="presence(${a.id},'NAO_VOU')">👎 Não vou</button></div>`;
  }
  if(!["DONO_TIME","DONO_SOCIETY"].includes(user?.tipo)&&!isSocio()&&!staff)return "";
  if(a.status!=="CONFIRMADO"&&a.status!=="REALIZADO")return "";
  const box=(time,label)=>{const ps=(a.presencas||[]).filter(p=>Number(p.timeId)===Number(time.id));const vou=ps.filter(p=>p.status==="VOU").length,nao=ps.filter(p=>p.status==="NAO_VOU").length,pend=ps.filter(p=>p.status==="PENDENTE").length;return `<div class="presence-box"><strong>${esc(label)} • 👍 ${vou} · 👎 ${nao} · ⏳ ${pend}</strong>${ps.length?ps.map(p=>`<div class="presence-line"><span>${esc(p.usuario?.nome||"Jogador")}</span><b>${p.status==="VOU"?"👍":p.status==="NAO_VOU"?"👎":"⏳"}</b></div>`).join(""):'<div class="presence-line">Sem jogadores convidados.</div>'}</div>`};
  return `<div class="friend-presences">${box(a.timeA,a.timeA.nome)}${box(a.timeB,a.timeB.nome)}</div>`;
}
function rowHtml(a){
  const p=myPresence(a);
  const opponentAction=user?.tipo==="DONO_TIME"&&a.status==="PENDENTE_ADVERSARIO"&&ownerOf(a.timeB);
  const showCancel=user&&(isSocio()||Number(a.criadoPorId)===Number(user.id)||(user.tipo==="DONO_SOCIETY"&&Number(a.society?.usuarioId)===Number(user.id)))&&!["CANCELADO","REALIZADO"].includes(a.status);
  return `<article class="friend-row">
    <div class="friend-row-head"><div><div class="friend-match">${esc(a.timeA?.nome)} × ${esc(a.timeB?.nome)}</div><div class="friend-meta">📅 ${dt(a.dataHora)} • ${Number(a.duracaoMinutos||60)} min${a.society?` • 🏟️ ${esc(a.society.nome)}`:''}${a.campo?` / ${esc(a.campo.nome)}`:''}</div>${a.observacao?`<div class="friend-meta">📝 ${esc(a.observacao)}</div>`:''}${a.motivoRecusa?`<div class="friend-meta">Motivo: ${esc(a.motivoRecusa)}</div>`:''}</div><span class="friend-status ${esc(a.status)}">${esc(statusLabel(a.status))}</span></div>
    <div class="friend-actions">
      ${opponentAction?`<button class="friend-action ok" onclick="respondOpponent(${a.id},'ACEITAR')">✓ Aceitar</button><button class="friend-action no" onclick="respondOpponent(${a.id},'RECUSAR')">✕ Recusar</button>`:''}
      ${canSocietyRespond(a)?`<button class="friend-action ok" onclick="respondSociety(${a.id},'APROVAR')">✓ Aprovar estrutura</button><button class="friend-action no" onclick="respondSociety(${a.id},'RECUSAR')">✕ Recusar</button>`:''}
      ${a.jogo?.id?`<button class="friend-action" onclick="location.href='jogo-detalhe.html?jogoId=${a.jogo.id}'">Central da partida</button>`:''}
      ${canOpenMesa(a)&&a.status==="CONFIRMADO"?`<button class="friend-action dark" onclick="openMesa(${a.id})">Abrir Mesa</button>`:''}
      ${showCancel?`<button class="friend-action no" onclick="cancelar(${a.id})">Cancelar</button>`:''}
    </div>
    ${presencesHtml(a)}
    ${user?.tipo==="PLAYER"&&p&&a.status==="CONFIRMADO"?`<div class="friend-meta" style="margin-top:8px">Sua resposta: <strong>${p.status==="VOU"?"👍 Vou":p.status==="NAO_VOU"?"👎 Não vou":"⏳ Pendente"}</strong></div>`:''}
  </article>`;
}
function render(){
  const filter=$("filtroStatus").value;
  const list=filter?rows.filter(r=>r.status===filter):rows;
  $("listaAmistosos").innerHTML=list.length?list.map(rowHtml).join(""):'<div class="friend-empty">Nenhum amistoso encontrado.</div>';
}
async function loadRows(){
  try{rows=await api(`${BASE_URL}/amistosos/meus`);render();}catch(e){$("listaAmistosos").innerHTML=`<div class="friend-empty">${esc(e.message)}</div>`;}
}
window.respondOpponent=respondOpponent;window.respondSociety=respondSociety;window.presence=presence;window.openMesa=openMesa;window.cancelar=cancelar;
document.addEventListener("DOMContentLoaded",async()=>{
  if(window.GoPlayEmpresaContextReady)await window.GoPlayEmpresaContextReady;
  if(!actor?.id)return;
  $("btnCriar").onclick=criar;$("btnRefresh").onclick=loadRows;$("filtroStatus").onchange=render;
  await loadOptions();await loadRows();
  const qs=new URLSearchParams(location.search),focus=Number(qs.get("amistosoId")||0);
  if(focus)setTimeout(()=>{const a=rows.find(x=>Number(x.id)===focus);if(a){$("filtroStatus").value="";render();}},0);
});
