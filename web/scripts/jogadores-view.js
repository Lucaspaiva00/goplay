const BASE_URL = "http://localhost:3000";

function getSocietyId() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = (params.get("societyId") || "").trim();
    const fromLS = (localStorage.getItem("societyId") || "").trim();
    const id = fromUrl || fromLS;
    return id ? id : null;
}

document.addEventListener("DOMContentLoaded", () => {
    carregarJogadores();
});

function carregarJogadores() {
    const societyId = getSocietyId();
    const div = document.getElementById("listaJogadores");

    if (!societyId) {
        div.innerHTML = "<p style='color:#ef4444;font-weight:800;'>Erro: society não encontrado.</p>";
        return;
    }

    localStorage.setItem("societyId", societyId);

    fetch(`${BASE_URL}/society/${encodeURIComponent(societyId)}`)
        .then(res => res.json())
        .then(data => {
            const jogadores = data?.societyPlayers || [];

            if (!Array.isArray(jogadores) || jogadores.length === 0) {
                div.innerHTML = "<p>Nenhum jogador cadastrado ainda.</p>";
                return;
            }

            div.innerHTML = jogadores.map(j => `
        <div class="jogador-card">
          <strong>${j?.usuario?.nome || "-"}</strong>
          <p>Email: ${j?.usuario?.email || "-"}</p>
          <p>Telefone: ${j?.usuario?.telefone || "-"}</p>
        </div>
      `).join("");
        })
        .catch(() => {
            div.innerHTML = "<p>Erro ao carregar jogadores.</p>";
        });
}
