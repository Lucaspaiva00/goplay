const BASE_URL = "https://goplay-dzlr.onrender.com";

function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

function escapeHtml(str) {
    return String(str ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function fetchJSON(url, options = {}) {

    const res = await fetch(url, options);

    const text = await res.text().catch(() => "");

    let data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = null;
    }

    if (!res.ok) {
        throw new Error(
            data?.error ||
            data?.message ||
            text ||
            `HTTP ${res.status}`
        );
    }

    return data;
}

async function carregarLiga() {

    const campeonatoId = getParam("campeonatoId");

    if (!campeonatoId) {
        alert("Campeonato inválido.");
        return;
    }

    const lista = document.getElementById("listaRodadas");

    lista.innerHTML = `
        <div class="loading">
            Carregando jogos...
        </div>
    `;

    try {

        const campeonato = await fetchJSON(
            `${BASE_URL}/campeonato/${campeonatoId}`
        );

        const jogos = [...(campeonato.jogos || [])];

        jogos.sort((a, b) => {
            return (a.rodada || 0) - (b.rodada || 0);
        });

        if (!jogos.length) {

            lista.innerHTML = `
                <div class="empty">
                    Nenhum jogo gerado ainda.
                </div>
            `;

            return;
        }

        const rodadas = {};

        jogos.forEach((jogo) => {

            const rodada = jogo.rodada || 1;

            if (!rodadas[rodada]) {
                rodadas[rodada] = [];
            }

            rodadas[rodada].push(jogo);
        });

        lista.innerHTML = Object.keys(rodadas)
            .sort((a, b) => Number(a) - Number(b))
            .map((rodada) => {

                const jogosRodada = rodadas[rodada];

                return `
                    <div class="rodada">

                        <div class="rodada-header">
                            Rodada ${rodada}
                        </div>

                        <div class="rodada-body">

                            ${jogosRodada.map((j) => {

                    const tipo =
                        j.tipoJogo === "VOLTA"
                            ? "🔁 Volta"
                            : "➡️ Ida";

                    return `
                                    <div class="jogo-card">

                                        <div class="jogo-top">
                                            <span class="badge">
                                                ${tipo}
                                            </span>

                                            <span class="status">
                                                ${j.finalizado
                            ? "Finalizado"
                            : "Pendente"}
                                            </span>
                                        </div>

                                        <div class="times">

                                            <div class="time">
                                                ${escapeHtml(j.timeA?.nome || "Time A")}
                                            </div>

                                            <div class="placar">

                                                <span>
                                                    ${j.golsA ?? "-"}
                                                </span>

                                                <span>x</span>

                                                <span>
                                                    ${j.golsB ?? "-"}
                                                </span>

                                            </div>

                                            <div class="time">
                                                ${escapeHtml(j.timeB?.nome || "Time B")}
                                            </div>

                                        </div>

                                    </div>
                                `;
                }).join("")}

                        </div>

                    </div>
                `;
            }).join("");

    } catch (err) {

        console.error(err);

        lista.innerHTML = `
            <div class="empty">
                ${escapeHtml(err?.message || "Erro ao carregar liga.")}
            </div>
        `;
    }
}

document.addEventListener("DOMContentLoaded", () => {

    const btnVoltar = document.getElementById("btnVoltar");

    if (btnVoltar) {
        btnVoltar.onclick = () => history.back();
    }

    carregarLiga();
});