const BASE_URL='https://goplay-dzlr.onrender.com';
const user=JSON.parse(localStorage.getItem('usuarioLogado')||'null');
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
async function api(url,opt={}){const r=await fetch(url,opt),t=await r.text().catch(()=>"");let d=null;try{d=t?JSON.parse(t):null}catch{}if(!r.ok)throw new Error(d?.error||t||`HTTP ${r.status}`);return d;}
function dte(v){return v?new Date(v).toLocaleDateString('pt-BR'):'—';}
function counts(p=[]){return {vou:p.filter(x=>x.status==='VOU').length,nao:p.filter(x=>x.status==='NAO_VOU').length,pend:p.filter(x=>x.status==='PENDENTE').length};}
function myStatus(p=[]){return p.find(x=>Number(x.usuarioId)===Number(user.id))?.status||'PENDENTE';}
let grupos=[];
let meusTimes=[];
function configurePage(){
  if(user?.tipo==='DONO_TIME'){
    $('pageTitleHorarios').textContent='Horário Fixo / Presenças';
    $('heroHorariosTitulo').textContent='⚽ Rotinas dos seus times';
    $('heroHorariosTexto').textContent='Crie uma rotina para cada time que administra e acompanhe as confirmações semanais.';
    $('btnNovoGrupo').style.display='inline-flex';
    $('disponibilidadeCard').style.display='none';
  }else if(user?.tipo==='PLAYER'){
    $('pageTitleHorarios').textContent='Minhas Presenças';
    $('heroHorariosTitulo').textContent='👍 Seus próximos jogos';
    $('heroHorariosTexto').textContent='Veja os horários do seu time e responda 👍 vou ou 👎 não vou.';
    $('btnNovoGrupo').style.display='none';
  }
}
async function carregarTimesDoDono(){
  if(user?.tipo!=='DONO_TIME') return [];
  meusTimes=await api(`${BASE_URL}/time/dono/${user.id}`);
  return meusTimes;
}
function abrirModalNovaRotina(){
  const usados=new Set(grupos.filter(g=>g.time?.id).map(g=>Number(g.time.id)));
  const disponiveis=meusTimes.filter(t=>!usados.has(Number(t.id)));
  if(!meusTimes.length) return alert('Você ainda não possui nenhum time. Crie ou administre um time antes de configurar uma rotina.');
  if(!disponiveis.length) return alert('Todos os seus times já possuem uma rotina. Abra a rotina desejada na lista abaixo.');
  $('grupoTimeId').innerHTML='<option value="">Selecione o time</option>'+disponiveis.map(t=>`<option value="${t.id}">${esc(t.nome)} • ${esc(t.society?.nome||'Empresa')}</option>`).join('');
  $('grupoNome').value=''; $('grupoDescricao').value='';
  $('modalNovoGrupo').classList.add('show');
}
async function load(){
  const calls=[api(`${BASE_URL}/grupos-horario/meus`),api(`${BASE_URL}/usuarios/${user.id}`)];
  if(user?.tipo==='DONO_TIME') calls.push(carregarTimesDoDono());
  const result=await Promise.all(calls);
  grupos=result[0]; const u=result[1];
  if($('toggleDisponivel')) $('toggleDisponivel').checked=!!u.disponivelParaConvites;
  const box=$('gruposLista');
  if(!grupos.length){
    if(user?.tipo==='DONO_TIME') box.innerHTML='<div class="p4-empty" style="grid-column:1/-1">Nenhuma rotina configurada ainda.<br><br><button class="p4-btn p4-primary" onclick="document.getElementById(\'btnNovoGrupo\').click()">+ Criar primeira rotina</button><div style="margin-top:8px">Escolha qual dos seus times terá o horário fixo.</div></div>';
    else if(user?.tipo==='PLAYER') box.innerHTML='<div class="p4-empty" style="grid-column:1/-1">Você ainda não possui rotina de time.<br><br><button class="p4-btn p4-primary" onclick="location.href=\'times-disponiveis.html\'">Ver times da empresa</button><div style="margin-top:8px">Solicite entrada em um time. Depois que o dono aprovar, os horários e enquetes aparecem aqui.</div></div>';
    else box.innerHTML='<div class="p4-empty" style="grid-column:1/-1">Nenhum horário recorrente encontrado.</div>';
    return;
  }
  box.innerHTML=grupos.map(g=>{const a=g.proximo,c=a?counts(a.presencas):null,st=a?myStatus(a.presencas):null;const hf=g.horariosFixos?.[0];return `<article class="p4-card"><div class="p4-topline"><span class="p4-chip">${g.time?'⚽ '+esc(g.time.nome):(g.euOrganizo?'⭐ Organizador':'👥 Grupo')}</span><span class="p4-chip">${g.membros.length}/${g.maxJogadores}</span>${hf?`<span class="p4-chip ${hf.status==='APROVADO'?'yes':hf.status==='PENDENTE'?'wait':'no'}">${hf.status==='APROVADO'?'✓ Fixo':hf.status==='PENDENTE'?'⏳ Aguardando empresa':'✕ Recusado'}</span>`:''}</div><h3 style="margin-top:10px">${esc(g.nome)}</h3><div class="p4-muted">📍 ${esc(g.society?.nome||'Empresa')}</div>${a?`<div style="margin-top:14px"><strong>Próximo: ${dte(a.data)} • ${esc(a.horaInicio)}</strong><div class="p4-topline" style="margin-top:8px"><span class="p4-chip yes">👍 ${c.vou}</span><span class="p4-chip no">👎 ${c.nao}</span><span class="p4-chip wait">⏳ ${c.pend}</span></div>${user?.tipo==='PLAYER'?`<div style="margin-top:8px" class="p4-muted">Sua resposta: ${st==='VOU'?'👍 Vou':st==='NAO_VOU'?'👎 Não vou':'⏳ Pendente'}</div>`:''}</div>`:'<div class="p4-muted" style="margin-top:14px">Nenhum encontro futuro criado ainda.</div>'}<div class="phase4-actions" style="margin-top:14px"><button class="p4-btn p4-dark" onclick="location.href='horario-grupo.html?grupoId=${g.id}'">${g.euOrganizo?'Gerenciar rotina':'Abrir rotina'}</button>${a?`<button class="p4-btn p4-primary" onclick="location.href='confirmar-presenca.html?agendamentoId=${a.id}'">${g.euOrganizo?'Ver presenças':'Confirmar presença'}</button>`:''}</div></article>`}).join('');
}
$('btnNovoGrupo')?.addEventListener('click',abrirModalNovaRotina);
$('fecharNovoGrupo')?.addEventListener('click',()=>$('modalNovoGrupo').classList.remove('show'));
$('formNovoGrupo')?.addEventListener('submit',async e=>{
  e.preventDefault();
  if(user?.tipo!=='DONO_TIME') return alert('Somente o dono do time pode criar uma rotina.');
  const timeId=Number($('grupoTimeId').value||0); if(!timeId) return alert('Selecione o time.');
  try{
    const payload={timeId,nome:$('grupoNome').value.trim()||undefined,descricao:$('grupoDescricao').value.trim()||undefined};
    const g=await api(`${BASE_URL}/grupos-horario`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    $('modalNovoGrupo').classList.remove('show');
    location.href=`horario-grupo.html?grupoId=${g.id}`;
  }catch(err){
    const match=String(err.message||'').match(/grupoId[^0-9]*(\d+)/i);
    if(match&&confirm('Este time já possui uma rotina. Deseja abri-la?')) location.href=`horario-grupo.html?grupoId=${match[1]}`; else alert(err.message);
  }
});
$('toggleDisponivel')?.addEventListener('change',async e=>{try{await api(`${BASE_URL}/jogadores/disponibilidade`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({disponivel:e.target.checked})});}catch(err){alert(err.message);e.target.checked=!e.target.checked;}});
document.addEventListener('DOMContentLoaded',()=>{configurePage();load().catch(e=>{$('gruposLista').innerHTML=`<div class="p4-empty">${esc(e.message)}</div>`;});});
