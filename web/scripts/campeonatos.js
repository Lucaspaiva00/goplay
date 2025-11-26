const BASE_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", carregarCampeonatos);

function carregarCampeonatos() {
    const societyId = localStorage.getItem("societyId");

    if (!societyId) {
        document.getElementById("listaCampeonatos").innerHTML =
            "<p class='sem-campeonatos'>Nenhum society selecionado.</p>";
        return;
    }

    fetch(`${BASE_URL}/campeonato/society/${societyId}`)
        .then(res => res.json())
        .then(lista => {
            const div = document.getElementById("listaCampeonatos");

            if (!lista || lista.length === 0) {
                div.innerHTML = "<p class='sem-campeonatos'>Nenhum campeonato cadastrado.</p>";
                return;
            }

            div.innerHTML = lista.map(c => `
                <div class="card-campeonato">

                    <h3>${c.nome}</h3>
                    <div class="tipo">${c.tipo.replace("_", " ")}</div>

                    <div class="times">
                        Times inscritos: <b>${c.times.length}</b>
                    </div>

                    <button class="card-btn" onclick="abrir(${c.id})">
                        Gerenciar
                    </button>

                </div>
            `).join("");
        });
}

function abrir(id) {
    window.location.href = `campeonato-detalhe.html?campeonatoId=${id}`;
}
