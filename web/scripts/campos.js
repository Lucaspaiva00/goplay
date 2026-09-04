const BASE_URL = "https://goplay-dzlr.onrender.com";

let campoEmEdicao = null;

function el(id) {
  return document.getElementById(id);
}

function getUsuarioLogado() {
  try {
    return JSON.parse(localStorage.getItem("usuarioLogado") || "null");
  } catch {
    return null;
  }
}

function getSocietyId() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = (params.get("societyId") || "").trim();
  const fromLS = (localStorage.getItem("societyId") || "").trim();
  return fromUrl || fromLS || null;
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text().catch(() => "");
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
  }

  return data;
}

function formatMoney(v) {
  if (v === null || v === undefined || v === "") return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

function renderCampos(campos) {
  const wrap = el("listaCampos");
  if (!wrap) return;

  const usuario = getUsuarioLogado();
  const tipo = String(usuario?.tipo || "").toUpperCase();
  const podeGerenciar = tipo === "DONO_SOCIETY" || (tipo === "FUNCIONARIO" && String(usuario?.funcao || "").toUpperCase() === "ADMIN");

  if (!Array.isArray(campos) || campos.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Nenhuma quadra cadastrada nesta empresa.</div>`;
    return;
  }

  wrap.innerHTML = campos.map((c) => `
    <div class="campo-card">
      <div class="campo-top">
        <div>
          <h3 class="campo-nome">${c.nome || "-"}</h3>
          <p class="campo-subinfo">${c.dimensoes || "-"} • ${c.gramado || "-"}</p>
        </div>

        ${podeGerenciar ? `
          <div class="campo-actions">
            <button class="icon-btn" onclick="abrirModalEdicaoCampo(${c.id})" title="Editar quadra">
              <i class="fa fa-pen"></i>
            </button>
            <button class="icon-btn danger" onclick="excluirCampo(${c.id}, '${(c.nome || "").replace(/'/g, "\\'")}')" title="Excluir quadra">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        ` : ""}
      </div>

      <div class="campo-info">
        <div><b>Avulso (por hora):</b> ${formatMoney(c.valorAvulso)}</div>
        <div><b>Mensal:</b> ${formatMoney(c.valorMensal)}</div>
      </div>

      ${c.fotoUrl
      ? `
            <div class="campo-foto-wrap">
              <img src="${c.fotoUrl}" alt="Foto da quadra" class="campo-foto">
            </div>
          `
      : ""
    }
    </div>
  `).join("");
}

async function listarCampos() {
  const societyId = getSocietyId();
  const wrap = el("listaCampos");

  if (!societyId) {
    if (wrap) {
      wrap.innerHTML = `
        <div class="error-state">Empresa não selecionada.</div>
        <div class="helper-state">
          Volte em <b>Minha Empresa</b> e entre novamente pelos detalhes da empresa.
        </div>
      `;
    }
    return;
  }

  localStorage.setItem("societyId", societyId);

  const campos = await fetchJSON(`${BASE_URL}/campos/society/${encodeURIComponent(societyId)}`);
  renderCampos(campos);
}

window.salvarCampo = async function salvarCampo() {
  try {
    const societyId = getSocietyId();

    if (!societyId) {
      alert("Empresa não selecionada. Volte no detalhe da empresa e clique em Criar / Gerenciar Quadras.");
      return;
    }

    const nome = (el("nome")?.value || "").trim();
    const valorAvulso = (el("valorAvulso")?.value || "").trim();
    const valorMensal = (el("valorMensal")?.value || "").trim();
    const dimensoes = (el("dimensoes")?.value || "").trim();
    const estiloGramado = (el("estiloGramado")?.value || "").trim();
    const fotoFile = el("foto")?.files?.[0] || null;

    if (!nome) {
      alert("Informe o nome da quadra.");
      return;
    }

    let fotoUrl = null;
    if (fotoFile) {
      fotoUrl = await uploadImage(fotoFile);
    }

    const payload = {
      societyId,
      nome,
      valorAvulso: valorAvulso !== "" ? Number(valorAvulso) : null,
      valorMensal: valorMensal !== "" ? Number(valorMensal) : null,
      dimensoes: dimensoes || null,
      gramado: estiloGramado || null,
      fotoUrl
    };

    await fetchJSON(`${BASE_URL}/campos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    ["nome", "valorAvulso", "valorMensal", "dimensoes", "estiloGramado", "foto"].forEach((id) => {
      if (el(id)) el(id).value = "";
    });

    alert("Quadra salva com sucesso!");
    await listarCampos();
  } catch (e) {
    console.error(e);
    alert(e.message || "Erro ao salvar quadra.");
  }
};

window.abrirModalEdicaoCampo = async function abrirModalEdicaoCampo(campoId) {
  try {
    const campo = await fetchJSON(`${BASE_URL}/campos/${campoId}`);
    campoEmEdicao = campo;

    el("editNome").value = campo.nome || "";
    el("editValorAvulso").value = campo.valorAvulso ?? "";
    el("editValorMensal").value = campo.valorMensal ?? "";
    el("editDimensoes").value = campo.dimensoes || "";
    el("editEstiloGramado").value = campo.gramado || "";
    if (el("editFoto")) el("editFoto").value = "";

    el("editCampoModal").style.display = "flex";
    document.body.style.overflow = "hidden";
  } catch (e) {
    console.error(e);
    alert(e.message || "Erro ao carregar quadra.");
  }
};

window.fecharModalCampo = function fecharModalCampo() {
  el("editCampoModal").style.display = "none";
  document.body.style.overflow = "auto";
  campoEmEdicao = null;
};

window.salvarEdicaoCampo = async function salvarEdicaoCampo() {
  try {
    if (!campoEmEdicao?.id) {
      alert("Quadra não encontrada.");
      return;
    }

    const nome = (el("editNome")?.value || "").trim();
    const valorAvulso = (el("editValorAvulso")?.value || "").trim();
    const valorMensal = (el("editValorMensal")?.value || "").trim();
    const dimensoes = (el("editDimensoes")?.value || "").trim();
    const estiloGramado = (el("editEstiloGramado")?.value || "").trim();
    const fotoFile = el("editFoto")?.files?.[0] || null;

    if (!nome) {
      alert("Informe o nome da quadra.");
      return;
    }

    let fotoUrl = campoEmEdicao.fotoUrl || null;
    if (fotoFile) {
      fotoUrl = await uploadImage(fotoFile);
    }

    const payload = {
      nome,
      valorAvulso: valorAvulso !== "" ? Number(valorAvulso) : null,
      valorMensal: valorMensal !== "" ? Number(valorMensal) : null,
      dimensoes: dimensoes || null,
      gramado: estiloGramado || null,
      fotoUrl
    };

    await fetchJSON(`${BASE_URL}/campos/${campoEmEdicao.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    fecharModalCampo();
    alert("Quadra atualizada com sucesso!");
    await listarCampos();
  } catch (e) {
    console.error(e);
    alert(e.message || "Erro ao atualizar quadra.");
  }
};

window.excluirCampo = async function excluirCampo(campoId, nome) {
  const confirmar = confirm(`Deseja realmente excluir a quadra "${nome}"?`);
  if (!confirmar) return;

  try {
    await fetchJSON(`${BASE_URL}/campos/${campoId}`, {
      method: "DELETE"
    });

    alert("Quadra excluída com sucesso!");
    await listarCampos();
  } catch (e) {
    console.error(e);
    alert(e.message || "Erro ao excluir quadra.");
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  if (window.GoPlayEmpresaContextReady) await window.GoPlayEmpresaContextReady;
  try {
    const modal = el("editCampoModal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          fecharModalCampo();
        }
      });
    }

    await listarCampos();
  } catch (e) {
    console.error(e);
    alert(e.message || "Erro ao carregar quadras.");
  }
});