const BASE_URL = "https://goplay-dzlr.onrender.com";

// ========================================================
// 🔐 VALIDAR LOGIN
// ========================================================
const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

if (!usuario) {
    alert("Sessão expirada. Faça login novamente.");
    window.location.href = "login.html";
}

const usuarioId = usuario.id;


// ========================================================
// 🔄 CARREGAR MEU TIME
// ========================================================
async function carregarMeuTime() {
    try {
        const res = await fetch(`${BASE_URL}/time/details/by-player/${usuarioId}`);
        const data = await res.json();

        if (data.error || !data.time) {
            document.getElementById("dadosTime").innerHTML = `
                <div class="time-info-card">
                    <p>❌ Você ainda não faz parte de nenhum time.</p>
                </div>
            `;
            document.getElementById("listaJogadores").innerHTML = "";
            document.getElementById("sair").style.display = "none";
            return;
        }

        const time = data.time;

        // =======================
        // CARD DO TIME
        // =======================
        document.getElementById("dadosTime").innerHTML = `
            <h2 style="margin-bottom: 8px;">${time.nome}</h2>
            <p><b>Localidade:</b> ${time.cidade || "—"} - ${time.estado || "—"}</p>
            <p><b>Descrição:</b> ${time.descricao || "Sem descrição"}</p>
        `;

        // =======================
        // LISTA DE JOGADORES
        // =======================
        if (time.jogadores.length === 0) {
            document.getElementById("listaJogadores").innerHTML = `
                <p>Nenhum jogador no time ainda.</p>
            `;
        } else {
            document.getElementById("listaJogadores").innerHTML = time.jogadores
                .map(j => `
                    <div class="player-item">
                        <b>${j.nome}</b><br>
                        <small>${j.posicaoCampo || "Posição não informada"}</small>
                    </div>
                `)
                .join("");
        }

        // exibir botão sair
        document.getElementById("sair").style.display = "block";

    } catch (error) {
        console.error("Erro ao carregar meu time:", error);
        alert("Erro ao carregar dados do time.");
    }
}


// ========================================================
// 🚪 SAIR DO TIME
// ========================================================
async function sairDoTime() {
    if (!confirm("Tem certeza que deseja sair do time?")) return;

    try {
        const res = await fetch(`${BASE_URL}/time/leave`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuarioId })
        });

        const data = await res.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        alert("Você saiu do time!");
        window.location.reload();

    } catch (error) {
        console.error("Erro ao sair do time:", error);
        alert("Erro ao tentar sair do time.");
    }
}


// ========================================================
// ▶️ INICIALIZAÇÃO
// ========================================================
document.addEventListener("DOMContentLoaded", () => {
    carregarMeuTime();

    document.getElementById("sair").addEventListener("click", sairDoTime);
});
