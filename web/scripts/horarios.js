const BASE_URL = "https://goplay-dzlr.onrender.com";

let semanaAtual = new Date();

function getUsuario() {
    return JSON.parse(localStorage.getItem("usuarioLogado") || "null");
}

function inicioSemana(data) {
    const d = new Date(data);
    const dia = d.getDay();
    const diff = d.getDate() - dia;
    return new Date(d.setDate(diff));
}

function formatDate(d) {
    return d.toISOString().split("T")[0];
}

function gerarSemana() {
    const inicio = inicioSemana(semanaAtual);

    const dias = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(inicio);
        d.setDate(inicio.getDate() + i);
        dias.push(d);
    }

    return dias;
}

async function carregarAgenda() {

    const usuario = getUsuario();

    const societies = await fetch(`${BASE_URL}/society/owner/${usuario.id}`)
        .then(r => r.json());

    const societyId = societies?.[0]?.id;

    const agendamentos = await fetch(`${BASE_URL}/agendamentos/society/${societyId}`)
        .then(r => r.json());

    montarGrid(agendamentos);
}

function montarGrid(agendamentos) {

    const grid = document.getElementById("agendaGrid");
    grid.innerHTML = "";

    const dias = gerarSemana();

    document.getElementById("rangeSemana").innerText =
        `${dias[0].toLocaleDateString()} - ${dias[6].toLocaleDateString()}`;

    const horas = [
        "18:00", "19:00", "20:00", "21:00", "22:00"
    ];

    // HEADER
    grid.innerHTML += `<div></div>`;
    dias.forEach(d => {
        grid.innerHTML += `
            <div class="day-header">
                ${d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })}
            </div>
        `;
    });

    // LINHAS
    horas.forEach(hora => {

        grid.innerHTML += `<div class="hour">${hora}</div>`;

        dias.forEach(dia => {

            const dataStr = formatDate(dia);

            const ag = agendamentos.find(a => {
                const dAg = formatDate(new Date(a.data || a.dataAgendamento));
                return dAg === dataStr && a.horaInicio === hora;
            });

            let classe = "free";
            let conteudo = `<div class="event-title">Livre</div>`;

            if (ag) {
                classe = "busy";
                conteudo = `
                    <div class="event-title">${ag.time?.nome || "Reservado"}</div>
                    <div class="event-sub">${ag.campo?.nome || ""}</div>
                `;
            }

            grid.innerHTML += `
                <div class="slot ${classe}" onclick="clicarSlot('${dataStr}','${hora}')">
                    ${conteudo}
                </div>
            `;
        });

    });
}

function clicarSlot(data, hora) {
    location.href = `time-agendamento.html?data=${data}&hora=${hora}`;
}

function avancarSemana() {
    semanaAtual.setDate(semanaAtual.getDate() + 7);
    carregarAgenda();
}

function voltarSemana() {
    semanaAtual.setDate(semanaAtual.getDate() - 7);
    carregarAgenda();
}

document.addEventListener("DOMContentLoaded", carregarAgenda);