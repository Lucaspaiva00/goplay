const BASE_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
    const societyId = localStorage.getItem("societyId");
    carregarCampeonatos(societyId);
});

function carregarCampeonatos(societyId) {
    fetch(`${BASE_URL}/campeonato/society/${societyId}`)
        .then(res => res.json())
        .then(lista => {
            const div = document.getElementById("listaCampeonatos");

            if (!lista.length) {
                div.innerHTML = "<p>Nenhum campeonato criado ainda.</p>";
                return;
            }

            div.innerHTML = lista.map(c => `
                <div class="card-campeonato" onclick="abrirDetalhe(${c.id})">
                    <h3>${c.nome}</h3>
                    <p>${c.tipo} - ${c.times.length} time(s)</p>
                </div>
            `).join("");
        })
        .catch(() => alert("Erro ao carregar campeonatos"));
}

function abrirDetalhe(id) {
    location.href = `campeonato-detalhe.html?campeonatoId=${id}`;
}
