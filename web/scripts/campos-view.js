const BASE_URL = "https://goplay-dzlr.onrender.com";

function el(id) {
    return document.getElementById(id);
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

    if (!Array.isArray(campos) || campos.length === 0) {
        wrap.innerHTML = `<div style="color:#6b7280;">Este society ainda não possui campos cadastrados.</div>`;
        return;
    }

    wrap.innerHTML = campos.map((c) => `
        <div class="campo-card" style="padding:20px;border-radius:16px;background:#fff;box-shadow:0 4px 14px rgba(0,0,0,.08);margin-bottom:16px;border:1px solid #e5e7eb;">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;">
                <div style="flex:1;min-width:250px;">
                    <div style="font-weight:800;font-size:24px;color:#111827;margin-bottom:10px;">${c.nome || "-"}</div>
                    <div style="color:#111827;line-height:1.8;font-size:15px;">
                        <div><b>Dimensões:</b> ${c.dimensoes || "-"}</div>
                        <div><b>Gramado:</b> ${c.gramado || "-"}</div>
                        <div><b>Valor avulso:</b> ${formatMoney(c.valorAvulso)}</div>
                        <div><b>Valor mensal:</b> ${formatMoney(c.valorMensal)}</div>
                    </div>
                </div>

                ${c.fotoUrl ? `
                    <div style="width:280px;max-width:100%;">
                        <img src="${c.fotoUrl}" alt="Foto do campo" style="width:100%;border-radius:14px;object-fit:cover;border:1px solid #e5e7eb;" />
                    </div>
                ` : ""}
            </div>
        </div>
    `).join("");
}

async function listarCampos() {
    const societyId = getSocietyId();
    const wrap = el("listaCampos");

    if (!societyId) {
        if (wrap) {
            wrap.innerHTML = `
                <div style="color:#ef4444;font-weight:800;">Society não selecionado.</div>
                <div style="margin-top:10px;color:#374151;">
                    Volte em <b>Ver Societies</b> → abra o <b>Detalhe</b> → clique em <b>Ver Campos</b>.
                </div>
            `;
        }
        return;
    }

    localStorage.setItem("societyId", societyId);

    const campos = await fetchJSON(`${BASE_URL}/campos/society/${encodeURIComponent(societyId)}`);
    renderCampos(campos);
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await listarCampos();
    } catch (e) {
        console.error(e);
        const wrap = el("listaCampos");
        if (wrap) {
            wrap.innerHTML = `<div style="color:#b91c1c;font-weight:800;">${e.message || "Erro ao carregar campos."}</div>`;
        }
    }
});