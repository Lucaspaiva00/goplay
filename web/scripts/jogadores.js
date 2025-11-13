const BASE_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
    carregarJogadores();
});

// Carregar jogadores
function carregarJogadores() {

    const societyOwnerId = localStorage.getItem("societyOwnerId");

    if (!societyOwnerId) {
        document.getElementById("listaJogadores").innerHTML =
            "<p>Erro: society não encontrado. Volte e abra pelo botão 'Ver detalhes'.</p>";
        return;
    }

    fetch(`${BASE_URL}/society/owner/${societyOwnerId}`)
        .then(res => res.json())
        .then(data => {

            if (!data || data.length === 0) {
                document.getElementById("listaJogadores").innerHTML =
                    "<p>Nenhum jogador encontrado.</p>";
                return;
            }

            const society = data[0]; // dono pode ter vários societies
            const jogadores = society.societyPlayers || [];

            const div = document.getElementById("listaJogadores");

            if (jogadores.length === 0) {
                div.innerHTML = "<p>Nenhum jogador adicionado ainda.</p>";
                return;
            }

            div.innerHTML = jogadores.map(j => `
                <div class="card" style="margin-bottom: 10px;">
                    <strong>${j.usuario.nome}</strong><br>
                    Email: ${j.usuario.email || "-"}<br>
                    Telefone: ${j.usuario.telefone || "-"}
                </div>
            `).join("");

        })
        .catch(err => {
            console.error(err);
            document.getElementById("listaJogadores").innerHTML =
                "<p>Erro ao carregar jogadores.</p>";
        });
}

// Adicionar
function adicionarJogador() {

    const societyId = localStorage.getItem("societyId");
    const usuarioId = document.getElementById("usuarioId").value.trim();

    if (!societyId) {
        alert("Erro: societyId não encontrado.");
        return;
    }

    if (!usuarioId) {
        alert("Informe o ID do usuário.");
        return;
    }

    const data = {
        societyId: Number(societyId),
        usuarioId: Number(usuarioId)
    };

    fetch(`${BASE_URL}/society/player`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
        .then(res => res.json())
        .then(json => {

            if (json.error) {
                alert(json.error);
                return;
            }

            alert("Jogador adicionado com sucesso!");
            document.getElementById("usuarioId").value = "";
            carregarJogadores();
        })
        .catch(() => {
            alert("Erro ao adicionar jogador.");
        });
}
