const BASE_URL = "https://goplay-dzlr.onrender.com";

function getUsuarioLogado() {
    try {
        return JSON.parse(localStorage.getItem("usuarioLogado") || "null");
    } catch {
        return null;
    }
}

function el(id) {
    return document.getElementById(id);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = {};
    }

    if (!res.ok) {
        throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
    }

    return data;
}

const usuario = getUsuarioLogado();

if (!usuario?.id) {
    alert("Sessão expirada. Faça login novamente.");
    window.location.href = "login.html";
}

const usuarioId = usuario.id;

function renderSemTime() {
    const dadosTime = el("dadosTime");
    const listaJogadores = el("listaJogadores");
    const btnSair = el("sair");

    if (dadosTime) {
        dadosTime.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fa-solid fa-user-group"></i>
                </div>
                <h2>Você ainda não faz parte de nenhum time</h2>
                <p>Entre em um time disponível para começar a participar.</p>
                <button class="btn-primary" onclick="irParaTimesDisponiveis()">
                    <i class="fa fa-users"></i> Ver times disponíveis
                </button>
            </div>
        `;
    }

    if (listaJogadores) {
        listaJogadores.innerHTML = `
            <div class="empty-list">
                Nenhum jogador para exibir.
            </div>
        `;
    }

    if (btnSair) {
        btnSair.style.display = "none";
    }
}

function renderTime(time) {
    const dadosTime = el("dadosTime");
    const listaJogadores = el("listaJogadores");
    const btnSair = el("sair");

    if (!dadosTime || !listaJogadores || !btnSair) return;

    dadosTime.innerHTML = `
        <div class="time-header">
            <div class="time-header-main">
                <h2>${escapeHtml(time.nome || "Meu Time")}</h2>
                <span class="time-badge">Meu time atual</span>
            </div>
        </div>

        <div class="time-grid">
            <div class="time-item">
                <span class="label">Society</span>
                <strong>${escapeHtml(time?.society?.nome || "-")}</strong>
            </div>

            <div class="time-item">
                <span class="label">Cidade / Estado</span>
                <strong>${escapeHtml(time.cidade || "—")} ${time.estado ? `/ ${escapeHtml(time.estado)}` : ""}</strong>
            </div>

            <div class="time-item">
                <span class="label">Modalidade</span>
                <strong>${escapeHtml(time.modalidade || "—")}</strong>
            </div>

            <div class="time-item">
                <span class="label">Quantidade de jogadores</span>
                <strong>${Array.isArray(time.jogadores) ? time.jogadores.length : 0}</strong>
            </div>
        </div>

        <div class="time-desc">
            <span class="label">Descrição</span>
            <p>${escapeHtml(time.descricao || "Sem descrição cadastrada.")}</p>
        </div>
    `;

    if (!Array.isArray(time.jogadores) || time.jogadores.length === 0) {
        listaJogadores.innerHTML = `
            <div class="empty-list">
                Nenhum jogador no time ainda.
            </div>
        `;
    } else {
        listaJogadores.innerHTML = time.jogadores.map((j) => `
            <div class="player-item">
                <div class="player-avatar">
                    <i class="fa-solid fa-user"></i>
                </div>

                <div class="player-info">
                    <strong>${escapeHtml(j.nome || "Jogador")}</strong>
                    <small>${escapeHtml(j.posicaoCampo || "Posição não informada")}</small>
                </div>
            </div>
        `).join("");
    }

    btnSair.style.display = "block";
}

async function carregarMeuTime() {
    const dadosTime = el("dadosTime");
    const listaJogadores = el("listaJogadores");

    if (dadosTime) dadosTime.innerHTML = "Carregando informações do time...";
    if (listaJogadores) listaJogadores.innerHTML = "Carregando jogadores...";

    try {
        const data = await fetchJSON(`${BASE_URL}/time/details/by-player/${usuarioId}`);
        console.log("DATA TIME:", data);

        if (data?.error || !data?.time) {
            renderSemTime();
            return;
        }

        renderTime(data.time);
    } catch (error) {
        console.error("Erro ao carregar meu time:", error);

        if (dadosTime) {
            dadosTime.innerHTML = `
                <div class="empty-state error">
                    <div class="empty-icon">
                        <i class="fa-solid fa-circle-exclamation"></i>
                    </div>
                    <h2>Não foi possível carregar seu time</h2>
                    <p>${escapeHtml(error.message || "Tente novamente mais tarde.")}</p>
                    <button class="btn-primary" onclick="carregarMeuTime()">
                        <i class="fa-solid fa-rotate"></i> Tentar novamente
                    </button>
                </div>
            `;
        }

        if (listaJogadores) {
            listaJogadores.innerHTML = `<div class="empty-list">-</div>`;
        }

        const btnSair = el("sair");
        if (btnSair) btnSair.style.display = "none";
    }
}

async function sairDoTime() {
    if (!confirm("Tem certeza que deseja sair do time?")) return;

    try {
        const data = await fetchJSON(`${BASE_URL}/time/sair`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuarioId })
        });

        if (data?.error) {
            alert(data.error);
            return;
        }

        alert("Você saiu do time com sucesso!");
        renderSemTime();
    } catch (error) {
        console.error("Erro ao sair do time:", error);
        alert(error.message || "Erro ao tentar sair do time.");
    }
}

window.irParaTimesDisponiveis = function () {
    window.location.href = "times-disponiveis.html";
};

document.addEventListener("DOMContentLoaded", () => {
    carregarMeuTime();

    const btnSair = el("sair");
    if (btnSair) {
        btnSair.addEventListener("click", sairDoTime);
    }
});