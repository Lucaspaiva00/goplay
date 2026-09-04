const BASE_URL = "https://goplay-dzlr.onrender.com";
let charts = [];
function money(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
function getUsuarioLogado(){return JSON.parse(localStorage.getItem("usuarioLogado")||"null");}
async function fetchJSON(url){const r=await fetch(url);const t=await r.text();let d=null;try{d=t?JSON.parse(t):null}catch{}if(!r.ok)throw new Error(d?.error||t||`HTTP ${r.status}`);return d;}
function sameLocalDay(value,date=new Date()){if(!value)return false;const d=new Date(value);return d.getFullYear()===date.getFullYear()&&d.getMonth()===date.getMonth()&&d.getDate()===date.getDate();}

function renderOnboarding(society){
  const campos=Array.isArray(society.campos)?society.campos:[];
  const cardapio=Array.isArray(society.cardapio)?society.cardapio:[];
  const id=society.id;
  const steps=[
    {ok:!!(society.nome&&(society.telefone||society.whatsapp)&&society.cidade),title:"Perfil da empresa",desc:"Nome, contato e cidade cadastrados.",link:`society-detalhe.html?societyId=${id}`,action:"Completar perfil"},
    {ok:campos.length>0,title:"Primeira quadra",desc:"Cadastre ao menos uma quadra para liberar agenda.",link:"campos.html",action:"Gerenciar quadras"},
    {ok:campos.some(c=>Number(c.valorAvulso)>0),title:"Preço da quadra",desc:"Defina o valor avulso para permitir reservas.",link:"campos.html",action:"Configurar preços"},
    {ok:!!String(society.pixChave||"").trim(),title:"PIX para recebimentos",desc:"Cadastre a chave que seus clientes usarão.",link:`society-detalhe.html?societyId=${id}`,action:"Cadastrar PIX"},
    {ok:cardapio.length>0,title:"Cardápio",desc:"Cadastre produtos para usar as comandas.",link:"cardapio.html",action:"Montar cardápio"}
  ];
  const done=steps.filter(s=>s.ok).length;const pct=Math.round(done/steps.length*100);
  document.getElementById("onboardingPercent").textContent=`${pct}%`;
  document.getElementById("onboardingProgress").style.width=`${pct}%`;
  document.getElementById("onboardingTitle").textContent=pct===100?"Empresa pronta para operar":"Finalize a configuração da empresa";
  document.getElementById("onboardingText").textContent=pct===100?"Os itens essenciais estão configurados.":`${steps.length-done} etapa(s) ainda precisam de atenção.`;
  document.getElementById("onboardingSteps").innerHTML=steps.map(s=>`<div class="onboarding-step ${s.ok?"done":""}"><div class="onboarding-icon"><i class="fa ${s.ok?"fa-check":"fa-circle"}"></i></div><div><strong>${s.title}</strong><small>${s.desc}</small>${s.ok?"":`<a href="${s.link}">${s.action} →</a>`}</div></div>`).join("");
}

function safeText(id,value){const e=document.getElementById(id);if(e)e.innerText=value;}
function destroyCharts(){charts.forEach(c=>{try{c.destroy()}catch{}});charts=[];}

async function carregarDashboard(){
  try{
    const usuario=getUsuarioLogado();if(!usuario?.id)return location.href="login.html";
    if(window.GoPlayEmpresaContextReady)await window.GoPlayEmpresaContextReady;
    const societyId=Number(localStorage.getItem("societyId")||0);
    if(!societyId){document.querySelector(".content").insertAdjacentHTML("afterbegin",`<div class="onboarding-card"><h3>Selecione uma empresa</h3><p>Use o seletor no menu para escolher qual empresa deseja administrar.</p></div>`);return;}

    const [society,pagamentos,agendamentos,comandas,campeonatos]=await Promise.all([
      fetchJSON(`${BASE_URL}/society/${societyId}`),
      fetchJSON(`${BASE_URL}/pagamentos/society/${societyId}`),
      fetchJSON(`${BASE_URL}/agendamentos/society/${societyId}`),
      fetchJSON(`${BASE_URL}/comanda/society/${societyId}`),
      fetchJSON(`${BASE_URL}/campeonato/society/${societyId}`)
    ]);
    renderOnboarding(society);
    const pagos=(pagamentos||[]).filter(p=>p.status==="PAGO");const total=pagos.reduce((s,p)=>s+Number(p.valor||0),0);
    const hojeTotal=pagos.filter(p=>sameLocalDay(p.pagoEm)).reduce((s,p)=>s+Number(p.valor||0),0);
    const agora=new Date();const mesTotal=pagos.filter(p=>{const d=new Date(p.pagoEm);return d.getFullYear()===agora.getFullYear()&&d.getMonth()===agora.getMonth();}).reduce((s,p)=>s+Number(p.valor||0),0);
    const pendente=(pagamentos||[]).filter(p=>p.status==="PENDENTE").reduce((s,p)=>s+Number(p.valor||0),0);const ticket=pagos.length?total/pagos.length:0;
    const reservasMes=(agendamentos||[]).filter(a=>{const d=new Date(a.data);return d.getFullYear()===agora.getFullYear()&&d.getMonth()===agora.getMonth()&&a.status!=="CANCELADO";}).length;
    const totalSlots=Math.max(1,(society.campos?.length||1)*5*30);const ocupacao=Math.min(100,reservasMes/totalSlots*100);
    safeText("receitaTotal",money(total));safeText("receitaMes",money(mesTotal));safeText("receitaHoje",money(hojeTotal));safeText("pendente",money(pendente));safeText("ticket",money(ticket));safeText("ocupacao",`${ocupacao.toFixed(1)}%`);
    safeText("reservasHoje",(agendamentos||[]).filter(a=>sameLocalDay(a.data)&&a.status!=="CANCELADO").length);
    safeText("comandasAbertas",(comandas||[]).filter(c=>c.status==="ABERTA").length);
    safeText("pagamentosPendentes",(pagamentos||[]).filter(p=>p.status==="PENDENTE").length);
    safeText("campeonatosAtivos",(campeonatos||[]).filter(c=>c.status==="EM_ANDAMENTO"||c.status==="INSCRICOES_ABERTAS").length);

    destroyCharts();
    const dias={};pagos.forEach(p=>{const d=new Date(p.pagoEm).toLocaleDateString("pt-BR");dias[d]=(dias[d]||0)+Number(p.valor||0);});
    charts.push(new Chart(document.getElementById("chartLinha"),{type:"line",data:{labels:Object.keys(dias),datasets:[{label:"Receita",data:Object.values(dias),tension:.4,fill:true}]}}));
    const tipos={AVULSO:0,MENSALISTA:0,CONSUMO_BAR:0};pagos.forEach(p=>{tipos[p.tipo]=(tipos[p.tipo]||0)+Number(p.valor||0);});
    charts.push(new Chart(document.getElementById("chartPizza"),{type:"doughnut",data:{labels:Object.keys(tipos),datasets:[{data:Object.values(tipos)}]}}));
    const horas={};(agendamentos||[]).forEach(a=>{const h=a.horaInicio||"Outro";horas[h]=(horas[h]||0)+1;});
    charts.push(new Chart(document.getElementById("chartBarra"),{type:"bar",data:{labels:Object.keys(horas),datasets:[{label:"Agendamentos",data:Object.values(horas)}]}}));
    const ranking={};pagos.forEach(p=>{const t=p.time?.nome||"Sem time";ranking[t]=(ranking[t]||0)+Number(p.valor||0);});
    document.getElementById("rankingTimes").innerHTML=Object.entries(ranking).sort((a,b)=>b[1]-a[1]).map(([t,v])=>`<div>${t} — <strong>${money(v)}</strong></div>`).join("")||"<div>Sem dados ainda.</div>";
    const insights=[];if(!society.pixChave)insights.push("⚠️ Cadastre o PIX da empresa para facilitar pagamentos.");if(!(society.campos||[]).length)insights.push("🏟️ Cadastre uma quadra para liberar agendamentos.");if((comandas||[]).filter(c=>c.status==="ABERTA").length)insights.push(`🧾 ${(comandas||[]).filter(c=>c.status==="ABERTA").length} comanda(s) aberta(s) agora.`);const melhorHora=Object.entries(horas).sort((a,b)=>b[1]-a[1])[0];if(melhorHora)insights.push(`🔥 Horário mais procurado: ${melhorHora[0]}`);
    document.getElementById("insights").innerHTML=insights.map(i=>`<div>${i}</div>`).join("")||"<div>Nenhum alerta importante no momento.</div>";
  }catch(e){console.error(e);alert(e.message||"Erro ao carregar dashboard");}
}
document.addEventListener("DOMContentLoaded",carregarDashboard);
