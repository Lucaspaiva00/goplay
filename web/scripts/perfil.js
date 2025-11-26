// =====================================================
// VALIDAR LOGIN
// =====================================================
const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));

if (!usuarioLogado) {
    alert("Sessão expirada. Faça login novamente.");
    window.location.href = "login.html";
}


// =====================================================
// CARREGAR PERFIL
// =====================================================
window.onload = async () => {
    try {
        const resp = await fetch(`http://localhost:3000/usuarios/${usuarioLogado.id}`);

        // Se a rota não responder JSON (ex: HTML de erro)
        if (!resp.ok) {
            console.log("Erro API:", resp.status);
            alert("Erro ao carregar dados. (Rota incorreta ou API offline)");
            return;
        }

        const data = await resp.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        // Preencher formulário
        document.getElementById("nome").value = data.nome || "";
        document.getElementById("telefone").value = data.telefone || "";
        document.getElementById("nascimento").value = data.nascimento ? data.nascimento.split("T")[0] : "";
        document.getElementById("sexo").value = data.sexo || "";
        document.getElementById("pernaMelhor").value = data.pernaMelhor || "";
        document.getElementById("posicaoCampo").value = data.posicaoCampo || "";
        document.getElementById("altura").value = data.altura || "";
        document.getElementById("peso").value = data.peso || "";
        document.getElementById("goleiro").checked = data.goleiro || false;

    } catch (err) {
        console.log("ERRO LOAD PERFIL:", err);
        alert("Erro ao carregar os dados.");
    }
};



// =====================================================
// SALVAR PERFIL
// =====================================================
async function salvarPerfil() {

    const nascimentoValue = document.getElementById("nascimento").value;

    const payload = {
        nome: document.getElementById("nome").value,
        telefone: document.getElementById("telefone").value,
        nascimento: nascimentoValue ? new Date(nascimentoValue).toISOString() : null,
        sexo: document.getElementById("sexo").value,
        pernaMelhor: document.getElementById("pernaMelhor").value,
        posicaoCampo: document.getElementById("posicaoCampo").value,
        altura: document.getElementById("altura").value ? Number(document.getElementById("altura").value) : null,
        peso: document.getElementById("peso").value ? Number(document.getElementById("peso").value) : null,
        goleiro: document.getElementById("goleiro").checked
    };

    try {
        const resp = await fetch(`http://localhost:3000/usuarios/${usuarioLogado.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await resp.json();

        if (result.error) {
            alert(result.error);
            return;
        }

        alert("Perfil atualizado com sucesso!");

    } catch (err) {
        console.log("ERRO UPDATE PERFIL:", err);
        alert("Erro ao salvar alterações.");
    }
}
