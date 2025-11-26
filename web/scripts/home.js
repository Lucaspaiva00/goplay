let usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
const homeContent = document.getElementById("homeContent");

if (!usuarioLogado) {
    window.location.href = "login.html";
}

let html = `
    <section class="card welcome-card">
        <h2>👋 Bem-vindo, ${usuarioLogado.nome}!</h2>
        <p>Estamos felizes em ter você no GoPlay.</p>
    </section>
`;

// ● PLAYER
if (usuarioLogado.tipo === "PLAYER") {
    html += `
    <section class="card action-card">
        <h3>O que deseja fazer agora?</h3>

        <button class="btn green" onclick="location.href='societies.html'">
            👀 Explorar Societies
        </button>

        <button class="btn navy" onclick="location.href='meu-time.html'">
            ⚽ Ver Meu Time
        </button>
    </section>`;
}

// ● DONO DO TIME
if (usuarioLogado.tipo === "DONO_TIME") {
    html += `
    <section class="card action-card">
        <h3>O que deseja fazer agora?</h3>

        <button class="btn green" onclick="location.href='times.html'">
            ⚽ Gerenciar Meus Times
        </button>
    </section>`;
}

// ● DONO SOCIETY
if (usuarioLogado.tipo === "DONO_SOCIETY") {
    html += `
    <section class="card action-card">
        <h3>O que deseja fazer agora?</h3>

        <button class="btn green" onclick="location.href='societies.html'">
            👀 Explorar Societies
        </button>

        <button class="btn navy" onclick="location.href='society-create.html'">
            ➕ Cadastrar Society
        </button>

        <button class="btn navy" onclick="location.href='campeonatos.html'">
            🏆 Campeonatos
        </button>
    </section>`;
}

homeContent.innerHTML = html;
