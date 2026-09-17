const BASE_URL = "https://goplay-dzlr.onrender.com";

let solicitacoesJogador = [];
let timeAtualJogador = null;

function getUsuario() {
    return JSON.parse(localStorage.getItem("usuarioLogado") || "null");
}

function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

function isCompanyBrowseMode() {
    return String(getQueryParam("view") || "").toLowerCase() === "empresa";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { }
    if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
    return data;
}

function currentSocietyId() {
    return Number(
        getQueryParam("societyId") ||
        window.GOPLAY_EMPRESA_ATUAL?.id ||
        localStorage.getItem("societyId") ||
        0
    );
}

function ajustarModoTela() {
    const usuario = getUsuario();
    const pageTitle = document.getElementById("pageTitle");
    const pageSubtitle = document.getElementById("pageSubtitle");
    const blocoCriacao = document.getElementById("blocoCriacaoTime");
    if (!usuario) return;

    if (usuario.tipo === "DONO_SOCIETY") {
        if (pageTitle) pageTitle.textContent = "⚽ Times da Empresa";
        if (pageSubtitle) pageSubtitle.textContent = "Visualize os times vinculados à empresa selecionada.";
        if (blocoCriacao) blocoCriacao.style.display = "none";
        return;
    }
    if (usuario.tipo === "DONO_TIME") {
        if (isCompanyBrowseMode()) {
            const nomeEmpresa = window.GOPLAY_EMPRESA_ATUAL?.nome || localStorage.getItem("societyContextName") || "empresa selecionada";
            if (pageTitle) pageTitle.textContent = "⚽ Times desta Empresa";
            if (pageSubtitle) pageSubtitle.textContent = `Visualização dos times aprovados em ${nomeEmpresa}. A gestão continua restrita ao dono de cada time.`;
            if (blocoCriacao) blocoCriacao.style.display = "none";
        } else {
            if (pageTitle) pageTitle.textContent = "⚽ Meus Times";
            if (pageSubtitle) pageSubtitle.textContent = "Cadastre, gerencie o elenco e organize a rotina semanal dos seus times.";
            if (blocoCriacao) blocoCriacao.style.display = "block";
        }
        return;
    }
    if (usuario.tipo === "PLAYER") {
        const nomeEmpresa = window.GOPLAY_EMPRESA_ATUAL?.nome || localStorage.getItem("societyContextName") || "empresa selecionada";
        if (pageTitle) pageTitle.textContent = "⚽ Times desta Empresa";
        if (pageSubtitle) pageSubtitle.textContent = `Escolha um time de ${nomeEmpresa} e envie uma solicitação ao dono. Você só entra depois da aprovação.`;
        if (blocoCriacao) blocoCriacao.style.display = "none";
        return;
    }
    if (blocoCriacao) blocoCriacao.style.display = "none";
}

async function carregarSocietiesNoSelect() {
    const usuario = getUsuario();
    const select = document.getElementById("societyId");
    const blocoCriacao = document.getElementById("blocoCriacaoTime");
    if (!select) return;
    if (!usuario?.id) return;
    if (usuario.tipo !== "DONO_TIME" || isCompanyBrowseMode()) {
        if (blocoCriacao) blocoCriacao.style.display = "none";
        return;
    }

    let lista = window.GOPLAY_EMPRESAS || [];
    if (!lista.length) {
        try { lista = await fetchJSON(`${BASE_URL}/society`); } catch { lista = []; }
    }
    if (!Array.isArray(lista) || !lista.length) {
        select.innerHTML = `<option value="">Nenhuma empresa encontrada</option>`;
        return;
    }
    select.innerHTML = `<option value="">Selecione</option>` + lista.map(s =>
        `<option value="${s.id}">${escapeHtml(s.nome)}${s.cidade || s.estado ? ` (${escapeHtml(s.cidade || "")}${s.estado ? "/" + escapeHtml(s.estado) : ""})` : ""}</option>`
    ).join("");
    const saved = currentSocietyId();
    if (saved) select.value = String(saved);
    select.onchange = () => {
        if (select.value) localStorage.setItem("societyId", select.value);
    };
}

function pillStatus(status) {
    const s = String(status || "").toUpperCase();
    if (s === "APROVADO") return `<span style="background:#dcfce7;color:#166534;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:800;">APROVADO</span>`;
    if (s === "RECUSADO") return `<span style="background:#fee2e2;color:#991b1b;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:800;">RECUSADO</span>`;
    if (s === "INATIVO") return `<span style="background:#e5e7eb;color:#374151;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:800;">INATIVO</span>`;
    return `<span style="background:#fef3c7;color:#92400e;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:800;">PENDENTE</span>`;
}

function pillTipo(tipo) {
    return String(tipo || "").toUpperCase() === "MENSALISTA"
        ? `<span style="background:#dbeafe;color:#1d4ed8;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:800;">MENSALISTA</span>`
        : `<span style="background:#f3f4f6;color:#111827;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:800;">AVULSO</span>`;
}

function solicitacaoDoTime(timeId) {
    return solicitacoesJogador.find(s => Number(s.timeId) === Number(timeId)) || null;
}

function playerAction(t) {
    if (Number(timeAtualJogador?.id) === Number(t.id)) {
        return `<button class="btn" onclick="location.href='meu-time.html'">✓ Meu time</button>`;
    }
    if (timeAtualJogador?.id) {
        return `<button class="btn" disabled style="opacity:.55;cursor:not-allowed">Você já está em outro time</button>`;
    }
    const req = solicitacaoDoTime(t.id);
    if (req?.status === "PENDENTE") {
        return `<button class="btn" disabled style="opacity:.7;cursor:not-allowed">⏳ Solicitação enviada</button>`;
    }
    if (req?.status === "APROVADA") {
        return `<button class="btn" onclick="location.href='meu-time.html'">✓ Entrada aprovada</button>`;
    }
    return `<button class="btn" onclick="solicitarEntrada(${Number(t.id)})">${req?.status === "RECUSADA" ? "Solicitar novamente" : "Solicitar entrada"}</button>`;
}

function montarCardTime(t, usuario) {
    const isPlayer = usuario?.tipo === "PLAYER";
    const isDonoSociety = usuario?.tipo === "DONO_SOCIETY";
    const isDonoTime = usuario?.tipo === "DONO_TIME";
    const browseCompany = isDonoTime && isCompanyBrowseMode();
    const cidadeEstado = `${escapeHtml(t.cidade || "")}${t.estado ? ` - ${escapeHtml(t.estado)}` : ""}`;
    const jogadores = Array.isArray(t.jogadores) ? t.jogadores.length : 0;
    const subtitulo = t?.society?.nome ? `<small>Empresa: ${escapeHtml(t.society.nome)}</small>` : "";
    let action = `<button class="btn" onclick="verDetalhes(${t.id})">Ver detalhes</button>`;
    if (isPlayer) action = `${playerAction(t)} <button class="btn" style="background:#eef4f8;color:#052845" onclick="verDetalhes(${t.id})">Ver time</button>`;
    if (isDonoSociety) action = `<button class="btn" onclick="verDetalhes(${t.id})">Gerenciar vínculo</button>`;
    if (isDonoTime) action = browseCompany
        ? `<button class="btn" onclick="verDetalhes(${t.id})">Ver time</button>`
        : `<button class="btn" onclick="verDetalhes(${t.id})">Gerenciar time</button>`;
    const badges = (isPlayer || browseCompany) ? "" : `${pillTipo(t.tipoVinculo)} ${pillStatus(t.statusVinculo)}`;

    return `<div class="time-card">
        <div class="time-card-top" style="display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap;">
            <div class="time-card-info" style="display:flex;gap:12px;align-items:flex-start;">
                ${t.brasao ? `<img src="${escapeHtml(t.brasao)}" alt="Brasão" style="width:48px;height:48px;border-radius:10px;object-fit:cover;border:1px solid #e5e7eb;">` : ""}
                <div style="display:flex;flex-direction:column;gap:6px;">
                    <strong>${escapeHtml(t.nome || "-")}</strong>${subtitulo}
                    <small>${cidadeEstado || "Cidade não informada"}</small>
                    <small>Jogadores: ${jogadores}</small>
                    ${t.modalidade ? `<small>Modalidade: ${escapeHtml(t.modalidade)}</small>` : ""}
                </div>
            </div>
            <div class="time-card-badges" style="display:flex;gap:8px;flex-wrap:wrap;">${badges}</div>
        </div>
        <div class="time-card-actions" style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;">${action}</div>
    </div>`;
}

async function carregarTimes() {
    const usuario = getUsuario();
    const div = document.getElementById("listaTimes");
    if (!usuario?.id) return div.innerHTML = "<p>Erro: usuário não encontrado.</p>";

    try {
        let data = [];
        if (usuario.tipo === "DONO_SOCIETY" || usuario.tipo === "PLAYER" || (usuario.tipo === "DONO_TIME" && isCompanyBrowseMode())) {
            const societyId = currentSocietyId();
            if (!societyId) {
                div.innerHTML = `<div style="padding:18px"><strong>Selecione uma empresa primeiro.</strong><p style="color:#6b7280">Use Explorar Empresas ou o seletor de Empresa atual e depois abra Times da Empresa.</p><button class="btn" onclick="location.href='societies.html'">Explorar Empresas</button></div>`;
                return;
            }
            localStorage.setItem("societyId", String(societyId));
            data = await fetchJSON(`${BASE_URL}/time/society/${societyId}`);
            if (usuario.tipo === "PLAYER" || (usuario.tipo === "DONO_TIME" && isCompanyBrowseMode())) {
                data = (Array.isArray(data) ? data : []).filter(t => String(t.statusVinculo || "").toUpperCase() === "APROVADO");
            }
            if (usuario.tipo === "PLAYER") {
                const [reqs, current] = await Promise.all([
                    fetchJSON(`${BASE_URL}/time/solicitacoes/minhas`).catch(() => []),
                    fetchJSON(`${BASE_URL}/time/details/by-player/${usuario.id}`).catch(() => ({ time: null }))
                ]);
                solicitacoesJogador = Array.isArray(reqs) ? reqs : [];
                timeAtualJogador = current?.time || null;
            }
        } else if (usuario.tipo === "DONO_TIME") {
            data = await fetchJSON(`${BASE_URL}/time/dono/${usuario.id}`);
        } else {
            div.innerHTML = "<p>Visualização não disponível para este perfil.</p>";
            return;
        }

        if (!Array.isArray(data) || !data.length) {
            div.innerHTML = (usuario.tipo === "PLAYER" || (usuario.tipo === "DONO_TIME" && isCompanyBrowseMode()))
                ? `<div style="padding:18px"><strong>Nenhum time aprovado nesta empresa ainda.</strong><p style="color:#6b7280">Os times aprovados pela empresa aparecerão aqui.</p></div>`
                : "<p>Nenhum time cadastrado ainda.</p>";
            return;
        }
        div.innerHTML = data.map(t => montarCardTime(t, usuario)).join("");
    } catch (e) {
        console.error(e);
        div.innerHTML = `<p>Erro ao carregar times: ${escapeHtml(e.message)}</p>`;
    }
}

async function solicitarEntrada(timeId) {
    if (!confirm("Enviar solicitação para o dono deste time? Você só entrará depois que ele aprovar.")) return;
    try {
        const d = await fetchJSON(`${BASE_URL}/time/${timeId}/solicitar-entrada`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        alert(d?.message || "Solicitação enviada ao dono do time.");
        await carregarTimes();
    } catch (e) { alert(e.message || "Erro ao solicitar entrada."); }
}

async function salvarTime() {
    const usuario = getUsuario();
    if (!usuario?.id) return alert("Sessão expirada. Faça login de novo.");
    const societyId = document.getElementById("societyId")?.value;
    if (!societyId) return alert("Nenhuma empresa selecionada/identificada. Selecione uma empresa.");

    const brasaoFile = document.getElementById("brasao")?.files?.[0] || null;
    let brasao = null;
    if (brasaoFile) {
        try { brasao = await uploadImage(brasaoFile); } catch (e) { return alert(e.message || "Erro no upload do brasão."); }
    }
    const payload = {
        donoId: usuario.id, societyId: Number(societyId), nome: document.getElementById("nome").value.trim(), brasao,
        descricao: document.getElementById("descricao").value.trim() || null, estado: document.getElementById("estado").value.trim() || null,
        cidade: document.getElementById("cidade").value.trim() || null, modalidade: document.getElementById("modalidade").value.trim() || null,
        tipoVinculo: "AVULSO", statusVinculo: "PENDENTE"
    };
    if (!payload.nome) return alert("O nome do time é obrigatório.");
    try {
        await fetchJSON(`${BASE_URL}/time`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        alert("Time cadastrado com sucesso! Agora ele aguarda aprovação da empresa.");
        await carregarTimes();
        ["nome","brasao","descricao","estado","cidade","modalidade"].forEach(id => { const e=document.getElementById(id); if(e)e.value=""; });
    } catch (e) { alert(e.message || "Erro ao criar time."); }
}

function verDetalhes(id) { window.location.href = `time-detalhe.html?timeId=${id}`; }

window.salvarTime = salvarTime;
window.verDetalhes = verDetalhes;
window.solicitarEntrada = solicitarEntrada;

document.addEventListener("DOMContentLoaded", async () => {
    if (window.GoPlayEmpresaContextReady) await window.GoPlayEmpresaContextReady;
    ajustarModoTela();
    await carregarSocietiesNoSelect();
    await carregarTimes();
});
