// ✅ web/scripts/pagamento-link.js  (ARQUIVO TODO)
const BASE_URL = "https://goplay-dzlr.onrender.com";

function el(id) { return document.getElementById(id); }

function getQueryParam(name) {
    return new URL(window.location.href).searchParams.get(name);
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

function statusPill(status) {
    const s = String(status || "").toUpperCase();
    const pill = el("statusPill");
    pill.className = "status pendente";
    pill.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> PENDENTE`;

    if (s === "PAGO") {
        pill.className = "status pago";
        pill.innerHTML = `<i class="fa-solid fa-circle-check"></i> PAGO`;
    } else if (s === "CANCELADO") {
        pill.className = "status cancelado";
        pill.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> CANCELADO`;
    }
}

function render(p) {
    el("chipId").textContent = `#${p.id}`;
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

    const pixChave = String(p?.society?.pixChave || "").trim();
    const pixTitular = String(p?.society?.pixTitular || "").trim();

    el("pixKey").textContent = pixChave || "PIX não cadastrado pela empresa";

    const pixTitularEl = el("pixTitular");
    if (pixTitularEl) {
        pixTitularEl.textContent = pixTitular ? `Titular: ${pixTitular}` : "";
    }

    const btnCopiar = el("btnCopiar");
    if (btnCopiar) {
        btnCopiar.disabled = !pixChave;
    }

    statusPill(p?.status);
}

async function copiarPix() {
    const pix = (el("pixKey")?.textContent || "").trim();

    if (!pix || pix === "PIX não cadastrado pela empresa") {
        alert("A empresa ainda não cadastrou uma chave PIX.");
        return;
    }

    await navigator.clipboard.writeText(pix);
    alert("✅ Pix copiado!");
}

async function compartilhar() {
    const url = window.location.href;
    if (navigator.share) {
        try {
            await navigator.share({ title: "Pagamento GoPlay", text: "Pagamento por link", url });
            return;
        } catch { }
    }
    await navigator.clipboard.writeText(url);
    alert("✅ Link copiado!");
}

async function avisarPagamento(pagamentoId) {
    await fetchJSON(`${BASE_URL}/pagamentos/${encodeURIComponent(pagamentoId)}/avisar`, { method: "POST" });
    alert("✅ Empresa avisada! Aguarde a conferência do caixa.");
    await boot();
}

function voltar() {
    history.length > 1 ? history.back() : (location.href = "meus-agendamentos.html");
}

async function boot() {
    const pagamentoId = getQueryParam("pagamentoId");
    if (!pagamentoId) {
        el("msg").textContent = "Faltou pagamentoId na URL. Ex: pagamento.html?pagamentoId=123";
        return;
    }

    el("btnCopiar").onclick = () => copiarPix().catch(() => alert("Erro ao copiar"));
    el("btnCompartilhar").onclick = () => compartilhar().catch(() => alert("Erro ao compartilhar"));
    el("btnConfirmar").onclick = () => avisarPagamento(pagamentoId).catch(e => alert(e.message || "Erro"));
    el("btnVoltar").onclick = voltar;

    try {
        el("msg").textContent = "Carregando...";
        const p = await fetchJSON(`${BASE_URL}/pagamentos/${encodeURIComponent(pagamentoId)}`);
        el("msg").textContent = "";
        render(p);
    } catch (e) {
        console.error(e);
        el("msg").textContent = e?.message || "Erro ao carregar pagamento.";
    }
}

document.addEventListener("DOMContentLoaded", boot);
