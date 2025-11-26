const BASE_URL = "http://localhost:3000";

function criarConta() {
    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value.trim();
    const telefone = document.getElementById("telefone").value.trim();
    const tipo = document.getElementById("tipo").value;

    if (!nome || !email || !senha || !tipo) {
        alert("Preencha todos os campos obrigatórios!");
        return;
    }

    const data = { nome, email, senha, telefone, tipo };

    fetch(`${BASE_URL}/usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
        .then(r => r.json())
        .then(json => {
            if (json.error) {
                alert(json.error);
                return;
            }

            alert("Conta criada com sucesso!");
            window.location.href = "login.html";
        })
        .catch(() => alert("Erro ao criar conta."));
}
