/************************************************************
 * campeonatoDetalhe.js — ATUALIZADO (COM BOTÃO “DETALHES”)
 * - Adiciona botão Detalhes em cada jogo (abre jogo-detalhe.html?jogoId=ID)
 ************************************************************/

const BASE_URL = "http://localhost:3000";

let campeonatoId = null;
let campeonatoAtual = null;

document.addEventListener("DOMContentLoaded", () => {
    campeonatoId = new URLSearchParams(location.search).get("campeonatoId");

    if (!campeonatoId) {
        alert("Campeonato inválido");
        return;
    }

    // Navegação de seções
    document.querySelectorAll(".nav-pill").forEach((btn) => {
        btn.addEventListener("click", () => abrirSecao(btn.dataset.target));
    });

    // Ações do header
    document.getElementById("btnVoltar").addEventListener("click", () => {
        location.href = "campeonatos.html";
    });

    document.getElementById("btnAtualizar").addEventListener("click", () => {
        carregarDetalhes(true);
    });

    document.getElementById("btnVerChaveamento").addEventListener("click", abrirBracket);
    document.getElementById("btnAbrirBracket").addEventListener("click", abrirBracket);

    // Ações principais
    document.getElementById("btnAddTime").addEventListener("click", addTime);
    document.getElementById("btnCriarEAddTime").addEventListener("click", criarEAdicionarTime);

    const inputNovo = document.getElementById("novoTimeNome");
    if (inputNovo) {
        inputNovo.addEventListener("keydown", (e) => {
            if (e.key === "Enter") criarEAdicionarTime();
        });
    }

    document.getElementById("btnGerarGrupos").addEventListener("click", gerarGrupos);
    document.getElementById("btnGerarJogosGrupos").addEventListener("click", gerarJogosGrupos);
    document.getElementById("btnGerarMataMata").addEventListener("click", gerarMataMata);

    carregarDetalhes();
});

// ============================
// UI Helpers
// ============================
function abrirSecao(idSecao) {
    document.querySelectorAll(".nav-pill").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));

    const pill = document.querySelector(`.nav-pill[data-target="${idSecao}"]`);
    const sec = document.getElementById(idSecao);

    if (pill) pill.classList.add("active");
    if (sec) sec.classList.add("active");

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function setLoading(loading) {
    const titulo = document.getElementById("titulo");
    const subtitulo = document.getElementById("subtitulo");
    if (loading) {
        subtitulo.textContent = "Carregando informações...";
        titulo.style.opacity = "0.9";
    } else {
        subtitulo.textContent = "Detalhes e gerenciamento";
        titulo.style.opacity = "1";
    }
}

function showInlineMessage(el, type, title, desc) {
    // type: info | warn | error | success
    const icon =
        type === "success"
            ? "fa-circle-check"
            : type === "warn"
                ? "fa-triangle-exclamation"
                : type === "error"
                    ? "fa-circle-xmark"
                    : "fa-circle-info";

    el.innerHTML = `
    <div style="
      border:1px solid #e6edf6;
      background:#fff;
      border-radius:14px;
      padding:14px;
      display:flex;
      gap:10px;
      align-items:flex-start;
    ">
      <i class="fa-solid ${icon}" style="margin-top:2px;"></i>
      <div>
        <div style="font-weight:700;">${title}</div>
        ${desc ? `<div class="muted" style="margin-top:4px;">${desc}</div>` : ""}
      </div>
    </div>
  `;
}

async function safeFetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        /* ignore */
    }

    if (!res.ok) {
        const msg = data?.error || data?.message || text || `Erro HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}

// ============================
// Carregamento geral
// ============================
async function carregarDetalhes(force = false) {
    try {
        setLoading(true);

        const c = await safeFetchJSON(`${BASE_URL}/campeonato/${campeonatoId}`);
        campeonatoAtual = c;

        document.getElementById("titulo").textContent = c.nome || "Campeonato";

        await carregarSelectTimes();

        renderTimes(c);
        renderGrupos(c);
        renderJogos(c);

        // ✅ final/chaveamento agora depende de existir bracket
        await renderFinal(c);

        ajustarAcoesSemFluxo(c);
    } catch (err) {
        console.error(err);
        alert(err?.message || "Erro ao carregar campeonato");
    } finally {
        setLoading(false);
    }
}

function ajustarAcoesSemFluxo(c) {
    const btnGerarGrupos = document.getElementById("btnGerarGrupos");
    const btnGerarJogosGrupos = document.getElementById("btnGerarJogosGrupos");
    const btnGerarMataMata = document.getElementById("btnGerarMataMata");

    if (c.faseAtual === "FINALIZADO") {
        btnGerarGrupos.style.display = "none";
        btnGerarJogosGrupos.style.display = "none";
        btnGerarMataMata.style.display = "none";
        return;
    }

    const podeGerarGrupos = (c.times?.length || 0) >= 4 && (c.grupos?.length || 0) === 0;
    btnGerarGrupos.style.display = podeGerarGrupos ? "inline-flex" : "none";

    const podeGerarJogosGrupos = (c.grupos?.length || 0) > 0 && (c.jogos?.length || 0) === 0;
    btnGerarJogosGrupos.style.display = podeGerarJogosGrupos ? "inline-flex" : "none";

    const temJogos = (c.jogos?.length || 0) > 0;
    btnGerarMataMata.style.display = temJogos ? "inline-flex" : "none";
}

// ============================
// TIMES
// ============================
function renderTimes(c) {
    const div = document.getElementById("listaTimes");
    const total = c.times?.length || 0;
    document.getElementById("chipTimes").textContent = `${total} time(s)`;

    if (!total) {
        div.innerHTML = `<div class="empty">Nenhum time adicionado ainda.</div>`;
        return;
    }

    div.innerHTML = c.times
        .map((t) => {
            const nome = t?.time?.nome ?? "Time";
            return `
        <div class="item">
          <div>
            <strong>${nome}</strong>
            <div class="muted" style="font-size:12px;">Inscrito</div>
          </div>
          <span class="chip">OK</span>
        </div>
      `;
        })
        .join("");
}

async function carregarSelectTimes() {
    const select = document.getElementById("timeId");

    try {
        const societyId = campeonatoAtual?.societyId;
        if (!societyId) throw new Error("societyId não encontrado no campeonato.");

        const times = await safeFetchJSON(`${BASE_URL}/time/society/${societyId}`);

        const inscritos = new Set((campeonatoAtual?.times || []).map((t) => t?.time?.id).filter(Boolean));

        select.innerHTML = `<option value="">Selecione...</option>`;

        times
            .filter((t) => !inscritos.has(t.id))
            .forEach((t) => {
                select.innerHTML += `<option value="${t.id}">${t.nome}</option>`;
            });

        if (select.options.length === 1) {
            select.innerHTML = `<option value="">Nenhum time disponível (todos já inscritos)</option>`;
        }
    } catch (err) {
        console.error(err);
        select.innerHTML = `<option value="">Erro ao carregar times</option>`;
    }
}

async function addTime() {
    const timeId = document.getElementById("timeId").value;
    if (!timeId) return alert("Selecione um time");

    try {
        await safeFetchJSON(`${BASE_URL}/campeonato/${campeonatoId}/add-time`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ timeId: Number(timeId) }),
        });

        await carregarDetalhes();
    } catch (err) {
        console.error(err);
        alert(err?.message || "Não foi possível adicionar o time.");
    }
}

async function criarEAdicionarTime() {
    const input = document.getElementById("novoTimeNome");
    const nome = (input?.value || "").trim();
    if (!nome) return alert("Digite o nome do time.");

    const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
    if (!usuarioLogado?.id) return alert("Sessão expirada. Faça login novamente.");

    const jaExisteNoCampeonato = (campeonatoAtual?.times || []).some((t) => {
        const n = (t?.time?.nome || "").trim().toLowerCase();
        return n === nome.toLowerCase();
    });

    if (jaExisteNoCampeonato) {
        input.value = "";
        return alert("Esse time já está inscrito no campeonato.");
    }

    try {
        const societyId = campeonatoAtual?.societyId;
        if (!societyId) throw new Error("Não encontrei societyId do campeonato.");

        const donoId = Number(usuarioLogado.id);

        const novoTime = await safeFetchJSON(`${BASE_URL}/time`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nome,
                societyId: Number(societyId),
                donoId,
            }),
        });

        const timeId = novoTime?.id;
        if (!timeId) throw new Error("Time criado, mas não retornou ID.");

        await safeFetchJSON(`${BASE_URL}/campeonato/${campeonatoId}/add-time`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ timeId: Number(timeId) }),
        });

        input.value = "";
        await carregarDetalhes();
        abrirSecao("sec-times");
    } catch (err) {
        console.error(err);
        alert(err?.message || "Erro ao criar e adicionar time.");
    }
}

// ============================
// GRUPOS
// ============================
function renderGrupos(c) {
    const div = document.getElementById("listaGrupos");
    const total = c.grupos?.length || 0;
    document.getElementById("chipGrupos").textContent = `${total} grupo(s)`;

    if (!total) {
        div.innerHTML = `<div class="empty">Nenhum grupo disponível no momento.</div>`;
        return;
    }

    div.innerHTML = c.grupos
        .map((g) => {
            const times = g.timesGrupo || [];
            return `
        <div class="item" style="align-items:flex-start;">
          <div style="width:100%;">
            <strong>${g.nome}</strong>
            <div class="muted" style="font-size:12px; margin-top:4px;">Times</div>
            <div style="margin-top:8px; display:flex; flex-direction:column; gap:6px;">
              ${times
                    .map(
                        (tg) => `
                  <div style="padding:10px; border:1px solid #eef2f6; border-radius:12px;">
                    ${tg?.time?.nome ?? "Time"}
                  </div>
                `
                    )
                    .join("")}
            </div>
          </div>
          <span class="chip">${times.length} time(s)</span>
        </div>
      `;
        })
        .join("");
}

async function gerarGrupos() {
    try {
        await safeFetchJSON(`${BASE_URL}/campeonato/${campeonatoId}/gerar-grupos`, { method: "POST" });
        await carregarDetalhes();
        abrirSecao("sec-grupos");
    } catch (err) {
        console.error(err);
        alert(err?.message || "Não foi possível gerar os grupos.");
    }
}

async function gerarJogosGrupos() {
    try {
        await safeFetchJSON(`${BASE_URL}/campeonato/${campeonatoId}/gerar-jogos-grupos`, { method: "POST" });
        await carregarDetalhes();
        abrirSecao("sec-jogos");
    } catch (err) {
        console.error(err);
        alert(err?.message || "Não foi possível gerar os jogos dos grupos.");
    }
}

// ============================
// JOGOS
// ============================
function renderJogos(c) {
    const div = document.getElementById("listaJogos");
    const total = c.jogos?.length || 0;
    document.getElementById("chipJogos").textContent = `${total} jogo(s)`;

    if (!total) {
        div.innerHTML = `<div class="empty">Nenhum jogo disponível no momento.</div>`;
        return;
    }

    div.innerHTML = c.jogos
        .map((j) => {
            const nomeA = j?.timeA?.nome ?? "Time A";
            const nomeB = j?.timeB?.nome ?? "Time B";
            const placarA = j.golsA ?? "";
            const placarB = j.golsB ?? "";

            const status = j.finalizado
                ? `<span class="chip">Finalizado</span>`
                : `<span class="chip">Em aberto</span>`;

            return `
        <div class="match">
          <div class="match-main">
            <div class="match-title">${nomeA} ${placarA} x ${placarB} ${nomeB}</div>
            <div class="match-sub">Jogo #${j.id}</div>
          </div>

          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            ${status}

            <!-- ✅ BOTÃO DETALHES (NOVO) -->
            <button class="btn btn-light" onclick="abrirDetalhesJogo(${j.id})">
              <i class="fa-solid fa-eye"></i> Detalhes
            </button>

            ${j.finalizado
                    ? ``
                    : `
                  <div class="score-inputs">
                    <input id="gA${j.id}" type="number" min="0" placeholder="Gols A" />
                    <input id="gB${j.id}" type="number" min="0" placeholder="Gols B" />
                    <button class="btn btn-primary" onclick="finalizarJogo(${j.id})">
                      <i class="fa-solid fa-check"></i> Finalizar
                    </button>
                  </div>
                `
                }
          </div>
        </div>
      `;
        })
        .join("");
}

async function finalizarJogo(id) {
    const golsA = Number(document.getElementById(`gA${id}`).value);
    const golsB = Number(document.getElementById(`gB${id}`).value);

    if (!Number.isFinite(golsA) || !Number.isFinite(golsB)) {
        return alert("Informe os gols corretamente");
    }

    try {
        await safeFetchJSON(`${BASE_URL}/campeonato/jogo/${id}/finalizar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ golsA, golsB }),
        });

        await carregarDetalhes();
    } catch (err) {
        console.error(err);
        alert(err?.message || "Não foi possível finalizar o jogo.");
    }
}

async function gerarMataMata() {
    try {
        await safeFetchJSON(`${BASE_URL}/campeonato/${campeonatoId}/gerar-mata-mata`, { method: "POST" });
        await carregarDetalhes();
        abrirSecao("sec-final");
    } catch (err) {
        console.error(err);
        alert(err?.message || "Não foi possível gerar o mata-mata.");
    }
}

// ============================
// FINAL / CHAVEAMENTO
// ============================
async function renderFinal(c) {
    const finalInfo = document.getElementById("finalInfo");
    const btnVerChaveamento = document.getElementById("btnVerChaveamento");

    // ✅ se já finalizou, mostra campeão/vice
    if (c.faseAtual === "FINALIZADO") {
        const campeao = c?.campeao?.nome || "—";
        const vice = c?.viceCampeao?.nome || "—";

        finalInfo.innerHTML = `
      <div style="border:1px solid #cfead5;background:#f2fff5;border-radius:14px;padding:14px;">
        <div style="font-weight:800;font-size:14px;margin-bottom:6px;">🏆 Campeonato finalizado</div>
        <div style="margin:6px 0;"><strong>Campeão:</strong> ${campeao}</div>
        <div style="margin:6px 0;"><strong>Vice:</strong> ${vice}</div>
      </div>
    `;
        btnVerChaveamento.style.display = "inline-flex";
        return;
    }

    // tenta ver se existe bracket mesmo
    try {
        const jogos = await safeFetchJSON(`${BASE_URL}/campeonato/${campeonatoId}/bracket`);
        const temBracket = Array.isArray(jogos) && jogos.length > 0;

        if (!temBracket) {
            showInlineMessage(
                finalInfo,
                "info",
                "Chaveamento ainda não gerado",
                "Quando você gerar o mata-mata, o chaveamento aparece aqui para visualização."
            );
            btnVerChaveamento.style.display = "none";
            return;
        }

        showInlineMessage(
            finalInfo,
            "success",
            "Chaveamento disponível",
            "Você já pode abrir a tela do chaveamento para acompanhar as rodadas."
        );

        btnVerChaveamento.style.display = "inline-flex";
    } catch (err) {
        console.error(err);
        showInlineMessage(
            finalInfo,
            "warn",
            "Não consegui verificar o chaveamento agora",
            "Clique em “Atualizar” ou tente novamente em instantes."
        );
        btnVerChaveamento.style.display = "inline-flex";
    }
}

function abrirBracket() {
    location.href = `campeonato-bracket.html?campeonatoId=${campeonatoId}`;
}

/** ✅ NOVO: abrir detalhes do jogo */
function abrirDetalhesJogo(jogoId) {
    location.href = `jogo-detalhe.html?jogoId=${jogoId}`;
}
