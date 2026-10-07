const BASE_URL = "https://goplay-dzlr.onrender.com";

document.addEventListener("DOMContentLoaded", async () => {
    if (window.GoPlayEmpresaContextReady) await window.GoPlayEmpresaContextReady;
    const usuario=JSON.parse(localStorage.getItem("usuarioLogado")||"null");
    const independente=["ORGANIZADOR_COMPETICAO","ORGAO_PUBLICO"].includes(usuario?.tipo);
    const societyId = localStorage.getItem("societyId");

    if (independente) {
        await carregarCampeonatos(null,true);
        return;
    }
    if (!societyId) {
        const div = document.getElementById("listaCampeonatos");
        if (div) div.innerHTML = `<div class="empty">Selecione uma empresa no menu para ver os campeonatos.</div>`;
        return;
    }

    await carregarCampeonatos(societyId,false);
});

async function carregarCampeonatos(societyId, independente=false) {

    try {

        const url=independente?`${BASE_URL}/campeonato/organizador/meus`:`${BASE_URL}/campeonato/society/${societyId}`;
        const res = await fetch(url);

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