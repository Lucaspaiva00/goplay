const BASE_URL = "https://goplay-dzlr.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
    carregarSocieties();
});

async function carregarSocieties() {
    const div = document.getElementById("listaSocieties");

    try {
        const res = await fetch(`${BASE_URL}/society`);
        const societies = await res.json();

        if (!Array.isArray(societies) || societies.length === 0) {
            div.innerHTML = "<p>Nenhum society encontrado.</p>";
            return;
        }

        div.innerHTML = societies.map(s => `
            <div class="card society-card">
                <div class="society-card-top">
                    <div class="society-main">
                        <strong>${s.nome || "-"}</strong>
                        <small>${s.cidade || ""}${s.estado ? " / " + s.estado : ""}</small>
                    </div>

                    <button class="btn-details" onclick="verDetalhes(${s.id})">
                        Ver detalhes
                    </button>
                </div>
            </div>
        `).join("");
    } catch (error) {
        console.error("Erro ao carregar societies:", error);
        div.innerHTML = "<p>Erro ao carregar societies.</p>";
    }
}

function verDetalhes(id) {
    window.location.href = `society-detalhe.html?societyId=${id}`;
}

window.verDetalhes = verDetalhes;