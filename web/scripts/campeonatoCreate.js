const BASE_URL = "https://goplay-dzlr.onrender.com";

function salvarCampeonato() {
    const societyId = localStorage.getItem("societyId");

    const data = {
        societyId: Number(societyId),
        nome: document.getElementById("nome").value.trim(),
        tipo: "LIGA_IDA_VOLTA",
        maxTimes: Number(document.getElementById("maxTimes").value),
        maxJogadoresPorTime: Number(document.getElementById("maxJogadoresPorTime").value || 20),
        modalidade: document.getElementById("modalidade").value,
        categoria: document.getElementById("categoria").value,
        temporada: document.getElementById("temporada").value.trim() || null,
        dataInicio: document.getElementById("dataInicio").value || null,
        dataFim: document.getElementById("dataFim").value || null,
        status: "EM_CRIACAO",
        regulamentoUrl: document.getElementById("regulamentoUrl").value.trim() || null,
        regulamentoTexto: document.getElementById("regulamentoTexto").value.trim() || null,
    };

    if (!data.societyId) return alert("Empresa não encontrada.");
    if (!data.nome) return alert("Informe o nome do campeonato.");
    if (!Number.isInteger(data.maxTimes) || data.maxTimes < 2) {
        return alert("Informe uma quantidade de times a partir de 2.");
    }
    if (!Number.isInteger(data.maxJogadoresPorTime) || data.maxJogadoresPorTime < 1 || data.maxJogadoresPorTime > 100) {
        return alert("Informe um limite de jogadores por time entre 1 e 100.");
    }

    fetch(`${BASE_URL}/campeonato`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
        .then(res => res.json())
        .then(json => {
            if (json?.error) return alert(json.error);
            alert("Campeonato criado com sucesso!");
            window.location.href = "campeonatos.html";
        })
        .catch(() => alert("Erro ao criar campeonato."));
}