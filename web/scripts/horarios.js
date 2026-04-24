const BASE_URL = "https://goplay-dzlr.onrender.com";

function getUsuario() {
    return JSON.parse(localStorage.getItem("usuarioLogado") || "null");
}

async function carregarHorarios() {
    try {
        const usuario = getUsuario();

        if (!usuario?.id) {
            alert("Sessão expirada");
            return;
        }

        // 🔥 pega society do dono
        const societies = await fetch(`${BASE_URL}/society/owner/${usuario.id}`)
            .then(r => r.json());

        const societyId = societies?.[0]?.id;

        if (!societyId) {
            document.getElementById("listaHorarios").innerHTML =
                "<p>Nenhum society encontrado.</p>";
            return;
        }

        const data = document.getElementById("data").value;

        if (!data) return;

        // 🔥 busca horários
        const lista = await fetch(`${BASE_URL}/agendamentos/society/${societyId}?data=${data}`)
            .then(r => r.json());

        const div = document.getElementById("listaHorarios");

        if (!lista.length) {
            div.innerHTML = "<p>Nenhum horário encontrado.</p>";
            return;
        }

        div.innerHTML = lista.map(a => `
            <div class="slot ${a.status}">
                <div>
                    <strong>${a.horaInicio} - ${a.horaFim}</strong>
                </div>

                <div>${a.campo?.nome || "-"}</div>

                <div>${a.time?.nome || "Livre"}</div>

                <div class="status">${a.status}</div>
            </div>
        `).join("");

    } catch (e) {
        console.error(e);
        alert("Erro ao carregar horários");
    }
}

document.getElementById("data").addEventListener("change", carregarHorarios);