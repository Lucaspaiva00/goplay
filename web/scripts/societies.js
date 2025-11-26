const BASE_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
    carregarSocieties();
});

function carregarSocieties() {
    fetch(`${BASE_URL}/geral`)
        .then(res => res.json())
        .then(data => {
            const societies = data.societies || [];
            const div = document.getElementById("listaSocieties");

            if (societies.length === 0) {
                div.innerHTML = "<p>Nenhum society encontrado.</p>";
                return;
            }

            div.innerHTML = societies.map(s => `
                <div class="card">
                    <strong>${s.nome}</strong><br>
                    <small>${s.cidade || ""} / ${s.estado || ""}</small>

                    <button class="btn-details" onclick="verDetalhes(${s.id})">
                        Ver detalhes
                    </button>
                </div>
            `).join("");
        })
        .catch(() => {
            document.getElementById("listaSocieties").innerHTML =
                "<p>Erro ao carregar societies.</p>";
        });
}

function verDetalhes(id) {
    window.location.href = `society-detalhe.html?societyId=${id}`;
}
