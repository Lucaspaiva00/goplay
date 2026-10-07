const BASE_URL="https://goplay-dzlr.onrender.com";
const user=JSON.parse(localStorage.getItem("usuarioLogado")||"null");
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
async function api(url,opt={}){const r=await fetch(url,opt),t=await r.text().catch(()=>"");let d=null;try{d=t?JSON.parse(t):null}catch{}if(!r.ok)throw new Error(d?.error||t||`HTTP ${r.status}`);return d;}
function kpi(label,value,small=""){return `<div class="platform-kpi"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(small)}</small></div>`;}
function roleLabel(v){return({PLAYER:"Jogador",DONO_TIME:"Dono de time",DONO_SOCIETY:"Dono de Society",ORGANIZADOR_COMPETICAO:"Organizador",ORGAO_PUBLICO:"Órgão público",SOCIO_GOPLAY:"Sócio GoPlay"})[v]||v;}

async function loadDashboard(){
  const d=await api(`${BASE_URL}/plataforma/dashboard`);
  const u=d.usuarios,o=d.operacao,f=d.financeiro;
  $("kpis").innerHTML=[
    kpi("Usuários",u.total,`+${u.novos30Dias} em 30 dias`),
    kpi("Ativos • 30 dias",u.ativos30Dias,"Acessaram o GoPlay"),
    kpi("Jogadores",u.jogadores),
    kpi("Donos de time",u.donosTime),
    kpi("Societies",o.societies,`+${o.novasSocieties30Dias} em 30 dias`),
    kpi("Times",o.times),
    kpi("Campeonatos",o.campeonatos),
    kpi("Amistosos",o.amistosos,`${o.amistososMes} no mês`),
    kpi("Reservas",o.reservas,`${o.reservasMes} no mês`),
    kpi("Jogos realizados",o.jogosRealizados,`${o.jogosAoVivo} ao vivo`),
    kpi("Movimentado pago",money(f.movimentadoPago),`${f.pagamentosPagos} pagamento(s)`),
    kpi("Movimentado no mês",money(f.movimentadoMes),`${f.pagamentosMes} pagamento(s)`),
    kpi("Pendente",money(f.pendente),`${f.pagamentosPendentes} cobrança(s)`),
    kpi("Organizadores",u.organizadores),
    kpi("Órgãos públicos",u.orgaosPublicos),
    kpi("Sócios GoPlay",u.socios)
  ].join("");
  $("growth").innerHTML=`<div class="growth-row head"><span>Mês</span><span>Usuários</span><span>Societies</span><span>Reservas</span><span>Amistosos</span></div>`+(d.crescimento||[]).map(x=>`<div class="growth-row"><b>${esc(x.mes)}</b><span>${x.usuarios}</span><span>${x.societies}</span><span>${x.reservas}</span><span>${x.amistosos}</span></div>`).join("");
  $("cities").innerHTML=(d.cidades||[]).length?(d.cidades||[]).map(x=>`<div class="city-row"><span>📍 ${esc(x.cidade)}${x.estado?`/${esc(x.estado)}`:""}</span><strong>${x.societies}</strong></div>`).join(""):'<div class="result-row">Ainda não há dados por cidade.</div>';
}
async function loadHealth(){
  const d=await api(`${BASE_URL}/plataforma/saude`);
  const b=$("healthBanner");
  b.className="health-banner "+(d.status==="SAUDAVEL"?"ok":d.status==="ATENCAO"?"danger":"warn");
  b.textContent=d.status==="SAUDAVEL"?"✅ Plataforma saudável — nenhum alerta operacional relevante agora.":`⚠️ ${d.alertas.length} alerta(s) operacional(is) precisam de atenção.`;
  $("alerts").innerHTML=d.alertas.length?d.alertas.map(a=>`<div class="alert-row ${a.nivel}"><strong>${esc(a.tipo)} • ${a.quantidade}</strong><p>${esc(a.mensagem)}</p></div>`).join(""):'<div class="result-row"><strong>Sem alertas</strong><p>Não encontramos partidas travadas, aprovações antigas ou cobranças antigas pelos critérios atuais.</p></div>';
}
async function searchUsers(){
  const q=encodeURIComponent($("userQ").value.trim()),tipo=encodeURIComponent($("userTipo").value);
  const rows=await api(`${BASE_URL}/plataforma/usuarios?q=${q}&tipo=${tipo}`);
  $("usersResults").innerHTML=rows.length?rows.map(u=>`<div class="result-row"><strong>${esc(u.nome)}</strong><p>${esc(u.email)}${u.telefone?` • ${esc(u.telefone)}`:""} • cadastro ${new Date(u.createdAt).toLocaleDateString("pt-BR")} • último acesso ${u.ultimoAcessoEm?new Date(u.ultimoAcessoEm).toLocaleString("pt-BR"):"nunca"}</p><div class="meta"><span class="mini-chip">${esc(roleLabel(u.tipo))}</span>${u.isSocioGoPlay?'<span class="mini-chip">Sócio GoPlay</span>':''}<span class="mini-chip">${u._count.times} time(s)</span><span class="mini-chip">${u._count.societies} Society(s)</span><span class="mini-chip">${u._count.pagamentos} pagamento(s)</span></div></div>`).join(""):'<div class="result-row">Nenhum usuário encontrado.</div>';
}
async function searchSocieties(){
  const q=encodeURIComponent($("societyQ").value.trim());
  const rows=await api(`${BASE_URL}/plataforma/societies?q=${q}`);
  $("societiesResults").innerHTML=rows.length?rows.map(s=>`<div class="result-row"><strong>${esc(s.nome)}</strong><p>${esc(s.cidade||"")} ${esc(s.estado||"")} • responsável: ${esc(s.dono?.nome||"-")} • ${esc(s.dono?.email||"")}</p><div class="meta"><span class="mini-chip">${s._count.campos} quadra(s)</span><span class="mini-chip">${s._count.times} time(s)</span><span class="mini-chip">${s._count.campeonatos} campeonato(s)</span><span class="mini-chip">${s._count.amistosos} amistoso(s)</span><span class="mini-chip">${s._count.agendamentos} reserva(s)</span></div></div>`).join(""):'<div class="result-row">Nenhuma Society encontrada.</div>';
}
async function all(){
  try{await Promise.all([loadDashboard(),loadHealth()]);await Promise.all([searchUsers(),searchSocieties()]);}
  catch(e){alert(e.message);if(/restrito|403/i.test(e.message))location.href="home.html";}
}
document.addEventListener("DOMContentLoaded",()=>{
  if(!user?.id)return;
  $("refreshAll").onclick=all;$("searchUsers").onclick=searchUsers;$("searchSocieties").onclick=searchSocieties;
  $("userQ").onkeydown=e=>{if(e.key==="Enter")searchUsers()};$("societyQ").onkeydown=e=>{if(e.key==="Enter")searchSocieties()};
  all();
});
