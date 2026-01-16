const BASE_URL = "http://localhost:3000";

// normal viria do login
const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
const SOCIETY_ID = usuarioLogado?.societyId;

async function carregarAgendaHoje() {
    const hoje = new Date().toISOString().slice(0, 10);

    const res = await fetch(
        `${BASE_URL}/agendamentos?societyId=${SOCIETY_ID}&data=${hoje}`
    );

    const lista = await res.json();
    const tbody = document.getElementById("agendaHoje");
    tbody.innerHTML = "";

    lista.forEach(a => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
      <td>${a.campo.nome}</td>
      <td>${a.horaInicio} - ${a.horaFim}</td>
      <td>${a.time.nome}</td>
      <td><span class="badge ${a.status}">${a.status}</span></td>
    `;
        tbody.appendChild(tr);
    });
}

async function carregarPagamentos() {
    const res = await fetch(`${BASE_URL}/pagamentos/society/${SOCIETY_ID}`);
    const lista = await res.json();

    const tbody = document.getElementById("pagamentos");
    tbody.innerHTML = "";

    lista.forEach(p => {
        const tr = document.createElement("tr");

        const botao =
            p.status === "PENDENTE"
                ? `<button class="btn-confirmar" onclick="confirmarPagamento(${p.id})">
            Confirmar
           </button>`
                : "-";

        tr.innerHTML = `
      <td>${p.time?.nome || "-"}</td>
      <td>${p.campo?.nome || "-"}</td>
      <td>R$ ${p.valor.toFixed(2)}</td>
      <td><span class="badge ${p.status}">${p.status}</span></td>
      <td>${botao}</td>
    `;
        tbody.appendChild(tr);
    });
}

async function confirmarPagamento(id) {
    if (!confirm("Confirmar pagamento?")) return;

    await fetch(`${BASE_URL}/pagamentos/${id}/confirmar`, {
        method: "POST",
    });

    carregarPagamentos();
    carregarAgendaHoje();
}

// INIT
carregarAgendaHoje();
carregarPagamentos();
