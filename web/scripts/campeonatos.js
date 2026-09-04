const BASE_URL = "https://goplay-dzlr.onrender.com";

document.addEventListener("DOMContentLoaded", async () => {
    if (window.GoPlayEmpresaContextReady) await window.GoPlayEmpresaContextReady;
    const societyId = localStorage.getItem("societyId");

    if (!societyId) {
        const div = document.getElementById("listaCampeonatos");
        if (div) div.innerHTML = `<div class="empty">Selecione uma empresa no menu para ver os campeonatos.</div>`;
        return;
    }

    await carregarCampeonatos(societyId);
});

async function carregarCampeonatos(societyId) {

    try {

        const res = await fetch(`${BASE_URL}/campeonato/society/${societyId}`);

        if (!res.ok) {
            throw new Error("Erro ao buscar campeonatos.");
        }

        const lista = await res.json();

        const div = document.getElementById("listaCampeonatos");

        if (!lista.length) {

            div.innerHTML = `
                <div class="empty">
                    Nenhum campeonato criado ainda.
                </div>
            `;

            return;
        }

        div.innerHTML = lista.map(c => {

            const jogos = c.jogos?.length || 0;
            const times = c.times?.length || 0;

            return `
                <div class="card-campeonato" onclick="abrirDetalhe(${c.id})">

                    <div class="card-top">
                        <h3>${c.nome}</h3>

                        <span class="badge-status">
                            ${c.status || "EM_CRIACAO"}
                        </span>
                    </div>

                    <div class="card-info">

                        <div>
                            <strong>Formato:</strong>
                            Liga Ida e Volta
                        </div>

                        <div>
                            <strong>Times:</strong>
                            ${times}/${c.maxTimes}
                        </div>

                        <div>
                            <strong>Jogos:</strong>
                            ${jogos}
                        </div>

                    </div>

                </div>
            `;
        }).join("");

    } catch (err) {

        console.error(err);

        alert(
            err?.message ||
            "Erro ao carregar campeonatos"
        );
    }
}

function abrirDetalhe(id) {
    location.href = `campeonato-detalhe.html?campeonatoId=${id}`;
}