const BASE_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", carregarCampeonatos);

function carregarCampeonatos() {
    const societyId = localStorage.getItem("societyId");

    if (!societyId) {
        document.getElementById("listaCampeonatos").innerHTML =
            "<p>Nenhum society selecionado.</p>";
        return;
    }

    fetch(`${BASE_URL}/campeonato/society/${societyId}`)
        .then(res => res.json())
        .then(lista => {
            const div = document.getElementById("listaCampeonatos");

            if (lista.length === 0) {
                div.innerHTML = "<p>Nenhum campeonato cadastrado.</p>";
                return;
            }

            div.innerHTML = lista.map(c => `
                <div class="campeonato-card">
                    <strong>${c.nome}</strong><br>
                    <span style="font-size:14px;">${c.tipo}</span><br>
                    Times inscritos: <b>${c.times.length}</b>
                    <br><br>
                    <button class="btn-esportivo" onclick="abrir(${c.id})">Gerenciar</button>
                </div>
            `).join("");
        });
}

function abrir(id) {
    window.location.href = `campeonato-detalhe.html?campeonatoId=${id}`;
}
