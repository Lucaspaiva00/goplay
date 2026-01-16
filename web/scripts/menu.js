// menu.js (BROWSER) - sem require

// Impede duplicação do menu
if (!window.menuLoaded) {
    window.menuLoaded = true;

    const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
    const menu = document.getElementById("menuDynamic");

    if (!usuarioLogado) {
        window.location.href = "login.html";
    }

    let html = `
    <li onclick="location.href='home.html'"><i class="fa fa-house"></i> Início</li>
    <li onclick="location.href='societies.html'"><i class="fa fa-eye"></i> Ver Societies</li>
  `;

    // ✅ DONO_SOCIETY
    if (usuarioLogado.tipo === "DONO_SOCIETY") {
        html += `
      <li onclick="location.href='society-create.html'"><i class="fa fa-plus"></i> Cadastrar Society</li>
      <li onclick="location.href='campos.html'"><i class="fa fa-map"></i> Gerenciar Campos</li>
      <li onclick="location.href='campeonatos.html'"><i class="fa fa-trophy"></i> Campeonatos</li>
      <li onclick="location.href='pagamentos.html'"><i class="fa fa-credit-card"></i> Recebimentos</li>
      <li onclick="location.href='society-dashboard.html'"><i class="fa fa-chart-line"></i> Dashboard</li>
    `;
    }

    // ✅ DONO_TIME
    if (usuarioLogado.tipo === "DONO_TIME") {
        html += `
      <li onclick="location.href='times.html'"><i class="fa fa-users"></i> Meus Times</li>
      <li onclick="location.href='time-agendamento.html'"><i class="fa fa-calendar"></i> Agendar Horário</li>
      <li onclick="location.href='meus-agendamentos.html'"><i class="fa fa-list"></i> Meus Agendamentos</li>
      <li onclick="location.href='meus-pagamentos.html'"><i class="fa fa-money-bill"></i> Meus Pagamentos</li>
    `;
    }

    // ✅ PLAYER
    if (usuarioLogado.tipo === "PLAYER") {
        html += `
      <li onclick="location.href='times-disponiveis.html'"><i class="fa fa-users"></i> Times</li>
      <li onclick="location.href='meu-time.html'"><i class="fa fa-user-friends"></i> Meu Time</li>
    `;
    }

    html += `
    <li onclick="location.href='perfil.html'"><i class="fa fa-user"></i> Perfil</li>
    <li id="btnSairMenu"><i class="fa fa-sign-out-alt"></i> Sair</li>
  `;

    if (menu) menu.innerHTML = html;

    // ✅ sair (precisa ser global e/ou bind)
    const btnSair = document.getElementById("btnSairMenu");
    if (btnSair) {
        btnSair.onclick = () => {
            localStorage.removeItem("usuarioLogado");
            localStorage.removeItem("societyId");
            localStorage.removeItem("societyOwnerId");
            window.location.href = "login.html";
        };
    }

    // 🔥 (opcional) salvar societyId do dono
    if (usuarioLogado.tipo === "DONO_SOCIETY") {
        fetch(`http://localhost:3000/society/owner/${usuarioLogado.id}`)
            .then((res) => res.json())
            .then((lista) => {
                if (lista?.length) {
                    localStorage.setItem("societyId", lista[0].id);
                    localStorage.setItem("societyOwnerId", usuarioLogado.id);
                }
            })
            .catch(() => { });
    }
}
