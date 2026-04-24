const BASE_URL = "https://goplay-dzlr.onrender.com";

function el(id) {
    return document.getElementById(id);
}

function getUsuarioLogado() {
    try {
        return JSON.parse(localStorage.getItem("usuarioLogado") || "null");
    } catch {
        return null;
    }
}

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = null;
    }

    if (!res.ok) {
        throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
    }

    return data;
}

function escapeHtml(s) {
    return String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function setText(id, value) {
    const node = el(id);
    if (node) node.textContent = value ?? "";
}

let sociedadesDisponiveis = [];
let campeonatosLista = [];

/* =========================================================
   BUSCAR SOCIETIES (SÓ PARA DONO_SOCIETY)
========================================================= */
async function descobrirSocietiesDoUsuario(usuario) {

    if (usuario.tipo === "DONO_SOCIETY") {
        const lista = await fetchJSON(`${BASE_URL}/society/owner/${usuario.id}`);
        return (lista || []).map(s => ({
            id: s.id,
            nome: s.nome || `Society #${s.id}`
        }));
    }

    return [];
}

/* =========================================================
   UI
========================================================= */
function ajustarUI(usuario) {
    const filtroSociety = el("selSociety")?.parentElement?.parentElement;

    if (usuario.tipo !== "DONO_SOCIETY") {
        if (filtroSociety) filtroSociety.style.display = "none";
    }
}

/* =========================================================
   SELECT
========================================================= */
function preencherSelectSocieties(lista) {
    const sel = el("selSociety");
    sociedadesDisponiveis = lista || [];

    if (!sel) return;

    if (!sociedadesDisponiveis.length) {
        sel.innerHTML = `<option value="">Nenhum society</option>`;
        return;
    }

    sel.innerHTML = sociedadesDisponiveis
        .map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.nome)}</option>`)
        .join("");

    const lastSociety = localStorage.getItem("societyId");

    if (lastSociety && sociedadesDisponiveis.some(s => String(s.id) === String(lastSociety))) {
        sel.value = lastSociety;
    } else {
        sel.value = sociedadesDisponiveis[0].id;
    }
}

/* =========================================================
   RENDER
========================================================= */
function renderLista() {
    const busca = (el("busca")?.value || "").toLowerCase();

    const listaFiltrada = campeonatosLista.filter(c =>
        !busca || String(c.nome || "").toLowerCase().includes(busca)
    );

    setText("chipResumo", `${listaFiltrada.length} campeonato(s)`);

    const wrap = el("lista");
    if (!wrap) return;

    if (!listaFiltrada.length) {
        wrap.innerHTML = `<div class="muted">Nenhum campeonato encontrado.</div>`;
        return;
    }

    wrap.innerHTML = listaFiltrada.map(c => `
        <div class="item">
            <div class="item-main">
                <b>${escapeHtml(c.nome || "Campeonato")}</b>
                <div class="item-meta">
                    <span class="mini-chip">${escapeHtml(c.status || "Sem status")}</span>
                    <span class="mini-chip">${escapeHtml(c.tipo || "Sem tipo")}</span>
                    <span class="mini-chip">${escapeHtml(c.modalidade || "Sem modalidade")}</span>
                    ${c.society?.nome ? `<span class="mini-chip">🏟 ${escapeHtml(c.society.nome)}</span>` : ""}
                </div>
            </div>

            <div class="actions">
                <button class="btn-mini ok" onclick="abrirCampeonato('${escapeHtml(c.id)}')">
                    <i class="fa-solid fa-eye"></i> Ver
                </button>
            </div>
        </div>
    `).join("");
}

/* =========================================================
   LOAD CAMPEONATOS (🔥 REGRA NOVA)
========================================================= */
async function carregarCampeonatos() {
    const u = getUsuarioLogado();

    setText("msg", "Carregando campeonatos...");

    try {
        let lista = [];

        // 🔹 DONO_SOCIETY continua filtrando
        if (u.tipo === "DONO_SOCIETY") {
            const societyId = el("selSociety")?.value;

            if (!societyId) {
                campeonatosLista = [];
                renderLista();
                return;
            }

            localStorage.setItem("societyId", societyId);

            lista = await fetchJSON(`${BASE_URL}/campeonato/society/${societyId}`);
        }

        // 🔥 PLAYER e DONO_TIME veem TODOS
        else {
            lista = await fetchJSON(`${BASE_URL}/campeonato`);
        }

        campeonatosLista = Array.isArray(lista) ? lista : [];

        setText("msg", "");
        renderLista();

    } catch (e) {
        console.error(e);
        campeonatosLista = [];
        setText("msg", "Erro ao carregar campeonatos.");
        renderLista();
    }
}

/* =========================================================
   NAV
========================================================= */
window.abrirCampeonato = function (id) {
    location.href = `campeonato-view.html?id=${encodeURIComponent(id)}`;
};

/* =========================================================
   INIT
========================================================= */
async function boot() {
    const u = getUsuarioLogado();

    if (!u?.id) {
        alert("Você precisa fazer login!");
        location.href = "login.html";
        return;
    }

    ajustarUI(u);

    try {
        if (u.tipo === "DONO_SOCIETY") {
            const sociedades = await descobrirSocietiesDoUsuario(u);
            preencherSelectSocieties(sociedades);
        }

        await carregarCampeonatos();

    } catch (e) {
        console.error(e);
        setText("msg", "Erro ao inicializar.");
    }
}

/* =========================================================
   EVENTS
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    el("btnRecarregar")?.addEventListener("click", carregarCampeonatos);
    el("selSociety")?.addEventListener("change", carregarCampeonatos);
    el("busca")?.addEventListener("input", renderLista);

    boot();
});