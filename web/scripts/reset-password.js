const BASE_URL = "http://localhost:3000";

function getTokenFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("token");
}

async function redefinirSenha() {
    const token = getTokenFromUrl();
    const novaSenha = document.getElementById("novaSenha").value.trim();
    const confirmarSenha = document.getElementById("confirmarSenha").value.trim();
    const msg = document.getElementById("msg");

    msg.innerText = "";

    if (!token) {
        msg.innerText = "Token inválido ou ausente.";
        return;
    }

    if (!novaSenha || !confirmarSenha) {
        msg.innerText = "Preencha os dois campos.";
        return;
    }

    if (novaSenha.length < 6) {
        msg.innerText = "A senha deve ter pelo menos 6 caracteres.";
        return;
    }

    if (novaSenha !== confirmarSenha) {
        msg.innerText = "As senhas não coincidem.";
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, novaSenha })
        });

        const json = await response.json();

        if (json.error) {
            msg.innerText = json.error;
            return;
        }

        msg.innerText = json.message || "Senha redefinida com sucesso.";

        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
    } catch (error) {
        msg.innerText = "Erro ao redefinir senha.";
    }
}