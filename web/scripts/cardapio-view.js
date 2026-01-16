const BASE_URL = "http://localhost:3000";

function getSocietyId() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = (params.get("societyId") || "").trim();
    const fromLS = (localStorage.getItem("societyId") || "").trim();
    const id = fromUrl || fromLS;
    return id ? id : null;
}

function money(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "-";
    return `R$ ${n.toFixed(2)}`;
}

document.addEventListener("DOMContentLoaded", () => {
    carregarCardapio();
});

function carregarCardapio() {
    const societyId = getSocietyId();

    const div = document.getElementById("listaCardapio");
    if (!societyId) {
        div.innerHTML = "<p style='color:#ef4444;font-weight:800;'>Society não encontrado.</p>";
        return;
    }

    localStorage.setItem("societyId", societyId);

    fetch(`${BASE_URL}/cardapio/${encodeURIComponent(societyId)}`)
        .then(res => res.json())
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                div.innerHTML = "<p>Nenhum item cadastrado.</p>";
                return;
            }

            div.innerHTML = data.map(i => `
        <div class="card" style="margin-bottom:10px;">
          <strong>${i.nome || "-"}</strong><br>
          Preço: ${money(i.preco)}
        </div>
      `).join("");
        })
        .catch(() => {
            div.innerHTML = "<p>Erro ao carregar cardápio.</p>";
        });
}
