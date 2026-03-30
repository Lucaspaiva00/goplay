const BASE_URL = "https://goplay-dzlr.onrender.com";

function getTokenFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("token");
}

async function redefinirSenha() {
    const token = getTokenFromUrl();
    const novaSenha = document.getElementById("novaSenha").value.trim();
    const confirmarSenha = document.getElementById("confirmarSenha").value.trim();
    const msg = document.getElementById("msg");

    msg.textContent = "";
    msg.classList.remove("error");

    if (!token) {
        msg.textContent = "Token inválido ou ausente.";
        msg.classList.add("error");
        return;
    }

    if (!novaSenha || !confirmarSenha) {
        msg.textContent = "Preencha todos os campos.";
        msg.classList.add("error");
        return;
    }

    if (novaSenha.length < 6) {
        msg.textContent = "A senha deve ter pelo menos 6 caracteres.";
        msg.classList.add("error");
        return;
    }

    if (novaSenha !== confirmarSenha) {
        msg.textContent = "As senhas não coincidem.";
        msg.classList.add("error");
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, novaSenha })
        });

        const json = await response.json();

        if (!response.ok || json.error) {
            msg.textContent = json.error || "Erro ao redefinir senha.";
            msg.classList.add("error");
            return;
        }

        msg.textContent = json.message || "Senha redefinida com sucesso.";

        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
    } catch (error) {
        msg.textContent = "Erro ao redefinir senha.";
        msg.classList.add("error");
    }
}