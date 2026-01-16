const BASE_URL = "http://localhost:3000";

const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
if (!usuarioLogado?.id) location.href = "login.html";

function el(id) { return document.getElementById(id); }

function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

    if (!res.ok) {
        throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
    }
    return data;
}

// estado
let timeSelecionadoId = null;
let societyIdDoTime = null;

let campoSelecionado = null;
let horarioSelecionado = null;

async function carregarTimesDoDono() {
    const donoId = usuarioLogado.id;
    const times = await fetchJSON(`${BASE_URL}/time/dono/${donoId}`);

    const selectTime = el("timeId");
    selectTime.innerHTML = `<option value="">Selecione seu Time</option>`;

    (times || []).forEach(t => {
        // aqui o t.societyId pode vir, mas não vamos depender dele
        selectTime.innerHTML += `<option value="${t.id}">${t.nome}</option>`;
    });

    if (!times?.length) {
        selectTime.innerHTML = `<option value="">Nenhum time encontrado</option>`;
    }

    selectTime.addEventListener("change", async () => {
        timeSelecionadoId = selectTime.value ? Number(selectTime.value) : null;

        // reset
        societyIdDoTime = null;
        campoSelecionado = null;
        horarioSelecionado = null;
        el("horarios").innerHTML = "";
        el("acao").style.display = "none";

        el("campoId").innerHTML = `<option value="">Selecione</option>`;

        if (!timeSelecionadoId) return;

        // ✅ descobre societyId pelo detalhe do time
        const time = await fetchJSON(`${BASE_URL}/time/${timeSelecionadoId}`);
        societyIdDoTime = time?.society?.id || time?.societyId || null;

        renderResumo(time);

        if (!societyIdDoTime) {
            el("campoId").innerHTML = `<option value="">Nenhum society vinculado ao time</option>`;
            return;
        }

        await carregarCampos(societyIdDoTime);
    });
}

function renderResumo(time) {
    if (!time) return;

    const resumo = el("resumoTopo");
    const chipTime = el("chipTime");
    const chipSociety = el("chipSociety");

    chipTime.textContent = `Time: ${time?.nome || "-"}`;
    chipSociety.textContent = `Society: ${time?.society?.nome || "-"}`;
    resumo.style.display = "flex";
}

async function carregarCampos(societyId) {
    const campos = await fetchJSON(`${BASE_URL}/campos/${societyId}`);

    const select = el("campoId");
    select.innerHTML = `<option value="">Selecione</option>`;

    if (!campos?.length) {
        select.innerHTML = `<option value="">Nenhum campo cadastrado</option>`;
        return;
    }

    campos.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
    });
}

async function buscarHorarios() {
    campoSelecionado = el("campoId").value ? Number(el("campoId").value) : null;
    const data = el("data").value; // yyyy-mm-dd

    if (!timeSelecionadoId) return alert("Selecione seu time.");
    if (!societyIdDoTime) return alert("Não consegui identificar o society do time.");
    if (!campoSelecionado) return alert("Selecione o campo.");
    if (!data) return alert("Selecione a data.");

    const horarios = await fetchJSON(
        `${BASE_URL}/agendamentos/disponiveis?campoId=${campoSelecionado}&data=${data}`
    );

    const div = el("horarios");
    div.innerHTML = "";

    horarioSelecionado = null;
    el("acao").style.display = "none";

    (horarios || []).forEach(h => {
        const slot = document.createElement("div");
        slot.className = `slot ${h.disponivel ? "livre" : "ocupado"}`;
        slot.textContent = `${h.horaInicio} - ${h.horaFim}`;

        if (h.disponivel) {
            slot.onclick = () => selecionarHorario(slot, h);
        }
        div.appendChild(slot);
    });

    if (!horarios?.length) {
        div.innerHTML = `<div class="muted">Nenhum horário retornado.</div>`;
    }
}

function selecionarHorario(slotEl, h) {
    document.querySelectorAll(".slot").forEach(s => s.classList.remove("selected"));
    slotEl.classList.add("selected");
    horarioSelecionado = h;
    el("acao").style.display = "block";
}

async function criarAgendamento() {
    const data = el("data").value;

    if (!timeSelecionadoId) return alert("Selecione seu time.");
    if (!societyIdDoTime) return alert("Não consegui identificar o society do time.");
    if (!campoSelecionado || !data || !horarioSelecionado?.horaInicio) {
        return alert("Selecione campo, data e horário.");
    }

    // 1) cria agendamento (por hora)
    const agendamento = await fetchJSON(`${BASE_URL}/agendamentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            societyId: societyIdDoTime,
            campoId: campoSelecionado,
            timeId: timeSelecionadoId,
            data,
            horaInicio: horarioSelecionado.horaInicio,
        }),
    });

    // 2) cria pagamento vinculado
    const pagamento = await fetchJSON(`${BASE_URL}/pagamentos/agendamento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            usuarioId: usuarioLogado.id,
            societyId: societyIdDoTime,
            timeId: timeSelecionadoId,
            campoId: campoSelecionado,
            agendamentoId: agendamento.id,
            forma: "PIX",
        }),
    });

    alert("✅ Agendamento criado e pagamento gerado! Vá em 'Meus Pagamentos'.");

    // recarrega horários (pra já travar o horário)
    await buscarHorarios();
    el("acao").style.display = "none";
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await carregarTimesDoDono();

        // ✅ se veio com timeId na URL, pré-seleciona
        const timeIdFromUrl = getQueryParam("timeId");
        if (timeIdFromUrl) {
            el("timeId").value = String(timeIdFromUrl);
            el("timeId").dispatchEvent(new Event("change"));
        }

        el("btnBuscar").onclick = buscarHorarios;
        el("btnAgendar").onclick = criarAgendamento;
    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao carregar agendamento.");
    }
});
