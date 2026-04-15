const BASE_URL = "https://goplay-dzlr.onrender.com";

let societyAtual = null;

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

function renderSocietyInfo(data) {
    const usuario = getUsuarioLogado();
    const tipo = String(usuario?.tipo || "").trim().toUpperCase();
    const isDonoSociety = tipo === "DONO_SOCIETY";

    el("societyInfo").innerHTML = `
      <div class="society-header-row">
        <div>
            <h3>${data.nome || "-"}</h3>
            <p class="society-description">${data.descricao || "Sem descrição cadastrada."}</p>
        </div>

        ${isDonoSociety ? `
          <button class="icon-edit-btn" onclick="abrirEdicaoSociety()" title="Editar Society">
            <i class="fa fa-pen"></i>
          </button>
        ` : ""}
      </div>

      <div class="society-details-grid">
        <div><b>Cidade:</b> ${data.cidade || "-"} / ${data.estado || "-"}</div>
        <div><b>Telefone:</b> ${data.telefone || "-"}</div>
        <div><b>WhatsApp:</b> ${data.whatsapp || "-"}</div>
        <div><b>Email:</b> ${data.email || "-"}</div>
        <div><b>Website:</b> ${data.website || "-"}</div>
        <div><b>Instagram:</b> ${data.instagram || "-"}</div>
        <div><b>Facebook:</b> ${data.facebook || "-"}</div>
        <div><b>YouTube:</b> ${data.youtube || "-"}</div>
        <div><b>Endereço:</b> ${data.endereco || "-"}</div>
        <div><b>CEP:</b> ${data.cep || "-"}</div>
      </div>

      <div class="society-stats">
        <div class="stat-box">
            <span>Campos cadastrados</span>
            <strong>${(data.campos || []).length}</strong>
        </div>
        <div class="stat-box">
            <span>Itens no cardápio</span>
            <strong>${(data.cardapio || []).length}</strong>
        </div>
        <div class="stat-box">
            <span>Times cadastrados</span>
            <strong>${(data.times || []).length}</strong>
        </div>
      </div>
    `;
}

function preencherFormularioEdicao(data) {
    el("editNome").value = data.nome || "";
    el("editDescricao").value = data.descricao || "";
    el("editTelefone").value = data.telefone || "";
    el("editWhatsapp").value = data.whatsapp || "";
    el("editEmail").value = data.email || "";
    el("editWebsite").value = data.website || "";
    el("editInstagram").value = data.instagram || "";
    el("editFacebook").value = data.facebook || "";
    el("editYoutube").value = data.youtube || "";
    el("editCep").value = data.cep || "";
    el("editEndereco").value = data.endereco || "";
    el("editCidade").value = data.cidade || "";
    el("editEstado").value = data.estado || "";
}

async function carregarSociety() {
    const societyId = getQueryParam("societyId");

    if (!societyId) {
        alert("Society inválido.");
        return;
    }

    localStorage.setItem("societyId", String(societyId));

    const res = await fetch(`${BASE_URL}/society/${societyId}`);
    const data = await res.json();

    if (data?.error) {
        el("societyInfo").innerHTML = `<p>${data.error}</p>`;
        return;
    }

    societyAtual = data;
    renderSocietyInfo(data);
}

document.addEventListener("DOMContentLoaded", async () => {
    const usuarioLogado = getUsuarioLogado();

    if (!usuarioLogado?.id) {
        alert("Você precisa fazer login!");
        window.location.href = "login.html";
        return;
    }

    try {
        await carregarSociety();

        const tipo = String(usuarioLogado.tipo || "").trim().toUpperCase();
        const isDonoSociety = tipo === "DONO_SOCIETY";
        const isDonoTime = tipo === "DONO_TIME";
        const isPlayer = tipo === "PLAYER";

        const btnPag = el("btnPagamentos");

        if (isPlayer) {
            hideButton(btnPag);
        } else if (isDonoTime) {
            if (btnPag) btnPag.textContent = "Meus Pagamentos";
        } else if (isDonoSociety) {
            if (btnPag) btnPag.textContent = "Pagamentos";
        } else {
            lockButton(btnPag, "Ação não disponível para este perfil.");
        }

        const aviso = el("avisoPermissao");
        if (!isDonoSociety && aviso) {
            aviso.style.display = "block";
            aviso.textContent = "Você está em modo visualização (sem permissões de gerenciamento).";
        }

        const modalOverlay = el("editModalOverlay");
        if (modalOverlay) {
            modalOverlay.addEventListener("click", (e) => {
                if (e.target === modalOverlay) {
                    cancelarEdicaoSociety();
                }
            });
        }
    } catch (e) {
        console.error(e);
        el("societyInfo").innerHTML = "<p>Erro ao carregar society.</p>";
    }
});

function abrirEdicaoSociety() {
    const usuario = getUsuarioLogado();
    const tipo = String(usuario?.tipo || "").trim().toUpperCase();

    if (tipo !== "DONO_SOCIETY") {
        alert("Apenas o dono do society pode editar.");
        return;
    }

    if (!societyAtual) {
        alert("Society ainda não carregado.");
        return;
    }

    preencherFormularioEdicao(societyAtual);
    el("editModalOverlay").style.display = "flex";
    document.body.style.overflow = "hidden";
}

function cancelarEdicaoSociety() {
    el("editModalOverlay").style.display = "none";
    document.body.style.overflow = "auto";
}

async function salvarEdicaoSociety() {
    try {
        if (!societyAtual?.id) {
            alert("Society inválido.");
            return;
        }

        const body = {
            nome: el("editNome").value.trim(),
            descricao: el("editDescricao").value.trim(),
            telefone: el("editTelefone").value.trim(),
            whatsapp: el("editWhatsapp").value.trim(),
            email: el("editEmail").value.trim(),
            website: el("editWebsite").value.trim(),
            instagram: el("editInstagram").value.trim(),
            facebook: el("editFacebook").value.trim(),
            youtube: el("editYoutube").value.trim(),
            cep: el("editCep").value.trim(),
            endereco: el("editEndereco").value.trim(),
            cidade: el("editCidade").value.trim(),
            estado: el("editEstado").value.trim()
        };

        if (!body.nome) {
            alert("O nome do society é obrigatório.");
            return;
        }

        const res = await fetch(`${BASE_URL}/society/${societyAtual.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok || data?.error) {
            alert(data?.error || "Erro ao atualizar society.");
            return;
        }

        societyAtual = {
            ...societyAtual,
            ...data
        };

        renderSocietyInfo(societyAtual);
        cancelarEdicaoSociety();
        alert("Society atualizado com sucesso!");
    } catch (error) {
        console.error(error);
        alert("Erro ao atualizar society.");
    }
}

function irCampos() {
    const u = getUsuarioLogado();
    const tipo = String(u?.tipo || "").toUpperCase();
    const societyId = localStorage.getItem("societyId");

    if (tipo === "DONO_SOCIETY") {
        return (location.href = "campos.html");
    }

    return (location.href = `campos-view.html?societyId=${encodeURIComponent(societyId || "")}`);
}

function irCardapio() {
    const u = getUsuarioLogado();
    const tipo = String(u?.tipo || "").toUpperCase();
    const societyId = localStorage.getItem("societyId");

    if (tipo === "DONO_SOCIETY") {
        return (location.href = "cardapio.html");
    }

    return (location.href = `cardapio-view.html?societyId=${encodeURIComponent(societyId || "")}`);
}

function irTimes() {
    const societyId = localStorage.getItem("societyId") || getQueryParam("societyId") || "";
    location.href = `times.html?societyId=${encodeURIComponent(societyId)}`;
}

function irPagamentos() {
    const u = getUsuarioLogado();
    const tipo = String(u?.tipo || "").toUpperCase();

    if (tipo === "DONO_SOCIETY") {
        return (location.href = "recebimentos.html");
    }

    if (tipo === "DONO_TIME") {
        return (location.href = "meus-pagamentos.html");
    }

    alert("Ação não disponível para este perfil.");
}