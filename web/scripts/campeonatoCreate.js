const BASE_URL = "http://localhost:3000";

function salvarCampeonato() {
    const societyId = localStorage.getItem("societyId");

    const data = {
        societyId,
        nome: nome.value.trim(),
        tipo: tipo.value,
        maxTimes: Number(maxTimes.value)
    };

    fetch(`${BASE_URL}/campeonato`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
        .then(res => res.json())
        .then(json => {
            alert("Campeonato criado com sucesso!");
            window.location.href = "campeonatos.html";
        });
}
