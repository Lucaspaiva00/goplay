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

async function descobrirSocietiesDoUsuario(usuario) {
    const societyIdLS = (localStorage.getItem("societyId") || "").trim();

    if (societyIdLS) {
        try {
            const s = await fetchJSON(`${BASE_URL}/society/${encodeURIComponent(societyIdLS)}`);
            if (s?.id) {
                return [{ id: s.id, nome: s.nome || `Society #${s.id}` }];
            }
        } catch { }
    }

    if (usuario.tipo === "DONO_TIME") {
        const times = await fetchJSON(`${BASE_URL}/time/dono/${usuario.id}`);
        const ids = [
            ...new Set(
                (times || [])
                    .map((t) => t?.society?.id || t?.societyId)
                    .filter(Boolean)
            )
        ];

        const out = [];
        for (const sid of ids) {
            try {
                const s = await fetchJSON(`${BASE_URL}/society/${encodeURIComponent(sid)}`);
                if (s?.id) out.push({ id: s.id, nome: s.nome || `Society #${s.id}` });
            } catch { }
        }
        return out;
    }

    if (usuario.tipo === "PLAYER") {
        const payload = await fetchJSON(`${BASE_URL}/time/details/by-player/${usuario.id}`);
        const time = payload?.time || null;
        const sid = time?.society?.id || time?.societyId || null;

        if (sid) {
            const s = await fetchJSON(`${BASE_URL}/society/${encodeURIComponent(sid)}`);
            if (s?.id) return [{ id: s.id, nome: s.nome || `Society #${s.id}` }];
        }

        return [];
    }

    if (usuario.tipo === "DONO_SOCIETY") {
        const lista = await fetchJSON(`${BASE_URL}/society/owner/${usuario.id}`);
        return (lista || []).map((s) => ({
            id: s.id,
            nome: s.nome || `Society #${s.id}`
        }));
    }

    return [];
}

function preencherSelectSocieties(lista) {
    const sel = el("selSociety");
    sociedadesDisponiveis = lista || [];

    if (!sel) return;

    if (!sociedadesDisponiveis.length) {
        sel.innerHTML = `<option value="">Society não identificado</option>`;
        return;
    }

    sel.innerHTML = sociedadesDisponiveis
        .map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.nome)}</option>`)
        .join("");

    sel.value = sociedadesDisponiveis[0].id;
    localStorage.setItem("societyId", String(sociedadesDisponiveis[0].id));
}

function renderLista() {
    const inputBusca = el("busca");
    const busca = (inputBusca?.value || "").trim().toLowerCase();

    const listaFiltrada = campeonatosLista.filter((c) =>
        !busca || String(c.nome || "").toLowerCase().includes(busca)
    );

    setText("chipResumo", `${listaFiltrada.length} campeonato(s)`);

    const wrap = el("lista");
    if (!wrap) return;

    if (!listaFiltrada.length) {
        wrap.innerHTML = `<div class="muted">Nenhum campeonato encontrado para este society.</div>`;
        return;
    }

    wrap.innerHTML = listaFiltrada.map((c) => `
        <div class="item">
            <div class="item-main">
                <b>${escapeHtml(c.nome || "Campeonato")}</b>
                <div class="item-meta">
                    <span class="mini-chip">${escapeHtml(c.status || "Sem status")}</span>
                    <span class="mini-chip">${escapeHtml(c.tipo || "Sem tipo")}</span>
                    <span class="mini-chip">${escapeHtml(c.modalidade || "Sem modalidade")}</span>
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

async function carregarCampeonatos() {
    const sel = el("selSociety");
    const societyId = (sel?.value || "").trim();

    if (!societyId) {
        campeonatosLista = [];
        setText("chipResumo", "0 campeonato(s)");
        const wrap = el("lista");
        if (wrap) wrap.innerHTML = `<div class="muted">Society não identificado.</div>`;
        return;
    }

    localStorage.setItem("societyId", societyId);
    setText("msg", "Carregando campeonatos...");

    try {
        const lista = await fetchJSON(`${BASE_URL}/campeonato/society/${encodeURIComponent(societyId)}`);
        campeonatosLista = Array.isArray(lista) ? lista : [];
        setText("msg", "");
        renderLista();
    } catch (e) {
        console.error(e);
        campeonatosLista = [];
        setText("msg", e.message || "Erro ao carregar campeonatos.");
        renderLista();
    }
}

window.abrirCampeonato = function abrirCampeonato(id) {
    location.href = `campeonato-view.html?id=${encodeURIComponent(id)}`;
};

async function boot() {
    const u = getUsuarioLogado();

    if (!u?.id) {
        alert("Você precisa fazer login!");
        location.href = "login.html";
        return;
    }

    setText("msg", "Identificando society...");

    try {
        const sociedades = await descobrirSocietiesDoUsuario(u);
        preencherSelectSocieties(sociedades);
        setText("msg", "");
        await carregarCampeonatos();
    } catch (e) {
        console.error(e);
        preencherSelectSocieties([]);
        setText("msg", e.message || "Não foi possível identificar o society.");
        await carregarCampeonatos();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const btnRecarregar = el("btnRecarregar");
    const selSociety = el("selSociety");
    const busca = el("busca");

    if (btnRecarregar) btnRecarregar.onclick = () => carregarCampeonatos();
    if (selSociety) selSociety.onchange = () => carregarCampeonatos();
    if (busca) busca.oninput = () => renderLista();

    boot();
});