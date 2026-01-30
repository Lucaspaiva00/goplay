const BASE_URL = "http://localhost:3000";

function salvarCampeonato() {
    const societyId = localStorage.getItem("societyId");

    const data = {
        societyId,
        nome: nome.value.trim(),
        tipo: tipo.value,
        maxTimes: Number(maxTimes.value),

        // ✅ novos campos
        modalidade: document.getElementById("modalidade").value,
        categoria: document.getElementById("categoria").value,
        temporada: document.getElementById("temporada").value.trim() || null,
        dataInicio: document.getElementById("dataInicio").value || null,
        dataFim: document.getElementById("dataFim").value || null,
        status: document.getElementById("status").value,
        regulamentoUrl: document.getElementById("regulamentoUrl").value.trim() || null,
        regulamentoTexto: document.getElementById("regulamentoTexto").value.trim() || null,
    };

    if (!data.nome) return alert("Informe o nome do campeonato.");
    if (!data.tipo) return alert("Selecione o tipo.");
    if (!data.maxTimes || data.maxTimes < 2) return alert("Informe o número máximo de times (mínimo 2).");

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
