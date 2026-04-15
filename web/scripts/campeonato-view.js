const BASE_URL = "https://goplay-dzlr.onrender.com";

function el(id) {
    return document.getElementById(id);
}

function getUsuarioLogado() {
    try {
        const u = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
        return u?.id ? u : null;
    } catch {
        return null;
    }
}

function getParam(name) {
    return new URLSearchParams(location.search).get(name);
}

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch { }

    if (!res.ok) {
        throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
    }

    return data;
}

function escapeHtml(s) {
    return String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function safeNum(v, def = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
}

function formatDateTime(value) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("pt-BR");
}

function renderRanking(lista) {
    const tbody = el("tbodyRanking");

    if (!Array.isArray(lista) || !lista.length) {
        tbody.innerHTML = `<tr><td colspan="10" class="muted">Sem ranking.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map((r, idx) => {
        const timeNome = r?.time?.nome ?? r?.timeNome ?? r?.nome ?? r?.time ?? "-";
        const P = safeNum(r?.pontos ?? r?.P ?? r?.pts, 0);
        const J = safeNum(r?.jogos ?? r?.J ?? r?.pj, 0);
        const V = safeNum(r?.vitorias ?? r?.V ?? r?.vit, 0);
        const E = safeNum(r?.empates ?? r?.E ?? r?.emp, 0);
        const D = safeNum(r?.derrotas ?? r?.D ?? r?.der, 0);
        const GP = safeNum(r?.golsPro ?? r?.GP ?? r?.gf, 0);
        const GC = safeNum(r?.golsContra ?? r?.GC ?? r?.ga, 0);
        const SG = safeNum(r?.saldoGols ?? r?.SG ?? (GP - GC), (GP - GC));

        return `
            <tr>
                <td>${idx + 1}</td>
                <td>${escapeHtml(String(timeNome))}</td>
                <td class="right"><b>${P}</b></td>
                <td class="right">${J}</td>
                <td class="right">${V}</td>
                <td class="right">${E}</td>
                <td class="right">${D}</td>
                <td class="right">${GP}</td>
                <td class="right">${GC}</td>
                <td class="right">${SG}</td>
            </tr>
        `;
    }).join("");
}

function renderInfo(c) {
    const nome = c?.nome ?? "Campeonato";
    el("titulo").textContent = nome;
    el("chipId").textContent = `#${c?.id ?? "-"}`;

    const status = c?.status ?? c?.faseAtual ?? "—";
    const tipo = c?.tipo ?? "—";
    const societyNome = c?.society?.nome ?? "—";
    const qtdTimes = Array.isArray(c?.times) ? c.times.length : "—";
    const qtdJogos = Array.isArray(c?.jogos) ? c.jogos.length : "—";

    el("boxInfo").innerHTML = `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
            <span class="chip"><i class="fa-solid fa-flag"></i> ${escapeHtml(String(status))}</span>
            <span class="chip"><i class="fa-solid fa-layer-group"></i> ${escapeHtml(String(tipo))}</span>
            <span class="chip"><i class="fa-solid fa-futbol"></i> Jogos: ${escapeHtml(String(qtdJogos))}</span>
            <span class="chip"><i class="fa-solid fa-users"></i> Times: ${escapeHtml(String(qtdTimes))}</span>
        </div>

        <div style="font-size:14px;line-height:1.6;">
            <div><b>Society:</b> ${escapeHtml(String(societyNome))}</div>
            <div><b>Temporada:</b> ${escapeHtml(String(c?.temporada || "-"))}</div>
            <div><b>Categoria:</b> ${escapeHtml(String(c?.categoria || "-"))}</div>
            <div><b>Modalidade:</b> ${escapeHtml(String(c?.modalidade || "-"))}</div>
            <div><b>Data início:</b> ${escapeHtml(formatDateTime(c?.dataInicio))}</div>
            <div><b>Data fim:</b> ${escapeHtml(formatDateTime(c?.dataFim))}</div>
        </div>
    `;
}

function renderBracket(bracket) {
    const box = el("boxBracket");

    if (!bracket || !Array.isArray(bracket) || !bracket.length) {
        box.innerHTML = `<span class="muted">Sem dados de bracket.</span>`;
        return;
    }

    box.innerHTML = bracket.map((m) => {
        const a = m?.timeA?.nome ?? "Time A";
        const b = m?.timeB?.nome ?? "Time B";
        const ga = m?.golsA ?? "-";
        const gb = m?.golsB ?? "-";
        const fase = m?.round ? `Rodada ${m.round}` : "";

        return `
            <div style="padding:10px 0;border-bottom:1px dashed #e5e7eb;">
                <div style="font-weight:900;">${escapeHtml(String(a))} <span style="opacity:.7;">${ga} x ${gb}</span> ${escapeHtml(String(b))}</div>
                ${fase ? `<div class="muted">${escapeHtml(String(fase))}</div>` : ""}
            </div>
        `;
    }).join("");
}

function renderJogos(jogos) {
    const box = el("listaJogos");

    if (!Array.isArray(jogos) || !jogos.length) {
        box.innerHTML = `<div class="muted">Nenhum jogo cadastrado.</div>`;
        return;
    }

    box.innerHTML = jogos.map((j) => {
        const timeA = j?.timeA?.nome || "Time A";
        const timeB = j?.timeB?.nome || "Time B";
        const golsA = j?.golsA ?? "-";
        const golsB = j?.golsB ?? "-";
        const rodada = j?.round ? `Rodada ${j.round}` : "";
        const status = j?.finalizado ? "Finalizado" : "Pendente";
        const dataHora = formatDateTime(j?.dataHora);
        const observacao = j?.observacao || "-";

        return `
            <div class="jogo-item">
                <div class="jogo-placar">${escapeHtml(timeA)} ${golsA} x ${golsB} ${escapeHtml(timeB)}</div>
                <div class="muted">${escapeHtml(rodada)} • ${escapeHtml(status)}</div>
                <div class="muted">Data/Hora: ${escapeHtml(dataHora)}</div>
                <div class="muted">Observação: ${escapeHtml(observacao)}</div>
            </div>
        `;
    }).join("");
}

async function carregarTudo() {
    const id = getParam("id");

    if (!id) {
        el("msg").textContent = "ID do campeonato não informado na URL (?id=...).";
        return;
    }

    el("msg").textContent = "Carregando...";
    el("tbodyRanking").innerHTML = `<tr><td colspan="10" class="muted">Carregando...</td></tr>`;
    el("boxBracket").innerHTML = `<span class="muted">Carregando...</span>`;
    el("listaJogos").innerHTML = `<div class="muted">Carregando jogos...</div>`;

    const camp = await fetchJSON(`${BASE_URL}/campeonato/${encodeURIComponent(id)}`);
    renderInfo(camp);
    renderJogos(camp?.jogos || []);

    try {
        const ranking = await fetchJSON(`${BASE_URL}/campeonato/${encodeURIComponent(id)}/ranking`);
        renderRanking(ranking);
    } catch (e) {
        console.error("ranking", e);
        renderRanking([]);
    }

    try {
        const bracket = await fetchJSON(`${BASE_URL}/campeonato/${encodeURIComponent(id)}/bracket`);
        renderBracket(bracket);
    } catch (e) {
        console.error("bracket", e);
        renderBracket(null);
    }

    el("msg").textContent = "";
}

document.addEventListener("DOMContentLoaded", () => {
    const u = getUsuarioLogado();

    if (!u?.id) {
        alert("Você precisa fazer login!");
        location.href = "login.html";
        return;
    }

    el("btnVoltar").onclick = () => history.back();
    el("btnRecarregar").onclick = () => carregarTudo().catch((e) => {
        console.error(e);
        el("msg").textContent = e?.message || "Erro ao recarregar.";
    });

    carregarTudo().catch((e) => {
        console.error(e);
        el("msg").textContent = e?.message || "Erro ao carregar.";
    });
});