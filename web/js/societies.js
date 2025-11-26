const lista = document.getElementById("listaSocieties");

// PEGAR USUÁRIO LOGADO
const usuario = JSON.parse(localStorage.getItem("usuarioCadastrado"));

if (!usuario) {
    alert("Sessão expirada. Faça login novamente.");
    window.location.href = "login.html";
}

// URL BASE DA API
const API = "http://localhost:3000";

// BUSCAR SOCIETIES DO USUÁRIO
async function carregarSocieties() {
    try {
        const resp = await fetch(`${API}/api/society/owner/${usuario.id}`);
        const data = await resp.json();

        lista.innerHTML = "";

        if (!data || data.length === 0) {
            lista.innerHTML = `
                <div class="society-card">
                    <h2>Nenhum society encontrado</h2>
                    <span>Cadastre seu primeiro society</span>
                </div>
            `;
            return;
        }

        data.forEach(s => {
            const card = document.createElement("div");
            card.classList.add("society-card");

            card.innerHTML = `
                <h2>${s.nome}</h2>
                <span>${s.cidade ?? "Cidade não informada"}</span>
                <div class="btn-details" onclick="verDetalhes(${s.id})">
                    Ver detalhes
                </div>
            `;

            lista.appendChild(card);
        });

    } catch (error) {
        console.log("ERRO AO BUSCAR SOCIETIES:", error);
        lista.innerHTML = `<p>Erro ao carregar societies.</p>`;
    }
}

// REDIRECIONAR PARA DETALHES
function verDetalhes(id) {
    window.location.href = `society-detalhes.html?id=${id}`;
}

// INICIAR
carregarSocieties();
