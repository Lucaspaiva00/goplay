// /web/scripts/societyCreate.js
const BASE_URL = "https://goplay-dzlr.onrender.com";

const DIAS_SEMANA = [
    [0, "Domingo"], [1, "Segunda-feira"], [2, "Terça-feira"], [3, "Quarta-feira"],
    [4, "Quinta-feira"], [5, "Sexta-feira"], [6, "Sábado"]
];

function renderHorariosFuncionamento() {
    const wrap = document.getElementById("horariosFuncionamento");
    if (!wrap) return;
    wrap.innerHTML = DIAS_SEMANA.map(([dia, nome]) => `
        <div class="hours-row" data-dia="${dia}">
            <span class="day-name">${nome}</span>
            <label class="open-toggle"><input type="checkbox" class="dia-ativo" checked> Aberto</label>
            <span class="time-label">De</span>
            <input type="time" class="hora-inicio" value="18:00">
            <span class="time-label">até</span>
            <input type="time" class="hora-fim" value="23:00">
        </div>`).join("");

    wrap.querySelectorAll(".hours-row").forEach(row => {
        const toggle = row.querySelector(".dia-ativo");
        const sync = () => {
            const ativo = toggle.checked;
            row.classList.toggle("closed", !ativo);
            row.querySelectorAll('input[type="time"]').forEach(i => i.disabled = !ativo);
        };
        toggle.addEventListener("change", sync);
        sync();
    });
}

function coletarHorariosFuncionamento() {
    return [...document.querySelectorAll("#horariosFuncionamento .hours-row")].map(row => ({
        diaSemana: Number(row.dataset.dia),
        ativo: row.querySelector(".dia-ativo")?.checked === true,
        horaInicio: row.querySelector(".dia-ativo")?.checked ? row.querySelector(".hora-inicio").value : null,
        horaFim: row.querySelector(".dia-ativo")?.checked ? row.querySelector(".hora-fim").value : null
    }));
}

document.addEventListener("DOMContentLoaded", renderHorariosFuncionamento);

async function salvarSociety() {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

    if (!usuario || !usuario.id) {
        alert("Sessão expirada. Faça login novamente.");
        window.location.href = "login.html";
        return;
    }

    const nome = document.getElementById("nome").value.trim();
    if (!nome) {
        alert("Informe o nome da Empresa.");
        return;
    }

    let imagem = null;
    const imagemFile = document.getElementById("imagem")?.files?.[0] || null;
    if (imagemFile) {
        try {
            imagem = await uploadImage(imagemFile);
        } catch (e) {
            alert(e.message || "Erro no upload da imagem.");
            return;
        }
    }

    const data = {
        usuarioId: usuario.id,
        nome,
        descricao: document.getElementById("descricao").value.trim(),
        telefone: document.getElementById("telefone").value.trim(),
        whatsapp: document.getElementById("whatsapp").value.trim(),
        email: document.getElementById("email").value.trim(),
        website: document.getElementById("website").value.trim(),
        instagram: document.getElementById("instagram").value.trim(),
        facebook: document.getElementById("facebook").value.trim(),
        youtube: document.getElementById("youtube").value.trim(),
        cep: document.getElementById("cep").value.trim(),
        endereco: document.getElementById("endereco").value.trim(),
        estado: document.getElementById("estado").value.trim(),
        cidade: document.getElementById("cidade").value.trim(),
        pixTitular: document.getElementById("pixTitular").value.trim(),
        pixChave: document.getElementById("pixChave").value.trim(),
        horariosFuncionamento: coletarHorariosFuncionamento(),
        imagem
    };

    fetch(`${BASE_URL}/society`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
        .then(async (res) => {
            const json = await res.json().catch(() => ({}));

            if (!res.ok) {
                alert(json.error || "Erro ao cadastrar empresa.");
                return;
            }

            alert("Empresa cadastrada com sucesso!");

            if (json.id) {
                localStorage.setItem("societyId", json.id);
            }

            window.location.href = "home.html";
        })
        .catch((err) => {
            console.error("Erro na requisição:", err);
            alert("Erro ao cadastrar empresa (falha na comunicação com o servidor).");
        });
}
