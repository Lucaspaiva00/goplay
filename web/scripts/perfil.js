const BASE_URL = "https://goplay-dzlr.onrender.com";

function getUsuarioLogado() {
    try {
        return JSON.parse(localStorage.getItem("usuarioLogado") || "null");
    } catch {
        return null;
    }
}

let usuarioLogado = getUsuarioLogado();
let fotoUrlAtual = usuarioLogado?.fotoUrl || null;

if (!usuarioLogado?.id) {
    alert("Sessão expirada. Faça login novamente.");
    window.location.href = "login.html";
}

function el(id) {
    return document.getElementById(id);
}

function mostrarFeedback(msg, tipo = "success") {
    const box = el("perfilFeedback");
    if (!box) return;

    box.className = `perfil-feedback show ${tipo}`;
    box.textContent = msg;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function limparFeedback() {
    const box = el("perfilFeedback");
    if (!box) return;

    box.className = "perfil-feedback";
    box.textContent = "";
}

function setHeroFoto(url) {
    const img = el("perfilHeroImg");
    const icon = el("perfilHeroIcon");
    if (!img || !icon) return;

    if (url) {
        img.src = url;
        img.style.display = "block";
        icon.style.display = "none";
    } else {
        img.removeAttribute("src");
        img.style.display = "none";
        icon.style.display = "block";
    }
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
        limparFeedback();

        const data = await fetchJSON(`${BASE_URL}/usuarios/${usuarioLogado.id}`);

        el("nome").value = data.nome || "";
        el("telefone").value = data.telefone || "";
        el("nascimento").value = data.nascimento ? String(data.nascimento).split("T")[0] : "";
        el("sexo").value = data.sexo || "";
        el("pernaMelhor").value = data.pernaMelhor || "";
        el("posicaoCampo").value = data.posicaoCampo || "";
        el("altura").value = data.altura || "";
        el("peso").value = data.peso || "";
        el("goleiro").checked = !!data.goleiro;
        if (el("foto")) el("foto").value = "";

        fotoUrlAtual = data.fotoUrl || null;
        setHeroFoto(fotoUrlAtual);
    } catch (err) {
        console.error("ERRO LOAD PERFIL:", err);
        mostrarFeedback(err.message || "Erro ao carregar os dados do perfil.", "error");
    }
}

async function salvarPerfil() {
    limparFeedback();

    const btn = document.querySelector(".btn-salvar");
    const nome = el("nome").value.trim();
    const telefone = el("telefone").value.trim();
    const nascimentoValue = el("nascimento").value;
    const sexo = el("sexo").value;
    const pernaMelhor = el("pernaMelhor").value.trim();
    const posicaoCampo = el("posicaoCampo").value.trim();
    const alturaValue = el("altura").value.trim().replace(",", ".");
    const pesoValue = el("peso").value.trim().replace(",", ".");

    if (!nome) {
        mostrarFeedback("O nome é obrigatório.", "error");
        el("nome").focus();
        return;
    }

    if (alturaValue && Number.isNaN(Number(alturaValue))) {
        mostrarFeedback("A altura precisa ser numérica. Ex: 1.80", "error");
        el("altura").focus();
        return;
    }

    if (pesoValue && Number.isNaN(Number(pesoValue))) {
        mostrarFeedback("O peso precisa ser numérico. Ex: 75", "error");
        el("peso").focus();
        return;
    }

    let fotoUrl = fotoUrlAtual;
    const fotoFile = el("foto")?.files?.[0] || null;

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Salvando alterações...`;
        }

        if (fotoFile) {
            fotoUrl = await uploadImage(fotoFile);
        }

        const payload = {
            nome,
            telefone,
            nascimento: nascimentoValue ? new Date(`${nascimentoValue}T12:00:00`).toISOString() : null,
            sexo,
            pernaMelhor,
            posicaoCampo,
            altura: alturaValue ? Number(alturaValue) : null,
            peso: pesoValue ? Number(pesoValue) : null,
            goleiro: el("goleiro").checked,
            fotoUrl: fotoUrl || null
        };

        const result = await fetchJSON(`${BASE_URL}/usuarios/${usuarioLogado.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        fotoUrlAtual = result.fotoUrl || fotoUrl || null;
        setHeroFoto(fotoUrlAtual);
        if (el("foto")) el("foto").value = "";

        usuarioLogado = {
            ...usuarioLogado,
            nome: result.nome || payload.nome,
            telefone: result.telefone || payload.telefone,
            tipo: result.tipo || usuarioLogado.tipo,
            fotoUrl: fotoUrlAtual
        };

        localStorage.setItem("usuarioLogado", JSON.stringify(usuarioLogado));

        mostrarFeedback("Perfil atualizado com sucesso!", "success");
    } catch (err) {
        console.error("ERRO UPDATE PERFIL:", err);
        mostrarFeedback(err.message || "Erro ao salvar alterações.", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Salvar alterações`;
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    carregarPerfil();
});

window.salvarPerfil = salvarPerfil;
