// /web/scripts/societyCreate.js
const BASE_URL = "http://localhost:3000";

function salvarSociety() {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

    if (!usuario || !usuario.id) {
        alert("Sessão expirada. Faça login novamente.");
        window.location.href = "login.html";
        return;
    }

    const data = {
        usuarioId: usuario.id,
        nome: document.getElementById("nome").value.trim(),
        descricao: document.getElementById("descricao").value.trim(),
        telefone: document.getElementById("telefone").value.trim(),
        whatsapp: document.getElementById("whatsapp").value.trim(),
        email: document.getElementById("email").value.trim(),
        website: document.getElementById("website").value.trim(),
        instagram: document.getElementById("instagram").value.trim(),
        facebook: document.getElementById("facebook").value.trim(),
        youtube: document.getElementById("youtube").value.trim(),
        cep: document.getElementById("cep").value.trim(),
        endereco: document.getElementById("endereco").value.trim(),
        estado: document.getElementById("estado").value.trim(),
        cidade: document.getElementById("cidade").value.trim(),
    };

    if (!data.nome) {
        alert("Informe o nome do Society.");
        return;
    }

    fetch(`${BASE_URL}/society`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
        .then(async (res) => {
            const json = await res.json().catch(() => ({}));

            if (!res.ok) {
                alert(json.error || "Erro ao cadastrar society.");
                return;
            }

            alert("Society cadastrado com sucesso!");

            if (json.id) {
                localStorage.setItem("societyId", json.id);
            }

            window.location.href = "home.html";
        })
        .catch((err) => {
            console.error("Erro na requisição:", err);
            alert("Erro ao cadastrar society (falha na comunicação com o servidor).");
        });
}
