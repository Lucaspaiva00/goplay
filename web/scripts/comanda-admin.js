const BASE_URL = "https://goplay-dzlr.onrender.com";

const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
let societyId = localStorage.getItem("societyId") ? Number(localStorage.getItem("societyId")) : null;

if (!usuarioLogado?.id) {
    window.location.href = "login.html";
}

if (usuarioLogado.tipo !== "DONO_SOCIETY") {
    alert("Acesso permitido apenas para dono do society.");
    window.location.href = "home.html";
}

let comandasCache = [];
let statusFiltroAtual = "TODAS";

function el(id) {
    return document.getElementById(id);
}

function money(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function dtBR(value) {
    if (!value) return "-";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("pt-BR");
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

async function descobrirSocietyId() {
    if (societyId) return societyId;

    const lista = await fetchJSON(`${BASE_URL}/society/owner/${usuarioLogado.id}`);
    const society = Array.isArray(lista) ? lista[0] : null;

    if (!society?.id) {
        throw new Error("Você ainda não possui society cadastrado.");
    }

    societyId = Number(society.id);
    localStorage.setItem("societyId", String(societyId));
    localStorage.setItem("societyOwnerId", String(usuarioLogado.id));

    return societyId;
}

async function carregarComandas() {
    try {
        await descobrirSocietyId();

        const lista = await fetchJSON(`${BASE_URL}/comanda/society/${societyId}`);
        comandasCache = Array.isArray(lista) ? lista : [];

        renderResumo();
        renderLista();
    } catch (e) {
        console.error(e);

        const listaEl = el("listaComandas") || el("lista");
        if (listaEl) {
            listaEl.innerHTML = `<div class="empty-state">${escapeHtml(e.message || "Erro ao carregar comandas.")}</div>`;
        }
    }
}

function filtrar(status) {
    statusFiltroAtual = status || "TODAS";
    renderLista();
}

function getComandasFiltradas() {
    if (statusFiltroAtual === "TODAS") return [...comandasCache];

    return comandasCache.filter(c =>
        String(c.status || "").toUpperCase() === String(statusFiltroAtual).toUpperCase()
    );
}

function renderResumo() {
    const abertas = comandasCache.filter(c => c.status === "ABERTA");
    const fechadas = comandasCache.filter(c => c.status === "FECHADA");
    const pagas = comandasCache.filter(c => c.status === "PAGA");

    const totalAberto = abertas.reduce((s, c) => s + Number(c.total || 0), 0);
    const totalFechado = fechadas.reduce((s, c) => s + Number(c.total || 0), 0);
    const totalPago = pagas.reduce((s, c) => s + Number(c.total || 0), 0);

    setText("kpiAbertas", abertas.length);
    setText("kpiFechadas", fechadas.length);
    setText("kpiPagas", pagas.length);
    setText("kpiTotalAberto", money(totalAberto));
    setText("kpiTotalFechado", money(totalFechado));
    setText("kpiTotalPago", money(totalPago));
}

function renderLista() {
    const listaEl = el("listaComandas") || el("lista");
    if (!listaEl) return;

    const lista = getComandasFiltradas();

    if (!lista.length) {
        listaEl.innerHTML = `<div class="empty-state">Nenhuma comanda encontrada.</div>`;
        return;
    }

    listaEl.innerHTML = `
        <div class="comandas-admin-list">
            ${lista.map(c => cardComanda(c)).join("")}
        </div>
    `;
}

function cardComanda(c) {
    const status = String(c.status || "").toUpperCase();
    const badgeClass = status.toLowerCase();

    const cliente = c.usuario?.nome || "Cliente";
    const time = c.time?.nome || "Sem time vinculado";

    const btnDetalhe = `
        <button class="btn-admin-secondary" onclick="abrirDetalhe(${c.id})">
            <i class="fa-solid fa-eye"></i> Ver
        </button>
    `;

    const btnGerarPagamento = status === "FECHADA" && !c.pagamento
        ? `
            <button class="btn-admin-primary" onclick="gerarPagamento(${c.id})">
                <i class="fa-solid fa-receipt"></i> Gerar pagamento
            </button>
        `
        : "";

    const btnPagar = status === "FECHADA"
        ? `
            <button class="btn-admin-primary" onclick="pagarComanda(${c.id})">
                <i class="fa-solid fa-check"></i> Confirmar pagamento
            </button>
        `
        : "";

    return `
        <div class="comanda-admin-card">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                <h4>Comanda #${c.codigo || c.id}</h4>
                <span class="badge ${badgeClass}">${status}</span>
            </div>

            <p><strong>Cliente:</strong> ${escapeHtml(cliente)}</p>
            <p><strong>Time:</strong> ${escapeHtml(time)}</p>
            <p><strong>Criada em:</strong> ${dtBR(c.createdAt)}</p>

            <div class="valor">${money(c.total)}</div>

            <div class="comanda-admin-actions">
                ${btnDetalhe}
                ${btnGerarPagamento}
                ${btnPagar}
            </div>
        </div>
    `;
}

async function abrirDetalhe(id) {
    try {
        const comanda = await fetchJSON(`${BASE_URL}/comanda/${id}`);

        const modal = el("modalDetalhe");
        const corpo = el("modalDetalheBody");

        if (!modal || !corpo) {
            alert("Modal de detalhe não encontrado no HTML.");
            return;
        }

        const itens = Array.isArray(comanda.itens) ? comanda.itens : [];

        corpo.innerHTML = `
            <div class="modal-info">
                <div><strong>Comanda:</strong> #${comanda.codigo || comanda.id}</div>
                <div><strong>Status:</strong> ${comanda.status}</div>
                <div><strong>Cliente:</strong> ${escapeHtml(comanda.usuario?.nome || "-")}</div>
                <div><strong>Time:</strong> ${escapeHtml(comanda.time?.nome || "-")}</div>
                <div><strong>Total:</strong> ${money(comanda.total)}</div>
                <div><strong>Criada em:</strong> ${dtBR(comanda.createdAt)}</div>
            </div>

            <h3 style="margin-top:16px;">Itens consumidos</h3>

            ${itens.length ? itens.map(item => `
                <div class="item-comanda">
                    <div>
                        <strong>${escapeHtml(item.nomeProduto)}</strong><br>
                        <small>${item.quantidade}x ${money(item.precoUnitario)}</small>
                    </div>
                    <strong>${money(item.total)}</strong>
                </div>
            `).join("") : `<div class="empty-state">Nenhum item consumido.</div>`}
        `;

        modal.classList.add("show");
    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao abrir detalhes.");
    }
}

function fecharDetalhe() {
    const modal = el("modalDetalhe");
    if (modal) modal.classList.remove("show");
}

async function gerarPagamento(id) {
    try {
        if (!confirm("Gerar pagamento para esta comanda?")) return;

        await fetchJSON(`${BASE_URL}/comanda/${id}/gerar-pagamento`, {
            method: "POST"
        });

        alert("Pagamento gerado com sucesso.");
        await carregarComandas();
    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao gerar pagamento.");
    }
}

async function pagarComanda(id) {
    try {
        if (!confirm("Confirmar pagamento desta comanda?")) return;

        await fetchJSON(`${BASE_URL}/comanda/${id}/pagar`, {
            method: "POST"
        });

        alert("Pagamento confirmado.");
        await carregarComandas();
    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao confirmar pagamento.");
    }
}

function setText(id, value) {
    const node = el(id);
    if (node) node.textContent = value;
}

function escapeHtml(s) {
    return String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
    const btnTodas = el("btnFiltroTodas");
    const btnAbertas = el("btnFiltroAbertas");
    const btnFechadas = el("btnFiltroFechadas");
    const btnPagas = el("btnFiltroPagas");
    const btnAtualizar = el("btnAtualizarComandas");

    if (btnTodas) btnTodas.onclick = () => filtrar("TODAS");
    if (btnAbertas) btnAbertas.onclick = () => filtrar("ABERTA");
    if (btnFechadas) btnFechadas.onclick = () => filtrar("FECHADA");
    if (btnPagas) btnPagas.onclick = () => filtrar("PAGA");
    if (btnAtualizar) btnAtualizar.onclick = carregarComandas;

    const modal = el("modalDetalhe");
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) fecharDetalhe();
        });
    }

    carregarComandas();
});

window.filtrar = filtrar;
window.abrirDetalhe = abrirDetalhe;
window.fecharDetalhe = fecharDetalhe;
window.gerarPagamento = gerarPagamento;
window.pagarComanda = pagarComanda;