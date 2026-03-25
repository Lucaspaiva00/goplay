const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
const homeContent = document.getElementById("homeContent");

if (!usuarioLogado) window.location.href = "login.html";

let html = `
  <section class="card welcome-card">
    <h2>👋 Bem-vindo, ${usuarioLogado.nome}!</h2>
    <p>Estamos felizes em ter você no GoPlay.</p>
  </section>
`;

if (usuarioLogado.tipo === "PLAYER") {
  html += `
    <section class="card action-card">
      <h3>O que deseja fazer agora?</h3>
      <button class="btn green" onclick="location.href='societies.html'">👀 Explorar Societies</button>
      <button class="btn navy" onclick="location.href='meu-time.html'">⚽ Ver Meu Time</button>
    </section>
  `;
}

if (usuarioLogado.tipo === "DONO_TIME") {
  html += `
    <section class="card action-card">
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
    </section>
  `;
}

if (usuarioLogado.tipo === "DONO_SOCIETY") {
  html += `
    <section class="card action-card">
      <h3>Painel do Society</h3>

      <button class="btn green" onclick="abrirMeuSociety()">
        👀 Ver meu Society
      </button>

      <button class="btn navy" onclick="location.href='campeonatos.html'">
        🏆 Campeonatos
      </button>

      <button class="btn navy" onclick="location.href='recebimentos.html'">
        💰 Recebimentos
      </button>
    </section>
  `;
}

function abrirMeuSociety() {
  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));

  if (!usuarioLogado || usuarioLogado.tipo !== "DONO_SOCIETY") {
    window.location.href = "societies.html";
    return;
  }

  fetch(`https://goplay-dzlr.onrender.com/society/owner/${usuarioLogado.id}`)
    .then(res => res.json())
    .then(lista => {
      if (!Array.isArray(lista) || lista.length === 0) {
        alert("Você ainda não possui society cadastrado.");
        window.location.href = "society-create.html";
        return;
      }

      const society = lista[0];
      localStorage.setItem("societyId", society.id);
      localStorage.setItem("societyOwnerId", usuarioLogado.id);

      window.location.href = `society-detalhe.html?societyId=${society.id}`;
    })
    .catch(() => {
      alert("Erro ao carregar seu society.");
    });
}

homeContent.innerHTML = html;
