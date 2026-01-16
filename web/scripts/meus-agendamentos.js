// ✅ web/scripts/meus-agendamentos.js  (ARQUIVO TODO)
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

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
    if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
    return data;
}

// 🔥 tenta pegar a data do jogo independente do nome que veio do backend
function pickDataJogo(a) {
    // mais comuns
    const v =
        a?.data ??
        a?.dataJogo ??
        a?.dia ??
        a?.data_agenda ??
        a?.dataAgenda ??
        a?.dataAgendamento ??
        a?.agendamento?.data ??
        a?.agendamentoData ??
        a?.jogoData ??
        null;

    return v;
}

// ✅ aceita "2026-01-16", ISO "2026-01-16T00:00:00.000Z", Date, etc
function dtBRDateOnly(value) {
    if (!value) return "-";

    // se já vier Date
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? "-" : value.toLocaleDateString("pt-BR");
    }

    const s = String(value);

    // se vier "YYYY-MM-DD"
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const x = new Date(`${s}T00:00:00`);
        return Number.isNaN(x.getTime()) ? "-" : x.toLocaleDateString("pt-BR");
    }

    // se vier ISO com T
    const x = new Date(s);
    return Number.isNaN(x.getTime()) ? "-" : x.toLocaleDateString("pt-BR");
}

function getTimeMsFromDateOnly(value) {
    if (!value) return NaN;
    const s = String(value);

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        return new Date(`${s}T00:00:00`).getTime();
    }

    const d = new Date(s);
    return d.getTime();
}

function statusPill(status) {
    const s = String(status || "").toUpperCase();
    if (s === "CONFIRMADO") return `<span class="status confirmado"><i class="fa-solid fa-circle-check"></i> CONFIRMADO</span>`;
    if (s === "CANCELADO") return `<span class="status cancelado"><i class="fa-solid fa-circle-xmark"></i> CANCELADO</span>`;
    return `<span class="status pendente"><i class="fa-solid fa-hourglass-half"></i> PENDENTE</span>`;
}

let __TIMES__ = [];
let __AGENDAMENTOS__ = [];

async function carregarTimesDoDono() {
    const u = getUsuarioLogado();
    if (!u?.id) throw new Error("Sessão expirada. Faça login novamente.");

    const times = await fetchJSON(`${BASE_URL}/time/dono/${u.id}`);
    __TIMES__ = times || [];

    const sel = el("filtroTime");
    sel.innerHTML = `<option value="">Todos</option>`;

    __TIMES__.forEach(t => {
        const opt = document.createElement("option");
        opt.value = String(t.id);
        opt.textContent = t.nome;
        sel.appendChild(opt);
    });

    if (!__TIMES__.length) {
        sel.innerHTML = `<option value="">Nenhum time encontrado</option>`;
    }
}

async function carregarAgendamentosBackend() {
    const u = getUsuarioLogado();
    if (!u?.id) throw new Error("Sessão expirada. Faça login novamente.");

    const times = __TIMES__.length ? __TIMES__ : await fetchJSON(`${BASE_URL}/time/dono/${u.id}`);
    __TIMES__ = times || [];

    const all = [];

    for (const t of __TIMES__) {
        try {
            const lista = await fetchJSON(`${BASE_URL}/agendamentos/time/${t.id}`);
            (lista || []).forEach(a => {
                all.push({
                    ...a,
                    timeId: a.timeId ?? t.id,
                });
            });
        } catch (e) {
            console.error("Erro ao buscar agendamentos do time", t?.id, e);
        }
    }

    // ✅ ordena por data do jogo desc e horaInicio
    all.sort((a, b) => {
        const da = getTimeMsFromDateOnly(pickDataJogo(a));
        const db = getTimeMsFromDateOnly(pickDataJogo(b));
        if (!Number.isNaN(db) && !Number.isNaN(da) && db !== da) return db - da;

        // fallback: createdAt
        const ca = new Date(a?.createdAt || 0).getTime();
        const cb = new Date(b?.createdAt || 0).getTime();
        if (cb !== ca) return cb - ca;

        return String(b.horaInicio || "").localeCompare(String(a.horaInicio || ""));
    });

    __AGENDAMENTOS__ = all;
}

function aplicarFiltroLocal() {
    const timeId = el("filtroTime").value ? Number(el("filtroTime").value) : null;
    const from = el("filtroFrom").value || null;
    const to = el("filtroTo").value || null;

    let lista = [...__AGENDAMENTOS__];

    if (timeId) lista = lista.filter(a => Number(a.timeId) === Number(timeId));

    // filtra por data do jogo (independente do nome do campo)
    if (from) {
        const f = new Date(`${from}T00:00:00`).getTime();
        lista = lista.filter(a => {
            const t = getTimeMsFromDateOnly(pickDataJogo(a));
            return !Number.isNaN(t) && t >= f;
        });
    }

    if (to) {
        const tmax = new Date(`${to}T00:00:00`).getTime();
        lista = lista.filter(a => {
            const t = getTimeMsFromDateOnly(pickDataJogo(a));
            return !Number.isNaN(t) && t <= tmax;
        });
    }

    renderTabela(lista);
}

function renderTabela(lista) {
    el("chipResumo").textContent = `${lista.length} agendamento(s)`;
    const tbody = el("tbody");

    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="muted">Nenhum agendamento encontrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(a => {
        const societyNome = a?.society?.nome || a?.societyNome || "-";
        const campoNome = a?.campo?.nome || a?.campoNome || a?.campo || "-";

        const dataJogo = pickDataJogo(a);
        const dataJogoBR = dtBRDateOnly(dataJogo);

        const status = String(a.status || "").toUpperCase();
        const podeCancelar = status !== "CANCELADO";
        const btnCancelar = podeCancelar
            ? `<button class="btn-mini danger" onclick="cancelarAgendamento(${a.id})"><i class="fa-solid fa-ban"></i> Cancelar</button>`
            : "";

        const pagId = a?.pagamento?.id || a?.pagamentoId || null;
        const btnPag = pagId
            ? `<button class="btn-mini ok" onclick="irParaPagamento(${pagId})"><i class="fa-solid fa-receipt"></i> Pagamento</button>`
            : "";

        return `
      <tr>
        <td>${dataJogoBR}</td>
        <td>${a.horaInicio || "-"} - ${a.horaFim || "-"}</td>
        <td>${societyNome}</td>
        <td>${campoNome}</td>
        <td>${statusPill(a.status)}</td>
        <td class="right">
          <div class="actions">
            ${btnPag}
            ${btnCancelar}
          </div>
        </td>
      </tr>
    `;
    }).join("");
}

async function cancelarAgendamento(id) {
    if (!confirm("Cancelar este agendamento?")) return;
    try {
        await fetchJSON(`${BASE_URL}/agendamentos/${id}/cancelar`, { method: "POST" });
        el("msg").textContent = "Agendamento cancelado.";
        await boot();
    } catch (e) {
        console.error(e);
        alert(e?.message || "Erro ao cancelar.");
    }
}

function irParaPagamento(pagamentoId) {
    location.href = `pagamentos.html?pagamentoId=${encodeURIComponent(pagamentoId)}`;
}

async function boot() {
    try {
        el("msg").textContent = "Carregando...";
        await carregarTimesDoDono();
        await carregarAgendamentosBackend();
        el("msg").textContent = "";
        aplicarFiltroLocal();
    } catch (e) {
        console.error(e);
        el("msg").textContent = e?.message || "Erro ao carregar.";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    el("btnFiltrar").onclick = () => aplicarFiltroLocal();
    boot();
});
