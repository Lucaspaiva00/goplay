const BASE_URL = "https://goplay-dzlr.onrender.com";

function toggleSenha() {
    const campoSenha = document.getElementById("senha");
    const icone = document.getElementById("iconeSenha");

    if (campoSenha.type === "password") {
        campoSenha.type = "text";
        icone.classList.remove("fa-eye");
        icone.classList.add("fa-eye-slash");
    } else {
        campoSenha.type = "password";
        icone.classList.remove("fa-eye-slash");
        icone.classList.add("fa-eye");
    }
}

function login() {
    const data = {
        email: email.value.trim(),
        senha: senha.value.trim()
    };

    if (!data.email || !data.senha) {
        alert("Informe e-mail e senha!");
        return;
    }

    fetch(`${BASE_URL}/login`, {
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

            localStorage.setItem("usuarioLogado", JSON.stringify(json));
            window.location.href = "home.html";
        })
        .catch(() => {
            alert("Erro ao fazer login.");
        });
}