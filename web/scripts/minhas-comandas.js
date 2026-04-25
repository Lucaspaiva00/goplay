const BASE_URL = "https://goplay-dzlr.onrender.com";

const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

if (!usuario?.id) {
    window.location.href = "login.html";
}

function money(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

async function carregar() {
    try {

        const res = await fetch(`${BASE_URL}/pagamentos/usuario/${usuario.id}`);
        const data = await res.json();

        const lista = data.pagamentos || [];

        const wrap = document.getElementById("listaMinhasComandas");

        if (!lista.length) {
            wrap.innerHTML = `<div class="empty-state">Você não possui comandas.</div>`;
            return;
        }

        wrap.innerHTML = lista.map(p => `
            <div class="comanda-admin-card">
                <h4>${p.descricao || "Comanda"}</h4>
                <p>Status: ${p.status}</p>
                <p>Valor: ${money(p.valor)}</p>
            </div>
        `).join("");

    } catch (e) {
        console.error(e);
    }
}

document.addEventListener("DOMContentLoaded", carregar);