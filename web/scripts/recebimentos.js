const BASE_URL = "https://goplay-dzlr.onrender.com";

let RECEBIMENTOS = [];
let FILTRADOS = [];

function el(id) {
    return document.getElementById(id);
}

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
    return new URL(window.location.href).searchParams.get(name);
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

function money(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function dateBR(value) {
    if (!value) return "-";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("pt-BR");
}

function dateOnlyMs(value) {
    if (!value) return NaN;

    const s = String(value);

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        return new Date(`${s}T00:00:00`).getTime();
    }

    const d = new Date(s);
    return d.getTime();
}

function normalize(str) {
    return String(str || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function isPago(status) {
    return String(status || "").toUpperCase() === "PAGO";
}

function isPendente(status) {
    return String(status || "").toUpperCase() === "PENDENTE";
}

function statusBadge(status) {
    const s = String(status || "").toUpperCase();

    if (s === "PAGO") {
        return `<span class="status pago"><i class="fa-solid fa-circle-check"></i> PAGO</span>`;
    }

    if (s === "CANCELADO") {
        return `<span class="status cancelado"><i class="fa-solid fa-circle-xmark"></i> CANCELADO</span>`;
    }

    return `<span class="status pendente"><i class="fa-solid fa-hourglass-half"></i> PENDENTE</span>`;
}

function showError(message) {
    const box = el("msgErro");
    if (!box) return;

    if (!message) {
        box.style.display = "none";
        box.textContent = "";
        return;
    }

    box.style.display = "block";
    box.textContent = message;
}

async function descobrirSocietyId() {
    const viaUrl = getQueryParam("societyId");
    if (viaUrl) {
        localStorage.setItem("societyId", viaUrl);
        return viaUrl;
    }

    const viaLS = localStorage.getItem("societyId");
    if (viaLS) return viaLS;

    const usuario = getUsuarioLogado();

    if (!usuario?.id) {
        location.href = "login.html";
        return null;
    }

    if (usuario.tipo === "DONO_SOCIETY") {
        const lista = await fetchJSON(`${BASE_URL}/society/owner/${usuario.id}`);

        if (Array.isArray(lista) && lista.length) {
            localStorage.setItem("societyId", String(lista[0].id));
            return String(lista[0].id);
        }
    }

    return null;
}

async function carregarRecebimentos() {
    const usuario = getUsuarioLogado();

    if (!usuario?.id) {
        alert("Sessão expirada. Faça login novamente.");
        location.href = "login.html";
        return;
    }

    showError("");

    const tbody = el("tbody");
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="loading">Carregando recebimentos...</td></tr>`;
    }

    try {
        const societyId = await descobrirSocietyId();

        if (!societyId) {
            throw new Error("Society não identificado. Acesse pelo Meu Society ou selecione um society válido.");
        }

        const lista = await fetchJSON(`${BASE_URL}/pagamentos/society/${encodeURIComponent(societyId)}`);

        RECEBIMENTOS = Array.isArray(lista) ? lista : [];
        FILTRADOS = [...RECEBIMENTOS];

        renderTudo(FILTRADOS);
    } catch (e) {
        console.error(e);
        showError(e.message || "Erro ao carregar recebimentos.");

        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="empty">Não foi possível carregar os recebimentos.</td></tr>`;
        }
    }
}

function aplicarFiltros() {
    const de = el("filtroDe")?.value || "";
    const ate = el("filtroAte")?.value || "";
    const status = String(el("filtroStatus")?.value || "").toUpperCase();
    const tipo = String(el("filtroTipo")?.value || "").toUpperCase();
    const busca = normalize(el("filtroBusca")?.value || "");

    let lista = [...RECEBIMENTOS];

    if (de) {
        const min = new Date(`${de}T00:00:00`).getTime();
        lista = lista.filter(p => {
            const t = dateOnlyMs(p.createdAt || p.pagoEm);
            return !Number.isNaN(t) && t >= min;
        });
    }

    if (ate) {
        const max = new Date(`${ate}T23:59:59`).getTime();
        lista = lista.filter(p => {
            const t = dateOnlyMs(p.createdAt || p.pagoEm);
            return !Number.isNaN(t) && t <= max;
        });
    }

    if (status) {
        lista = lista.filter(p => String(p.status || "").toUpperCase() === status);
    }

    if (tipo) {
        lista = lista.filter(p => String(p.tipo || "").toUpperCase() === tipo);
    }

    if (busca) {
        lista = lista.filter(p => {
            const alvo = normalize([
                p.time?.nome,
                p.usuario?.nome,
                p.usuario?.email,
                p.campo?.nome,
                p.society?.nome,
                p.descricao,
                p.tipo,
                p.status,
                p.forma
            ].join(" "));

            return alvo.includes(busca);
        });
    }

    FILTRADOS = lista;
    renderTudo(FILTRADOS);
}

function calcularMetricas(lista) {
    const hoje = new Date();
    const hojeY = hoje.getFullYear();
    const hojeM = hoje.getMonth();
    const hojeD = hoje.getDate();

    const pagos = lista.filter(p => isPago(p.status));
    const pendentes = lista.filter(p => isPendente(p.status));

    const recebido = pagos.reduce((s, p) => s + Number(p.valor || 0), 0);
    const pendente = pendentes.reduce((s, p) => s + Number(p.valor || 0), 0);
    const total = lista.reduce((s, p) => s + Number(p.valor || 0), 0);

    const recebidoHoje = pagos.reduce((s, p) => {
        const base = p.pagoEm || p.createdAt;
        const d = new Date(base);
        if (
            d.getFullYear() === hojeY &&
            d.getMonth() === hojeM &&
            d.getDate() === hojeD
        ) {
            return s + Number(p.valor || 0);
        }
        return s;
    }, 0);

    const recebidoMes = pagos.reduce((s, p) => {
        const base = p.pagoEm || p.createdAt;
        const d = new Date(base);
        if (
            d.getFullYear() === hojeY &&
            d.getMonth() === hojeM
        ) {
            return s + Number(p.valor || 0);
        }
        return s;
    }, 0);

    const ticket = pagos.length ? recebido / pagos.length : 0;

    return {
        recebido,
        pendente,
        total,
        recebidoHoje,
        recebidoMes,
        ticket,
        qtd: lista.length,
        qtdPagos: pagos.length,
        qtdPendentes: pendentes.length
    };
}

function renderKPIsGlobal() {
    const m = calcularMetricas(RECEBIMENTOS);

    el("kpiRecebido").textContent = money(m.recebido);
    el("kpiPendente").textContent = money(m.pendente);
    el("kpiHoje").textContent = money(m.recebidoHoje);
    el("kpiMes").textContent = money(m.recebidoMes);
    el("kpiTicket").textContent = money(m.ticket);
    el("kpiQtd").textContent = `${m.qtd} pagamento(s) no total`;
}

function renderResumoFiltro(lista) {
    const m = calcularMetricas(lista);

    el("resumoRecebido").textContent = money(m.recebido);
    el("resumoPendente").textContent = money(m.pendente);
    el("resumoTotal").textContent = money(m.total);
    el("pillResultado").textContent = `${lista.length} registro(s)`;
}

function renderTabela(lista) {
    const tbody = el("tbody");

    if (!tbody) return;

    if (!lista.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty">
                    Nenhum recebimento encontrado para os filtros selecionados.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = lista.map(p => {
        const timeNome = p.time?.nome || "-";
        const campoNome = p.campo?.nome || "-";
        const tipo = p.tipo || "-";
        const descricao = p.descricao || "-";
        const valor = Number(p.valor || 0);

        return `
            <tr>
                <td>${dateBR(p.pagoEm || p.createdAt)}</td>
                <td><strong>${timeNome}</strong></td>
                <td>${campoNome}</td>
                <td><span class="tipo">${tipo}</span></td>
                <td class="desc">${descricao}</td>
                <td class="right money">${money(valor)}</td>
                <td>${statusBadge(p.status)}</td>
            </tr>
        `;
    }).join("");
}

function renderTudo(lista) {
    renderKPIsGlobal();
    renderResumoFiltro(lista);
    renderTabela(lista);
}

function limparFiltros() {
    el("filtroDe").value = "";
    el("filtroAte").value = "";
    el("filtroStatus").value = "";
    el("filtroTipo").value = "";
    el("filtroBusca").value = "";

    FILTRADOS = [...RECEBIMENTOS];
    renderTudo(FILTRADOS);
}

function exportarCSV() {
    const lista = FILTRADOS.length ? FILTRADOS : RECEBIMENTOS;

    if (!lista.length) {
        alert("Não há dados para exportar.");
        return;
    }

    const linhas = [
        ["Data", "Time", "Campo", "Tipo", "Descrição", "Valor", "Status", "Forma"]
    ];

    lista.forEach(p => {
        linhas.push([
            dateBR(p.pagoEm || p.createdAt),
            p.time?.nome || "-",
            p.campo?.nome || "-",
            p.tipo || "-",
            p.descricao || "-",
            Number(p.valor || 0).toFixed(2).replace(".", ","),
            p.status || "-",
            p.forma || "-"
        ]);
    });

    const csv = linhas
        .map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
        .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    const hoje = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `recebimentos-goplay-${hoje}.csv`;
    a.click();

    URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", () => {
    el("btnFiltrar")?.addEventListener("click", aplicarFiltros);
    el("btnAtualizar")?.addEventListener("click", carregarRecebimentos);
    el("btnExportar")?.addEventListener("click", exportarCSV);

    el("filtroBusca")?.addEventListener("input", aplicarFiltros);
    el("filtroStatus")?.addEventListener("change", aplicarFiltros);
    el("filtroTipo")?.addEventListener("change", aplicarFiltros);
    el("filtroDe")?.addEventListener("change", aplicarFiltros);
    el("filtroAte")?.addEventListener("change", aplicarFiltros);

    carregarRecebimentos();
});