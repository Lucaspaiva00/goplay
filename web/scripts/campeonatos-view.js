// ✅ web/scripts/campeonatos-view.js (ARQUIVO TODO)
const BASE_URL = "http://localhost:3000";

function el(id) { return document.getElementById(id); }

function getUsuarioLogado() {
    try { return JSON.parse(localStorage.getItem("usuarioLogado") || "null"); }
    catch { return null; }
}

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
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

let __SOC__ = [];
let __CAMPS__ = [];

/* =========================
   Descobrir societies do usuário
========================= */
async function descobrirSocietiesDoUsuario(usuario) {
    // 1) se tiver societyId em localStorage, tenta carregar ele
    const societyIdLS = (localStorage.getItem("societyId") || "").trim();
    if (societyIdLS) {
        try {
            const s = await fetchJSON(`${BASE_URL}/society/${encodeURIComponent(societyIdLS)}`);
            if (s?.id) return [{ id: s.id, nome: s.nome || `Society #${s.id}` }];
        } catch { /* ignora */ }
    }

    // 2) DONO_TIME -> times do dono -> societyId
    if (usuario.tipo === "DONO_TIME") {
        const times = await fetchJSON(`${BASE_URL}/time/dono/${usuario.id}`);
        const ids = [...new Set((times || []).map(t => t.societyId).filter(Boolean))];

        const out = [];
        for (const sid of ids) {
            try {
                const s = await fetchJSON(`${BASE_URL}/society/${encodeURIComponent(sid)}`);
                if (s?.id) out.push({ id: s.id, nome: s.nome || `Society #${s.id}` });
            } catch { }
        }
        return out;
    }

    // 3) PLAYER -> time do jogador -> societyId
    if (usuario.tipo === "PLAYER") {
        const time = await fetchJSON(`${BASE_URL}/time/details/by-player/${usuario.id}`);
        const sid = time?.societyId || time?.society?.id;
        if (sid) {
            const s = await fetchJSON(`${BASE_URL}/society/${encodeURIComponent(sid)}`);
            if (s?.id) return [{ id: s.id, nome: s.nome || `Society #${s.id}` }];
        }
        return [];
    }

    // 4) DONO_SOCIETY -> societies dele
    if (usuario.tipo === "DONO_SOCIETY") {
        const lista = await fetchJSON(`${BASE_URL}/society/owner/${usuario.id}`);
        return (lista || []).map(s => ({ id: s.id, nome: s.nome || `Society #${s.id}` }));
    }

    return [];
}

function preencherSelectSocieties(lista) {
    const sel = el("selSociety");
    __SOC__ = lista || [];

    if (!sel) return; // ✅ não quebra

    if (!__SOC__.length) {
        sel.innerHTML = `<option value="">Society não identificado</option>`;
        return;
    }

    sel.innerHTML = __SOC__
        .map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.nome)}</option>`)
        .join("");

    sel.value = __SOC__[0].id;
    localStorage.setItem("societyId", String(__SOC__[0].id));
}

function renderLista() {
    const inputBusca = el("busca");
    const busca = (inputBusca?.value || "").trim().toLowerCase();

    const lista = __CAMPS__.filter(c => !busca || String(c.nome || "").toLowerCase().includes(busca));

    setText("chipResumo", `${lista.length} campeonato(s)`);

    const wrap = el("lista");
    if (!wrap) return;

    if (!lista.length) {
        wrap.innerHTML = `<div class="muted">Nenhum campeonato encontrado para este society.</div>`;
        return;
    }

    wrap.innerHTML = lista.map(c => `
    <div class="item">
      <div>
        <b>${escapeHtml(c.nome || "Campeonato")}</b>
        <div class="muted">Visualização (sem editar)</div>
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
        __CAMPS__ = [];
        setText("chipResumo", "0 campeonato(s)");
        const wrap = el("lista");
        if (wrap) {
            wrap.innerHTML = `<div class="muted">Society não identificado. Entre em um society ou associe um time a um society.</div>`;
        }
        return;
    }

    localStorage.setItem("societyId", societyId);
    setText("msg", "Carregando campeonatos...");

    try {
        const lista = await fetchJSON(`${BASE_URL}/campeonato/society/${encodeURIComponent(societyId)}`);
        __CAMPS__ = lista || [];
        setText("msg", "");
        renderLista();
    } catch (e) {
        console.error(e);
        __CAMPS__ = [];
        setText("msg", e.message || "Erro ao carregar campeonatos.");
        renderLista();
    }
}

// global
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
        const societies = await descobrirSocietiesDoUsuario(u);
        preencherSelectSocieties(societies);
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
    // ✅ NUNCA MAIS QUEBRA por IDs faltando
    const btnRecarregar = el("btnRecarregar");
    const selSociety = el("selSociety");
    const busca = el("busca");

    if (btnRecarregar) btnRecarregar.onclick = () => carregarCampeonatos();
    if (selSociety) selSociety.onchange = () => carregarCampeonatos();
    if (busca) busca.oninput = () => renderLista();

    boot();
});
