const BASE_URL = "https://goplay-dzlr.onrender.com";

document.addEventListener("DOMContentLoaded", async () => {
    ajustarModoTela();
    await carregarSocietiesNoSelect();
    await carregarTimes();
});

function getUsuario() {
    return JSON.parse(localStorage.getItem("usuarioLogado") || "null");
}

function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function ajustarModoTela() {
    const usuario = getUsuario();
    const pageTitle = document.getElementById("pageTitle");
    const pageSubtitle = document.getElementById("pageSubtitle");
    const blocoCriacao = document.getElementById("blocoCriacaoTime");

    if (!usuario) return;

    if (usuario.tipo === "DONO_SOCIETY") {
        if (pageTitle) pageTitle.textContent = "⚽ Times do Society";
        if (pageSubtitle) pageSubtitle.textContent = "Visualize os times vinculados ao seu society.";
        if (blocoCriacao) blocoCriacao.style.display = "none";
        return;
    }

    if (usuario.tipo === "DONO_TIME") {
        if (pageTitle) pageTitle.textContent = "⚽ Meus Times";
        if (pageSubtitle) pageSubtitle.textContent = "Cadastre e gerencie os seus times.";
        if (blocoCriacao) blocoCriacao.style.display = "block";
        return;
    }

    if (usuario.tipo === "PLAYER") {
        if (pageTitle) pageTitle.textContent = "⚽ Times do Society";
        if (pageSubtitle) pageSubtitle.textContent = "Veja os times cadastrados neste society.";
        if (blocoCriacao) blocoCriacao.style.display = "none";
        return;
    }

    if (pageTitle) pageTitle.textContent = "⚽ Times";
    if (pageSubtitle) pageSubtitle.textContent = "";
    if (blocoCriacao) blocoCriacao.style.display = "none";
}

async function carregarSocietiesNoSelect() {
    const usuario = getUsuario();
    const select = document.getElementById("societyId");
    const blocoCriacao = document.getElementById("blocoCriacaoTime");

    if (!select) return;

    if (!usuario?.id) {
        select.innerHTML = `<option value="">Faça login novamente</option>`;
        return;
    }

    if (usuario.tipo !== "DONO_TIME") {
        if (blocoCriacao) blocoCriacao.style.display = "none";
        return;
    }

    const societyIdSalvo = localStorage.getItem("societyId");
    let lista = [];

    try {
        const res = await fetch(`${BASE_URL}/society`);
        lista = await res.json();
    } catch (e) {
        console.error(e);
    }

    if (!Array.isArray(lista) || lista.length === 0) {
        select.innerHTML = `<option value="">Nenhuma society encontrada</option>`;
        return;
    }

    select.innerHTML = `<option value="">Selecione</option>`;

    lista.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = `${s.nome}${s.cidade || s.estado ? ` (${s.cidade || ""}${s.estado ? "/" + s.estado : ""})` : ""}`;
        select.appendChild(opt);
    });

    if (societyIdSalvo) {
        select.value = societyIdSalvo;
    }

    select.onchange = () => {
        const v = select.value;
        if (v) localStorage.setItem("societyId", v);
    };
}

function pillStatus(status) {
    const s = String(status || "").toUpperCase();

    if (s === "APROVADO") {
        return `<span style="background:#dcfce7;color:#166534;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:800;">APROVADO</span>`;
    }

    if (s === "RECUSADO") {
        return `<span style="background:#fee2e2;color:#991b1b;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:800;">RECUSADO</span>`;
    }

    if (s === "INATIVO") {
        return `<span style="background:#e5e7eb;color:#374151;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:800;">INATIVO</span>`;
    }

    return `<span style="background:#fef3c7;color:#92400e;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:800;">PENDENTE</span>`;
}

function pillTipo(tipo) {
    const t = String(tipo || "").toUpperCase();

    if (t === "MENSALISTA") {
        return `<span style="background:#dbeafe;color:#1d4ed8;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:800;">MENSALISTA</span>`;
    }

    return `<span style="background:#f3f4f6;color:#111827;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:800;">AVULSO</span>`;
}

function montarCardTime(t, usuario) {
    const isPlayer = usuario?.tipo === "PLAYER";
    const isDonoSociety = usuario?.tipo === "DONO_SOCIETY";
    const isDonoTime = usuario?.tipo === "DONO_TIME";

    let subtitulo = "";

    if (isDonoTime && t?.society?.nome) {
        subtitulo = `<small>Society: ${escapeHtml(t.society.nome)}</small>`;
    }

    const cidadeEstado = `${escapeHtml(t.cidade || "")}${t.estado ? ` - ${escapeHtml(t.estado)}` : ""}`;
    const jogadores = Array.isArray(t.jogadores) ? t.jogadores.length : 0;

    let botaoTexto = "Ver detalhes";
    if (isPlayer) botaoTexto = "Ver time";
    if (isDonoSociety) botaoTexto = "Gerenciar visualização";
    if (isDonoTime) botaoTexto = "Ver detalhes";

    return `
        <div class="time-card">
            <div class="time-card-top" style="display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap;">
                <div class="time-card-info" style="display:flex;flex-direction:column;gap:6px;">
                    <strong>${escapeHtml(t.nome || "-")}</strong>
                    ${subtitulo}
                    <small>${cidadeEstado || "Cidade não informada"}</small>
                    <small>Jogadores: ${jogadores}</small>
                    ${t.modalidade ? `<small>Modalidade: ${escapeHtml(t.modalidade)}</small>` : ""}
                </div>

                <div class="time-card-badges" style="display:flex;gap:8px;flex-wrap:wrap;">
                    ${pillTipo(t.tipoVinculo)}
                    ${pillStatus(t.statusVinculo)}
                </div>
            </div>

            <div class="time-card-actions" style="margin-top:16px;">
                <button class="btn" onclick="verDetalhes(${t.id})">
                    ${botaoTexto}
                </button>
            </div>
        </div>
    `;
}

async function carregarTimes() {
    const usuario = getUsuario();
    const div = document.getElementById("listaTimes");

    if (!usuario?.id) {
        div.innerHTML = "<p>Erro: usuário não encontrado.</p>";
        return;
    }

    try {
        let data = [];

        if (usuario.tipo === "DONO_SOCIETY" || usuario.tipo === "PLAYER") {
            const societyId = getQueryParam("societyId") || localStorage.getItem("societyId");

            if (!societyId) {
                div.innerHTML = "<p>Nenhum society selecionado.</p>";
                return;
            }

            localStorage.setItem("societyId", societyId);

            const res = await fetch(`${BASE_URL}/time/society/${societyId}`);
            data = await res.json();
        } else if (usuario.tipo === "DONO_TIME") {
            const res = await fetch(`${BASE_URL}/time/dono/${usuario.id}`);
            data = await res.json();
        } else {
            div.innerHTML = "<p>Visualização não disponível para este perfil.</p>";
            return;
        }

        if (!Array.isArray(data) || data.length === 0) {
            div.innerHTML = "<p>Nenhum time cadastrado ainda.</p>";
            return;
        }

        div.innerHTML = data.map((t) => montarCardTime(t, usuario)).join("");
    } catch (e) {
        console.error(e);
        div.innerHTML = "<p>Erro ao carregar times.</p>";
    }
}

async function salvarTime() {
    const usuario = getUsuario();

    if (!usuario?.id) {
        alert("Sessão expirada. Faça login de novo.");
        return;
    }

    const societyId = document.getElementById("societyId")?.value;

    if (!societyId) {
        alert("Nenhuma society selecionada/identificada. Selecione uma society.");
        return;
    }

    const payload = {
        donoId: usuario.id,
        societyId: Number(societyId),
        nome: document.getElementById("nome").value.trim(),
        brasao: document.getElementById("brasao").value.trim() || null,
        descricao: document.getElementById("descricao").value.trim() || null,
        estado: document.getElementById("estado").value.trim() || null,
        cidade: document.getElementById("cidade").value.trim() || null,
        modalidade: document.getElementById("modalidade").value.trim() || null,
        tipoVinculo: "AVULSO",
        statusVinculo: "PENDENTE"
    };

    if (!payload.nome) {
        alert("O nome do time é obrigatório.");
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/time`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const json = await res.json();

        if (!res.ok || json?.error) {
            alert(json?.error || "Erro ao criar time");
            return;
        }

        alert("Time cadastrado com sucesso!");
        await carregarTimes();

        document.getElementById("nome").value = "";
        document.getElementById("brasao").value = "";
        document.getElementById("descricao").value = "";
        document.getElementById("estado").value = "";
        document.getElementById("cidade").value = "";
        document.getElementById("modalidade").value = "";
    } catch (e) {
        console.error(e);
        alert("Erro ao criar time.");
    }
}

function verDetalhes(id) {
    window.location.href = `time-detalhe.html?timeId=${id}`;
}

window.salvarTime = salvarTime;
window.verDetalhes = verDetalhes;