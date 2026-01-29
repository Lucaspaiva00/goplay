const BASE_URL = "http://localhost:3000";

function getParam(name) {
    return new URLSearchParams(location.search).get(name);
}

function escapeHtml(s) {
    return String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { }

    if (!res.ok) {
        const msg = data?.error || data?.message || text || `Erro HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}

// ---- helpers de agendamento ----
function pickDateField(a) {
    // tenta achar a data em vários formatos
    return (
        a?.data ||
        a?.dataJogo ||
        a?.dataDoJogo ||
        a?.dia ||
        a?.date ||
        a?.dataHora ||
        a?.createdAt ||
        null
    );
}

function toBRDateOnly(value) {
    if (!value) return "-";

    // se vier "YYYY-MM-DD"
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const d = new Date(value + "T00:00:00");
        if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("pt-BR");
    }

    // se vier ISO completo
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("pt-BR");

    return "-";
}

function statusPill(status) {
    const s = String(status || "").toUpperCase();
    if (s === "CONFIRMADO") {
        return `<span style="font-weight:900;font-size:12px;padding:6px 10px;border-radius:999px;display:inline-flex;align-items:center;gap:6px;border:1px solid #bbf7d0;background:#ecfdf5;color:#065f46;">
      <i class="fa-solid fa-circle-check"></i> CONFIRMADO
    </span>`;
    }
    if (s === "CANCELADO") {
        return `<span style="font-weight:900;font-size:12px;padding:6px 10px;border-radius:999px;display:inline-flex;align-items:center;gap:6px;border:1px solid #fecaca;background:#fee2e2;color:#7f1d1d;">
      <i class="fa-solid fa-circle-xmark"></i> CANCELADO
    </span>`;
    }
    return `<span style="font-weight:900;font-size:12px;padding:6px 10px;border-radius:999px;display:inline-flex;align-items:center;gap:6px;border:1px solid #fed7aa;background:#fff7ed;color:#9a3412;">
    <i class="fa-solid fa-hourglass-half"></i> PENDENTE
  </span>`;
}

function btnMini(label, icon, kind = "neutral", onClickJs = "") {
    const base = "border:none;border-radius:10px;padding:8px 10px;font-weight:900;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-size:12px;";
    let style = "background:#f3f4f6;color:#111827;border:1px solid #e5e7eb;";
    if (kind === "ok") style = "background:#ecfdf5;border:1px solid #bbf7d0;color:#065f46;";
    if (kind === "danger") style = "background:#fee2e2;border:1px solid #fecaca;color:#7f1d1d;";
    return `<button style="${base}${style}" onclick="${onClickJs}"><i class="${icon}"></i> ${label}</button>`;
}

async function cancelarAgendamento(id) {
    if (!confirm("Cancelar este agendamento?")) return;
    try {
        await fetchJSON(`${BASE_URL}/agendamentos/${id}/cancelar`, { method: "POST" });
        alert("✅ Agendamento cancelado!");
        // recarrega
        const timeId = getParam("timeId");
        await carregarAgendamentos(timeId);
    } catch (e) {
        console.error(e);
        alert(e?.message || "Erro ao cancelar agendamento.");
    }
}

function abrirPagamentoPorLink(pagamentoId) {
    // página de pagamento por link
    // ajuste o nome do param se seu pagamentos.js usa outro (aqui é pagamentoId)
    location.href = `pagamentos.html?pagamentoId=${encodeURIComponent(pagamentoId)}`;
}

function irMeusPagamentos(timeId) {
    // seu menu já aponta para meus-pagamentos.html
    location.href = `meus-pagamentos.html?timeId=${encodeURIComponent(timeId)}`;
}

async function carregarAgendamentos(timeId) {
    const wrap = document.getElementById("listaAgendamentos");
    const chip = document.getElementById("chipAgendamentos");

    if (!wrap) return;

    wrap.innerHTML = "Carregando agendamentos...";
    if (chip) chip.textContent = "0";

    try {
        const lista = await fetchJSON(`${BASE_URL}/agendamentos/time/${timeId}`);
        const ags = Array.isArray(lista) ? lista : [];

        // ordena por data desc e horaInicio
        ags.sort((a, b) => {
            const da = new Date(String(pickDateField(a) || "")).getTime();
            const db = new Date(String(pickDateField(b) || "")).getTime();
            if (Number.isFinite(db) && Number.isFinite(da) && db !== da) return db - da;
            return String(a?.horaInicio || "").localeCompare(String(b?.horaInicio || ""));
        });

        if (chip) chip.textContent = String(ags.length);

        if (!ags.length) {
            wrap.innerHTML = `<div style="color:#6b7280;">Nenhum agendamento desse time ainda.</div>`;
            return;
        }

        // tabela
        wrap.innerHTML = `
      <div style="overflow:auto;border-radius:14px;">
        <table style="width:100%;border-collapse:collapse;min-width:860px;background:#fff;border-radius:14px;overflow:hidden;">
          <thead>
            <tr>
              <th style="text-align:left;padding:12px;border-bottom:1px solid #eef2f6;font-size:12px;opacity:.7;font-weight:900;">Data</th>
              <th style="text-align:left;padding:12px;border-bottom:1px solid #eef2f6;font-size:12px;opacity:.7;font-weight:900;">Horário</th>
              <th style="text-align:left;padding:12px;border-bottom:1px solid #eef2f6;font-size:12px;opacity:.7;font-weight:900;">Society</th>
              <th style="text-align:left;padding:12px;border-bottom:1px solid #eef2f6;font-size:12px;opacity:.7;font-weight:900;">Campo</th>
              <th style="text-align:left;padding:12px;border-bottom:1px solid #eef2f6;font-size:12px;opacity:.7;font-weight:900;">Status</th>
              <th style="text-align:right;padding:12px;border-bottom:1px solid #eef2f6;font-size:12px;opacity:.7;font-weight:900;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${ags.map(a => {
            const dt = toBRDateOnly(pickDateField(a));
            const hr = `${escapeHtml(a?.horaInicio || "-")} - ${escapeHtml(a?.horaFim || "-")}`;
            const societyNome = escapeHtml(a?.society?.nome || a?.societyNome || "-");
            const campoNome = escapeHtml(a?.campo?.nome || a?.campoNome || a?.campo || "-");
            const st = statusPill(a?.status);

            const pagamentoId =
                a?.pagamentoId ??
                a?.pagamento?.id ??
                a?.pagamento?.pagamentoId ??
                null;

            const podeCancelar = String(a?.status || "").toUpperCase() !== "CANCELADO";

            const actions = [];

            if (pagamentoId) {
                actions.push(btnMini("Pagamento", "fa-solid fa-receipt", "ok", `abrirPagamentoPorLink(${JSON.stringify(pagamentoId)})`));
            } else {
                // Se você quiser forçar a criação do pagamento aqui, dá pra fazer depois.
            }

            if (podeCancelar) {
                actions.push(btnMini("Cancelar", "fa-solid fa-ban", "danger", `cancelarAgendamento(${Number(a.id)})`));
            }

            return `
                <tr>
                  <td style="text-align:left;padding:12px;border-bottom:1px solid #eef2f6;font-size:14px;">${dt}</td>
                  <td style="text-align:left;padding:12px;border-bottom:1px solid #eef2f6;font-size:14px;">${hr}</td>
                  <td style="text-align:left;padding:12px;border-bottom:1px solid #eef2f6;font-size:14px;">${societyNome}</td>
                  <td style="text-align:left;padding:12px;border-bottom:1px solid #eef2f6;font-size:14px;">${campoNome}</td>
                  <td style="text-align:left;padding:12px;border-bottom:1px solid #eef2f6;font-size:14px;">${st}</td>
                  <td style="text-align:right;padding:12px;border-bottom:1px solid #eef2f6;font-size:14px;">
                    <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
                      ${actions.join("")}
                    </div>
                  </td>
                </tr>
              `;
        }).join("")}
          </tbody>
        </table>
      </div>
    `;
    } catch (e) {
        console.error(e);
        wrap.innerHTML = `<div style="color:#b91c1c;font-weight:800;">Erro ao carregar agendamentos: ${escapeHtml(e.message)}</div>`;
    }
}

// ---- tela atual ----
document.addEventListener("DOMContentLoaded", () => {
    init();
});

async function init() {
    const timeId = getParam("timeId");
    if (!timeId) {
        document.getElementById("info").innerHTML = `<p>timeId não informado na URL.</p>`;
        document.getElementById("listaJogadores").innerHTML = `<p>-</p>`;
        const la = document.getElementById("listaAgendamentos");
        if (la) la.innerHTML = `<p>-</p>`;
        return;
    }

    // Botões
    document.getElementById("btnAgendar").onclick = () => {
        location.href = `time-agendamento.html?timeId=${timeId}`;
    };

    document.getElementById("btnPagamentos").onclick = () => {
        irMeusPagamentos(timeId);
    };

    await carregarTime(timeId);
    await carregarAgendamentos(timeId);
}

async function carregarTime(timeId) {
    const infoEl = document.getElementById("info");
    const listEl = document.getElementById("listaJogadores");

    infoEl.innerHTML = "Carregando...";
    listEl.innerHTML = "Carregando jogadores...";

    try {
        const time = await fetchJSON(`${BASE_URL}/time/${timeId}`);

        infoEl.innerHTML = `
      <div style="text-align:left;">
        <p><strong>Nome:</strong> ${escapeHtml(time.nome)}</p>
        <p><strong>Society:</strong> ${escapeHtml(time?.society?.nome || "-")}</p>
        <p><strong>Cidade:</strong> ${escapeHtml(time.cidade || "-")} / ${escapeHtml(time.estado || "-")}</p>
        <p><strong>Modalidade:</strong> ${escapeHtml(time.modalidade || "-")}</p>
      </div>
    `;

        const jogadores = time.jogadores || [];

        if (!jogadores.length) {
            listEl.innerHTML = `<p>Nenhum jogador no time ainda.</p>`;
            return;
        }

        listEl.innerHTML = `
      <div style="text-align:left;">
        ${jogadores.map(j => `
          <div style="padding:10px 0;border-bottom:1px solid #eee;">
            <strong>${escapeHtml(j.nome)}</strong><br/>
            <span style="color:#6b7280;font-size:13px;">
              ${escapeHtml(j.posicaoCampo || "—")} ${j.goleiro ? "• Goleiro" : ""}
            </span>
          </div>
        `).join("")}
      </div>
    `;
    } catch (err) {
        console.error(err);
        infoEl.innerHTML = `<p style="color:#b91c1c;"><strong>Erro:</strong> ${escapeHtml(err.message)}</p>`;
        listEl.innerHTML = `<p>-</p>`;
    }
}

// expõe pro onclick dos botões da tabela
window.cancelarAgendamento = cancelarAgendamento;
window.abrirPagamentoPorLink = abrirPagamentoPorLink;
