const BASE_URL = "http://localhost:3000";
let campeonatoId = null;

document.addEventListener("DOMContentLoaded", () => {
    campeonatoId = new URLSearchParams(location.search).get("campeonatoId");
    carregarDetalhes();

    document.querySelectorAll(".tab").forEach(btn => {
        btn.addEventListener("click", () => {
            mudarAba(btn.dataset.tab);
        });
    });
});

// Troca de abas
function mudarAba(nomeAba) {
    document.querySelectorAll(".tab, .tab-content").forEach(e => e.classList.remove("active"));
    document.querySelector(`button[data-tab="${nomeAba}"]`).classList.add("active");
    document.getElementById(nomeAba).classList.add("active");
}

// Carregamento geral
function carregarDetalhes() {
    fetch(`${BASE_URL}/campeonato/${campeonatoId}`)
        .then(r => r.json())
        .then(c => {
            document.getElementById("titulo").textContent = c.nome;
            carregarTimes(c);
            carregarSelectTimes();
            carregarGrupos(c);
            carregarJogos(c);
            liberarFluxo(c);
        });
}

// Fluxo visual
async function loadBracket() {
    const res = await fetch(`${BASE_URL}/campeonato/bracket/${campeonatoId}`);
    const jogos = await res.json();

    const container = document.getElementById("bracketContainer");
    container.innerHTML = "";

    if (!jogos.length) {
        return container.innerHTML = `
            <p class="alert-info">Mata-mata ainda não gerado ou nenhum jogo finalizado.</p>
        `;
    }

    const rounds = {};

    jogos.forEach(j => {
        if (!rounds[j.round]) rounds[j.round] = [];
        rounds[j.round].push(j);
    });

    Object.keys(rounds).forEach(round => {
        const divRound = document.createElement("div");
        divRound.className = "round";
        divRound.innerHTML = `<h3>Rodada ${round}</h3>`;

        rounds[round].forEach(j => {
            const card = document.createElement("div");
            card.className = "match " + (j.finalizado ? "winner" : "");

            card.innerHTML = `
                <span>${j.timeA.nome} ${j.golsA ?? ""}</span>
                <strong>x</strong>
                <span>${j.timeB.nome} ${j.golsB ?? ""}</span>
            `;

            divRound.appendChild(card);
        });

        container.appendChild(divRound);
    });
}
loadBracket();
// TIMES
function carregarTimes(c) {
    document.getElementById("listaTimes").innerHTML =
        c.times.map(t => `<p>• ${t.time.nome}</p>`).join("");
}

function carregarSelectTimes() {
    fetch(`${BASE_URL}/time`)
        .then(r => r.json())
        .then(times => {
            const select = document.getElementById("timeId");
            select.innerHTML = `<option value="">Selecione...</option>`;
            times.forEach(t => select.innerHTML += `
                <option value="${t.id}">${t.nome}</option>`);
        });
}

function addTime() {
    const id = document.getElementById("timeId").value;
    if (!id) return alert("Selecione um time!");

    fetch(`${BASE_URL}/campeonato/${campeonatoId}/add-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeId: Number(id) })
    }).then(() => carregarDetalhes());
}

// GRUPOS
function carregarGrupos(c) {
    document.getElementById("listaGrupos").innerHTML =
        c.grupos.map(g => `
            <div class="grupo-box">
                <div class="grupo-title">${g.nome}</div>
                <ul>${g.timesGrupo.map(t => `<li>${t.time.nome}</li>`).join("")}</ul>
            </div>
        `).join("");
}

function gerarGrupos() {
    fetch(`${BASE_URL}/campeonato/${campeonatoId}/gerar-grupos`, { method: "POST" })
        .then(() => carregarDetalhes());
}

function gerarJogosGrupos() {
    fetch(`${BASE_URL}/campeonato/${campeonatoId}/gerar-jogos-grupos`, { method: "POST" })
        .then(() => carregarDetalhes());
}

// JOGOS
function carregarJogos(c) {
    const div = document.getElementById("listaJogos");
    if (!c.jogos.length) return div.innerHTML = "<p>Aguardando...</p>";

    div.innerHTML = c.jogos.map(j => `
        <div class="jogo-card">
            <div class="match-title">${j.timeA.nome} ${j.golsA ?? ""} x ${j.golsB ?? ""} ${j.timeB.nome}</div>

            ${j.finalizado ? `
                <span class="status-finalizado">🟩 Finalizado</span>
            ` : `
                <input id="gA${j.id}" type="number" placeholder="Gols A">
                <input id="gB${j.id}" type="number" placeholder="Gols B">
                <button class="btn-primary" onclick="finalizarJogo(${j.id})">Finalizar</button>
            `}
        </div>
    `).join("");
}

function finalizarJogo(id) {
    const golsA = Number(document.getElementById(`gA${id}`).value);
    const golsB = Number(document.getElementById(`gB${id}`).value);
    if (isNaN(golsA) || isNaN(golsB)) return alert("Preencha gols!");

    fetch(`${BASE_URL}/campeonato/jogo/${id}/finalizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ golsA, golsB })
    }).then(() => carregarDetalhes());
}

function gerarMataMata() {
    fetch(`${BASE_URL}/campeonato/${campeonatoId}/gerar-mata-mata`, { method: "POST" })
        .then(() => carregarDetalhes());
}

function abrirBracket() {
    location.href = `campeonato-bracket.html?campeonatoId=${campeonatoId}`;
}
