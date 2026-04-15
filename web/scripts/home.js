const BASE_URL = "https://goplay-dzlr.onrender.com";
const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
const homeContent = document.getElementById("homeContent");

if (!usuarioLogado?.id) {
  window.location.href = "login.html";
}

let html = `
  <section class="welcome-card">
    <h2>👋 Bem-vindo, ${usuarioLogado.nome || "usuário"}!</h2>
    <p>Estamos felizes em ter você no GoPlay.</p>
  </section>
`;

if (usuarioLogado.tipo === "PLAYER") {
  html += `
    <section class="action-card">
      <h3>O que deseja fazer agora?</h3>

      <button class="btn green" onclick="location.href='societies.html'">
        <i class="fa fa-eye"></i> Explorar Societies
      </button>

      <button class="btn navy" onclick="location.href='times-disponiveis.html'">
        <i class="fa fa-users"></i> Ver Times Disponíveis
      </button>

      <button class="btn navy" onclick="location.href='meu-time.html'">
        <i class="fa fa-futbol"></i> Ver Meu Time
      </button>

      <button class="btn navy" onclick="location.href='campeonatos-view.html'">
        <i class="fa fa-trophy"></i> Ver Campeonatos
      </button>
    </section>
  `;
}

if (usuarioLogado.tipo === "DONO_TIME") {
  html += `
    <section class="action-card">
      <h3>Atalhos do seu Time</h3>

      <button class="btn green" onclick="location.href='times.html'">
        <i class="fa fa-users"></i> Gerenciar Meus Times
      </button>

      <button class="btn navy" onclick="location.href='time-agendamento.html'">
        <i class="fa fa-calendar"></i> Agendar Horário
      </button>

      <button class="btn navy" onclick="location.href='meus-agendamentos.html'">
        <i class="fa fa-list"></i> Meus Agendamentos
      </button>

      <button class="btn navy" onclick="location.href='meus-pagamentos.html'">
        <i class="fa fa-money-bill"></i> Meus Pagamentos
      </button>

      <button class="btn navy" onclick="location.href='societies.html'">
        <i class="fa fa-eye"></i> Explorar Societies
      </button>
    </section>
  `;
}

if (usuarioLogado.tipo === "DONO_SOCIETY") {
  html += `
    <section class="action-card">
      <h3>Painel do Society</h3>

      <button class="btn green" onclick="abrirMeuSociety()">
        <i class="fa fa-futbol"></i> Ver meu Society
      </button>

      <button class="btn navy" onclick="location.href='society-dashboard.html'">
        <i class="fa fa-chart-line"></i> Dashboard Completo
      </button>

      <button class="btn navy" onclick="location.href='campeonatos.html'">
        <i class="fa fa-trophy"></i> Campeonatos
      </button>

      <button class="btn navy" onclick="location.href='recebimentos.html'">
        <i class="fa fa-credit-card"></i> Recebimentos
      </button>

      <button class="btn navy" onclick="location.href='horarios.html'">
        <i class="fa fa-calendar"></i> Ver Horários
      </button>
    </section>
  `;
}

homeContent.innerHTML = html;

function abrirMeuSociety() {
  const usuario = JSON.parse(localStorage.getItem("usuarioLogado") || "null");

  if (!usuario || usuario.tipo !== "DONO_SOCIETY") {
    window.location.href = "societies.html";
    return;
  }

  fetch(`${BASE_URL}/society/owner/${usuario.id}`)
    .then((res) => res.json())
    .then((lista) => {
      if (!Array.isArray(lista) || lista.length === 0) {
        alert("Você ainda não possui society cadastrado.");
        window.location.href = "society-create.html";
        return;
      }

      const society = lista[0];
      localStorage.setItem("societyId", society.id);
      localStorage.setItem("societyOwnerId", usuario.id);

      window.location.href = `society-detalhe.html?societyId=${society.id}`;
    })
    .catch(() => {
      alert("Erro ao carregar seu society.");
    });
}

async function carregarResumoDonoSociety() {
  try {
    const societyId = localStorage.getItem("societyId");
    if (!societyId) return;

    const [timesRes, agendRes, pagRes] = await Promise.all([
      fetch(`${BASE_URL}/time/society/${societyId}`),
      fetch(`${BASE_URL}/agendamentos/society/${societyId}`),
      fetch(`${BASE_URL}/pagamentos/society/${societyId}`)
    ]);

    const times = await timesRes.json();
    const agendamentos = await agendRes.json();
    const pagamentos = await pagRes.json();

    const totalTimes = Array.isArray(times) ? times.length : 0;
    const totalAgendamentos = Array.isArray(agendamentos) ? agendamentos.length : 0;

    const valorPago = Array.isArray(pagamentos)
      ? pagamentos.filter((p) => p.status === "PAGO").reduce((acc, p) => acc + Number(p.valor || 0), 0)
      : 0;

    const valorPendente = Array.isArray(pagamentos)
      ? pagamentos.filter((p) => p.status === "PENDENTE").reduce((acc, p) => acc + Number(p.valor || 0), 0)
      : 0;

    const totalTimesEl = document.getElementById("totalTimes");
    const totalAgendamentosEl = document.getElementById("totalAgendamentos");
    const valorPagoEl = document.getElementById("valorPago");
    const valorPendenteEl = document.getElementById("valorPendente");

    if (totalTimesEl) totalTimesEl.textContent = totalTimes;
    if (totalAgendamentosEl) totalAgendamentosEl.textContent = totalAgendamentos;
    if (valorPagoEl) valorPagoEl.textContent = `R$ ${valorPago.toFixed(2).replace(".", ",")}`;
    if (valorPendenteEl) valorPendenteEl.textContent = `R$ ${valorPendente.toFixed(2).replace(".", ",")}`;
  } catch (error) {
    console.log("Erro ao carregar resumo do society:", error);
  }
}

if (usuarioLogado.tipo === "DONO_SOCIETY") {
  carregarResumoDonoSociety();
}