const BASE_URL='https://goplay-dzlr.onrender.com';
const user=JSON.parse(localStorage.getItem('usuarioLogado')||'null');
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
async function api(url,opt={}){const r=await fetch(url,opt),t=await r.text().catch(()=>"");let d=null;try{d=t?JSON.parse(t):null}catch{}if(!r.ok)throw new Error(d?.error||t||`HTTP ${r.status}`);return d;}
function dte(v){return v?new Date(v).toLocaleDateString('pt-BR'):'—';}
function counts(p=[]){return {vou:p.filter(x=>x.status==='VOU').length,nao:p.filter(x=>x.status==='NAO_VOU').length,pend:p.filter(x=>x.status==='PENDENTE').length};}
function myStatus(p=[]){return p.find(x=>Number(x.usuarioId)===Number(user.id))?.status||'PENDENTE';}

function configurePage(){
  if(user?.tipo==='DONO_TIME'){
    if($('pageTitleHorarios'))$('pageTitleHorarios').textContent='Rotina e Presenças';
    if($('heroHorariosTitulo'))$('heroHorariosTitulo').textContent='⚽ Rotina dos seus times';
    if($('heroHorariosTexto'))$('heroHorariosTexto').textContent='A rotina nasce dentro do perfil do time. Aqui você acompanha as confirmações semanais.';
  }else if(user?.tipo==='PLAYER'){
    if($('pageTitleHorarios'))$('pageTitleHorarios').textContent='Minhas Presenças';
    if($('heroHorariosTitulo'))$('heroHorariosTitulo').textContent='👍 Seus próximos jogos';
    if($('heroHorariosTexto'))$('heroHorariosTexto').textContent='Veja os horários do seu time e responda 👍 vou ou 👎 não vou.';
  }
  if($('btnNovoGrupo')) $('btnNovoGrupo').style.display='none';
}

async function load(){
  const [groups,u]=await Promise.all([api(`${BASE_URL}/grupos-horario/meus`),api(`${BASE_URL}/usuarios/${user.id}`)]);
  $('toggleDisponivel').checked=!!u.disponivelParaConvites;
  const box=$('gruposLista');
  if(!groups.length){
    if(user?.tipo==='DONO_TIME') box.innerHTML='<div class="p4-empty" style="grid-column:1/-1">Nenhuma rotina configurada ainda.<br><br><button class="p4-btn p4-primary" onclick="location.href=\'times.html\'">Abrir Meus Times</button><div style="margin-top:8px">Entre no time desejado e clique em <b>Criar rotina do time</b>.</div></div>';
    else if(user?.tipo==='PLAYER') box.innerHTML='<div class="p4-empty" style="grid-column:1/-1">Você ainda não possui rotina de time.<br><br><button class="p4-btn p4-primary" onclick="location.href=\'times.html\'">Ver times da empresa</button><div style="margin-top:8px">Solicite entrada em um time. Depois que o dono aprovar, os horários e enquetes dele aparecem aqui.</div></div>';
    else box.innerHTML='<div class="p4-empty" style="grid-column:1/-1">Nenhum horário recorrente encontrado.</div>';
    return;
  }
  box.innerHTML=groups.map(g=>{const a=g.proximo,c=a?counts(a.presencas):null,st=a?myStatus(a.presencas):null;const hf=g.horariosFixos?.[0];return `<article class="p4-card"><div class="p4-topline"><span class="p4-chip">${g.time?'⚽ '+esc(g.time.nome):(g.euOrganizo?'⭐ Organizador':'👥 Grupo')}</span><span class="p4-chip">${g.membros.length}/${g.maxJogadores}</span>${hf?`<span class="p4-chip ${hf.status==='APROVADO'?'yes':hf.status==='PENDENTE'?'wait':'no'}">${hf.status==='APROVADO'?'✓ Fixo':hf.status==='PENDENTE'?'⏳ Aguardando empresa':'✕ Recusado'}</span>`:''}</div><h3 style="margin-top:10px">${esc(g.nome)}</h3><div class="p4-muted">📍 ${esc(g.society?.nome||'Empresa')}</div>${a?`<div style="margin-top:14px"><strong>Próximo: ${dte(a.data)} • ${esc(a.horaInicio)}</strong><div class="p4-topline" style="margin-top:8px"><span class="p4-chip yes">👍 ${c.vou}</span><span class="p4-chip no">👎 ${c.nao}</span><span class="p4-chip wait">⏳ ${c.pend}</span></div><div style="margin-top:8px" class="p4-muted">Sua resposta: ${st==='VOU'?'👍 Vou':st==='NAO_VOU'?'👎 Não vou':'⏳ Pendente'}</div></div>`:'<div class="p4-muted" style="margin-top:14px">Nenhum encontro futuro criado ainda.</div>'}<div class="phase4-actions" style="margin-top:14px"><button class="p4-btn p4-dark" onclick="location.href='horario-grupo.html?grupoId=${g.id}'">${g.euOrganizo?'Gerenciar rotina':'Abrir rotina'}</button>${a?`<button class="p4-btn p4-primary" onclick="location.href='confirmar-presenca.html?agendamentoId=${a.id}'">Confirmar presença</button>`:''}</div></article>`}).join('');
}

$('toggleDisponivel')?.addEventListener('change',async e=>{try{await api(`${BASE_URL}/jogadores/disponibilidade`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({disponivel:e.target.checked})});}catch(err){alert(err.message);e.target.checked=!e.target.checked;}});

document.addEventListener('DOMContentLoaded',()=>{configurePage();load().catch(e=>{$('gruposLista').innerHTML=`<div class="p4-empty">${esc(e.message)}</div>`;});});
