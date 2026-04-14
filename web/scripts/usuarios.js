const BASE_URL = "https://goplay-dzlr.onrender.com";

function toggleSenha(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector("i");

    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
}

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

            // salva usuário como logado
            localStorage.setItem("usuarioLogado", JSON.stringify(json));

            alert("Conta criada com sucesso!");
            window.location.href = "home.html";
        })
        .catch(() => alert("Erro ao criar conta."));
}