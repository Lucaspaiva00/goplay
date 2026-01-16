const BASE_URL = "http://localhost:3000";
const PIX_KEY_PADRAO = "47.051.258/0001-58";

function el(id) { return document.getElementById(id); }

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
    if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
    return data;
}

function getParam(name) {
    return new URL(window.location.href).searchParams.get(name);
}

function moneyBR(v) {
    return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function setStatusPill(status) {
    const pill = el("statusPill");
    if (!pill) return;

    const s = String(status || "PENDENTE").toUpperCase();
    pill.classList.remove("pendente", "pago", "cancelado");

    if (s === "PAGO") {
        pill.classList.add("pago");
        pill.innerHTML = `<i class="fa-solid fa-circle-check"></i> PAGO`;
        return;
    }
    if (s === "CANCELADO") {
        pill.classList.add("cancelado");
        pill.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> CANCELADO`;
        return;
    }

    pill.classList.add("pendente");
    pill.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> PENDENTE`;
}

async function carregarPagamento(pagamentoId) {
    // ✅ precisa existir: GET /pagamentos/:id
    const p = await fetchJSON(`${BASE_URL}/pagamentos/${encodeURIComponent(pagamentoId)}`);

    el("chipId").textContent = `#${p.id}`;
    setStatusPill(p.status);

    el("societyNome").textContent = p?.society?.nome || "-";
    el("campoNome").textContent = p?.campo?.nome || "-";
    el("timeNome").textContent = p?.time?.nome || "-";
    el("tipo").textContent = p?.tipo || "-";

    const jogo = p?.agendamento
        ? `${p.agendamento.data || "-"} • ${p.agendamento.horaInicio || "-"} - ${p.agendamento.horaFim || "-"}`
        : "-";
    el("jogo").textContent = jogo;

    el("descricao").textContent = p?.descricao || "-";
    el("valor").textContent = moneyBR(p?.valor);

    el("pixKey").textContent = PIX_KEY_PADRAO;

    return p;
}

async function copiarPix() {
    const txt = (el("pixKey")?.textContent || PIX_KEY_PADRAO).trim();
    await navigator.clipboard.writeText(txt);
    alert("✅ Pix copiado!");
}

async function compartilharLink() {
    const url = window.location.href;

    if (navigator.share) {
        try {
            await navigator.share({ title: "Pagamento GoPlay", text: "Link do pagamento:", url });
            return;
        } catch { }
    }

    await navigator.clipboard.writeText(url);
    alert("✅ Link copiado!");
}

async function confirmarPagamento(pagamentoId) {
    if (!confirm("Confirmar como PAGO?")) return;

    await fetchJSON(`${BASE_URL}/pagamentos/${encodeURIComponent(pagamentoId)}/confirmar`, {
        method: "POST",
    });

    alert("✅ Confirmado como pago!");
    location.reload();
}

function voltar() {
    history.length > 1 ? history.back() : (location.href = "meus-agendamentos.html");
}

document.addEventListener("DOMContentLoaded", async () => {
    const msg = el("msg");

    const btnCopiar = el("btnCopiar");
    const btnCompartilhar = el("btnCompartilhar");
    const btnConfirmar = el("btnConfirmar");
    const btnVoltar = el("btnVoltar");

    if (btnCopiar) btnCopiar.onclick = () => copiarPix().catch(console.error);
    if (btnCompartilhar) btnCompartilhar.onclick = () => compartilharLink().catch(console.error);
    if (btnVoltar) btnVoltar.onclick = voltar;

    const pagamentoId = getParam("pagamentoId");
    if (!pagamentoId) {
        if (msg) msg.textContent = "❌ Falta pagamentoId na URL. Ex: pagamentos.html?pagamentoId=123";
        if (btnConfirmar) btnConfirmar.disabled = true;
        return;
    }

    try {
        if (msg) msg.textContent = "Carregando...";
        await carregarPagamento(pagamentoId);
        if (msg) msg.textContent = "";

        if (btnConfirmar) {
            btnConfirmar.onclick = () => confirmarPagamento(pagamentoId).catch(e => {
                console.error(e);
                alert(e?.message || "Erro ao confirmar.");
            });
        }
    } catch (e) {
        console.error(e);
        if (msg) msg.textContent = e?.message || "Erro ao carregar pagamento.";
        if (btnConfirmar) btnConfirmar.disabled = true;
    }
});
