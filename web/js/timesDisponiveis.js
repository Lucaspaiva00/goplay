const BASE_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", carregarTimesDisponiveis);

function carregarTimesDisponiveis() {
    fetch(`${BASE_URL}/time`)
        .then(res => res.json())
        .then(times => {
            const div = document.getElementById("listaTimes");

            if (!Array.isArray(times) || times.length === 0) {
                div.innerHTML = "<p>Nenhum time disponível no momento.</p>";
                return;
            }

            div.innerHTML = times.map(t => `
                <div class="time-card">
                    <div class="time-nome">${t.nome}</div>
                    <div class="time-local">${t.cidade || ''} ${t.estado || ''}</div>
                    <button class="time-btn" onclick="entrarNoTime(${t.id})">
                        Entrar no time
                    </button>
                </div>
            `).join("");
        })
        .catch(() => {
            document.getElementById("listaTimes").innerHTML =
                "<p>Erro ao carregar times.</p>";
        });
}

function entrarNoTime(timeId) {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (!usuario) {
        alert("Faça login novamente.");
        window.location.href = "login.html";
        return;
    }

    fetch(`${BASE_URL}/time/entrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId: usuario.id, timeId })
    })
        .then(res => res.json())
        .then(json => {
            if (json.error) {
                alert(json.error);
                return;
            }
            alert("Você entrou no time!");
            // se quiser, manda pra tela "meu-time.html" depois:
            // window.location.href = "meu-time.html";
        })
        .catch(() => alert("Erro ao entrar no time."));
}
