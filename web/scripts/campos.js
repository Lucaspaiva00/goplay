const BASE_URL = "http://localhost:3000";
const params = new URLSearchParams(location.search);
const societyId = Number(params.get("societyId"));

if (!societyId) alert("societyId não informado na URL.");

async function listarCampos() {
    const res = await fetch(`${BASE_URL}/campos/${societyId}`);
    const campos = await res.json();
    // render...
}

async function salvarCampo() {
    const data = {
        societyId,
        nome: document.getElementById("nomeCampo").value,
        valorAvulso: document.getElementById("valorAvulso").value,
        valorMensal: document.getElementById("valorMensal").value,
        dimensoes: document.getElementById("dimensoes").value,
        gramado: document.getElementById("gramado").value,
        fotoUrl: document.getElementById("fotoUrl").value,
    };

    await fetch(`${BASE_URL}/campos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    listarCampos();
}
