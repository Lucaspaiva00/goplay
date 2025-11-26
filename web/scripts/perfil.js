// =====================
// VALIDAR LOGIN
// =====================
const usuario = JSON.parse(localStorage.getItem("usuario"));

if (!usuario) {
    alert("Sessão expirada. Faça login novamente.");
    window.location.href = "login.html";
}

// =====================
// GERAR MENU DINÂMICO
// =====================
const menu = document.getElementById("menu");
menu.innerHTML = "";

const tipo = usuario.tipo;

// Sempre aparece
menu.innerHTML += `
    <li onclick="location.href='home.html'"><i class="fas fa-home"></i> Início</li>
`;

if (tipo === "PLAYER") {
    menu.innerHTML += `
        <li onclick="location.href='societies.html'"><i class="fas fa-eye"></i> Ver Societies</li>
        <li onclick="location.href='times.html'"><i class="fas fa-users"></i> Meus Times</li>
        <li onclick="location.href='jogadores.html'"><i class="fas fa-user-friends"></i> Jogadores</li>
    `;
}

if (tipo === "DONO_SOCIETY") {
    menu.innerHTML += `
        <li onclick="location.href='society-create.html'"><i class="fas fa-plus-circle"></i> Cadastrar Society</li>
        <li onclick="location.href='campos.html'"><i class="fas fa-futbol"></i> Campos</li>
        <li onclick="location.href='cardapio.html'"><i class="fas fa-utensils"></i> Cardápio</li>
        <li onclick="location.href='pagamentos.html'"><i class="fas fa-credit-card"></i> Pagamentos</li>
    `;
}

if (tipo === "DONO_TIME") {
    menu.innerHTML += `
        <li onclick="location.href='meus-times.html'"><i class="fas fa-users"></i> Meu Time</li>
        <li onclick="location.href='jogadores.html'"><i class="fas fa-user-friends"></i> Jogadores</li>
    `;
}

// Item ativo
menu.innerHTML += `
    <li class="active"><i class="fas fa-user"></i> Perfil</li>
    <li onclick="logout()"><i class="fas fa-sign-out-alt"></i> Sair</li>
`;


// =====================
// MENU MOBILE
// =====================
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const menuBtn = document.getElementById("menuBtn");

menuBtn.onclick = () => {
    sidebar.classList.add("open");
    overlay.classList.add("show");
};

overlay.onclick = () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
};


// =====================
// CARREGAR PERFIL DO USUÁRIO
// =====================
window.onload = async () => {
    try {
        const resp = await fetch(`http://localhost:3000/api/usuarios/${usuario.id}`);
        const data = await resp.json();

        if (data.error) {
            alert("Erro ao carregar perfil.");
            return;
        }

        // Preencher campos
        nome.value = data.nome || "";
        telefone.value = data.telefone || "";
        nascimento.value = data.nascimento ? data.nascimento.split("T")[0] : "";
        sexo.value = data.sexo || "";
        pernaMelhor.value = data.pernaMelhor || "";
        posicaoCampo.value = data.posicaoCampo || "";
        altura.value = data.altura || "";
        peso.value = data.peso || "";
        goleiro.checked = data.goleiro || false;

    } catch (err) {
        console.log("ERRO LOAD PERFIL:", err);
        alert("Erro ao carregar dados.");
    }
};


// =====================
// SALVAR PERFIL
// =====================
async function salvarPerfil() {

    const payload = {
        nome: nome.value,
        telefone: telefone.value,
        nascimento: nascimento.value || null,
        sexo: sexo.value,
        pernaMelhor: pernaMelhor.value,
        posicaoCampo: posicaoCampo.value,
        altura: altura.value ? Number(altura.value) : null,
        peso: peso.value ? Number(peso.value) : null,
        goleiro: goleiro.checked
    };

    try {
        const resp = await fetch(`http://localhost:3000/api/usuarios/${usuario.id}`, {
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
