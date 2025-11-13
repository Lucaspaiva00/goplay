const BASE_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
    carregarCardapio();
});

function carregarCardapio() {
    const societyId = localStorage.getItem("societyId");

    if (!societyId) {
        document.getElementById("listaCardapio").innerHTML = "<p>Society não encontrado.</p>";
        return;
    }

    fetch(`${BASE_URL}/cardapio/${societyId}`)
        .then(res => res.json())
        .then(data => {
            const div = document.getElementById("listaCardapio");

            if (!data || data.length === 0) {
                div.innerHTML = "<p>Nenhum item cadastrado.</p>";
                return;
            }

            div.innerHTML = data.map(i => `
                <div class="card" style="margin-bottom:10px;">
                    <strong>${i.nome}</strong><br>
                    Preço: R$ ${i.preco.toFixed(2)}
                </div>
            `).join("");
        })
        .catch(() => {
            document.getElementById("listaCardapio").innerHTML =
                "<p>Erro ao carregar cardápio.</p>";
        });
}

function salvarItem() {
    const societyId = localStorage.getItem("societyId");

    if (!societyId) {
        alert("Erro: Society não encontrado.");
        return;
    }

    const nome = document.getElementById("nome").value.trim();
    const preco = parseFloat(document.getElementById("preco").value);

    if (!nome || isNaN(preco)) {
        alert("Informe nome e preço corretamente.");
        return;
    }

    const data = {
        societyId: Number(societyId),
        nome,
        preco
    };

    fetch(`${BASE_URL}/cardapio`, {
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

            alert("Item adicionado ao cardápio!");
            carregarCardapio();

            document.getElementById("nome").value = "";
            document.getElementById("preco").value = "";
        })
        .catch(() => {
            alert("Erro ao salvar item.");
        });
}
