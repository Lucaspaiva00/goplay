const BASE_URL = "https://goplay-dzlr.onrender.com";

const usuarioMC = JSON.parse(localStorage.getItem("usuarioLogado") || "null");

if (!usuarioMC?.id) {
    window.location.href = "login.html";
}

let societyId = localStorage.getItem("societyId");

function money(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

async function fetchJSON(url) {
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) throw new Error(data?.error || "Erro");

    return data;
}

async function carregarComandas() {
    try {

        if (!societyId) {
            const lista = await fetchJSON(`${BASE_URL}/society/owner/${usuarioMC.id}`);
            societyId = lista[0]?.id;
            localStorage.setItem("societyId", societyId);
        }

        const comandas = await fetchJSON(`${BASE_URL}/comanda/society/${societyId}`);

        // 🔥 FILTRA SOMENTE AS DO USUÁRIO
        const minhas = comandas.filter(c => Number(c.usuarioId) === Number(usuarioMC.id));

        const wrap = document.getElementById("listaMinhasComandas");

        if (!minhas.length) {
            wrap.innerHTML = `<div class="empty-state">Você não possui comandas.</div>`;
            return;
        }

        wrap.innerHTML = minhas.map(c => `
            <div class="comanda-admin-card">
                <div style="display:flex; justify-content:space-between;">
                    <h4>#${c.codigo || c.id}</h4>
                    <span class="badge ${c.status.toLowerCase()}">${c.status}</span>
                </div>

                <p><strong>Total:</strong> ${money(c.total)}</p>
                <p><strong>Criada em:</strong> ${new Date(c.createdAt).toLocaleString("pt-BR")}</p>
            </div>
        `).join("");

    } catch (e) {
        console.error(e);
        document.getElementById("listaMinhasComandas").innerHTML =
            `<div class="empty-state">${e.message}</div>`;
    }
}

document.addEventListener("DOMContentLoaded", carregarComandas);