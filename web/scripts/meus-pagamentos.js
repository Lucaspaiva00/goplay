// ✅ web/scripts/meus-pagamentos.js  (ARQUIVO TODO)
// (ajuste pra aceitar ?pagamentoId=123 e focar/filtrar)
// PERFIL: DONO DO TIME (quem gerou pagamentos)
const BASE_URL = "http://localhost:3000";

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
    const total = Number(data?.total || 0);

    // ✅ se veio da tela "Meus Agendamentos" com pagamentoId, filtra/foca nele
    const pagamentoId = getQueryParam("pagamentoId");
    if (pagamentoId) {
        const pid = Number(pagamentoId);
        lista = lista.filter(p => Number(p.id) === pid);
    }

    el("chipResumo").textContent = `${lista.length} pagamento(s) • Total ${moneyBR(
        lista.reduce((s, p) => s + Number(p.valor || 0), 0)
    )}`;

    if (!lista.length) {
        el("msg").textContent = pagamentoId ? "Pagamento não encontrado." : "Nenhum pagamento encontrado.";
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
