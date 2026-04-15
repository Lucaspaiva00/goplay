const BASE_URL = "https://goplay-dzlr.onrender.com";

function getUsuarioLogado() {
    try {
        return JSON.parse(localStorage.getItem("usuarioLogado") || "null");
    } catch {
        return null;
    }
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

const usuarioLogado = getUsuarioLogado();

if (!usuarioLogado?.id) {
    alert("Sessão expirada. Faça login novamente.");
    window.location.href = "login.html";
}

const usuarioId = usuarioLogado.id;

async function carregarMeuTime() {
    const dadosTime = document.getElementById("dadosTime");
    const listaJogadores = document.getElementById("listaJogadores");
    const btnSair = document.getElementById("sair");

    try {
        dadosTime.innerHTML = `<p>Carregando informações do time...</p>`;
        listaJogadores.innerHTML = `<p>Carregando jogadores...</p>`;

        const data = await fetchJSON(`${BASE_URL}/time/details/by-player/${usuarioId}`);

        if (data?.error || !data?.time) {
            dadosTime.innerHTML = `
                <div class="time-info-card">
                    <p>Você ainda não faz parte de nenhum time.</p>
                </div>
            `;
            listaJogadores.innerHTML = "";
            if (btnSair) btnSair.style.display = "none";
            return;
        }

        const time = data.time;

        dadosTime.innerHTML = `
            <h2 style="margin-bottom: 10px;">${escapeHtml(time.nome)}</h2>
            <p><b>Society:</b> ${escapeHtml(time?.society?.nome || "-")}</p>
            <p><b>Localidade:</b> ${escapeHtml(time.cidade || "—")} - ${escapeHtml(time.estado || "—")}</p>
            <p><b>Modalidade:</b> ${escapeHtml(time.modalidade || "—")}</p>
            <p><b>Descrição:</b> ${escapeHtml(time.descricao || "Sem descrição")}</p>
        `;

        if (!Array.isArray(time.jogadores) || time.jogadores.length === 0) {
            listaJogadores.innerHTML = `<p>Nenhum jogador no time ainda.</p>`;
        } else {
            listaJogadores.innerHTML = time.jogadores.map(j => `
                <div class="player-item">
                    <b>${escapeHtml(j.nome)}</b><br>
                    <small>${escapeHtml(j.posicaoCampo || "Posição não informada")}</small>
                </div>
            `).join("");
        }

        if (btnSair) btnSair.style.display = "block";
    } catch (error) {
        console.error("Erro ao carregar meu time:", error);
        dadosTime.innerHTML = `<p>Erro ao carregar informações do time.</p>`;
        listaJogadores.innerHTML = "";
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

        alert("Você saiu do time!");
        window.location.reload();
    } catch (error) {
        console.error("Erro ao sair do time:", error);
        alert(error.message || "Erro ao tentar sair do time.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    carregarMeuTime();

    const btnSair = document.getElementById("sair");
    if (btnSair) {
        btnSair.addEventListener("click", sairDoTime);
    }
});