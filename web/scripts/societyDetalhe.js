const BASE_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const societyId = params.get("societyId");

    if (!societyId) {
        alert("Society inválido.");
        return;
    }

    fetch(`${BASE_URL}/society/${societyId}`)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                document.getElementById("societyInfo").innerHTML = `<p>${data.error}</p>`;
                return;
            }

            document.getElementById("societyInfo").innerHTML = `
                <h3>${data.nome}</h3>
                <p>${data.descricao || "Sem descrição"}</p>
                <p><b>Cidade:</b> ${data.cidade} / ${data.estado}</p>
                <p><b>Telefone:</b> ${data.telefone || "-"}</p>
                <p><b>Whats:</b> ${data.whatsapp || "-"}</p>
                <p><b>Email:</b> ${data.email || "-"}</p>
                <p><b>Website:</b> ${data.website || "-"}</p>
                <hr>
                <p><b>Campos cadastrados:</b> ${data.campos.length}</p>
                <p><b>Itens no cardápio:</b> ${data.cardapio.length}</p>
                <p><b>Jogadores:</b> ${data.societyPlayers.length}</p>
            `;

            localStorage.setItem("societyId", societyId);
        })
        .catch(() => {
            document.getElementById("societyInfo").innerHTML = "<p>Erro ao carregar society.</p>";
        });
});

function irCampos() { window.location.href = "campos.html"; }
function irCardapio() { window.location.href = "cardapio.html"; }
function irJogadores() { window.location.href = "jogadores.html"; }
function irPagamentos() { window.location.href = "pagamentos.html"; }
function irConvites() { window.location.href = "convites.html"; }
