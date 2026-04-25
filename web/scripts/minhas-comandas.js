const BASE_URL = "https://goplay-dzlr.onrender.com";

const usuarioMC = JSON.parse(localStorage.getItem("usuarioLogado") || "null");

if (!usuarioMC?.id) {
    window.location.href = "login.html";
}

let societyId = localStorage.getItem("societyId");

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
    const text = await res.text().catch(() => "");
    let data;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = null;
    }

    if (!res.ok) {
        throw new Error(data?.error || text || "Erro na requisição");
    }

    return data;
}

/* =========================
   CARREGAR COMANDAS
========================= */
async function carregarComandas() {
    try {

        if (!societyId) {
            const lista = await fetchJSON(`${BASE_URL}/society/owner/${usuarioMC.id}`);
            societyId = lista[0]?.id;

            if (!societyId) {
                throw new Error("Nenhum society encontrado.");
            }

            localStorage.setItem("societyId", societyId);
        }

        const comandas = await fetchJSON(`${BASE_URL}/comanda/society/${societyId}`);

        const minhas = comandas.filter(c =>
            Number(c.usuarioId) === Number(usuarioMC.id)
        );

        const wrap = el("listaMinhasComandas");

        if (!minhas.length) {
            wrap.innerHTML = `<div class="empty-state">Você não possui comandas.</div>`;
            return;
        }

        wrap.innerHTML = `
            <div class="comandas-admin-list">
                ${minhas.map(c => `
                    <div class="comanda-admin-card" data-id="${c.id}">
                        <div style="display:flex; justify-content:space-between;">
                            <h4>#${c.codigo || c.id}</h4>
                            <span class="badge ${c.status.toLowerCase()}">${c.status}</span>
                        </div>

                        <p><strong>Total:</strong> ${money(c.total)}</p>
                        <p><strong>Criada em:</strong> ${new Date(c.createdAt).toLocaleString("pt-BR")}</p>
                    </div>
                `).join("")}
            </div>
        `;

    } catch (e) {
        console.error(e);
        el("listaMinhasComandas").innerHTML =
            `<div class="empty-state">${e.message}</div>`;
    }
}

/* =========================
   ABRIR MODAL
========================= */
async function abrirDetalheComanda(id) {
    try {
        const comanda = await fetchJSON(`${BASE_URL}/comanda/${id}`);

        const itens = Array.isArray(comanda.itens) ? comanda.itens : [];

        el("tituloComanda").textContent =
            `Comanda #${comanda.codigo || comanda.id}`;

        el("subtituloComanda").textContent =
            `Status: ${comanda.status}`;

        el("totalDetalheComanda").textContent =
            money(comanda.total);

        const wrap = el("itensDetalheComanda");

        if (!itens.length) {
            wrap.innerHTML = `<div class="empty-state">Nenhum item consumido.</div>`;
        } else {
            wrap.innerHTML = itens.map(item => `
                <div class="item-comanda">
                    <div>
                        <strong>${item.nomeProduto}</strong><br>
                        <small>${item.quantidade}x ${money(item.precoUnitario)}</small>
                    </div>
                    <strong>${money(item.total)}</strong>
                </div>
            `).join("");
        }

        el("modalDetalheComanda").classList.add("show");

    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao carregar detalhes.");
    }
}

/* =========================
   FECHAR MODAL
========================= */
function fecharModalComanda() {
    el("modalDetalheComanda").classList.remove("show");
}

/* =========================
   EVENTOS
========================= */
document.addEventListener("DOMContentLoaded", () => {

    carregarComandas();

    // 🔥 clique nos cards (delegação - padrão profissional)
    el("listaMinhasComandas").addEventListener("click", (e) => {
        const card = e.target.closest(".comanda-admin-card");
        if (!card) return;

        const id = card.getAttribute("data-id");
        abrirDetalheComanda(id);
    });

    // 🔥 fechar modal clicando fora
    const modal = el("modalDetalheComanda");
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            fecharModalComanda();
        }
    });
});

/* =========================
   GLOBAL
========================= */
window.fecharModalComanda = fecharModalComanda;