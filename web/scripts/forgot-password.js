const BASE_URL = "http://localhost:3000";

async function solicitarReset() {
    const email = document.getElementById("email").value.trim();
    const msg = document.getElementById("msg");

    msg.innerText = "";

    if (!email) {
        msg.innerText = "Informe seu e-mail.";
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        const json = await response.json();

        if (json.error) {
            msg.innerText = json.error;
            return;
        }

        msg.innerText = json.message || "Se o e-mail estiver cadastrado, enviaremos o link.";
    } catch (error) {
        msg.innerText = "Erro ao solicitar redefinição de senha.";
    }
}