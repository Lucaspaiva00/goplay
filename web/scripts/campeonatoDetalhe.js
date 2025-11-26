const BASE_URL = "http://localhost:3000";

let campeonatoId = null;

// ================================
// INICIALIZAÇÃO
// ================================
document.addEventListener("DOMContentLoaded", () => {
    const url = new URLSearchParams(window.location.search);
    campeonatoId = url.get("campeonatoId");

    carregarInfo();
    carregarTimes();
    carregarTimesDoSelect();
    carregarJogos();
});

// ================================
// CARREGAR INFORMAÇÕES DO CAMPEONATO
// ================================
function carregarInfo() {
    const societyId = localStorage.getItem("societyId");
    if (!societyId) return;

    fetch(`${BASE_URL}/campeonato/society/${societyId}`)
        .then(res => res.json())
        .then(lista => {
            const c = lista.find(x => x.id == campeonatoId);
            if (c) document.getElementById("titulo").textContent = c.nome;
        })
        .catch(() => console.log("Erro ao carregar nome do campeonato"));
}

// ================================
// LISTAR TIMES JÁ INSCRITOS
// ================================
function carregarTimes() {
    const societyId = localStorage.getItem("societyId");
    if (!societyId) return;

    fetch(`${BASE_URL}/campeonato/society/${societyId}`)
        .then(res => res.json())
        .then(lista => {
            const c = lista.find(x => x.id == campeonatoId);
            const div = document.getElementById("listaTimes");

            if (!c || !c.times || c.times.length === 0) {
                div.innerHTML = "<p>Nenhum time inscrito ainda.</p>";
                return;
            }

            div.innerHTML = c.times
                .map(t => `<p class="time">• ${t.time.nome}</p>`)
                .join("");
        })
        .catch(() => console.log("Erro ao carregar lista de times"));
}

// ================================
// CARREGAR TIMES PARA O SELECT
// (lista TODOS os times cadastrados)
// ================================
function carregarTimesDoSelect() {
    fetch(`${BASE_URL}/time`)
        .then(res => res.json())
        .then(times => {
            if (!Array.isArray(times)) {
                console.error("Resposta inesperada de /time:", times);
                return;
            }

            const select = document.getElementById("timeId");
            if (!select) return;

            select.innerHTML = `<option value="">Selecione um time...</option>`;

            times.forEach(t => {
                select.innerHTML += `<option value="${t.id}">${t.nome}</option>`;
            });
        })
        .catch(err => console.error("Erro ao carregar os times para o select:", err));
}

// ================================
// ADICIONAR TIME AO CAMPEONATO
// ================================
function addTime() {
    const timeId = document.getElementById("timeId").value;

    if (!timeId) {
        alert("Selecione um time.");
        return;
    }

    fetch(`${BASE_URL}/campeonato/${campeonatoId}/add-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeId: Number(timeId) })
    })
        .then(res => res.json())
        .then(json => {
            if (json.error) {
                alert(json.error);
                return;
            }

            alert("Time adicionado com sucesso!");
            carregarTimes();
        })
        .catch(() => alert("Erro ao adicionar time."));
}

// ================================
// GERAR CHAVEAMENTO
// ================================
function gerarChaves() {
    fetch(`${BASE_URL}/campeonato/${campeonatoId}/gerar-chaves`, {
        method: "POST"
    })
        .then(res => res.json())
        .then(json => {
            if (json.error) {
                alert(json.error);
                return;
            }

            alert("Chaveamento gerado!");
            carregarJogos();
        })
        .catch(() => alert("Erro ao gerar chaveamento."));
}

function carregarJogos() {
    fetch(`${BASE_URL}/campeonato/${campeonatoId}/jogos`)
        .then(res => res.json())
        .then(lista => {
            const div = document.getElementById("listaJogos");

            if (!lista || lista.length === 0) {
                div.innerHTML = "<p>Nenhum jogo gerado.</p>";
                return;
            }

            const gruposPorRodada = {};

            lista.forEach(jogo => {
                if (!gruposPorRodada[jogo.round]) gruposPorRodada[jogo.round] = [];
                gruposPorRodada[jogo.round].push(jogo);
            });

            let html = "";

            Object.keys(gruposPorRodada).sort().forEach(round => {
                html += `<h3 class="round-title">Rodada ${round}</h3>`;

                gruposPorRodada[round].forEach(j => {
                    html += `
                        <div class="jogo-card">
                            <div class="jogo-nome">${j.timeA.nome} <b>x</b> ${j.timeB.nome}</div>

                            <input id="gA${j.id}" class="input" placeholder="Gols ${j.timeA.nome}">
                            <input id="gB${j.id}" class="input" placeholder="Gols ${j.timeB.nome}">

                            <button class="btn-primary" onclick="finalizarJogo(${j.id})">
                                Finalizar jogo
                            </button>
                        </div>
                    `;
                });
            });

            div.innerHTML = html;
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
        .then(json => {
            if (json.fim) {
                alert("🏆 Campeonato encerrado! Temos um campeão!");
                window.location.reload();
                return;
            }

            if (json.novaFase) {
                alert("Nova fase gerada!");
                window.location.reload();
                return;
            }

            alert("Jogo finalizado!");
            carregarJogos();
        });
}
