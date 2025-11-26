const BASE_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
    carregarTimes();
});

function carregarTimes() {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

    if (!usuario || !usuario.id) {
        document.getElementById("listaTimes").innerHTML = "<p>Erro: usuário não encontrado.</p>";
        return;
    }

    fetch(`${BASE_URL}/time/dono/${usuario.id}`)
        .then(res => res.json())
        .then(data => {
            const div = document.getElementById("listaTimes");

            if (!data || data.length === 0) {
                div.innerHTML = "<p>Nenhum time cadastrado ainda.</p>";
                return;
            }

            div.innerHTML = data.map(t => `
                <div class="card" style="margin-bottom:15px;">
                    <strong>${t.nome}</strong><br>
                    ${t.cidade || ""} - ${t.estado || ""}<br><br>

                    <button class="btn" onclick="verDetalhes(${t.id})">
                        Ver detalhes
                    </button>
                </div>
            `).join("");
        })
        .catch(() => {
            document.getElementById("listaTimes").innerHTML = "<p>Erro ao carregar times.</p>";
        });
}

function salvarTime() {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

    const data = {
        donoId: usuario.id,
        nome: document.getElementById("nome").value,
        brasao: document.getElementById("brasao").value,
        descricao: document.getElementById("descricao").value,
        estado: document.getElementById("estado").value,
        cidade: document.getElementById("cidade").value,
        modalidade: document.getElementById("modalidade").value
    };

    if (!data.nome) {
        alert("O nome do time é obrigatório.");
        return;
    }

    fetch(`${BASE_URL}/time`, {
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

            alert("Time cadastrado com sucesso!");
            carregarTimes();
        });
}

function verDetalhes(id) {
    window.location.href = `time-detalhe.html?timeId=${id}`;
}
