const BASE_URL = "http://localhost:3000";
const campeonatoId = new URLSearchParams(location.search).get("campeonatoId");

async function loadBracket() {
    const res = await fetch(`${BASE_URL}/campeonato/${campeonatoId}/bracket`);
    const jogos = await res.json();

    const bracketDiv = document.getElementById("bracket");
    const msgDiv = document.getElementById("mensagem");

    bracketDiv.innerHTML = "";
    msgDiv.innerHTML = "";

    if (!jogos.length) {
        msgDiv.innerHTML = `<p class="alert-info">Mata-mata não gerado.</p>`;
        return;
    }

    const rounds = {};

    jogos.forEach(j => {
        if (!rounds[j.round]) rounds[j.round] = [];
        rounds[j.round].push(j);
    });

    Object.keys(rounds).forEach(round => {
        const col = document.createElement("div");
        col.className = "round";

        col.innerHTML = `<h3>Rodada ${round}</h3>`;

        rounds[round].forEach(j => {
            col.innerHTML += `
                <div class="match ${j.finalizado ? "winner" : ""}">
                    <span>${j.timeA.nome} ${j.golsA ?? ""}</span>
                    <strong>x</strong>
                    <span>${j.timeB.nome} ${j.golsB ?? ""}</span>
                </div>
            `;
        });

        bracketDiv.appendChild(col);
    });
}

loadBracket();
