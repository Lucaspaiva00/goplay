const BASE_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
    carregarCampos();
});

function carregarCampos() {
    const societyId = localStorage.getItem("societyId");

    if (!societyId) {
        document.getElementById("listaCampos").innerHTML = "<p>Society não encontrado.</p>";
        return;
    }

    fetch(`${BASE_URL}/campos/${societyId}`)
        .then(res => res.json())
        .then(data => {
            const div = document.getElementById("listaCampos");

            if (!data || data.length === 0) {
                div.innerHTML = "<p>Nenhum campo cadastrado.</p>";
                return;
            }

            div.innerHTML = data.map(c => `
                <div class="card" style="margin-bottom:10px;">
                    <strong>${c.nome}</strong><br>
                    Dimensões: ${c.dimensoes || "-"}<br>
                    Gramado: ${c.estiloGramado || "-"}<br>
                    Avulso: R$ ${c.valorAvulso || "-"}<br>
                    Mensal: R$ ${c.valorMensal || "-"}<br><br>
                </div>
            `).join("");

        })
        .catch(() => {
            document.getElementById("listaCampos").innerHTML =
                "<p>Erro ao carregar campos.</p>";
        });
}

function salvarCampo() {
    const societyId = localStorage.getItem("societyId");

    if (!societyId) {
        alert("Erro: Society não encontrado.");
        return;
    }

    const data = {
        societyId: Number(societyId),
        nome: document.getElementById("nome").value.trim(),
        valorAvulso: parseFloat(document.getElementById("valorAvulso").value) || null,
        valorMensal: parseFloat(document.getElementById("valorMensal").value) || null,
        dimensoes: document.getElementById("dimensoes").value.trim(),
        estiloGramado: document.getElementById("estiloGramado").value.trim(),
        foto: document.getElementById("foto").value.trim()
    };

    if (!data.nome) {
        alert("Informe o nome do campo.");
        return;
    }

    fetch(`${BASE_URL}/campos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
        .then(res => res.json())
        .then(json => {
            if (json.error) {
                alert(json.error);
                return;
            }

            alert("Campo cadastrado com sucesso!");
            carregarCampos();

            document.getElementById("nome").value = "";
            document.getElementById("valorAvulso").value = "";
            document.getElementById("valorMensal").value = "";
            document.getElementById("dimensoes").value = "";
            document.getElementById("estiloGramado").value = "";
            document.getElementById("foto").value = "";
        })
        .catch(() => {
            alert("Erro ao cadastrar campo.");
        });
}
