const BASE_URL = "https://goplay-dzlr.onrender.com";

let todosTimes = [];

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

function atualizarResumo(qtd) {
    const chip = document.getElementById("chipResumo");
    if (chip) {
        chip.textContent = `${qtd} time(s)`;
    }
}

function renderTimes(lista) {
    const div = document.getElementById("listaTimes");

    if (!Array.isArray(lista) || lista.length === 0) {
        atualizarResumo(0);
        div.innerHTML = `
            <div class="card">
                <p style="color:#6b7280;">Nenhum time disponível no momento.</p>
            </div>
        `;
        return;
    }

    atualizarResumo(lista.length);

    div.innerHTML = lista.map((t) => `
        <div class="time-card">
            <div class="time-card-header">
                <div>
                    <div class="time-nome">${escapeHtml(t.nome)}</div>
                    <div class="time-local">
                        ${escapeHtml(t?.society?.nome || "Society não informado")}
                    </div>
                    <div class="time-local">
                        ${(t.cidade || t.estado) ? `${escapeHtml(t.cidade || "")}${t.estado ? " - " + escapeHtml(t.estado) : ""}` : "Localidade não informada"}
                    </div>
                </div>

                <div class="time-badges">
                    <span class="mini-chip">${escapeHtml(t.modalidade || "Sem modalidade")}</span>
                    <span class="mini-chip">${Array.isArray(t.jogadores) ? t.jogadores.length : 0} jogador(es)</span>
                </div>
            </div>

            <div style="margin-top:14px;">
                <button class="time-btn" onclick="entrarNoTime(${Number(t.id)})">
                    Entrar no time
                </button>
            </div>
        </div>
    `).join("");
}

async function carregarTimesDisponiveis() {
    const div = document.getElementById("listaTimes");

    try {
        div.innerHTML = `<div class="card">Carregando times...</div>`;

        const times = await fetchJSON(`${BASE_URL}/time`);
        todosTimes = Array.isArray(times) ? times : [];
        renderTimes(todosTimes);
    } catch (error) {
        console.error(error);
        atualizarResumo(0);
        div.innerHTML = `<div class="card"><p>Erro ao carregar times.</p></div>`;
    }
}

function filtrarTimes() {
    const termo = (document.getElementById("buscaTime")?.value || "").trim().toLowerCase();

    if (!termo) {
        renderTimes(todosTimes);
        return;
    }

    const filtrados = todosTimes.filter((t) => {
        return (
            String(t.nome || "").toLowerCase().includes(termo) ||
            String(t?.society?.nome || "").toLowerCase().includes(termo) ||
            String(t.cidade || "").toLowerCase().includes(termo) ||
            String(t.estado || "").toLowerCase().includes(termo)
        );
    });

    renderTimes(filtrados);
}

async function entrarNoTime(timeId) {
    const usuario = getUsuarioLogado();

    if (!usuario?.id) {
        alert("Faça login novamente.");
        window.location.href = "login.html";
        return;
    }

    try {
        const json = await fetchJSON(`${BASE_URL}/time/entrar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuarioId: usuario.id, timeId })
        });

        if (json.error) {
            alert(json.error);
            return;
        }

        alert("Você entrou no time com sucesso!");
        window.location.href = "meu-time.html";
    } catch (error) {
        console.error(error);
        alert(error.message || "Erro ao entrar no time.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    carregarTimesDisponiveis();

    const busca = document.getElementById("buscaTime");
    if (busca) {
        busca.addEventListener("input", filtrarTimes);
    }
});

window.entrarNoTime = entrarNoTime;