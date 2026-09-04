if (!window.menuLoaded) {
  window.menuLoaded = true;

  const BASE_URL = "https://goplay-dzlr.onrender.com";
  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
  const menu = document.getElementById("menuDynamic");

  if (!usuarioLogado?.id) {
    window.location.href = "login.html";
  }

  const escapeHtml = (valor) => String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  async function fetchJSON(url) {
    const res = await fetch(url);
    const text = await res.text().catch(() => "");
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!res.ok) throw new Error(data?.error || text || `HTTP ${res.status}`);
    return data;
  }

  function getSocietyIdFromUrl() {
    try {
      const id = new URL(window.location.href).searchParams.get("societyId");
      return id && Number.isFinite(Number(id)) ? Number(id) : null;
    } catch {
      return null;
    }
  }

  function salvarEmpresaContexto(empresa) {
    if (!empresa?.id) {
      localStorage.removeItem("societyId");
      localStorage.removeItem("societyContextName");
      return;
    }
    localStorage.setItem("societyId", String(empresa.id));
    localStorage.setItem("societyContextName", empresa.nome || "Empresa");
  }

  function getEmpresaSelecionadaLocal() {
    const id = Number(localStorage.getItem("societyId") || 0);
    const nome = localStorage.getItem("societyContextName") || "";
    return id ? { id, nome } : null;
  }

  window.getEmpresaSelecionada = getEmpresaSelecionadaLocal;

  window.sairSistema = function () {
    localStorage.removeItem("usuarioLogado");
    localStorage.removeItem("societyId");
    localStorage.removeItem("societyContextName");
    localStorage.removeItem("societyOwnerId");
    window.location.href = "login.html";
  };

  function focarSeletorEmpresa() {
    const select = document.getElementById("empresaContextSelect");
    if (select) {
      select.focus();
      select.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  window.exigirEmpresaSelecionada = function () {
    const empresa = getEmpresaSelecionadaLocal();
    if (empresa?.id) return empresa;
    alert("Selecione uma empresa primeiro.");
    focarSeletorEmpresa();
    return null;
  };

  window.navegarComEmpresa = function (pagina) {
    const empresa = window.exigirEmpresaSelecionada();
    if (!empresa) return;
    window.location.href = pagina;
  };

  window.abrirMinhaEmpresaMenu = function () {
    const empresa = window.exigirEmpresaSelecionada();
    if (!empresa) return;
    window.location.href = `society-detalhe.html?societyId=${encodeURIComponent(empresa.id)}`;
  };

  function menuSection(label) {
    return `<li class="menu-section-label">${escapeHtml(label)}</li>`;
  }

  function menuItem(icon, label, action) {
    return `<li onclick="${action}"><i class="fa ${icon}"></i><span>${escapeHtml(label)}</span></li>`;
  }

  let html = menuItem("fa-house", "Início", "location.href='home.html'");

  if (usuarioLogado.tipo === "DONO_SOCIETY") {
    html += menuSection("OPERAÇÃO");
    html += menuItem("fa-calendar", "Agenda", "navegarComEmpresa('horarios.html')");
    html += menuItem("fa-receipt", "Comandas", "navegarComEmpresa('comanda-admin.html')");

    html += menuSection("ESPORTES");
    html += menuItem("fa-trophy", "Campeonatos", "navegarComEmpresa('campeonatos.html')");
    html += menuItem("fa-users", "Times", "navegarComEmpresa('times.html')");

    html += menuSection("FINANCEIRO");
    html += menuItem("fa-credit-card", "Recebimentos", "navegarComEmpresa('recebimentos.html')");
    html += menuItem("fa-chart-line", "Visão Geral", "navegarComEmpresa('society-dashboard.html')");

    html += menuSection("EMPRESA");
    html += menuItem("fa-building", "Minha Empresa", "abrirMinhaEmpresaMenu()");
    html += menuItem("fa-futbol", "Quadras", "navegarComEmpresa('campos.html')");
    html += menuItem("fa-utensils", "Cardápio", "navegarComEmpresa('cardapio.html')");
    html += menuItem("fa-plus", "Cadastrar Empresa", "location.href='society-create.html'");
  }

  if (usuarioLogado.tipo === "DONO_TIME") {
    html += menuSection("JOGAR");
    html += menuItem("fa-building", "Explorar Empresas", "location.href='societies.html'");
    html += menuItem("fa-calendar-check", "Agendar Horário", "location.href='time-agendamento.html'");
    html += menuItem("fa-receipt", "Minha Comanda", "location.href='comanda.html'");
    html += menuItem("fa-list", "Meus Agendamentos", "location.href='meus-agendamentos.html'");
    html += menuItem("fa-money-bill", "Meus Pagamentos", "location.href='meus-pagamentos.html'");

    html += menuSection("MEU TIME");
    html += menuItem("fa-users", "Meus Times", "location.href='times.html'");
    html += menuItem("fa-trophy", "Campeonatos", "location.href='campeonatos-view.html'");
  }

  if (usuarioLogado.tipo === "PLAYER") {
    html += menuSection("JOGAR");
    html += menuItem("fa-building", "Explorar Empresas", "location.href='societies.html'");
    html += menuItem("fa-receipt", "Minha Comanda", "location.href='comanda.html'");
    html += menuItem("fa-trophy", "Campeonatos", "location.href='campeonatos-view.html'");

    html += menuSection("TIME");
    html += menuItem("fa-users", "Times", "location.href='times.html'");
    html += menuItem("fa-user-friends", "Meu Time", "location.href='meu-time.html'");
  }

  html += menuSection("CONTA");
  html += menuItem("fa-user", "Perfil", "location.href='perfil.html'");
  html += `<li id="btnSairMenu"><i class="fa fa-sign-out-alt"></i><span>Sair</span></li>`;

  if (menu) menu.innerHTML = html;
  document.getElementById("btnSairMenu")?.addEventListener("click", window.sairSistema);

  function instalarEstilosContexto() {
    if (document.getElementById("goplayEmpresaContextStyles")) return;
    const style = document.createElement("style");
    style.id = "goplayEmpresaContextStyles";
    style.textContent = `
      .empresa-context-box{margin:0 14px 14px;padding:12px;border:1px solid rgba(255,255,255,.16);border-radius:14px;background:rgba(255,255,255,.07)}
      .empresa-context-box label{display:block;color:#b9c9d8;font-size:10px;font-weight:900;letter-spacing:.08em;margin:0 0 7px;text-transform:uppercase}
      .empresa-context-box select{width:100%;padding:9px 10px;border:1px solid rgba(255,255,255,.18);border-radius:10px;background:#fff;color:#052845;font-size:13px;font-weight:700}
      .empresa-context-hint{color:#d8e3ec;font-size:11px;line-height:1.35;margin-top:7px}
      .menu-section-label{padding:15px 22px 5px!important;color:#7fa0b9!important;font-size:10px!important;font-weight:900!important;letter-spacing:.12em!important;cursor:default!important}
      .menu-section-label:hover{background:transparent!important}
      .topbar-empresa-chip{margin-left:auto;max-width:320px;padding:7px 11px;border-radius:999px;background:#eef6fb;color:#052845;font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      @media(max-width:640px){.topbar-empresa-chip{max-width:135px;font-size:10px}.empresa-context-box{margin-left:10px;margin-right:10px}}
    `;
    document.head.appendChild(style);
  }

  function renderContextoEmpresa(empresas, selecionadaId) {
    instalarEstilosContexto();
    const sidebar = document.getElementById("sidebar");
    const menuEl = document.getElementById("menuDynamic");
    if (!sidebar || !menuEl) return;

    let box = document.getElementById("empresaContextBox");
    if (!box) {
      box = document.createElement("div");
      box.id = "empresaContextBox";
      box.className = "empresa-context-box";
      sidebar.insertBefore(box, menuEl);
    }

    const placeholder = usuarioLogado.tipo === "DONO_SOCIETY"
      ? "Selecione sua empresa"
      : "Selecione onde você está";

    box.innerHTML = `
      <label><i class="fa fa-location-dot"></i> Empresa atual</label>
      <select id="empresaContextSelect">
        <option value="">${placeholder}</option>
        ${(empresas || []).map(e => `<option value="${e.id}" ${Number(e.id) === Number(selecionadaId) ? "selected" : ""}>${escapeHtml(e.nome)}${e.cidade ? ` — ${escapeHtml(e.cidade)}` : ""}</option>`).join("")}
      </select>
      <div class="empresa-context-hint">Agenda, comanda e gestão usam a empresa selecionada aqui.</div>
    `;

    const select = document.getElementById("empresaContextSelect");
    select?.addEventListener("change", () => {
      const id = Number(select.value || 0);
      const empresa = (empresas || []).find(e => Number(e.id) === id) || null;
      salvarEmpresaContexto(empresa);
      window.dispatchEvent(new CustomEvent("goplay:empresa-changed", { detail: empresa }));
      // Mantém todas as páginas antigas sincronizadas sem depender de cada script escutar o evento.
      window.location.reload();
    });

    const topbar = document.querySelector(".topbar");
    if (topbar) {
      let chip = document.getElementById("topbarEmpresaChip");
      if (!chip) {
        chip = document.createElement("div");
        chip.id = "topbarEmpresaChip";
        chip.className = "topbar-empresa-chip";
        topbar.appendChild(chip);
      }
      const empresa = (empresas || []).find(e => Number(e.id) === Number(selecionadaId));
      chip.textContent = empresa ? `📍 ${empresa.nome}` : "📍 Nenhuma empresa selecionada";
    }
  }

  async function carregarContextoEmpresas() {
    try {
      const empresas = usuarioLogado.tipo === "DONO_SOCIETY"
        ? await fetchJSON(`${BASE_URL}/society/owner/${usuarioLogado.id}`)
        : await fetchJSON(`${BASE_URL}/society`);

      const lista = Array.isArray(empresas) ? empresas : [];
      const urlId = getSocietyIdFromUrl();
      const localId = Number(localStorage.getItem("societyId") || 0) || null;

      let selecionada = null;
      if (urlId) selecionada = lista.find(e => Number(e.id) === Number(urlId)) || null;
      if (!selecionada && localId) selecionada = lista.find(e => Number(e.id) === Number(localId)) || null;

      // Para dono com somente uma empresa não há ambiguidade: mantém fluxo rápido.
      if (!selecionada && usuarioLogado.tipo === "DONO_SOCIETY" && lista.length === 1) {
        selecionada = lista[0];
      }

      if (selecionada) salvarEmpresaContexto(selecionada);
      else if (localId) salvarEmpresaContexto(null);

      if (usuarioLogado.tipo === "DONO_SOCIETY") {
        localStorage.setItem("societyOwnerId", String(usuarioLogado.id));
      }

      window.GOPLAY_EMPRESAS = lista;
      window.GOPLAY_EMPRESA_ATUAL = selecionada;
      renderContextoEmpresa(lista, selecionada?.id || null);
      return { empresas: lista, empresa: selecionada };
    } catch (e) {
      console.error("Erro ao carregar contexto de empresa:", e);
      renderContextoEmpresa([], null);
      return { empresas: [], empresa: null, error: e };
    }
  }

  window.GoPlayEmpresaContextReady = carregarContextoEmpresas();
}
