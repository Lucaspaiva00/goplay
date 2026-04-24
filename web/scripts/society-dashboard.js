const BASE_URL = "https://goplay-dzlr.onrender.com";

function money(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function getUsuarioLogado() {
    return JSON.parse(localStorage.getItem("usuarioLogado") || "null");
}

async function carregarDashboard() {
    try {
        const usuario = getUsuarioLogado();

        if (!usuario?.id) {
            alert("Sessão expirada");
            return;
        }

        // 🔥 buscar society do dono
        const societies = await fetch(`${BASE_URL}/society/owner/${usuario.id}`)
            .then(r => r.json());

        const society = societies?.[0];

        if (!society) {
            console.warn("Nenhum society encontrado");
            return;
        }

        const societyId = society.id;

        // 🔥 buscar pagamentos
        const lista = await fetch(`${BASE_URL}/pagamentos/society/${societyId}`)
            .then(r => r.json());

        const pagos = lista.filter(p => p.status === "PAGO");

        /* =========================
           KPIs
        ========================= */
        const total = pagos.reduce((s, p) => s + p.valor, 0);

        const hoje = new Date().toDateString();

        const hojeTotal = pagos
            .filter(p => new Date(p.pagoEm).toDateString() === hoje)
            .reduce((s, p) => s + p.valor, 0);

        const mes = new Date().getMonth();

        const mesTotal = pagos
            .filter(p => new Date(p.pagoEm).getMonth() === mes)
            .reduce((s, p) => s + p.valor, 0);

        const pendente = lista
            .filter(p => p.status === "PENDENTE")
            .reduce((s, p) => s + p.valor, 0);

        const ticket = pagos.length ? total / pagos.length : 0;

        const totalSlots = 12 * 30;
        const ocupacao = (pagos.length / totalSlots) * 100;

        document.getElementById("receitaTotal").innerText = money(total);
        document.getElementById("receitaMes").innerText = money(mesTotal);
        document.getElementById("receitaHoje").innerText = money(hojeTotal);
        document.getElementById("pendente").innerText = money(pendente);
        document.getElementById("ticket").innerText = money(ticket);
        document.getElementById("ocupacao").innerText = ocupacao.toFixed(1) + "%";

        /* =========================
           GRÁFICO LINHA
        ========================= */
        const dias = {};

        pagos.forEach(p => {
            const d = new Date(p.pagoEm).toLocaleDateString("pt-BR");
            dias[d] = (dias[d] || 0) + p.valor;
        });

        new Chart(document.getElementById("chartLinha"), {
            type: "line",
            data: {
                labels: Object.keys(dias),
                datasets: [{
                    label: "Receita",
                    data: Object.values(dias),
                    tension: 0.4,
                    fill: true
                }]
            }
        });

        /* =========================
           PIZZA
        ========================= */
        const tipos = { AVULSO: 0, MENSALISTA: 0 };

        pagos.forEach(p => {
            tipos[p.tipo] += p.valor;
        });

        new Chart(document.getElementById("chartPizza"), {
            type: "doughnut",
            data: {
                labels: Object.keys(tipos),
                datasets: [{
                    data: Object.values(tipos)
                }]
            }
        });

        /* =========================
           BARRA
        ========================= */
        const horas = {};

        lista.forEach(p => {
            const h = p.agendamento?.horaInicio || "Outro";
            horas[h] = (horas[h] || 0) + 1;
        });

        new Chart(document.getElementById("chartBarra"), {
            type: "bar",
            data: {
                labels: Object.keys(horas),
                datasets: [{
                    label: "Agendamentos",
                    data: Object.values(horas)
                }]
            }
        });

        /* =========================
           RANKING
        ========================= */
        const ranking = {};

        pagos.forEach(p => {
            const t = p.time?.nome || "Desconhecido";
            ranking[t] = (ranking[t] || 0) + p.valor;
        });

        document.getElementById("rankingTimes").innerHTML =
            Object.entries(ranking)
                .sort((a, b) => b[1] - a[1])
                .map(([t, v]) =>
                    `<div>${t} — <strong>${money(v)}</strong></div>`
                )
                .join("");

        /* =========================
           INSIGHTS (NÍVEL EMPRESA)
        ========================= */
        const insights = [];

        if (ocupacao < 40) {
            insights.push("⚠️ Baixa ocupação — você está deixando dinheiro na mesa.");
        }

        if (mesTotal < total * 0.3) {
            insights.push("📉 Seu faturamento mensal está baixo comparado ao total.");
        }

        const melhorHora = Object.entries(horas)
            .sort((a, b) => b[1] - a[1])[0];

        if (melhorHora) {
            insights.push(`🔥 Horário mais vendido: ${melhorHora[0]}`);
        }

        const melhorTime = Object.entries(ranking)
            .sort((a, b) => b[1] - a[1])[0];

        if (melhorTime) {
            insights.push(`🏆 Time que mais gera receita: ${melhorTime[0]}`);
        }

        document.getElementById("insights").innerHTML =
            insights.map(i => `<div>${i}</div>`).join("");

    } catch (e) {
        console.error(e);
        alert("Erro ao carregar dashboard");
    }
}

document.addEventListener("DOMContentLoaded", carregarDashboard);