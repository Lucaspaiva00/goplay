const BASE_URL = "http://localhost:3000";

let jogoId = null;
let cache = null;

document.addEventListener("DOMContentLoaded", () => {
    jogoId = new URLSearchParams(location.search).get("jogoId");
    if (!jogoId) return alert("jogoId não informado.");

    document.getElementById("btnVoltar").addEventListener("click", () => history.back());
    document.getElementById("btnAtualizar").addEventListener("click", load);
    document.getElementById("btnAddEvento").addEventListener("click", addEvento);

    load();
});

function msg(text, type = "info") {
    const el = document.getElementById("msg");
    const bg = type === "error" ? "#fff2f2" : type === "ok" ? "#f2fff5" : "#f3f7ff";
    const br = type === "error" ? "#ffd0d0" : type === "ok" ? "#cfead5" : "#dbe7ff";
    el.innerHTML = `<div style="padding:12px 14px;border-radius:12px;border:1px solid ${br};background:${bg};">${text}</div>`;
}

async function safeFetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { }
    if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
    return data;
}

async function load() {
    try {
        msg("Carregando...", "info");
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

        msg("Ok — dados carregados.", "ok");
    } catch (e) {
        console.error(e);
        msg(`Erro: ${e.message}`, "error");
    }
}

function buildTimeSelect(jogo) {
    const evTime = document.getElementById("evTime");
    evTime.innerHTML = `
    <option value="${jogo.timeAId}">${jogo.timeA.nome}</option>
    <option value="${jogo.timeBId}">${jogo.timeB.nome}</option>
  `;

    evTime.addEventListener("change", () => fillJogadoresDoTime());
    fillJogadoresDoTime();
}

function fillJogadoresDoTime() {
    const jogo = cache.jogo;
    const evTime = Number(document.getElementById("evTime").value);
    const evJogador = document.getElementById("evJogador");

    const elenco = evTime === jogo.timeAId ? cache.elencoA : cache.elencoB;

    evJogador.innerHTML = `<option value="">Jogador (opcional)</option>`;
    elenco.forEach((p) => {
        evJogador.innerHTML += `<option value="${p.id}">${p.nome}${p.posicaoCampo ? " • " + p.posicaoCampo : ""}</option>`;
    });
}

function renderStats(jogo) {
    const a = jogo.estatisticasTimes?.find((x) => x.timeId === jogo.timeAId) || null;
    const b = jogo.estatisticasTimes?.find((x) => x.timeId === jogo.timeBId) || null;

    document.getElementById("statsA").innerHTML = statsForm(jogo.timeAId, a);
    document.getElementById("statsB").innerHTML = statsForm(jogo.timeBId, b);

    document.querySelectorAll("[data-save-stats]").forEach((btn) => {
        btn.addEventListener("click", () => saveStats(Number(btn.dataset.timeId)));
    });
}

function statsForm(timeId, s) {
    const v = (k) => (s && s[k] !== undefined && s[k] !== null ? s[k] : 0);

    return `
    <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:8px;">
      ${field("Chutes", `chutes_${timeId}`, v("chutes"))}
      ${field("Chutes no gol", `chutesNoGol_${timeId}`, v("chutesNoGol"))}
      ${field("Escanteios", `escanteios_${timeId}`, v("escanteios"))}
      ${field("Laterais", `laterais_${timeId}`, v("laterais"))}
      ${field("Faltas", `faltas_${timeId}`, v("faltas"))}
      ${field("Posse (%)", `posse_${timeId}`, v("posse"))}
    </div>

    <button class="btn btn-primary" data-save-stats="1" data-time-id="${timeId}" style="margin-top:10px;">
      <i class="fa-solid fa-floppy-disk"></i> Salvar stats
    </button>
  `;
}

function field(label, id, value) {
    return `
    <div>
      <div style="font-size:12px;opacity:.75;margin-bottom:4px;">${label}</div>
      <input id="${id}" type="number" min="0" value="${value}"
        style="width:100%;padding:10px;border-radius:12px;border:1px solid #dbe3ef;" />
    </div>
  `;
}

async function saveStats(timeId) {
    try {
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

        await load();
    } catch (e) {
        console.error(e);
        alert(e.message);
    }
}

function renderElenco(elencoA, elencoB, jogo) {
    document.getElementById("elencoA").innerHTML = elencoBox(elencoA, jogo, jogo.timeAId);
    document.getElementById("elencoB").innerHTML = elencoBox(elencoB, jogo, jogo.timeBId);

    document.querySelectorAll("[data-add-lineup]").forEach((btn) => {
        btn.addEventListener("click", () => addLineup(Number(btn.dataset.timeId), Number(btn.dataset.jogadorId)));
    });
}

function elencoBox(elenco, jogo, timeId) {
    const escalados = new Set((jogo.jogadoresAtuacao || []).filter(x => x.timeId === timeId).map(x => x.jogadorId));

    if (!elenco.length) return `<div class="empty">Nenhum jogador cadastrado nesse time ainda.</div>`;

    return elenco.map((p) => {
        const inGame = escalados.has(p.id);
        return `
      <div style="display:flex;justify-content:space-between;align-items:center;border:1px solid #eef2f6;border-radius:12px;padding:10px;margin-bottom:8px;">
        <div>
          <strong>${p.nome}</strong>
          <div style="font-size:12px;opacity:.75;">${p.posicaoCampo || "-"} ${p.goleiro ? "• Goleiro" : ""}</div>
        </div>

        <button class="btn ${inGame ? "btn-light" : "btn-primary"}" data-add-lineup="1" data-time-id="${timeId}" data-jogador-id="${p.id}">
          ${inGame ? "Já escalado" : "Escalar"}
        </button>
      </div>
    `;
    }).join("");
}

async function addLineup(timeId, jogadorId) {
    try {
        await safeFetchJSON(`${BASE_URL}/jogo/${jogoId}/escalacao`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ timeId, jogadorId, titular: true }),
        });
        await load();
    } catch (e) {
        console.error(e);
        alert(e.message);
    }
}

function renderEventos(jogo) {
    const div = document.getElementById("listaEventos");
    const evs = jogo.eventos || [];

    if (!evs.length) {
        div.innerHTML = `<div class="empty">Nenhum evento registrado ainda.</div>`;
        return;
    }

    div.innerHTML = evs.map((e) => {
        const min = e.minuto !== null && e.minuto !== undefined ? `${e.minuto}'` : "";
        return `
      <div style="border:1px solid #eef2f6;border-radius:12px;padding:10px;margin-bottom:8px;">
        <div style="font-weight:800;">${min} ${e.tipo}</div>
        <div style="font-size:12px;opacity:.8;">
          ${e.timeId ? "Time: " + (e.timeId === jogo.timeAId ? jogo.timeA.nome : jogo.timeB.nome) : ""}
          ${e.jogadorId ? " • JogadorId: " + e.jogadorId : ""}
          ${e.detalhe ? " • " + e.detalhe : ""}
        </div>
      </div>
    `;
    }).join("");
}

async function addEvento() {
    try {
        const tipo = document.getElementById("evTipo").value;
        const minuto = document.getElementById("evMinuto").value;
        const timeId = document.getElementById("evTime").value;
        const jogadorId = document.getElementById("evJogador").value;
        const detalhe = document.getElementById("evDetalhe").value;

        await safeFetchJSON(`${BASE_URL}/jogo/${jogoId}/evento`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tipo,
                minuto: minuto !== "" ? Number(minuto) : null,
                timeId: timeId ? Number(timeId) : null,
                jogadorId: jogadorId ? Number(jogadorId) : null,
                detalhe: detalhe || null,
            }),
        });

        document.getElementById("evMinuto").value = "";
        document.getElementById("evDetalhe").value = "";

        await load();
    } catch (e) {
        console.error(e);
        alert(e.message);
    }
}
