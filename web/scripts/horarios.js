const BASE_URL = "https://goplay-dzlr.onrender.com";

let semanaAtual = new Date();
let agendamentosCache = [];
let societyIdAtual = null;
let draggedAgendamentoId = null;

const HORAS = [
    "06:00", "07:00", "08:00", "09:00", "10:00",
    "11:00", "12:00", "13:00", "14:00", "15:00",
    "16:00", "17:00", "18:00", "19:00", "20:00",
    "21:00", "22:00", "23:00"
];

function el(id) {
    return document.getElementById(id);
}

function getUsuario() {
    return JSON.parse(localStorage.getItem("usuarioLogado") || "null");
}

function toDateKey(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function inicioSemana(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
}

function gerarDiasSemana() {
    const ini = inicioSemana(semanaAtual);
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(ini);
        d.setDate(ini.getDate() + i);
        return d;
    });
}

function pickDataAgendamento(a) {
    return a?.data || a?.dataAgendamento || a?.dataAgenda || a?.dia || null;
}

function mesmoSlot(a, dataKey, hora) {
    const dataAg = pickDataAgendamento(a);
    if (!dataAg) return false;

    return toDateKey(dataAg) === dataKey && String(a.horaInicio || "").slice(0, 5) === hora;
}

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = null;
    }

    if (!res.ok) {
        throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
    }

    return data;
}

async function descobrirSocietyId() {
    const ls = localStorage.getItem("societyId");
    if (ls) return ls;

    const usuario = getUsuario();
    if (!usuario?.id) {
        location.href = "login.html";
        return null;
    }

    const societies = await fetchJSON(`${BASE_URL}/society/owner/${usuario.id}`);
    const societyId = societies?.[0]?.id;

    if (societyId) {
        localStorage.setItem("societyId", String(societyId));
        return String(societyId);
    }

    return null;
}

async function carregarAgenda() {
    try {
        societyIdAtual = await descobrirSocietyId();

        if (!societyIdAtual) {
            el("agendaGrid").innerHTML = `<div class="empty">Nenhum society encontrado.</div>`;
            return;
        }

        agendamentosCache = await fetchJSON(`${BASE_URL}/agendamentos/society/${societyIdAtual}`);
        montarGrid();
    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao carregar agenda.");
    }
}

function montarGrid() {
    const grid = el("agendaGrid");
    const dias = gerarDiasSemana();

    el("rangeSemana").textContent =
        `${dias[0].toLocaleDateString("pt-BR")} até ${dias[6].toLocaleDateString("pt-BR")}`;

    grid.innerHTML = `<div class="grid-corner"></div>`;

    dias.forEach(d => {
        grid.innerHTML += `
            <div class="day-head">
                <strong>${d.toLocaleDateString("pt-BR", { weekday: "short" })}</strong>
                <span>${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
            </div>
        `;
    });

    HORAS.forEach(hora => {
        grid.innerHTML += `<div class="hour-cell">${hora}</div>`;

        dias.forEach(dia => {
            const dataKey = toDateKey(dia);
            const ag = agendamentosCache.find(a => mesmoSlot(a, dataKey, hora));

            if (ag) {
                const status = String(ag.status || "").toUpperCase();
                const isPendente = status === "PENDENTE";

                grid.innerHTML += `
                    <div class="slot ${isPendente ? "pending" : "busy"}"
                         data-date="${dataKey}"
                         data-hour="${hora}"
                         ondragover="permitirDrop(event)"
                         ondrop="dropAgendamento(event, '${dataKey}', '${hora}')"
                         onclick="abrirModalOcupado(${ag.id})">

                        <div class="event-card ${isPendente ? "pendente" : ""}"
                             draggable="true"
                             ondragstart="dragStart(event, ${ag.id})">
                            <div class="event-title">${ag.time?.nome || "Reservado"}</div>
                            <div class="event-sub">${ag.campo?.nome || "Campo"} • ${status || "STATUS"}</div>
                        </div>
                    </div>
                `;
            } else {
                grid.innerHTML += `
                    <div class="slot free"
                         data-date="${dataKey}"
                         data-hour="${hora}"
                         ondragover="permitirDrop(event)"
                         ondragleave="dragLeave(event)"
                         ondrop="dropAgendamento(event, '${dataKey}', '${hora}')"
                         onclick="abrirModalLivre('${dataKey}', '${hora}')">
                        <div class="free-label">Livre</div>
                    </div>
                `;
            }
        });
    });
}

function abrirModalLivre(data, hora) {
    el("modalTitulo").textContent = "Horário livre";
    el("modalDescricao").textContent = "Esse horário está disponível para agendamento.";

    el("modalInfo").innerHTML = `
        <div><strong>Data:</strong> ${new Date(data + "T00:00:00").toLocaleDateString("pt-BR")}</div>
        <div><strong>Horário:</strong> ${hora}</div>
        <div><strong>Status:</strong> Livre</div>
    `;

    el("btnAcaoModal").style.display = "block";
    el("btnAcaoModal").textContent = "Agendar horário";
    el("btnAcaoModal").onclick = () => {
        location.href = `time-agendamento.html?data=${encodeURIComponent(data)}&hora=${encodeURIComponent(hora)}`;
    };

    abrirModal();
}

function abrirModalOcupado(id) {
    const ag = agendamentosCache.find(a => Number(a.id) === Number(id));
    if (!ag) return;

    const data = pickDataAgendamento(ag);

    el("modalTitulo").textContent = "Horário ocupado";
    el("modalDescricao").textContent = "Confira os detalhes da reserva.";

    el("modalInfo").innerHTML = `
        <div><strong>Data:</strong> ${data ? new Date(data).toLocaleDateString("pt-BR") : "-"}</div>
        <div><strong>Horário:</strong> ${ag.horaInicio || "-"} - ${ag.horaFim || "-"}</div>
        <div><strong>Time:</strong> ${ag.time?.nome || "-"}</div>
        <div><strong>Campo:</strong> ${ag.campo?.nome || "-"}</div>
        <div><strong>Status:</strong> ${ag.status || "-"}</div>
    `;

    el("btnAcaoModal").style.display = "none";
    abrirModal();
}

function abrirModal() {
    el("modalOverlay").classList.add("show");
}

function fecharModal() {
    el("modalOverlay").classList.remove("show");
}

function dragStart(event, agendamentoId) {
    draggedAgendamentoId = agendamentoId;
    event.dataTransfer.effectAllowed = "move";
}

function permitirDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.add("drag-over");
}

function dragLeave(event) {
    event.currentTarget.classList.remove("drag-over");
}

async function dropAgendamento(event, novaData, novaHora) {
    event.preventDefault();
    event.currentTarget.classList.remove("drag-over");

    if (!draggedAgendamentoId) return;

    const ag = agendamentosCache.find(a => Number(a.id) === Number(draggedAgendamentoId));
    draggedAgendamentoId = null;

    if (!ag) return;

    const ocupado = agendamentosCache.find(a =>
        Number(a.id) !== Number(ag.id) &&
        mesmoSlot(a, novaData, novaHora)
    );

    if (ocupado) {
        alert("Esse horário já está ocupado.");
        return;
    }

    const ok = confirm(`Remarcar "${ag.time?.nome || "Reserva"}" para ${novaData} às ${novaHora}?`);

    if (!ok) return;

    alert(
        "Front pronto para drag & drop.\n\n" +
        "Mas seu backend ainda precisa de uma rota para salvar a remarcação, por exemplo:\n" +
        "PUT /agendamentos/:id/remarcar"
    );

    /*
    QUANDO O BACKEND EXISTIR, USAR ISSO:

    await fetchJSON(`${BASE_URL}/agendamentos/${ag.id}/remarcar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            data: novaData,
            horaInicio: novaHora
        })
    });

    await carregarAgenda();
    */
}

function avancarSemana() {
    semanaAtual.setDate(semanaAtual.getDate() + 7);
    carregarAgenda();
}

function voltarSemana() {
    semanaAtual.setDate(semanaAtual.getDate() - 7);
    carregarAgenda();
}

document.addEventListener("DOMContentLoaded", () => {
    el("btnSemanaAnterior")?.addEventListener("click", voltarSemana);
    el("btnProximaSemana")?.addEventListener("click", avancarSemana);
    el("btnAtualizar")?.addEventListener("click", carregarAgenda);

    el("btnFecharModal")?.addEventListener("click", fecharModal);
    el("btnCancelarModal")?.addEventListener("click", fecharModal);
    el("modalOverlay")?.addEventListener("click", (e) => {
        if (e.target.id === "modalOverlay") fecharModal();
    });

    carregarAgenda();
});