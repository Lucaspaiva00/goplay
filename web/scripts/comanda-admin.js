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
let statusFiltroAtual = "";

function el(id) {
    return document.getElementById(id);
}

function money(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data?.error || "Erro");
    }

    return data;
}

async function descobrirSocietyId() {
    if (societyId) return societyId;

    const lista = await fetchJSON(`${BASE_URL}/society/owner/${usuarioLogado.id}`);
    const s = lista[0];

    if (!s) throw new Error("Sem society");

    societyId = s.id;
    localStorage.setItem("societyId", s.id);

    return societyId;
}

async function carregarComandas() {
    try {
        await descobrirSocietyId();

        const lista = await fetchJSON(`${BASE_URL}/comanda/society/${societyId}`);
        comandasCache = lista;

        renderResumo();
        renderLista();

    } catch (e) {
        console.error(e);
        el("listaComandasAdmin").innerHTML = `<div class="empty-state">${e.message}</div>`;
    }
}

function filtrar(status) {
    statusFiltroAtual = status;
    renderLista();

    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.classList.remove("active");
        if (btn.dataset.status === status) {
            btn.classList.add("active");
        }
    });
}

function getLista() {
    if (!statusFiltroAtual) return comandasCache;

    return comandasCache.filter(c => c.status === statusFiltroAtual);
}

function renderResumo() {
    const abertas = comandasCache.filter(c => c.status === "ABERTA");
    const fechadas = comandasCache.filter(c => c.status === "FECHADA");
    const pagas = comandasCache.filter(c => c.status === "PAGA");

    el("kpiAbertas").textContent = abertas.length;
    el("kpiFechadas").textContent = fechadas.length;
    el("kpiPagas").textContent = pagas.length;

    const totalAberto = abertas.reduce((s, c) => s + c.total, 0);
    const receita = pagas.reduce((s, c) => s + c.total, 0);

    el("totalAberto").textContent = money(totalAberto);
    el("kpiReceita").textContent = money(receita);
}

function renderLista() {
    const lista = getLista();

    if (!lista.length) {
        el("listaComandasAdmin").innerHTML = `<div class="empty-state">Nenhuma comanda</div>`;
        return;
    }

    el("listaComandasAdmin").innerHTML = lista.map(c => `
        <div class="comanda-admin-card">
            <div class="header">
                <h4>#${c.codigo || c.id}</h4>
                <span class="badge ${c.status.toLowerCase()}">${c.status}</span>
            </div>

            <p><b>${c.usuario?.nome || "Cliente"}</b></p>
            <p>${c.time?.nome || "Sem time"}</p>

            <div class="valor">${money(c.total)}</div>

            <div class="actions">
                <button onclick="abrirDetalhe(${c.id})" class="btn-admin-secondary">
                    Ver
                </button>

                ${c.status === "FECHADA" ? `
                    <button onclick="pagarComanda(${c.id})" class="btn-admin-primary">
                        Pagar
                    </button>
                ` : ""}
            </div>
        </div>
    `).join("");
}

async function abrirDetalhe(id) {
    const comanda = await fetchJSON(`${BASE_URL}/comanda/${id}`);

    el("detalheItens").innerHTML = comanda.itens.map(i => `
        <div class="item-comanda">
            <div>
                <strong>${i.nomeProduto}</strong><br>
                <small>${i.quantidade}x ${money(i.precoUnitario)}</small>
            </div>
            <strong>${money(i.total)}</strong>
        </div>
    `).join("");

    el("modalDetalhe").classList.add("show");
}

function fecharDetalhe() {
    el("modalDetalhe").classList.remove("show");
}

async function pagarComanda(id) {
    await fetchJSON(`${BASE_URL}/comanda/${id}/pagar`, { method: "POST" });
    carregarComandas();
}

document.addEventListener("DOMContentLoaded", () => {

    // 🔥 conectar filtros corretamente
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.onclick = () => filtrar(btn.dataset.status);
    });

    el("btnFecharDetalhe").onclick = fecharDetalhe;

    carregarComandas();
});