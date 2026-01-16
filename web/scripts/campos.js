const BASE_URL = "http://localhost:3000";

function el(id) {
  return document.getElementById(id);
}

/**
 * Pega societyId:
 * 1) tenta pela URL (?societyId=...)
 * 2) se não tiver, tenta localStorage ("societyId")
 * Aceita ID string (cuid/uuid) - NÃO converte pra número.
 */
function getSocietyId() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = (params.get("societyId") || "").trim();
  const fromLS = (localStorage.getItem("societyId") || "").trim();

  const id = fromUrl || fromLS;
  return id ? id : null;
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
  return `R$ ${n.toFixed(2)}`;
}

function renderCampos(campos) {
  const wrap = el("listaCampos");
  if (!wrap) return;

  if (!Array.isArray(campos) || campos.length === 0) {
    wrap.innerHTML = `<div style="color:#6b7280;">Nenhum campo cadastrado neste society.</div>`;
    return;
  }

  wrap.innerHTML = campos
    .map(
      (c) => `
      <div class="campo-card" style="padding:16px;border-radius:14px;background:#fff;box-shadow:0 4px 14px rgba(0,0,0,.08);margin-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div style="font-weight:800;font-size:18px;color:#111827;">${c.nome || "-"}</div>
        </div>

        <div style="color:#111827;line-height:1.5;margin-top:8px;">
          <div><b>Dimensões:</b> ${c.dimensoes || "-"}</div>
          <div><b>Gramado:</b> ${c.gramado || "-"}</div>
          <div><b>Avulso (por hora):</b> ${formatMoney(c.valorAvulso)}</div>
          <div><b>Mensal:</b> ${formatMoney(c.valorMensal)}</div>

          ${
            c.fotoUrl
              ? `<div style="margin-top:10px;">
                   <img src="${c.fotoUrl}" alt="Foto do campo" style="max-width:100%;border-radius:12px;"/>
                 </div>`
              : ""
          }
        </div>
      </div>
    `
    )
    .join("");
}

async function listarCampos() {
  const societyId = getSocietyId();
  const wrap = el("listaCampos");

  if (!societyId) {
    if (wrap) {
      wrap.innerHTML = `
        <div style="color:#ef4444;font-weight:800;">
          Society não selecionado.
        </div>
        <div style="margin-top:10px;color:#374151;">
          Volte em <b>Ver Societies</b> → abra o <b>Detalhe</b> → clique em <b>Gerenciar Campos</b>.
        </div>
      `;
    }
    return;
  }

  // mantém sincronizado
  localStorage.setItem("societyId", societyId);

  const campos = await fetchJSON(`${BASE_URL}/campos/${encodeURIComponent(societyId)}`);
  renderCampos(campos);
}

window.salvarCampo = async function salvarCampo() {
  try {
    const societyId = getSocietyId();
    if (!societyId) {
      return alert("Society não selecionado. Volte no detalhe do society e clique em Gerenciar Campos.");
    }

    // mantém sincronizado
    localStorage.setItem("societyId", societyId);

    const nome = (el("nome")?.value || "").trim();
    const valorAvulso = (el("valorAvulso")?.value || "").trim();
    const valorMensal = (el("valorMensal")?.value || "").trim();
    const dimensoes = (el("dimensoes")?.value || "").trim();
    const estiloGramado = (el("estiloGramado")?.value || "").trim();
    const foto = (el("foto")?.value || "").trim();

    if (!nome) return alert("Informe o nome do campo.");

    const payload = {
      societyId, // STRING
      nome,
      valorAvulso: valorAvulso !== "" ? Number(valorAvulso) : null,
      valorMensal: valorMensal !== "" ? Number(valorMensal) : null,
      dimensoes: dimensoes || null,
      gramado: estiloGramado || null,
      fotoUrl: foto || null,
    };

    await fetchJSON(`${BASE_URL}/campos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // limpa form
    ["nome", "valorAvulso", "valorMensal", "dimensoes", "estiloGramado", "foto"].forEach((id) => {
      if (el(id)) el(id).value = "";
    });

    alert("✅ Campo salvo com sucesso!");
    await listarCampos();
  } catch (e) {
    console.error(e);
    alert(e.message || "Erro ao salvar campo.");
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await listarCampos();
  } catch (e) {
    console.error(e);
    alert(e.message || "Erro ao carregar campos.");
  }
});
