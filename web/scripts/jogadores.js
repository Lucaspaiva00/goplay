const BASE_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
    carregarJogadores();
});

function carregarJogadores() {
    const societyId = localStorage.getItem("societyId");

    if (!societyId) {
        document.getElementById("listaJogadores").innerHTML =
            "<p>Erro: society não encontrado.</p>";
        return;
    }

    fetch(`${BASE_URL}/society/${societyId}`)
        .then(res => res.json())
        .then(data => {
            const jogadores = data?.societyPlayers || [];
            const div = document.getElementById("listaJogadores");

            if (jogadores.length === 0) {
                div.innerHTML = "<p>Nenhum jogador cadastrado ainda.</p>";
                return;
            }

            div.innerHTML = jogadores.map(j => `
                <div class="jogador-card">
                    <strong>${j.usuario.nome}</strong>
                    <p>Email: ${j.usuario.email || "-"}</p>
                    <p>Telefone: ${j.usuario.telefone || "-"}</p>
                </div>
            `).join("");
        });
}

function adicionarJogador() {
    const societyId = localStorage.getItem("societyId");
    const usuarioId = document.getElementById("usuarioId").value.trim();

    const jaExiste = document.querySelector(`[data-id="${usuarioId}"]`);

    if (jaExiste) {
        alert("Este jogador já está cadastrado!");
        return;
    }

    fetch(`${BASE_URL}/society/player`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ societyId: Number(societyId), usuarioId: Number(usuarioId) })
    })
        .then(res => res.json())
        .then(json => {
            if (json.error) return alert(json.error);
            alert("Jogador adicionado!");
            document.getElementById("usuarioId").value = "";
            carregarJogadores();
        });
}


// 🔥 Tornar acessível ao HTML
window.adicionarJogador = adicionarJogador;
window.carregarJogadores = carregarJogadores;
