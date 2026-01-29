const BASE_URL = "http://localhost:3000";

function el(id) { return document.getElementById(id); }

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
    try { data = text ? JSON.parse(text) : null; } catch { }
    if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
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

function renderRanking(lista) {
    const tbody = el("tbodyRanking");
    if (!Array.isArray(lista) || !lista.length) {
        tbody.innerHTML = `<tr><td colspan="10" class="muted">Sem ranking.</td></tr>`;
        return;
    }

    // tenta normalizar campos comuns (você pode ajustar depois se teu ranking tiver nomes diferentes)
    tbody.innerHTML = lista.map((r, idx) => {
        const timeNome =
            r?.time?.nome ??
            r?.timeNome ??
            r?.nome ??
            r?.time ??
            "-";

        const P = safeNum(r?.pontos ?? r?.P ?? r?.pts, 0);
        const J = safeNum(r?.jogos ?? r?.J ?? r?.pj, 0);
        const V = safeNum(r?.vitorias ?? r?.V ?? r?.vit, 0);
        const E = safeNum(r?.empates ?? r?.E ?? r?.emp, 0);
        const D = safeNum(r?.derrotas ?? r?.D ?? r?.der, 0);
        const GP = safeNum(r?.golsPro ?? r?.GP ?? r?.gf, 0);
        const GC = safeNum(r?.golsContra ?? r?.GC ?? r?.ga, 0);
        const SG = safeNum((r?.saldoGols ?? r?.SG ?? (GP - GC)), (GP - GC));

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
    const nome = c?.nome ?? c?.titulo ?? "Campeonato";
    el("titulo").textContent = nome;
    el("chipId").textContent = `#${c?.id ?? "-"}`;

    const status = c?.status ?? c?.fase ?? "—";
    const societyNome = c?.society?.nome ?? c?.societyNome ?? "—";
    const qtdTimes = Array.isArray(c?.times) ? c.times.length : (c?.qtdTimes ?? "—");
    const qtdJogos = Array.isArray(c?.jogos) ? c.jogos.length : (c?.qtdJogos ?? "—");

    el("boxInfo").innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
      <span class="chip"><i class="fa-solid fa-flag"></i> ${escapeHtml(String(status))}</span>
      <span class="chip"><i class="fa-solid fa-futbol"></i> Jogos: ${escapeHtml(String(qtdJogos))}</span>
      <span class="chip"><i class="fa-solid fa-users"></i> Times: ${escapeHtml(String(qtdTimes))}</span>
    </div>
    <div style="font-size:14px;line-height:1.5;">
      <div><b>Society:</b> ${escapeHtml(String(societyNome))}</div>
    </div>
  `;
}

function renderBracket(bracket) {
    const box = el("boxBracket");

    if (!bracket) {
        box.innerHTML = `<span class="muted">Sem dados de bracket.</span>`;
        return;
    }

    // como não sabemos o formato exato do teu bracket, mostramos de forma segura:
    // 1) Se vier array de partidas, tenta mapear
    // 2) Se vier objeto, mostra JSON formatado
    if (Array.isArray(bracket)) {
        if (!bracket.length) {
            box.innerHTML = `<span class="muted">Sem dados de bracket.</span>`;
            return;
        }

        box.innerHTML = bracket.map((m, i) => {
            const a = m?.timeA?.nome ?? m?.timeA ?? m?.mandante?.nome ?? "Time A";
            const b = m?.timeB?.nome ?? m?.timeB ?? m?.visitante?.nome ?? "Time B";
            const ga = (m?.golsA ?? m?.placarA ?? m?.golsMandante ?? "-");
            const gb = (m?.golsB ?? m?.placarB ?? m?.golsVisitante ?? "-");
            const fase = m?.fase ?? m?.round ?? m?.rodada ?? "";
            return `
        <div style="padding:10px 0;border-bottom:1px dashed #e5e7eb;">
          <div style="font-weight:900;">${escapeHtml(String(a))} <span style="opacity:.7;">${ga} x ${gb}</span> ${escapeHtml(String(b))}</div>
          ${fase ? `<div class="muted">${escapeHtml(String(fase))}</div>` : ""}
        </div>
      `;
        }).join("");
        return;
    }

    // objeto: printa JSON
    try {
        box.innerHTML = `<pre>${escapeHtml(JSON.stringify(bracket, null, 2))}</pre>`;
    } catch {
        box.innerHTML = `<span class="muted">Bracket inválido.</span>`;
    }
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

    // Detalhe
    const camp = await fetchJSON(`${BASE_URL}/campeonato/${encodeURIComponent(id)}`);
    renderInfo(camp);

    // Ranking
    try {
        const ranking = await fetchJSON(`${BASE_URL}/campeonato/${encodeURIComponent(id)}/ranking`);
        renderRanking(ranking);
    } catch (e) {
        console.error("ranking", e);
        renderRanking([]);
    }

    // Bracket
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
    el("btnRecarregar").onclick = () => carregarTudo().catch(e => {
        console.error(e);
        el("msg").textContent = e?.message || "Erro ao recarregar.";
    });

    carregarTudo().catch(e => {
        console.error(e);
        el("msg").textContent = e?.message || "Erro ao carregar.";
    });
});
