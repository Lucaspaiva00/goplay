const BASE_URL = "http://localhost:3000";

let campeonatoId = null;

document.addEventListener("DOMContentLoaded", init);

function init() {
    const url = new URLSearchParams(window.location.search);
    campeonatoId = url.get("campeonatoId");

    carregarInfo();
    carregarTimes();
    carregarJogos();
}

function carregarInfo() {
    fetch(`${BASE_URL}/campeonato/society/${localStorage.getItem("societyId")}`)
        .then(res => res.json())
        .then(lista => {
            const c = lista.find(x => x.id == campeonatoId);
            if (c) document.getElementById("titulo").innerHTML = c.nome;
        });
}

function carregarTimes() {
    fetch(`${BASE_URL}/campeonato/society/${localStorage.getItem("societyId")}`)
        .then(res => res.json())
        .then(lista => {
            const c = lista.find(x => x.id == campeonatoId);

            const div = document.getElementById("listaTimes");
            div.innerHTML = c.times.map(t => `
                <p class="time">• ${t.time.nome}</p>
            `).join("");
        });
}

function addTime() {
    const timeId = document.getElementById("timeId").value;

    fetch(`${BASE_URL}/campeonato/${campeonatoId}/add-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeId })
    })
        .then(res => res.json())
        .then(() => {
            alert("Time adicionado!");
            carregarTimes();
        });
}

function gerarChaves() {
    fetch(`${BASE_URL}/campeonato/${campeonatoId}/gerar-chaves`, {
        method: "POST"
    })
        .then(res => res.json())
        .then(() => {
            alert("Chaveamento gerado!");
            carregarJogos();
        });
}

function carregarJogos() {
    fetch(`${BASE_URL}/campeonato/${campeonatoId}/jogos`)
        .then(res => res.json())
        .then(lista => {
            const div = document.getElementById("listaJogos");

            if (lista.length === 0) {
                div.innerHTML = "<p>Nenhum jogo gerado.</p>";
                return;
            }

            div.innerHTML = lista.map(j => `
    <div class="jogo-card">
        <div class="jogo-nome">
            ${j.timeA.nome} <b>x</b> ${j.timeB.nome}
        </div>

        <input id="gA${j.id}" class="input" placeholder="Gols ${j.timeA.nome}">
        <input id="gB${j.id}" class="input" placeholder="Gols ${j.timeB.nome}">

        <button class="btn-primary" onclick="finalizarJogo(${j.id})">
            Finalizar jogo
        </button>
    </div>
`).join("");

        });
}

function finalizarJogo(id) {
    const golsA = document.getElementById(`gA${id}`).value;
    const golsB = document.getElementById(`gB${id}`).value;

    fetch(`${BASE_URL}/campeonato/jogo/${id}/finalizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ golsA, golsB })
    })
        .then(res => res.json())
        .then(() => {
            alert("Jogo finalizado!");
            carregarJogos();
        });
}
