if (!window.menuLoaded) {
  window.menuLoaded = true;

  const BASE_URL = "https://goplay-dzlr.onrender.com";
  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
  const menu = document.getElementById("menuDynamic");

  if (!usuarioLogado) {
    window.location.href = "login.html";
  }

  window.sairSistema = function () {
    localStorage.removeItem("usuarioLogado");
    localStorage.removeItem("societyId");
    localStorage.removeItem("societyOwnerId");
    window.location.href = "login.html";
  };

  window.abrirMeuSocietyMenu = function () {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado") || "null");

    if (!usuario) {
      window.location.href = "login.html";
      return;
    }

    if (usuario.tipo !== "DONO_SOCIETY") {
      window.location.href = "societies.html";
      return;
    }

    fetch(`${BASE_URL}/society/owner/${usuario.id}`)
      .then((res) => res.json())
      .then((lista) => {
        if (!Array.isArray(lista) || lista.length === 0) {
          alert("Você ainda não possui society cadastrado.");
          window.location.href = "society-create.html";
          return;
        }

        const meuSociety = lista[0];

        localStorage.setItem("societyId", meuSociety.id);
        localStorage.setItem("societyOwnerId", usuario.id);

        window.location.href = `society-detalhe.html?societyId=${meuSociety.id}`;
      })
      .catch(() => {
        alert("Erro ao carregar seu society.");
      });
  };

  let html = `
    <li onclick="location.href='home.html'">
      <i class="fa fa-house"></i> Início
    </li>
  `;

  if (usuarioLogado.tipo === "DONO_SOCIETY") {
    html += `
      <li onclick="abrirMeuSocietyMenu()">
        <i class="fa fa-futbol"></i> Meu Society
      </li>
      <li onclick="location.href='society-create.html'">
        <i class="fa fa-plus"></i> Cadastrar Society
      </li>
      <li onclick="location.href='campeonatos.html'">
        <i class="fa fa-trophy"></i> Campeonatos
      </li>
      <li onclick="location.href='recebimentos.html'">
        <i class="fa fa-credit-card"></i> Recebimentos
      </li>
      <li onclick="location.href='society-dashboard.html'">
        <i class="fa fa-chart-line"></i> Dashboard
      </li>
    `;
  }

  if (usuarioLogado.tipo === "DONO_TIME") {
    html += `
      <li onclick="location.href='societies.html'">
        <i class="fa fa-eye"></i> Ver Societies
      </li>
      <li onclick="location.href='times.html'">
        <i class="fa fa-users"></i> Meus Times
      </li>
      <li onclick="location.href='time-agendamento.html'">
        <i class="fa fa-calendar"></i> Agendar Horário
      </li>
      <li onclick="location.href='meus-agendamentos.html'">
        <i class="fa fa-list"></i> Meus Agendamentos
      </li>
      <li onclick="location.href='meus-pagamentos.html'">
        <i class="fa fa-money-bill"></i> Meus Pagamentos
      </li>
      <li onclick="location.href='campeonatos-view.html'">
        <i class="fa fa-trophy"></i> Campeonatos
      </li>
    `;
  }

  if (usuarioLogado.tipo === "PLAYER") {
    html += `
      <li onclick="location.href='societies.html'">
        <i class="fa fa-eye"></i> Ver Societies
      </li>
      <li onclick="location.href='campeonatos-view.html'">
        <i class="fa fa-trophy"></i> Campeonatos
      </li>
      <li onclick="location.href='times-disponiveis.html'">
        <i class="fa fa-users"></i> Times
      </li>
      <li onclick="location.href='meu-time.html'">
        <i class="fa fa-user-friends"></i> Meu Time
      </li>
    `;
  }

  html += `
    <li onclick="location.href='perfil.html'">
      <i class="fa fa-user"></i> Perfil
    </li>
    <li id="btnSairMenu">
      <i class="fa fa-sign-out-alt"></i> Sair
    </li>
  `;

  if (menu) {
    menu.innerHTML = html;
  }

  const btnSair = document.getElementById("btnSairMenu");
  if (btnSair) {
    btnSair.onclick = window.sairSistema;
  }

  if (usuarioLogado.tipo === "DONO_SOCIETY") {
    fetch(`${BASE_URL}/society/owner/${usuarioLogado.id}`)
      .then((res) => res.json())
      .then((lista) => {
        if (Array.isArray(lista) && lista.length > 0) {
          localStorage.setItem("societyId", lista[0].id);
          localStorage.setItem("societyOwnerId", usuarioLogado.id);
        }
      })
      .catch(() => { });
  }
}