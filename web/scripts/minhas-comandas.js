const BASE_URL = "https://goplay-dzlr.onrender.com";
const usuarioMC = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
if (!usuarioMC?.id) window.location.href = "login.html";

function el(id) { return document.getElementById(id); }
function money(v) { return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function escapeHtml(v) {
    return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!res.ok) throw new Error(data?.error || text || "Erro na requisição");
    return data;
}

async function carregarComandas() {
    try {
        const comandas = await fetchJSON(`${BASE_URL}/comanda/usuario/${usuarioMC.id}`);
        const wrap = el("listaMinhasComandas");
        if (!Array.isArray(comandas) || !comandas.length) {
            wrap.innerHTML = `<div class="empty-state">Você ainda não possui comandas.</div>`;
            return;
        }

        wrap.innerHTML = `
            <div class="comanda-card-head">
                <div>
                    <h3><i class="fa fa-receipt"></i> Histórico de comandas</h3>
                    <p>Todas as suas comandas, em todas as empresas.</p>
                </div>
            </div>
            <div class="comandas-admin-list">
                ${comandas.map(c => `
                    <div class="comanda-admin-card" data-id="${c.id}" style="cursor:pointer">
                        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
                            <div>
                                <h4>${escapeHtml(c.society?.nome || "Empresa")}</h4>
                                <p>Comanda #${escapeHtml(c.codigo || c.id)}</p>
                            </div>
                            <span class="badge ${String(c.status || "").toLowerCase()}">${escapeHtml(c.status || "-")}</span>
                        </div>
                        <p><strong>Total:</strong> ${money(c.total)}</p>
                        <p><strong>Criada em:</strong> ${new Date(c.createdAt).toLocaleString("pt-BR")}</p>
                    </div>
                `).join("")}
            </div>`;
    } catch (e) {
        console.error(e);
        el("listaMinhasComandas").innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
    }
}

async function abrirDetalheComanda(id) {
    try {
        const comanda = await fetchJSON(`${BASE_URL}/comanda/${id}`);
        const itens = Array.isArray(comanda.itens) ? comanda.itens : [];
        el("tituloComanda").textContent = `${comanda.society?.nome || "Empresa"} — #${comanda.codigo || comanda.id}`;
        el("subtituloComanda").textContent = `Status: ${comanda.status}`;
        el("totalDetalheComanda").textContent = money(comanda.total);
        el("itensDetalheComanda").innerHTML = itens.length ? itens.map(item => `
            <div class="item-comanda">
                <div><strong>${escapeHtml(item.nomeProduto)}</strong><br><small>${item.quantidade}x ${money(item.precoUnitario)}</small></div>
                <strong>${money(item.total)}</strong>
            </div>`).join("") : `<div class="empty-state">Nenhum item consumido.</div>`;
        el("modalDetalheComanda").classList.add("show");
    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao carregar detalhes.");
    }
}

function fecharModalComanda() { el("modalDetalheComanda")?.classList.remove("show"); }

document.addEventListener("DOMContentLoaded", () => {
    carregarComandas();
    el("listaMinhasComandas")?.addEventListener("click", e => {
        const card = e.target.closest(".comanda-admin-card");
        if (card) abrirDetalheComanda(card.dataset.id);
    });
    el("modalDetalheComanda")?.addEventListener("click", e => {
        if (e.target.id === "modalDetalheComanda") fecharModalComanda();
    });
});
window.fecharModalComanda = fecharModalComanda;
