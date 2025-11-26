// Impede duplicação do menu
if (!window.menuLoaded) {
    window.menuLoaded = true;

    let usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
    const menu = document.getElementById("menuDynamic");

    if (!usuarioLogado) {
        window.location.href = "login.html";
    }

    let html = `
        <li onclick="location.href='home.html'"><i class="fa fa-house"></i> Início</li>
        <li onclick="location.href='societies.html'"><i class="fa fa-eye"></i> Ver Societies</li>
    `;

    if (usuarioLogado.tipo === "DONO_SOCIETY") {
        html += `
            <li onclick="location.href='society-create.html'"><i class="fa fa-plus"></i> Cadastrar Society</li>
            <li onclick="location.href='campeonatos.html'"><i class="fa fa-trophy"></i> Campeonatos</li>
            <li onclick="location.href='pagamentos.html'"><i class="fa fa-credit-card"></i> Pagamentos</li>
        `;
    }

    if (usuarioLogado.tipo === "DONO_TIME") {
        html += `
            <li onclick="location.href='times.html'"><i class="fa fa-users"></i> Meus Times</li>
            <li onclick="location.href='jogadores.html'"><i class="fa fa-people-group"></i> Jogadores</li>
        `;
    }

    if (usuarioLogado.tipo === "PLAYER") {
        html += `
            <li onclick="location.href='times-disponiveis.html'"><i class="fa fa-users"></i> Times</li>
            <li onclick="location.href='meu-time.html'"><i class="fa fa-user-friends"></i> Meu Time</li>
        `;
    }

    html += `
        <li onclick="location.href='perfil.html'"><i class="fa fa-user"></i> Perfil</li>
        <li onclick="sair()"><i class="fa fa-sign-out-alt"></i> Sair</li>
    `;

    if (menu) menu.innerHTML = html;

    function sair() {
        localStorage.removeItem("usuarioLogado");
        window.location.href = "login.html";
    }
}
