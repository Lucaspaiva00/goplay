const BASE_URL = "http://localhost:3000";

function getUsuarioLogado() {
    const keys = ["usuarioLogado", "USUARIO_LOGADO", "OPERADOR_LOGADO"];
    for (const k of keys) {
        try {
            const u = JSON.parse(localStorage.getItem(k) || "null");
            if (u?.id) return u;
        } catch { }
    }
    return null;
}

function el(id) {
    return document.getElementById(id);
}

function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

function lockButton(btn, msg) {
    if (!btn) return;
    btn.disabled = true;
    btn.style.opacity = "0.55";
    btn.style.cursor = "not-allowed";
    btn.title = msg || "Ação não permitida.";
    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        alert(msg || "Ação não permitida.");
        return false;
    };
}

function hideButton(btn) {
    if (!btn) return;
    btn.style.display = "none";
}

document.addEventListener("DOMContentLoaded", async () => {
    const usuarioLogado = getUsuarioLogado();
    if (!usuarioLogado?.id) {
        alert("Você precisa fazer login!");
        window.location.href = "login.html";
        return;
    }

    const societyId = getQueryParam("societyId");
    if (!societyId) {
        alert("Society inválido.");
        return;
    }

    // ✅ salvar societyId pro resto das telas (view)
    localStorage.setItem("societyId", String(societyId));

    try {
        const res = await fetch(`${BASE_URL}/society/${societyId}`);
        const data = await res.json();

        if (data?.error) {
            el("societyInfo").innerHTML = `<p>${data.error}</p>`;
            return;
        }

        el("societyInfo").innerHTML = `
      <h3>${data.nome}</h3>
      <p>${data.descricao || "Sem descrição"}</p>
      <p><b>Cidade:</b> ${data.cidade || "-"} / ${data.estado || "-"}</p>
      <p><b>Telefone:</b> ${data.telefone || "-"}</p>
      <p><b>Email:</b> ${data.email || "-"}</p>
      <p><b>Website:</b> ${data.website || "-"}</p>
      <hr>
      <p><b>Campos cadastrados:</b> ${(data.campos || []).length}</p>
      <p><b>Itens no cardápio:</b> ${(data.cardapio || []).length}</p>
      <p><b>Jogadores:</b> ${(data.societyPlayers || []).length}</p>
    `;

        const tipo = String(usuarioLogado.tipo || "").toUpperCase();
        const isDonoSociety = tipo === "DONO_SOCIETY";
        const isDonoTime = tipo === "DONO_TIME";
        const isPlayer = tipo === "PLAYER";

        // ✅ Campos/Cardápio/Jogadores: todos podem VER (não trava)

        // ✅ Pagamentos:
        // - DONO_SOCIETY: vai pra pagamentos.html (recebimentos do society)
        // - DONO_TIME: vai pra meus-pagamentos.html
        // - PLAYER: não mostra
        const btnPag = el("btnPagamentos");

        if (isPlayer) {
            hideButton(btnPag);
        } else if (isDonoTime) {
            // troca texto pra ficar claro
            if (btnPag) btnPag.textContent = "Meus Pagamentos";
        } else if (isDonoSociety) {
            // ok, mantém Pagamentos (recebimentos)
            if (btnPag) btnPag.textContent = "Pagamentos";
        } else {
            // qualquer outro caso, trava
            lockButton(btnPag, "Ação não disponível para este perfil.");
        }

        // ✅ aviso (somente se não for dono society)
        const aviso = el("avisoPermissao");
        if (!isDonoSociety && aviso) {
            aviso.style.display = "block";
            aviso.textContent = "Você está em modo visualização (sem permissões de gerenciamento).";
        }
    } catch (e) {
        console.error(e);
        el("societyInfo").innerHTML = "<p>Erro ao carregar society.</p>";
    }
});

function irCampos() {
    const u = getUsuarioLogado();
    const tipo = String(u?.tipo || "").toUpperCase();
    const societyId = localStorage.getItem("societyId");

    if (tipo === "DONO_SOCIETY") return (location.href = "campos.html");
    return (location.href = `campos-view.html?societyId=${encodeURIComponent(societyId || "")}`);
}

function irCardapio() {
    const u = getUsuarioLogado();
    const tipo = String(u?.tipo || "").toUpperCase();
    const societyId = localStorage.getItem("societyId");

    if (tipo === "DONO_SOCIETY") return (location.href = "cardapio.html");
    return (location.href = `cardapio-view.html?societyId=${encodeURIComponent(societyId || "")}`);
}

function irJogadores() {
    const u = getUsuarioLogado();
    const tipo = String(u?.tipo || "").toUpperCase();
    const societyId = localStorage.getItem("societyId");

    if (tipo === "DONO_SOCIETY") return (location.href = "jogadores.html");
    return (location.href = `jogadores-view.html?societyId=${encodeURIComponent(societyId || "")}`);
}

