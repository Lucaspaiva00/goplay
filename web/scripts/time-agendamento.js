const BASE_URL = "https://goplay-dzlr.onrender.com";
const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
if (!usuarioLogado?.id) location.href = "login.html";

function el(id) { return document.getElementById(id); }
function getQueryParam(name) { return new URL(window.location.href).searchParams.get(name); }
function escapeHtml(v) { return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
    return data;
}

let empresas = [];
let empresaAtual = null;
let timeSelecionadoId = null;
let campoSelecionado = null;
let horarioSelecionado = null;
let recorrenteSelecionado = false;
let horaPreferidaUrl = null;

function atualizarEtapas() {
    const steps = document.querySelectorAll(".booking-step");
    steps.forEach(s => s.classList.remove("active", "done"));
    if (empresaAtual) steps[0]?.classList.add("done"); else steps[0]?.classList.add("active");
    if (empresaAtual && campoSelecionado) steps[1]?.classList.add("done"); else if (empresaAtual) steps[1]?.classList.add("active");
    if (campoSelecionado && el("data")?.value) steps[2]?.classList.add("done"); else if (campoSelecionado) steps[2]?.classList.add("active");
    if (horarioSelecionado) steps[3]?.classList.add("done"); else if (campoSelecionado && el("data")?.value) steps[3]?.classList.add("active");
}

function salvarContextoEmpresa(e) {
    if (!e?.id) return;
    localStorage.setItem("societyId", String(e.id));
    localStorage.setItem("societyContextName", e.nome || "Empresa");
}

async function carregarEmpresas() {
    const select = el("societyId");
    select.innerHTML = `<option value="">Carregando empresas...</option>`;
    try {
        const ctx = window.GoPlayEmpresaContextReady ? await window.GoPlayEmpresaContextReady : null;
        empresas = Array.isArray(ctx?.empresas) && ctx.empresas.length ? ctx.empresas : await fetchJSON(`${BASE_URL}/society`);
    } catch {
        empresas = await fetchJSON(`${BASE_URL}/society`);
    }
    select.innerHTML = `<option value="">Selecione onde deseja jogar</option>` + empresas.map(e =>
        `<option value="${e.id}">${escapeHtml(e.nome)}${e.cidade ? ` — ${escapeHtml(e.cidade)}` : ""}</option>`
    ).join("");

    const urlSociety = Number(getQueryParam("societyId") || 0);
    const salvo = Number(localStorage.getItem("societyId") || 0);
    const pre = empresas.find(e => Number(e.id) === urlSociety) || empresas.find(e => Number(e.id) === salvo) || null;
    if (pre) {
        select.value = String(pre.id);
        await selecionarEmpresa(pre.id);
    }
}

async function selecionarEmpresa(id) {
    const base = empresas.find(e => Number(e.id) === Number(id));
    empresaAtual = null;
    campoSelecionado = null;
    horarioSelecionado = null;
    el("horarios").innerHTML = `<div class="muted">Selecione quadra e data para consultar horários.</div>`;
    el("acao").style.display = "none";

    if (!base) {
        el("campoId").disabled = true;
        el("campoId").innerHTML = `<option value="">Selecione a empresa primeiro</option>`;
        renderResumo();
        atualizarEtapas();
        return;
    }

    try { empresaAtual = await fetchJSON(`${BASE_URL}/society/${base.id}`); }
    catch { empresaAtual = base; }
    salvarContextoEmpresa(empresaAtual);
    await carregarCampos(empresaAtual.id);
    renderResumo();
    atualizarEtapas();
}

async function carregarTimes() {
    const select = el("timeId");
    select.innerHTML = `<option value="">Carregando seus times...</option>`;
    let times = [];

    if (usuarioLogado.tipo === "DONO_TIME") {
        times = await fetchJSON(`${BASE_URL}/time/dono/${usuarioLogado.id}`);
    } else if (usuarioLogado.tipo === "PLAYER") {
        try {
            const payload = await fetchJSON(`${BASE_URL}/time/details/by-player/${usuarioLogado.id}`);
            if (payload?.time) times = [payload.time];
        } catch { times = []; }
    }

    select.innerHTML = `<option value="">Selecione seu time</option>` + (times || []).map(t => `<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join("");
    if (!times?.length) select.innerHTML = `<option value="">Nenhum time disponível</option>`;

    const urlTime = Number(getQueryParam("timeId") || 0);
    const pre = times.find(t => Number(t.id) === urlTime) || (times.length === 1 ? times[0] : null);
    if (pre) {
        select.value = String(pre.id);
        timeSelecionadoId = Number(pre.id);
    }
    renderResumo();
}

async function carregarCampos(societyId) {
    const select = el("campoId");
    select.disabled = true;
    select.innerHTML = `<option value="">Carregando quadras...</option>`;
    const campos = await fetchJSON(`${BASE_URL}/campos/society/${societyId}`);
    if (!Array.isArray(campos) || !campos.length) {
        select.innerHTML = `<option value="">Esta empresa ainda não possui quadras cadastradas</option>`;
        return;
    }
    select.innerHTML = `<option value="">Selecione a quadra</option>` + campos.map(c => {
        const avulso = c.valorAvulso ? Number(c.valorAvulso).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "sem preço";
        return `<option value="${c.id}" data-mensal="${c.valorMensal || ""}">${escapeHtml(c.nome)} — ${avulso}</option>`;
    }).join("");
    select.disabled = false;
}

function renderResumo() {
    const resumo = el("resumoTopo");
    const timeOpt = el("timeId")?.selectedOptions?.[0];
    if (!empresaAtual && !timeSelecionadoId) {
        resumo.style.display = "none";
    } else {
        resumo.style.display = "flex";
        el("chipSociety").textContent = `Empresa: ${empresaAtual?.nome || "-"}`;
        el("chipTime").textContent = `Time: ${timeOpt?.textContent || "-"}`;
    }
    const pixChave = String(empresaAtual?.pixChave || "").trim();
    const pixTitular = String(empresaAtual?.pixTitular || "").trim();
    el("pixChaveAgendamento").textContent = pixChave || "Não cadastrado";
    el("pixTitularAgendamento").textContent = pixTitular || "-";
}

function renderSlots(horarios) {
    const div = el("horarios");
    div.innerHTML = "";
    horarioSelecionado = null;
    el("acao").style.display = "none";
    if (!Array.isArray(horarios) || !horarios.length) {
        div.innerHTML = `<div class="muted">Nenhum horário retornado.</div>`;
        return;
    }
    horarios.forEach(h => {
        const slot = document.createElement("div");
        slot.className = `slot ${h.disponivel ? "livre" : "ocupado"}`;
        slot.textContent = `${h.horaInicio} - ${h.horaFim}`;
        if (h.disponivel) {
            slot.onclick = () => selecionarHorario(slot, h);
            if (horaPreferidaUrl && String(h.horaInicio) === String(horaPreferidaUrl)) {
                setTimeout(() => selecionarHorario(slot, h), 0);
            }
        }
        div.appendChild(slot);
    });
    horaPreferidaUrl = null;
}

async function buscarHorarios() {
    campoSelecionado = Number(el("campoId").value || 0) || null;
    const data = el("data").value;
    timeSelecionadoId = Number(el("timeId").value || 0) || null;
    if (!empresaAtual?.id) return alert("Selecione a empresa onde deseja jogar.");
    if (!campoSelecionado) return alert("Selecione a quadra.");
    if (!data) return alert("Selecione a data.");
    if (!timeSelecionadoId) return alert("Selecione seu time.");
    atualizarEtapas();
    const horarios = await fetchJSON(`${BASE_URL}/agendamentos/disponiveis?campoId=${campoSelecionado}&data=${data}`);
    renderSlots(horarios);
}

function selecionarHorario(slotEl, h) {
    document.querySelectorAll(".slot").forEach(s => s.classList.remove("selected"));
    slotEl.classList.add("selected");
    horarioSelecionado = h;
    el("acao").style.display = "block";
    atualizarEtapas();
}

async function criarAgendamento() {
    try {
        const data = el("data").value;
        timeSelecionadoId = Number(el("timeId").value || 0) || null;
        campoSelecionado = Number(el("campoId").value || 0) || null;
        if (!empresaAtual?.id) return alert("Selecione a empresa.");
        if (!timeSelecionadoId) return alert("Selecione seu time.");
        if (!campoSelecionado || !data || !horarioSelecionado?.horaInicio) return alert("Selecione quadra, data e horário.");

        const opt = el("campoId").selectedOptions?.[0];
        const valorMensalCampo = Number(opt?.getAttribute("data-mensal") || 0);
        const recorrente = recorrenteSelecionado && valorMensalCampo > 0;

        const agendamento = await fetchJSON(`${BASE_URL}/agendamentos`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ societyId: empresaAtual.id, campoId: campoSelecionado, timeId: timeSelecionadoId, data, horaInicio: horarioSelecionado.horaInicio })
        });

        await fetchJSON(`${BASE_URL}/pagamentos/agendamento`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuarioId: usuarioLogado.id, societyId: empresaAtual.id, timeId: timeSelecionadoId, campoId: campoSelecionado, agendamentoId: agendamento.id, forma: "PIX", recorrente })
        });

        const msg = el("msgSucesso");
        msg.style.display = "block";
        msg.innerHTML = `<strong>Agendamento criado com sucesso.</strong><br>${escapeHtml(empresaAtual.nome)} • ${escapeHtml(opt?.textContent || "Quadra")} • ${escapeHtml(horarioSelecionado.horaInicio)}`;
        msg.scrollIntoView({ behavior: "smooth", block: "center" });
        el("acao").style.display = "none";
        setTimeout(() => { window.location.href = `meus-agendamentos.html?timeId=${encodeURIComponent(timeSelecionadoId)}`; }, 1200);
    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao criar agendamento.");
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const hoje = new Date();
        const localHoje = new Date(hoje.getTime() - hoje.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        el("data").min = localHoje;
        el("data").value = getQueryParam("data") || localHoje;
        horaPreferidaUrl = getQueryParam("hora");

        await Promise.all([carregarEmpresas(), carregarTimes()]);

        el("societyId").addEventListener("change", e => selecionarEmpresa(Number(e.target.value || 0)));
        el("campoId").addEventListener("change", () => {
            campoSelecionado = Number(el("campoId").value || 0) || null;
            horarioSelecionado = null;
            el("horarios").innerHTML = `<div class="muted">Clique em buscar horários.</div>`;
            el("acao").style.display = "none";
            atualizarEtapas();
        });
        el("data").addEventListener("change", () => { horarioSelecionado = null; el("acao").style.display = "none"; atualizarEtapas(); });
        el("timeId").addEventListener("change", () => { timeSelecionadoId = Number(el("timeId").value || 0) || null; renderResumo(); });
        el("recorrente")?.addEventListener("change", e => { recorrenteSelecionado = !!e.target.checked; });
        el("btnBuscar").onclick = buscarHorarios;
        el("btnAgendar").onclick = criarAgendamento;
        atualizarEtapas();

        // Se veio da agenda do dono com empresa, data e hora, já consulta quando possível.
        if (empresaAtual?.id && el("campoId").options.length === 2 && horaPreferidaUrl) {
            el("campoId").selectedIndex = 1;
            campoSelecionado = Number(el("campoId").value);
            if (timeSelecionadoId) await buscarHorarios();
        }
    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao carregar agendamento.");
    }
});
