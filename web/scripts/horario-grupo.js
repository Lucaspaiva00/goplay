const BASE_URL='https://goplay-dzlr.onrender.com';
const user=JSON.parse(localStorage.getItem('usuarioLogado')||'null');
const GRUPO_ID=Number(new URLSearchParams(window.location.search).get('grupoId')||0);
window.groupId=GRUPO_ID;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
async function api(url,opt={}){const r=await fetch(url,opt),t=await r.text().catch(()=>"");let d=null;try{d=t?JSON.parse(t):null}catch{}if(!r.ok)throw new Error(d?.error||t||`HTTP ${r.status}`);return d;}
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const date=v=>new Date(v).toLocaleDateString('pt-BR');
let group=null;
let campoAtual=null;
function countStatus(a,s){return (a?.presencas||[]).filter(p=>p.status===s).length;}
function donoPodeSolicitar(){return user?.tipo==='DONO_TIME'&&group?.time&&Number(group.time.donoId)===Number(user.id)&&Number(group.organizadorId)===Number(user.id);}
function tipoSelecionado(){return document.querySelector('input[name="hfTipoCobranca"]:checked')?.value||'';}
function updateBillingChoice(){
  const tipo=tipoSelecionado();
  const wrap=$('hfDividirWrap');
  const ajuda=$('hfCobrancaAjuda');
  if(wrap) wrap.style.display=tipo==='POR_JOGO'?'flex':'none';
  if(tipo==='MENSAL' && $('hfDividir')) $('hfDividir').checked=false;
  if(ajuda){
    if(!tipo) ajuda.textContent='Escolha uma das opções de cobrança acima.';
    else if(tipo==='MENSAL') ajuda.innerHTML=`Será cobrada <strong>uma mensalidade de ${money(campoAtual?.valorMensal)}</strong> do dono do time. Os encontros semanais não geram novas mensalidades.`;
    else ajuda.innerHTML=`Cada ocorrência usará o valor avulso de <strong>${money(campoAtual?.valorAvulso)}</strong>. Você pode dividir esse valor entre os jogadores que confirmarem 👍.`;
  }
}
async function render(){
  group=await api(`${BASE_URL}/grupos-horario/${GRUPO_ID}`);
  const topTitle=document.querySelector('.topbar .title');
  if(topTitle) topTitle.textContent=group.time?'Rotina do Time':'Rotina / Presenças';
  document.title=group.time?`Rotina • ${group.time.nome} – GoPlay`:'Rotina / Presenças – GoPlay';
  const future=group.agendamentos.filter(a=>new Date(a.data)>=new Date(new Date().setHours(0,0,0,0)));
  const next=future[0];
  $('grupoHero').innerHTML=`<div><h2>${esc(group.nome)}</h2><p>📍 ${esc(group.society.nome)} • ${group.time?`⚽ Time: ${esc(group.time.nome)} • `:''}Organizador: ${esc(group.organizador.nome)}</p></div><div class="phase4-actions"><button class="p4-btn p4-secondary" onclick="location.href='meus-horarios.html'">Todas as rotinas</button>${group.time?`<button class="p4-btn p4-secondary" onclick="location.href='time-detalhe.html?timeId=${group.time.id}'">Ver time</button>`:''}</div>`;
  $('grupoResumo').innerHTML=`<div class="p4-topline"><span class="p4-chip">👥 ${group.membros.length}/${group.maxJogadores}</span><span class="p4-chip">${group.ativo?'Ativo':'Inativo'}</span></div><p class="p4-muted" style="margin-top:10px">${esc(group.descricao||'Sem descrição.')}</p>`;
  $('proximoJogo').innerHTML=next?`<strong>${date(next.data)} • ${esc(next.horaInicio)}-${esc(next.horaFim)}</strong><div class="p4-topline" style="margin-top:10px"><span class="p4-chip yes">👍 ${countStatus(next,'VOU')}</span><span class="p4-chip no">👎 ${countStatus(next,'NAO_VOU')}</span><span class="p4-chip wait">⏳ ${countStatus(next,'PENDENTE')}</span></div><button class="p4-btn p4-primary" style="margin-top:12px" onclick="location.href='confirmar-presenca.html?agendamentoId=${next.id}'">Abrir confirmação</button>`:'<div class="p4-muted">Ainda não existe encontro futuro.</div>';
  const hf=group.horariosFixos[0];
  $('grupoCobranca').innerHTML=hf?`${hf.tipoCobranca==='MENSAL'?`<div class="p4-money">${money(hf.valorMensal)}/mês</div><div class="p4-muted">Mensalidade do dono do time</div>`:`<div class="p4-money">${money(hf.valorPorJogo)}</div><div class="p4-muted">Por jogo</div>`}<div class="p4-topline" style="margin-top:8px"><span class="p4-chip ${hf.status==='APROVADO'?'yes':hf.status==='RECUSADO'?'no':'wait'}">${hf.status==='APROVADO'?'✓ Aprovado':hf.status==='RECUSADO'?'✕ Recusado':'⏳ Aguardando empresa'}</span></div><div class="p4-muted" style="margin-top:8px">${hf.tipoCobranca==='MENSAL'?'A cobrança mensal é gerada automaticamente.':hf.dividirValor?'O valor pode ser dividido entre confirmados.':'Cobrança por jogo sem rateio automático.'}</div>${group.podeAprovarHorario&&hf.status==='PENDENTE'?`<div class="phase4-actions" style="margin-top:10px"><button class="p4-btn p4-primary" onclick="aprovarHorario(${hf.id})">Aprovar</button><button class="p4-btn p4-danger" onclick="recusarHorario(${hf.id})">Recusar</button></div>`:''}`:'<div class="p4-muted">Configure o horário fixo abaixo.</div>';
  $('membrosLista').innerHTML=group.membros.map(m=>`<div class="p4-row"><div style="display:flex;gap:10px;align-items:center"><div class="p4-avatar">${m.usuario.fotoUrl?`<img src="${esc(m.usuario.fotoUrl)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`:esc(m.usuario.nome[0]||'?')}</div><div><strong>${esc(m.usuario.nome)}</strong><div class="p4-muted">${esc(m.usuario.posicaoCampo||m.usuario.email||'Jogador')}</div></div></div>${group.podeGerenciar&&!group.timeId&&m.usuarioId!==group.organizadorId?`<button class="p4-btn p4-danger" onclick="remover(${m.usuarioId})">Remover</button>`:m.usuarioId===group.organizadorId?'<span class="p4-chip">Organizador</span>':''}</div>`).join('');
  if($('membrosAjuda')) $('membrosAjuda').textContent=group.timeId?'O elenco vem automaticamente do time. Para adicionar ou remover alguém, use o perfil do time.':'Convide pelo e-mail da conta GoPlay ou encontre jogadores disponíveis.';
  $('inviteControls').style.display=group.podeGerenciar&&!group.timeId?'grid':'none';
  $('criarHorarioBox').style.display=donoPodeSolicitar()&&!hf?'block':'none';
  $('encontrosLista').innerHTML=future.length?future.slice(0,20).map(a=>`<div class="p4-row"><div class="p4-row-main"><strong>${date(a.data)} • ${esc(a.horaInicio)}-${esc(a.horaFim)}</strong><div class="p4-muted">${esc(a.campo?.nome||'Quadra')}</div><div class="p4-topline" style="margin-top:6px"><span class="p4-chip yes">👍 ${countStatus(a,'VOU')}</span><span class="p4-chip no">👎 ${countStatus(a,'NAO_VOU')}</span><span class="p4-chip wait">⏳ ${countStatus(a,'PENDENTE')}</span></div></div><button class="p4-btn p4-dark" onclick="location.href='confirmar-presenca.html?agendamentoId=${a.id}'">Detalhes</button></div>`).join(''):'<div class="p4-empty">Nenhum encontro futuro.</div>';
  if(donoPodeSolicitar()) await loadFields();
}
async function loadFields(){
  const fields=await api(`${BASE_URL}/campos/society/${group.societyId}`);
  $('hfCampo').innerHTML='<option value="">Selecione</option>'+fields.map(c=>`<option value="${c.id}" data-avulso="${c.valorAvulso||0}" data-mensal="${c.valorMensal||0}">${esc(c.nome)}</option>`).join('');
  $('hfCampo').onchange=()=>{
    const o=$('hfCampo').selectedOptions[0];
    campoAtual=o&&o.value?{id:Number(o.value),valorAvulso:Number(o.dataset.avulso||0),valorMensal:Number(o.dataset.mensal||0)}:null;
    $('hfPrecoJogo').textContent=campoAtual?.valorAvulso>0?`${money(campoAtual.valorAvulso)} por jogo`:'Valor avulso não configurado';
    $('hfPrecoMensal').textContent=campoAtual?.valorMensal>0?`${money(campoAtual.valorMensal)} por mês`:'Valor mensal não configurado';
    const rJogo=document.querySelector('input[name="hfTipoCobranca"][value="POR_JOGO"]');
    const rMensal=document.querySelector('input[name="hfTipoCobranca"][value="MENSAL"]');
    rJogo.disabled=!(campoAtual?.valorAvulso>0); rMensal.disabled=!(campoAtual?.valorMensal>0);
    $('opcaoPorJogo').classList.toggle('disabled',rJogo.disabled); $('opcaoMensal').classList.toggle('disabled',rMensal.disabled);
    if(document.querySelector('input[name="hfTipoCobranca"]:checked')?.disabled){rJogo.checked=false;rMensal.checked=false;}
    updateBillingChoice();
  };
  document.querySelectorAll('input[name="hfTipoCobranca"]').forEach(r=>r.onchange=updateBillingChoice);
  if(!$('hfInicio').value) $('hfInicio').value=new Date().toISOString().slice(0,10);
  updateBillingChoice();
}
window.remover=async uid=>{if(!confirm('Remover este jogador do grupo?'))return;try{await api(`${BASE_URL}/grupos-horario/${GRUPO_ID}/membros/${uid}`,{method:'DELETE'});await render();}catch(e){alert(e.message);}};
$('btnConvidarEmail')?.addEventListener('click',async()=>{const emails=$('inviteEmail').value.split(/[,;\s]+/).map(x=>x.trim()).filter(Boolean);if(!emails.length)return alert('Informe pelo menos um e-mail.');let ok=0,erros=[];for(const email of emails){try{await api(`${BASE_URL}/grupos-horario/${GRUPO_ID}/convidar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});ok++;}catch(e){erros.push(`${email}: ${e.message}`);}}$('inviteEmail').value='';await render();alert(`${ok} jogador(es) convidado(s) pelo sininho.${erros.length?`\n\nNão enviados:\n${erros.join('\n')}`:''}`);});
$('btnBuscarDisponiveis')?.addEventListener('click',async()=>{try{const users=await api(`${BASE_URL}/grupos-horario/${GRUPO_ID}/disponiveis`);$('disponiveisBox').style.display='block';$('disponiveisLista').innerHTML=users.length?users.map(u=>`<div class="p4-row"><div><strong>${esc(u.nome)}</strong><div class="p4-muted">${esc(u.posicaoCampo||'Jogador disponível')}</div></div><button class="p4-btn p4-primary" onclick="convidarDisponivel(${u.id})">Convidar</button></div>`).join(''):'<div class="p4-empty">Nenhum jogador marcou disponibilidade no momento.</div>';}catch(e){alert(e.message);}});
$('btnFecharDisponiveis')?.addEventListener('click',()=>$('disponiveisBox').style.display='none');
window.convidarDisponivel=async uid=>{try{await api(`${BASE_URL}/grupos-horario/${GRUPO_ID}/convidar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({usuarioId:uid})});await render();$('disponiveisBox').style.display='none';alert('Convite enviado pelo sininho.');}catch(e){alert(e.message);}};
$('formHorarioFixo')?.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!donoPodeSolicitar()) return alert('Somente o dono deste time pode solicitar a reserva recorrente.');
  const tipo=tipoSelecionado();
  if(!tipo) return alert('Escolha se a cobrança será por jogo ou mensal.');
  if(!campoAtual) return alert('Selecione a quadra.');
  const valor=tipo==='MENSAL'?campoAtual.valorMensal:campoAtual.valorAvulso;
  if(!(valor>0)) return alert(tipo==='MENSAL'?'Esta quadra não possui valor mensal configurado.':'Esta quadra não possui valor avulso configurado.');
  const texto=tipo==='MENSAL'?`mensalidade de ${money(valor)}`:`${money(valor)} por jogo`;
  if(!confirm(`Solicitar este horário com cobrança ${texto}? A empresa precisará aprovar antes das reservas serem criadas.`))return;
  try{
    const body={campoId:Number($('hfCampo').value),diaSemana:Number($('hfDia').value),dataInicio:$('hfInicio').value,horaInicio:$('hfHoraInicio').value,horaFim:$('hfHoraFim').value,semanas:Number($('hfSemanas').value||12),tipoCobranca:tipo,dividirValor:tipo==='POR_JOGO'&&$('hfDividir').checked};
    const d=await api(`${BASE_URL}/grupos-horario/${GRUPO_ID}/horario-fixo`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(d.pendenteAprovacao) alert(`Solicitação enviada com cobrança ${texto}. A empresa recebeu um aviso no sininho para aprovar.`); else alert(`${d.agendamentos.length} encontros criados.`);
    await render();
  }catch(err){alert(err.message);}
});
window.aprovarHorario=async hfId=>{if(!confirm('Aprovar este horário fixo e reservar todas as ocorrências?'))return;try{const d=await api(`${BASE_URL}/horarios-fixos/${hfId}/aprovar`,{method:'POST'});alert(`${d.agendamentos.length} encontros aprovados e reservados.`);await render();}catch(e){alert(e.message);}};
window.recusarHorario=async hfId=>{if(!confirm('Recusar esta solicitação de horário fixo?'))return;try{await api(`${BASE_URL}/horarios-fixos/${hfId}/recusar`,{method:'POST'});alert('Solicitação recusada.');await render();}catch(e){alert(e.message);}};
document.addEventListener('DOMContentLoaded',()=>{if(!GRUPO_ID)return alert('Rotina inválida. Volte ao time e abra a rotina novamente.');render().catch(e=>alert(e.message));});
