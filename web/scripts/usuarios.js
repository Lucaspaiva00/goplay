const BASE_URL = "http://localhost:3000";

function criarUsuario() {

    const data = {
        nome: nome.value.trim(),
        email: email.value.trim(),
        senha: senha.value.trim(),
        telefone: telefone.value.trim(),
        tipo: "DONO_SOCIETY" // padrão para seu app
    };

    if (!data.nome || !data.email || !data.senha) {
        alert("Preencha todos os campos obrigatórios!");
        return;
    }

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
