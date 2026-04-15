const BASE_URL = "https://goplay-dzlr.onrender.com";

function getSocietyId() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = (params.get("societyId") || "").trim();
    const fromLS = (localStorage.getItem("societyId") || "").trim();
    return fromUrl || fromLS || null;
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
    carregarJogadores();
});

async function carregarJogadores() {
    const societyId = getSocietyId();
    const div = document.getElementById("listaJogadores");

    if (!societyId) {
        div.innerHTML = "<p style='color:#ef4444;font-weight:800;'>Erro: society não encontrado.</p>";
        return;
    }

    localStorage.setItem("societyId", societyId);

    try {
        const data = await fetchJSON(`${BASE_URL}/society/${encodeURIComponent(societyId)}`);
        const jogadores = data?.societyPlayers || [];

        if (!Array.isArray(jogadores) || jogadores.length === 0) {
            div.innerHTML = "<p>Nenhum jogador cadastrado neste society.</p>";
            return;
        }

        div.innerHTML = jogadores.map((j) => `
            <div class="jogador-card">
                <strong>${j?.usuario?.nome || "-"}</strong>
                <p>Email: ${j?.usuario?.email || "-"}</p>
                <p>Telefone: ${j?.usuario?.telefone || "-"}</p>
            </div>
        `).join("");
    } catch (error) {
        console.error(error);
        div.innerHTML = `<p style="color:#b91c1c;font-weight:800;">${error.message || "Erro ao carregar jogadores."}</p>`;
    }
}