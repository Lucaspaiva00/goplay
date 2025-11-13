const BASE_URL = "http://localhost:3000";

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

            // SALVAR USUÁRIO LOGADO
            localStorage.setItem("usuarioLogado", JSON.stringify(json));

            window.location.href = "home.html";
        })
        .catch(() => {
            alert("Erro ao fazer login.");
        });
}
