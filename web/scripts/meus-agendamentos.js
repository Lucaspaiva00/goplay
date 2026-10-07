// ✅ web/scripts/meus-agendamentos.js  (ARQUIVO TODO)
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

// Datas de reserva são datas de calendário, não instantes. O backend as serializa
// em UTC; por isso usamos apenas YYYY-MM-DD para impedir deslocamento de fuso.
function dateKeyOnly(value) {
    if (!value) return null;
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function dtBRDateOnly(value) {
    const key = dateKeyOnly(value);
    if (!key) return "-";
    const [y,m,d] = key.split("-");
    return `${d}/${m}/${y}`;
}

function getTimeMsFromDateOnly(value) {
    const key = dateKeyOnly(value);
    if (!key) return NaN;
    const [y,m,d] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
}

function statusPillAgendamento(a) {
    const agStatus = String(a?.status || "").toUpperCase();
    const pagamento = a?.pagamento || null;
    const pagStatus = String(pagamento?.status || "").toUpperCase();

    if (agStatus === "CANCELADO" || pagStatus === "CANCELADO") {
        return `<span class="status cancelado"><i class="fa-solid fa-circle-xmark"></i> CANCELADO</span>`;
    }
    if (pagStatus === "PAGO") {
        return `<span class="status confirmado"><i class="fa-solid fa-circle-check"></i> PAGO</span>`;
    }
    if (pagamento?.avisoPagamentoEm) {
        return `<span class="status pendente" style="background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8"><i class="fa-solid fa-bell"></i> PIX INFORMADO</span>`;
    }
    if (pagamento) {
        return `<span class="status pendente"><i class="fa-solid fa-hourglass-half"></i> PAGAMENTO PENDENTE</span>`;
    }
    if (a?.horarioFixoId && agStatus === "CONFIRMADO") {
        return `<span class="status confirmado"><i class="fa-solid fa-rotate"></i> HORÁRIO FIXO</span>`;
    }
    if (agStatus === "CONFIRMADO") {
        return `<span class="status confirmado"><i class="fa-solid fa-circle-check"></i> CONFIRMADO</span>`;
    }
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

    all.sort((a, b) => {
        const da = getTimeMsFromDateOnly(pickDataJogo(a));
        const db = getTimeMsFromDateOnly(pickDataJogo(b));
        if (!Number.isNaN(db) && !Number.isNaN(da) && db !== da) return db - da;

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

    if (from) {
        const f = getTimeMsFromDateOnly(from);
        lista = lista.filter(a => {
            const t = getTimeMsFromDateOnly(pickDataJogo(a));
            return !Number.isNaN(t) && t >= f;
        });
    }

    if (to) {
        const tmax = getTimeMsFromDateOnly(to);
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
        const pagamento = a?.pagamento || null;
        const pagStatus = String(pagamento?.status || "").toUpperCase();
        const pago = pagStatus === "PAGO";
        const cancelado = status === "CANCELADO" || pagStatus === "CANCELADO";
        const podeCancelar = !cancelado && !pago;

        const btnCancelar = podeCancelar
            ? `<button class="btn-mini danger" onclick="cancelarAgendamento(${a.id})"><i class="fa-solid fa-ban"></i> Cancelar</button>`
            : "";

        const btnPag = pagamento && !cancelado && !pago
            ? `<button class="btn-mini ok" onclick="irParaPagamento(${pagamento.id})">
                <i class="fa-solid fa-receipt"></i> ${pagamento.avisoPagamentoEm ? "Ver pagamento" : "Pagar / informar PIX"}
              </button>`
            : "";

        return `
      <tr>
        <td>${dataJogoBR}</td>
        <td>${a.horaInicio || "-"} - ${a.horaFim || "-"}</td>
        <td>${societyNome}</td>
        <td>${campoNome}</td>
        <td>${statusPillAgendamento(a)}</td>
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