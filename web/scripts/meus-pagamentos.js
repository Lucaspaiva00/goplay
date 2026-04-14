const BASE_URL = "https://goplay-dzlr.onrender.com";

function el(id) { return document.getElementById(id); }

function getUsuarioLogado() {
    const keys = ["usuarioLogado", "USUARIO_LOGADO", "OPERADOR_LOGADO"];
    for (const k of keys) {
        try {
            const u = JSON.parse(localStorage.getItem(k) || "null");
            if (u?.id) return u;
        } catch { }
    }
    return null;
}

function getQueryParam(name) {
    const u = new URL(window.location.href);
    return u.searchParams.get(name);
}

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
    if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
    return data;
}

function moneyBR(v) {
    const n = Number(v || 0);
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dtBR(d) {
    const x = new Date(d);
    return Number.isNaN(x.getTime()) ? "-" : x.toLocaleString("pt-BR");
}

async function carregar() {
    const u = getUsuarioLogado();
    if (!u?.id) {
        el("msg").textContent = "Sessão expirada. Faça login novamente.";
        return;
    }

    const tipo = el("filtroTipo").value;
    const from = el("filtroFrom").value;
    const to = el("filtroTo").value;

    const qs = new URLSearchParams();
    if (tipo) qs.set("tipo", tipo);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);

    el("msg").textContent = "Carregando...";
    el("tbodyPag").innerHTML = "";

    const data = await fetchJSON(`${BASE_URL}/pagamentos/usuario/${encodeURIComponent(u.id)}?${qs.toString()}`);

    let lista = data?.pagamentos || [];

    const pagamentoId = getQueryParam("pagamentoId");
    const timeId = getQueryParam("timeId");

    if (pagamentoId) {
        const pid = Number(pagamentoId);
        lista = lista.filter(p => Number(p.id) === pid);
    }

    if (timeId) {
        const tid = Number(timeId);
        lista = lista.filter(p => Number(p.timeId) === tid || Number(p?.time?.id) === tid);
    }

    const totalFiltrado = lista.reduce((s, p) => s + Number(p.valor || 0), 0);

    el("chipResumo").textContent = `${lista.length} pagamento(s) • Total ${moneyBR(totalFiltrado)}`;

    if (!lista.length) {
        if (pagamentoId) {
            el("msg").textContent = "Pagamento não encontrado.";
        } else if (timeId) {
            el("msg").textContent = "Nenhum pagamento encontrado para este time.";
        } else {
            el("msg").textContent = "Nenhum pagamento encontrado.";
        }
        return;
    }

    el("msg").textContent = "";

    el("tbodyPag").innerHTML = lista.map(p => `
        <tr>
            <td>${dtBR(p.createdAt)}</td>
            <td>${p?.society?.nome || "-"}</td>
            <td>${p.tipo || "-"}</td>
            <td>${p.descricao ? String(p.descricao) : "-"}</td>
            <td class="right"><strong>${moneyBR(p.valor)}</strong></td>
        </tr>
    `).join("");
}

document.addEventListener("DOMContentLoaded", () => {
    el("btnFiltrar").onclick = () => carregar().catch(e => {
        console.error(e);
        el("msg").textContent = e?.message || "Erro ao carregar.";
    });

    carregar().catch(e => {
        console.error(e);
        el("msg").textContent = e?.message || "Erro ao carregar.";
    });
});