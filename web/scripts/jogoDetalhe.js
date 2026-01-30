const BASE_URL = "http://localhost:3000";

let jogoId = null;
let cache = null;

/* =========================
   PERMISSÃO (READ ONLY)
========================= */
function getUsuarioLogado() {
    try {
        return JSON.parse(localStorage.getItem("usuarioLogado") || "null");
    } catch {
        return null;
    }
}

function isSomenteLeitura() {
    const u = getUsuarioLogado();
    return !u || u.tipo !== "DONO_SOCIETY";
}

function habilitarModoSomenteLeitura() {
    const banner = document.createElement("div");
    banner.style.margin = "10px 0";
    banner.style.padding = "10px 12px";
    banner.style.borderRadius = "12px";
    banner.style.background = "#fff7ed";
    banner.style.border = "1px solid #fed7aa";
    banner.style.color = "#9a3412";
    banner.style.fontWeight = "900";
    banner.textContent =
        "Você está apenas visualizando. PLAYER e DONO_TIME não podem alterar dados do jogo.";

    const alvo = document.querySelector(".content") || document.body;
    alvo.prepend(banner);

    document.querySelectorAll("input, select, textarea, button").forEach(el => {
        el.disabled = true;
        el.style.opacity = "0.6";
        el.style.cursor = "not-allowed";
    });
}

function denyEdit() {
    alert("Somente o dono do society pode alterar dados do jogo.");
}

/* =========================
   BOOT
========================= */
document.addEventListener("DOMContentLoaded", () => {
    jogoId = new URLSearchParams(location.search).get("jogoId");
    if (!jogoId) return alert("jogoId não informado.");

    document.getElementById("btnVoltar")?.addEventListener("click", () => history.back());
    document.getElementById("btnAtualizar")?.addEventListener("click", load);

    document.getElementById("btnAddEvento")?.addEventListener("click", () => {
        if (isSomenteLeitura()) return denyEdit();
        addEvento();
    });

    document.getElementById("evTipo")?.addEventListener("change", toggleSubstituicao);

    load();
});

/* =========================
   HELPERS
========================= */
function msg(text, type = "info") {
    const el = document.getElementById("msg");
    if (!el) return;

    const map = {
        info: ["#f3f7ff", "#dbe7ff"],
        ok: ["#f2fff5", "#cfead5"],
        error: ["#fff2f2", "#ffd0d0"],
    };

    const [bg, br] = map[type] || map.info;

    el.innerHTML = `
    <div style="padding:12px;border-radius:12px;border:1px solid ${br};background:${bg};">
        ${text}
    </div>`;
}

async function safeFetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch { }

    if (!res.ok) throw new Error(data?.error || data?.message || text || res.status);
    return data;
}

/* =========================
   LOAD
========================= */
async function load() {
    try {
        msg("Carregando jogo...", "info");

        cache = await safeFetchJSON(`${BASE_URL}/jogo/${jogoId}`);
        const { jogo, elencoA, elencoB } = cache;

        document.getElementById("tituloJogo").textContent =
            `${jogo.timeA.nome} ${jogo.golsA ?? "-"} x ${jogo.golsB ?? "-"} ${jogo.timeB.nome}`;

        document.getElementById("subtituloJogo").textContent =
            `Jogo #${jogo.id} • ${jogo.campeonato?.nome || "Campeonato"}`;

        buildTimeSelect(jogo);
        renderStats(jogo);
        renderElenco(elencoA, elencoB, jogo);
        renderEventos(jogo);

        msg("OK — dados carregados.", "ok");

        if (isSomenteLeitura()) habilitarModoSomenteLeitura();
    } catch (e) {
        console.error(e);
        msg(e.message, "error");
    }
}

/* =========================
   TIME / JOGADORES
========================= */
function buildTimeSelect(jogo) {
    const evTime = document.getElementById("evTime");
    evTime.innerHTML = `
        <option value="${jogo.timeAId}">${jogo.timeA.nome}</option>
        <option value="${jogo.timeBId}">${jogo.timeB.nome}</option>
    `;
    evTime.onchange = fillJogadoresDoTime;
    fillJogadoresDoTime();
}

function fillJogadoresDoTime() {
    if (!cache?.jogo) return;

    const jogo = cache.jogo;
    const timeId = Number(evTime.value);
    const elenco = timeId === jogo.timeAId ? cache.elencoA : cache.elencoB;

    evJogador.innerHTML = `<option value="">Jogador</option>`;
    evJogadorSaindo.innerHTML = `<option value="">Sai</option>`;
    evJogadorEntrando.innerHTML = `<option value="">Entra</option>`;

    (elenco || []).forEach(p => {
        const opt = `<option value="${p.id}">${p.nome}</option>`;
        evJogador.innerHTML += opt;
        evJogadorSaindo.innerHTML += opt;
        evJogadorEntrando.innerHTML += opt;
    });
}

/* =========================
   STATS
========================= */
function renderStats(jogo) {
    const a = jogo.estatisticasTimes?.find(x => x.timeId === jogo.timeAId);
    const b = jogo.estatisticasTimes?.find(x => x.timeId === jogo.timeBId);

    statsA.innerHTML = statsForm(jogo.timeAId, a);
    statsB.innerHTML = statsForm(jogo.timeBId, b);

    document.querySelectorAll("[data-save-stats]").forEach(btn => {
        btn.onclick = () => {
            if (isSomenteLeitura()) return denyEdit();
            saveStats(Number(btn.dataset.timeId));
        };
    });
}

function statsForm(timeId, s) {
    const v = k => s?.[k] ?? 0;

    return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        ${field("Chutes", `chutes_${timeId}`, v("chutes"))}
        ${field("Chutes no gol", `chutesNoGol_${timeId}`, v("chutesNoGol"))}
        ${field("Escanteios", `escanteios_${timeId}`, v("escanteios"))}
        ${field("Laterais", `laterais_${timeId}`, v("laterais"))}
        ${field("Faltas", `faltas_${timeId}`, v("faltas"))}
        ${field("Posse (%)", `posse_${timeId}`, v("posse"))}
    </div>
    <button class="btn btn-primary" data-save-stats data-time-id="${timeId}" style="margin-top:10px;">
        💾 Salvar stats
    </button>`;
}

function field(label, id, value) {
    return `
    <div>
        <small>${label}</small>
        <input id="${id}" type="number" min="0" value="${value}">
    </div>`;
}

async function saveStats(timeId) {
    const payload = {
        timeId,
        chutes: Number(document.getElementById(`chutes_${timeId}`).value),
        chutesNoGol: Number(document.getElementById(`chutesNoGol_${timeId}`).value),
        escanteios: Number(document.getElementById(`escanteios_${timeId}`).value),
        laterais: Number(document.getElementById(`laterais_${timeId}`).value),
        faltas: Number(document.getElementById(`faltas_${timeId}`).value),
        posse: Number(document.getElementById(`posse_${timeId}`).value),
    };

    await safeFetchJSON(`${BASE_URL}/jogo/${jogoId}/stats`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    load();
}

/* =========================
   ELENCO
========================= */
function renderElenco(elA, elB, jogo) {
    elencoA.innerHTML = elencoBox(elA || [], jogo, jogo.timeAId);
    elencoB.innerHTML = elencoBox(elB || [], jogo, jogo.timeBId);

    document.querySelectorAll("[data-add-lineup]").forEach(btn => {
        btn.onclick = () => {
            if (isSomenteLeitura()) return denyEdit();
            addLineup(Number(btn.dataset.timeId), Number(btn.dataset.jogadorId));
        };
    });
}

function elencoBox(lista, jogo, timeId) {
    const escalados = new Set(
        (jogo.jogadoresAtuacao || [])
            .filter(x => x.timeId === timeId)
            .map(x => x.jogadorId)
    );

    if (!lista.length) return `<div class="empty">Nenhum jogador.</div>`;

    return lista.map(p => `
        <div style="display:flex;justify-content:space-between;">
            <div><strong>${p.nome}</strong></div>
            <button class="btn ${escalados.has(p.id) ? "btn-light" : "btn-primary"}"
                data-add-lineup
                data-time-id="${timeId}"
                data-jogador-id="${p.id}">
                ${escalados.has(p.id) ? "Já escalado" : "Escalar"}
            </button>
        </div>
    `).join("");
}

async function addLineup(timeId, jogadorId) {
    await safeFetchJSON(`${BASE_URL}/jogo/${jogoId}/escalacao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeId, jogadorId, titular: true }),
    });
    load();
}

/* =========================
   EVENTOS
========================= */
function toggleSubstituicao() {
    const sub = evTipo.value === "SUBSTITUICAO";
    evJogador.style.display = sub ? "none" : "inline-block";
    evJogadorSaindo.style.display = sub ? "inline-block" : "none";
    evJogadorEntrando.style.display = sub ? "inline-block" : "none";
}

function renderEventos(jogo) {
    if (!jogo.eventos?.length) {
        listaEventos.innerHTML = `<div class="empty">Nenhum evento.</div>`;
        return;
    }

    listaEventos.innerHTML = jogo.eventos.map(e => `
        <div style="border:1px solid #eee;padding:10px;border-radius:10px;">
            <strong>${e.minuto ?? ""}' ${e.tipo}</strong>
            <div class="muted">${e.detalhe || ""}</div>
        </div>
    `).join("");
}

async function addEvento() {
    const tipo = evTipo.value;

    const payload = {
        tipo,
        minuto: evMinuto.value ? Number(evMinuto.value) : null,
        timeId: evTime.value ? Number(evTime.value) : null,
        detalhe: evDetalhe.value || null,
    };

    if (tipo === "SUBSTITUICAO") {
        if (!evJogadorSaindo.value || !evJogadorEntrando.value)
            return alert("Selecione quem sai e quem entra.");

        payload.jogadorSaindoId = Number(evJogadorSaindo.value);
        payload.jogadorEntrandoId = Number(evJogadorEntrando.value);
    } else {
        payload.jogadorId = evJogador.value ? Number(evJogador.value) : null;
    }

    await safeFetchJSON(`${BASE_URL}/jogo/${jogoId}/evento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    evMinuto.value = "";
    evDetalhe.value = "";

    load();
}
