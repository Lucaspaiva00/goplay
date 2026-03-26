const BASE_URL = "https://goplay-dzlr.onrender.com";

async function solicitarReset() {
    const email = document.getElementById("email").value.trim();
    const msg = document.getElementById("msg");

    msg.textContent = "";
    msg.classList.remove("error");

    if (!email) {
        msg.textContent = "Informe seu e-mail.";
        msg.classList.add("error");
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
            msg.textContent = json.error;
            msg.classList.add("error");
            return;
        }

        msg.textContent = json.message || "Se o e-mail estiver cadastrado, enviaremos o link.";
    } catch (error) {
        msg.textContent = "Erro ao solicitar redefinição de senha.";
        msg.classList.add("error");
    }
}