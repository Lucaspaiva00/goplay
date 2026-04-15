const BASE_URL = "https://goplay-dzlr.onrender.com";

function getUsuarioLogado() {
    try {
        return JSON.parse(localStorage.getItem("usuarioLogado") || "null");
    } catch {
        return null;
    }
}

const usuarioLogado = getUsuarioLogado();

if (!usuarioLogado?.id) {
    alert("Sessão expirada. Faça login novamente.");
    window.location.href = "login.html";
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

async function carregarPerfil() {
    try {
        const data = await fetchJSON(`${BASE_URL}/usuarios/${usuarioLogado.id}`);

        document.getElementById("nome").value = data.nome || "";
        document.getElementById("telefone").value = data.telefone || "";
        document.getElementById("nascimento").value = data.nascimento ? String(data.nascimento).split("T")[0] : "";
        document.getElementById("sexo").value = data.sexo || "";
        document.getElementById("pernaMelhor").value = data.pernaMelhor || "";
        document.getElementById("posicaoCampo").value = data.posicaoCampo || "";
        document.getElementById("altura").value = data.altura || "";
        document.getElementById("peso").value = data.peso || "";
        document.getElementById("goleiro").checked = !!data.goleiro;
    } catch (err) {
        console.error("ERRO LOAD PERFIL:", err);
        alert(err.message || "Erro ao carregar os dados.");
    }
}

async function salvarPerfil() {
    const nascimentoValue = document.getElementById("nascimento").value;

    const payload = {
        nome: document.getElementById("nome").value.trim(),
        telefone: document.getElementById("telefone").value.trim(),
        nascimento: nascimentoValue ? new Date(`${nascimentoValue}T12:00:00`).toISOString() : null,
        sexo: document.getElementById("sexo").value,
        pernaMelhor: document.getElementById("pernaMelhor").value.trim(),
        posicaoCampo: document.getElementById("posicaoCampo").value.trim(),
        altura: document.getElementById("altura").value ? Number(document.getElementById("altura").value) : null,
        peso: document.getElementById("peso").value ? Number(document.getElementById("peso").value) : null,
        goleiro: document.getElementById("goleiro").checked
    };

    if (!payload.nome) {
        alert("O nome é obrigatório.");
        return;
    }

    try {
        const result = await fetchJSON(`${BASE_URL}/usuarios/${usuarioLogado.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const usuarioAtualizado = {
            ...usuarioLogado,
            nome: result.nome || payload.nome,
            telefone: result.telefone || payload.telefone,
            tipo: result.tipo || usuarioLogado.tipo
        };

        localStorage.setItem("usuarioLogado", JSON.stringify(usuarioAtualizado));

        alert("Perfil atualizado com sucesso!");
    } catch (err) {
        console.error("ERRO UPDATE PERFIL:", err);
        alert(err.message || "Erro ao salvar alterações.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    carregarPerfil();
});

window.salvarPerfil = salvarPerfil;