const BASE_URL = "https://goplay-dzlr.onrender.com";

const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
if (!usuarioLogado?.id) location.href = "login.html";

function el(id) {
    return document.getElementById(id);
}

function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
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

let timeSelecionadoId = null;
let societyIdDoTime = null;
let campoSelecionado = null;
let horarioSelecionado = null;
let recorrenteSelecionado = false;

const PIX_CHAVE = "47.051.258/0001-58";

async function carregarTimesDoDono() {
    const donoId = usuarioLogado.id;
    const times = await fetchJSON(`${BASE_URL}/time/dono/${donoId}`);

    const selectTime = el("timeId");
    selectTime.innerHTML = `<option value="">Selecione seu Time</option>`;

    (times || []).forEach(t => {
        selectTime.innerHTML += `<option value="${t.id}">${t.nome}</option>`;
    });

    if (!times?.length) {
        selectTime.innerHTML = `<option value="">Nenhum time encontrado</option>`;
    }

    selectTime.addEventListener("change", async () => {
        timeSelecionadoId = selectTime.value ? Number(selectTime.value) : null;

        societyIdDoTime = null;
        campoSelecionado = null;
        horarioSelecionado = null;

        el("horarios").innerHTML = "";
        el("acao").style.display = "none";
        el("campoId").innerHTML = `<option value="">Selecione</option>`;

        const msg = el("msgSucesso");
        if (msg) {
            msg.style.display = "none";
            msg.innerHTML = "";
        }

        if (!timeSelecionadoId) return;

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
    el("chipTime").textContent = `Time: ${time?.nome || "-"}`;
    el("chipSociety").textContent = `Society: ${time?.society?.nome || "-"}`;
    resumo.style.display = "flex";
}

async function carregarCampos(societyId) {
    const select = el("campoId");
    select.innerHTML = `<option value="">Carregando campos...</option>`;

    const campos = await fetchJSON(`${BASE_URL}/campos/society/${societyId}`);

    select.innerHTML = `<option value="">Selecione</option>`;

    if (!campos?.length) {
        select.innerHTML = `<option value="">Nenhum campo cadastrado</option>`;
        return;
    }

    campos.forEach(c => {
        const mensal = c?.valorMensal
            ? ` • Mensal ${Number(c.valorMensal).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
            })}`
            : "";

        select.innerHTML += `
            <option value="${c.id}" data-mensal="${c?.valorMensal || ""}">
                ${c.nome}${mensal}
            </option>
        `;
    });
}

function renderSlots(horarios) {
    const div = el("horarios");
    div.innerHTML = "";

    horarioSelecionado = null;
    el("acao").style.display = "none";

    if (!horarios?.length) {
        div.innerHTML = `<div class="muted">Nenhum horário retornado.</div>`;
        return;
    }

    horarios.forEach(h => {
        const slot = document.createElement("div");
        slot.className = `slot ${h.disponivel ? "livre" : "ocupado"}`;
        slot.textContent = `${h.horaInicio} - ${h.horaFim}`;

        if (h.disponivel) {
            slot.onclick = () => selecionarHorario(slot, h);
        }

        div.appendChild(slot);
    });
}

async function buscarHorarios() {
    campoSelecionado = el("campoId").value ? Number(el("campoId").value) : null;
    const data = el("data").value;

    if (!timeSelecionadoId) return alert("Selecione seu time.");
    if (!societyIdDoTime) return alert("Não consegui identificar o society do time.");
    if (!campoSelecionado) return alert("Selecione o campo.");
    if (!data) return alert("Selecione a data.");

    const horarios = await fetchJSON(
        `${BASE_URL}/agendamentos/disponiveis?campoId=${campoSelecionado}&data=${data}`
    );

    renderSlots(horarios);
}

function selecionarHorario(slotEl, h) {
    document.querySelectorAll(".slot").forEach(s => s.classList.remove("selected"));
    slotEl.classList.add("selected");
    horarioSelecionado = h;
    el("acao").style.display = "block";
}

async function criarAgendamento() {
    try {
        const data = el("data").value;

        if (!timeSelecionadoId) return alert("Selecione seu time.");
        if (!societyIdDoTime) return alert("Não consegui identificar o society do time.");
        if (!campoSelecionado || !data || !horarioSelecionado?.horaInicio) {
            return alert("Selecione campo, data e horário.");
        }

        const opt = el("campoId").selectedOptions?.[0];
        const valorMensalCampo = opt?.getAttribute("data-mensal");
        const podeMensal = !!valorMensalCampo && Number(valorMensalCampo) > 0;

        const recorrente = recorrenteSelecionado && podeMensal;

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

        await fetchJSON(`${BASE_URL}/pagamentos/agendamento`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                usuarioId: usuarioLogado.id,
                societyId: societyIdDoTime,
                timeId: timeSelecionadoId,
                campoId: campoSelecionado,
                agendamentoId: agendamento.id,
                forma: "PIX",
                recorrente,
            }),
        });

        const msg = el("msgSucesso");
        if (msg) {
            msg.style.display = "block";
            msg.innerHTML = `
                <strong>Agendamento criado com sucesso.</strong><br>
                O pagamento foi gerado. Você será redirecionado para Meus Pagamentos.
            `;
            msg.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        el("acao").style.display = "none";

        setTimeout(() => {
            window.location.href = `meus-agendamentos.html?timeId=${encodeURIComponent(timeSelecionadoId)}`;
        }, 1500);

    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao criar agendamento.");
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await carregarTimesDoDono();

        const timeIdFromUrl = getQueryParam("timeId");
        if (timeIdFromUrl) {
            el("timeId").value = String(timeIdFromUrl);
            el("timeId").dispatchEvent(new Event("change"));
        }

        const chkRecorrente = el("recorrente");
        if (chkRecorrente) {
            chkRecorrente.addEventListener("change", (e) => {
                recorrenteSelecionado = !!e.target.checked;
            });
        }

        el("btnBuscar").onclick = buscarHorarios;
        el("btnAgendar").onclick = criarAgendamento;
    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao carregar agendamento.");
    }
});