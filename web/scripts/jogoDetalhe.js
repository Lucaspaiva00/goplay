// ✅ web/scripts/jogo-detalhe.js (ARQUIVO TODO)
const BASE_URL = "http://localhost:3000";

let jogoId = null;
let cache = null;

/* =========================
   PERMISSÃO (READ ONLY)
========================= */
function getUsuarioLogado() {
    try { return JSON.parse(localStorage.getItem("usuarioLogado") || "null"); } catch { return null; }
}

function isSomenteLeitura() {
    const u = getUsuarioLogado();
    // ✅ Somente DONO_SOCIETY pode editar jogo
    return !u || u.tipo !== "DONO_SOCIETY";
}

function habilitarModoSomenteLeitura() {
    // banner
    const banner = document.createElement("div");
    banner.style.margin = "10px 0";
    banner.style.padding = "10px 12px";
    banner.style.borderRadius = "12px";
    banner.style.background = "#fff7ed";
    banner.style.border = "1px solid #fed7aa";
    banner.style.color = "#9a3412";
    banner.style.fontWeight = "900";
    banner.textContent = "Você está apenas visualizando. PLAYER e DONO_TIME não podem alterar dados do jogo.";
    const alvo = document.querySelector(".content") || document.body;
    alvo.prepend(banner);

    // desabilita inputs, selects e textareas
    document.querySelectorAll("input, select, textarea").forEach(el => {
        el.disabled = true;
        el.style.opacity = "0.75";
        el.style.cursor = "not-allowed";
    });

    // desabilita botões de ações
    document.querySelectorAll("button").forEach(btn => {
        const t = (btn.textContent || "").toLowerCase();
        // trava tudo que for ação
        if (t.includes("salvar") || t.includes("adicionar") || t.includes("finalizar") || t.includes("escalar")) {
            btn.disabled = true;
            btn.style.opacity = "0.55";
            btn.style.cursor = "not-allowed";
            btn.title = "Somente o dono do society pode editar.";
        }
    });

    // se existir botão "Adicionar evento", trava também pelo ID
    const btnAddEvento = document.getElementById("btnAddEvento");
    if (btnAddEvento) {
        btnAddEvento.disabled = true;
        btnAddEvento.style.opacity = "0.55";
        btnAddEvento.style.cursor = "not-allowed";
        btnAddEvento.title = "Somente o dono do society pode editar.";
    }
}

function denyEdit() {
    alert("Você está apenas visualizando. Somente o dono do society pode alterar o jogo.");
}

/* =========================
   BOOT
========================= */
document.addEventListener("DOMContentLoaded", () => {
    jogoId = new URLSearchParams(location.search).get("jogoId");
    if (!jogoId) return alert("jogoId não informado.");

    const btnVoltar = document.getElementById("btnVoltar");
    const btnAtualizar = document.getElementById("btnAtualizar");
    const btnAddEvento = document.getElementById("btnAddEvento");

    if (btnVoltar) btnVoltar.addEventListener("click", () => history.back());
    if (btnAtualizar) btnAtualizar.addEventListener("click", load);

    // ✅ Só o dono do society pode adicionar evento
    if (btnAddEvento) {
        if (isSomenteLeitura()) {
            btnAddEvento.addEventListener("click", (e) => { e.preventDefault(); denyEdit(); });
        } else {
            btnAddEvento.addEventListener("click", addEvento);
        }
    }

    load();
});

/* =========================
   UI HELPERS
========================= */
function msg(text, type = "info") {
    const el = document.getElementById("msg");
    if (!el) return;

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

/* =========================
   LOAD
========================= */
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

        // ✅ IMPORTANTE: só depois de renderizar, aplica read-only (pra pegar botões gerados no HTML)
        if (isSomenteLeitura()) habilitarModoSomenteLeitura();
    } catch (e) {
        console.error(e);
        msg(`Erro: ${e.message}`, "error");
    }
}

function buildTimeSelect(jogo) {
    const evTime = document.getElementById("evTime");
    if (!evTime) return;

    evTime.innerHTML = `
    <option value="${jogo.timeAId}">${jogo.timeA.nome}</option>
    <option value="${jogo.timeBId}">${jogo.timeB.nome}</option>
  `;

    // só precisa atualizar lista de jogadores do select (isso pode existir no modo leitura também)
    evTime.onchange = () => fillJogadoresDoTime();
    fillJogadoresDoTime();
}

function fillJogadoresDoTime() {
    if (!cache?.jogo) return;

    const jogo = cache.jogo;
    const evTime = Number(document.getElementById("evTime").value);
    const evJogador = document.getElementById("evJogador");

    if (!evJogador) return;

    const elenco = evTime === jogo.timeAId ? cache.elencoA : cache.elencoB;

    evJogador.innerHTML = `<option value="">Jogador (opcional)</option>`;
    (elenco || []).forEach((p) => {
        evJogador.innerHTML += `<option value="${p.id}">${p.nome}${p.posicaoCampo ? " • " + p.posicaoCampo : ""}</option>`;
    });
}

/* =========================
   STATS
========================= */
function renderStats(jogo) {
    const a = jogo.estatisticasTimes?.find((x) => x.timeId === jogo.timeAId) || null;
    const b = jogo.estatisticasTimes?.find((x) => x.timeId === jogo.timeBId) || null;

    const statsA = document.getElementById("statsA");
    const statsB = document.getElementById("statsB");
    if (!statsA || !statsB) return;

    statsA.innerHTML = statsForm(jogo.timeAId, a);
    statsB.innerHTML = statsForm(jogo.timeBId, b);

    document.querySelectorAll("[data-save-stats]").forEach((btn) => {
        btn.addEventListener("click", () => {
            if (isSomenteLeitura()) return denyEdit();
            saveStats(Number(btn.dataset.timeId));
        });
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
    if (isSomenteLeitura()) return denyEdit();

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

/* =========================
   ELENCO / ESCALAÇÃO
========================= */
function renderElenco(elencoA, elencoB, jogo) {
    const elA = document.getElementById("elencoA");
    const elB = document.getElementById("elencoB");
    if (!elA || !elB) return;

    elA.innerHTML = elencoBox(elencoA || [], jogo, jogo.timeAId);
    elB.innerHTML = elencoBox(elencoB || [], jogo, jogo.timeBId);

    document.querySelectorAll("[data-add-lineup]").forEach((btn) => {
        btn.addEventListener("click", () => {
            if (isSomenteLeitura()) return denyEdit();
            addLineup(Number(btn.dataset.timeId), Number(btn.dataset.jogadorId));
        });
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
    if (isSomenteLeitura()) return denyEdit();

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

/* =========================
   EVENTOS
========================= */
function renderEventos(jogo) {
    const div = document.getElementById("listaEventos");
    if (!div) return;

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
    if (isSomenteLeitura()) return denyEdit();

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
