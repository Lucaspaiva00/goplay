const BASE_URL = "https://goplay-dzlr.onrender.com";

let semanaAtual = new Date();
let agendamentosCache = [];
let societyIdAtual = null;
let draggedAgendamentoId = null;

let HORAS = [];
let societyAtual = null;

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

function minutos(h){const [a,b]=String(h||'').split(':').map(Number);return Number.isFinite(a)&&Number.isFinite(b)?a*60+b:null;}
function fmtMin(m){m=((m%1440)+1440)%1440;return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
function horariosConfig(){
    const lista=Array.isArray(societyAtual?.horariosFuncionamento)?societyAtual.horariosFuncionamento:[];
    if(!lista.length) return Array.from({length:7},(_,diaSemana)=>({diaSemana,ativo:true,horaInicio:'18:00',horaFim:'23:00'}));
    return Array.from({length:7},(_,diaSemana)=>lista.find(x=>Number(x.diaSemana)===diaSemana)||{diaSemana,ativo:false,horaInicio:null,horaFim:null});
}
function configDia(date){return horariosConfig().find(h=>Number(h.diaSemana)===new Date(date).getDay());}
function dentroFuncionamento(date,hora){
    const cfg=configDia(date); if(!cfg?.ativo)return false; const ini=minutos(cfg.horaInicio), start=minutos(hora); let fim=minutos(cfg.horaFim); if(fim===0)fim=1440; return start>=ini && start+60<=fim;
}
function recalcularLinhasAgenda(){
    const set=new Set();
    horariosConfig().filter(h=>h.ativo).forEach(h=>{let ini=minutos(h.horaInicio),fim=minutos(h.horaFim);if(fim===0)fim=1440;if(ini==null||fim==null)return;for(let m=ini;m+60<=fim;m+=60)set.add(fmtMin(m));});
    HORAS=[...set].sort((a,b)=>minutos(a)-minutos(b));
    if(!HORAS.length) HORAS=['18:00','19:00','20:00','21:00','22:00'];
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
    if (window.GoPlayEmpresaContextReady) {
        await window.GoPlayEmpresaContextReady;
    }
    const id = localStorage.getItem("societyId");
    return id || null;
}

async function carregarAgenda() {
    try {
        societyIdAtual = await descobrirSocietyId();

        if (!societyIdAtual) {
            el("agendaGrid").innerHTML = `<div class="empty">Nenhuma empresa encontrada.</div>`;
            return;
        }

        [agendamentosCache, societyAtual] = await Promise.all([
            fetchJSON(`${BASE_URL}/agendamentos/society/${societyIdAtual}`),
            fetchJSON(`${BASE_URL}/society/${societyIdAtual}`)
        ]);
        recalcularLinhasAgenda();
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
            if (!ag && !dentroFuncionamento(dia, hora)) {
                const cfg=configDia(dia);
                grid.innerHTML += `<div class="slot closed" title="${cfg?.ativo?`Fora do funcionamento (${cfg.horaInicio}-${cfg.horaFim})`:'Empresa fechada neste dia'}"><div class="closed-label">Fechado</div></div>`;
                return;
            }

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
                            <div class="event-title">${ag.grupoHorario?.nome ? `🔁 ${ag.grupoHorario.nome}` : (ag.time?.nome || "Reservado")}</div>
                            <div class="event-sub">${ag.campo?.nome || "Quadra"} • ${ag.grupoHorario ? `${(ag.presencas||[]).filter(p=>p.status==="VOU").length} 👍` : (status || "STATUS")}</div>
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
        <div><strong>${ag.grupoHorario ? "Grupo" : "Time"}:</strong> ${ag.grupoHorario?.nome || ag.time?.nome || "-"}</div>
        <div><strong>Quadra:</strong> ${ag.campo?.nome || "-"}</div>
        <div><strong>Status:</strong> ${ag.status || "-"}</div>
    `;

    if (ag.grupoHorarioId) {
        el("btnAcaoModal").style.display = "block";
        el("btnAcaoModal").textContent = "Ver confirmações";
        el("btnAcaoModal").onclick = () => location.href = `confirmar-presenca.html?agendamentoId=${ag.id}`;
    } else {
        el("btnAcaoModal").style.display = "none";
    }
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

    const ok = confirm(`Remarcar "${ag.grupoHorario?.nome || ag.time?.nome || "Reserva"}" para ${novaData} às ${novaHora}?${ag.grupoHorario ? "\nAtenção: somente esta ocorrência será movida; a recorrência semanal continua igual." : ""}`);

    if (!ok) return;

    try {
        await fetchJSON(`${BASE_URL}/agendamentos/${ag.id}/remarcar`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: novaData, horaInicio: novaHora })
        });
        await carregarAgenda();
    } catch (e) {
        alert(e.message || "Não foi possível remarcar a reserva.");
    }
}

function avancarSemana() {
    semanaAtual.setDate(semanaAtual.getDate() + 7);
    carregarAgenda();
}

function voltarSemana() {
    semanaAtual.setDate(semanaAtual.getDate() - 7);
    carregarAgenda();
}

document.addEventListener("DOMContentLoaded", async () => {
    el("btnSemanaAnterior")?.addEventListener("click", voltarSemana);
    el("btnProximaSemana")?.addEventListener("click", avancarSemana);
    el("btnAtualizar")?.addEventListener("click", carregarAgenda);

    el("btnFecharModal")?.addEventListener("click", fecharModal);
    el("btnCancelarModal")?.addEventListener("click", fecharModal);
    el("modalOverlay")?.addEventListener("click", (e) => {
        if (e.target.id === "modalOverlay") fecharModal();
    });

    await carregarAgenda();
});