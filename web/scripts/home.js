const BASE_URL = "https://goplay-dzlr.onrender.com";
const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
const homeContent = document.getElementById("homeContent");

if (!usuarioLogado) {
  window.location.href = "login.html";
}

let html = `
  <section class="welcome-card">
    <h2>👋 Bem-vindo, ${usuarioLogado.nome}!</h2>
    <p>Estamos felizes em ter você no GoPlay.</p>
  </section>
`;

if (usuarioLogado.tipo === "PLAYER") {
  html += `
    <section class="action-card">
      <h3>O que deseja fazer agora?</h3>

      <button class="btn green" onclick="location.href='societies.html'">
        👀 Explorar Societies
      </button>

      <button class="btn navy" onclick="location.href='meu-time.html'">
        ⚽ Ver Meu Time
      </button>
    </section>
  `;
}

if (usuarioLogado.tipo === "DONO_TIME") {
  html += `
    <section class="action-card">
      <h3>Atalhos do seu Time</h3>

      <button class="btn green" onclick="location.href='times.html'">
        ⚽ Gerenciar Meus Times
      </button>

      <button class="btn navy" onclick="location.href='agendar-horario.html'">
        📅 Agendar Horário
      </button>

      <button class="btn navy" onclick="location.href='meus-agendamentos.html'">
        📋 Meus Agendamentos
      </button>

      <button class="btn navy" onclick="location.href='meus-pagamentos.html'">
        💰 Meus Pagamentos
      </button>
    </section>
  `;
}

if (usuarioLogado.tipo === "DONO_SOCIETY") {
  html += `
    <section class="action-card">
      <h3>Painel do Society</h3>

      <div class="dashboard-grid">
        <div class="dashboard-card">
          <span class="dashboard-label">Times</span>
          <strong id="totalTimes">...</strong>
        </div>

        <div class="dashboard-card">
          <span class="dashboard-label">Agendamentos</span>
          <strong id="totalAgendamentos">...</strong>
        </div>

        <div class="dashboard-card">
          <span class="dashboard-label">Recebido</span>
          <strong id="valorPago">R$ ...</strong>
        </div>

        <div class="dashboard-card">
          <span class="dashboard-label">Pendente</span>
          <strong id="valorPendente">R$ ...</strong>
        </div>
      </div>

      <button class="btn green" onclick="abrirMeuSociety()">
        👀 Ver meu Society
      </button>

      <button class="btn navy" onclick="location.href='society-dashboard.html'">
        📊 Dashboard Completo
      </button>

      <button class="btn navy" onclick="location.href='campeonatos.html'">
        🏆 Campeonatos
      </button>

      <button class="btn navy" onclick="location.href='recebimentos.html'">
        💰 Recebimentos
      </button>

      <button class="btn navy" onclick="location.href='campos.html'">
        🏟️ Gerenciar Campos
      </button>

      <button class="btn navy" onclick="location.href='cardapio.html'">
        🍔 Gerenciar Cardápio
      </button>

      <button class="btn navy" onclick="location.href='horarios.html'">
        📅 Ver Horários
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

    if (!societyId) {
      return;
    }

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
      ? pagamentos
        .filter((p) => p.status === "PAGO")
        .reduce((acc, p) => acc + Number(p.valor || 0), 0)
      : 0;

    const valorPendente = Array.isArray(pagamentos)
      ? pagamentos
        .filter((p) => p.status === "PENDENTE")
        .reduce((acc, p) => acc + Number(p.valor || 0), 0)
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