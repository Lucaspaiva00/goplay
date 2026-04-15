const BASE_URL = "https://goplay-dzlr.onrender.com";

function getSocietyId() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = (params.get("societyId") || "").trim();
    const fromLS = (localStorage.getItem("societyId") || "").trim();
    return fromUrl || fromLS || null;
}

function money(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "-";
    return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = {};
    }

    if (!res.ok) {
        throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
    }

    return data;
}

document.addEventListener("DOMContentLoaded", () => {
    carregarCardapio();
});

async function carregarCardapio() {
    const societyId = getSocietyId();
    const div = document.getElementById("listaCardapio");

    if (!societyId) {
        div.innerHTML = "<p style='color:#ef4444;font-weight:800;'>Society não encontrado.</p>";
        return;
    }

    localStorage.setItem("societyId", societyId);

    try {
        const data = await fetchJSON(`${BASE_URL}/cardapio/society/${encodeURIComponent(societyId)}`);

        if (!Array.isArray(data) || data.length === 0) {
            div.innerHTML = "<p>Este society ainda não possui itens no cardápio.</p>";
            return;
        }

        div.innerHTML = data.map((i) => `
            <div class="cardapio-item" style="margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                    <strong style="font-size:18px;">${i.nome || "-"}</strong>
                    <span style="font-weight:800;color:#052748;">${money(i.preco)}</span>
                </div>
            </div>
        `).join("");
    } catch (error) {
        console.error(error);
        div.innerHTML = `<p style="color:#b91c1c;font-weight:800;">${error.message || "Erro ao carregar cardápio."}</p>`;
    }
}