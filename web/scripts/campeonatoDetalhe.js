/************************************************************
 * campeonatoDetalhe.js — COMPLETO (robusto + Próximo passo)
 * - Mostra CTA "Próximo passo" na aba TIMES para TODAS modalidades
 * - Mantém botões originais (Grupos/Jogos/Mata-mata) por seção
 * - Evita requisições concorrentes / duplo clique
 * - Ranking por grupos usando /campeonato/:id/ranking-grupos (rota correta)
 * - AVISO: 4 times + 2 grupos => só 2 jogos (1 por grupo)
 ************************************************************/
const BASE_URL = "https://goplay-dzlr.onrender.com"; // <-- ajuste se seu backend estiver em outra porta

let campeonatoId = null;
let campeonatoAtual = null;

// trava de ações para evitar clique duplo
const busy = {
    carregar: false,
    addTime: false,
    criarTime: false,
    gerarGrupos: false,
    gerarJogos: false,
    gerarMataMata: false,
    finalizarJogo: new Set(),
};

// ============================
// Bootstrap
// ============================
document.addEventListener("DOMContentLoaded", () => {
    campeonatoId = new URLSearchParams(location.search).get("campeonatoId");
    if (!campeonatoId) {
        alert("Campeonato inválido");
        return;
    }

    // navegação
    document.querySelectorAll(".nav-pill").forEach((btn) => {
        btn.addEventListener("click", () => abrirSecao(btn.dataset.target));
    });

    // botões topo
    const btnVoltar = document.getElementById("btnVoltar");
    if (btnVoltar) btnVoltar.addEventListener("click", () => (location.href = "campeonatos.html"));

    const btnAtualizar = document.getElementById("btnAtualizar");
    if (btnAtualizar) btnAtualizar.addEventListener("click", () => carregarDetalhes(true));

    const btnVerChaveamento = document.getElementById("btnVerChaveamento");
    if (btnVerChaveamento) btnVerChaveamento.addEventListener("click", abrirBracket);

    const btnAbrirBracket = document.getElementById("btnAbrirBracket");
    if (btnAbrirBracket) btnAbrirBracket.addEventListener("click", abrirBracket);

    // ações de time
    const btnAddTime = document.getElementById("btnAddTime");
    if (btnAddTime) btnAddTime.addEventListener("click", addTime);

    const btnCriarEAddTime = document.getElementById("btnCriarEAddTime");
    if (btnCriarEAddTime) btnCriarEAddTime.addEventListener("click", criarEAdicionarTime);

    const inputNovo = document.getElementById("novoTimeNome");
    if (inputNovo) {
        inputNovo.addEventListener("keydown", (e) => {
            if (e.key === "Enter") criarEAdicionarTime();
        });
    }

    // ações de fluxo
    const btnGerarGrupos = document.getElementById("btnGerarGrupos");
    if (btnGerarGrupos) btnGerarGrupos.addEventListener("click", gerarGrupos);

    const btnGerarJogosGrupos = document.getElementById("btnGerarJogosGrupos");
    if (btnGerarJogosGrupos) btnGerarJogosGrupos.addEventListener("click", gerarJogosGrupos);

    const btnGerarMataMata = document.getElementById("btnGerarMataMata");
    if (btnGerarMataMata) btnGerarMataMata.addEventListener("click", gerarMataMata);

    carregarDetalhes();
});

// ============================
// Utils (UI / safety)
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
    if (!titulo || !subtitulo) return;

    if (loading) {
        subtitulo.textContent = "Carregando informações...";
        titulo.style.opacity = "0.9";
    } else {
        subtitulo.textContent = "Detalhes e gerenciamento";
        titulo.style.opacity = "1";
    }
}

function escapeHTML(str) {
    return String(str ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function setBtnLoading(btn, loading, labelWhenIdle) {
    if (!btn) return;
    btn.disabled = !!loading;
    if (loading) {
        btn.dataset._oldHTML = btn.innerHTML;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Aguarde...`;
    } else {
        btn.innerHTML = btn.dataset._oldHTML || labelWhenIdle || btn.innerHTML;
        delete btn.dataset._oldHTML;
    }
}

async function safeFetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = null;
    }

    if (!res.ok) {
        const msg = data?.error || data?.message || text || `Erro HTTP ${res.status}`;
        throw new Error(msg);
    }

    return data;
}

function badgeTipo(tipo) {
    const t = String(tipo || "").toUpperCase();
    if (t === "GRUPOS") return "Fase de grupos";
    if (t === "GRUPOS_MATA_MATA") return "Grupos + mata-mata";
    if (t === "COPA") return "Copa (grupos)";
    if (t === "PONTOS_CORRIDOS") return "Pontos corridos";
    if (t === "LIGA_IDA_VOLTA") return "Liga (ida e volta)";
    if (t === "MATA_MATA" || t === "MATA-MATA") return "Mata-mata";
    return t || "—";
}

function renderCampeonatoInfo(c) {
    const el = document.getElementById("campeonatoInfo");
    if (!el) return;

    const fmtData = (d) => {
        if (!d) return "—";
        const dt = new Date(d);
        if (Number.isNaN(dt.getTime())) return "—";
        return dt.toLocaleDateString("pt-BR");
    };

    const tipo = badgeTipo(c.tipo);
    const max = c.maxTimes ?? "—";
    const fase = c.faseAtual ?? "—";
    const status = c.status ?? "—";

    el.innerHTML = `
    <div class="item"><strong>Nome:</strong> ${escapeHTML(c.nome || "—")}</div>
    <div class="item"><strong>Tipo:</strong> ${escapeHTML(tipo)}</div>
    <div class="item"><strong>Times:</strong> ${(c.times?.length || 0)} / ${escapeHTML(max)}</div>
    <div class="item"><strong>Status:</strong> ${escapeHTML(status)}</div>
    <div class="item"><strong>Fase atual:</strong> ${escapeHTML(fase)}</div>
    <div class="item"><strong>Início:</strong> ${escapeHTML(fmtData(c.dataInicio))}</div>
    <div class="item"><strong>Fim:</strong> ${escapeHTML(fmtData(c.dataFim))}</div>
  `;
}

// ============================
// CTA "Próximo passo" (injetado na aba TIMES)
// ============================
function ensureNextStepContainer() {
    const secTimes = document.getElementById("sec-times");
    if (!secTimes) return null;

    let wrap = document.getElementById("nextStepWrap");
    if (wrap) return wrap;

    wrap = document.createElement("div");
    wrap.id = "nextStepWrap";
    wrap.style.marginTop = "14px";

    wrap.innerHTML = `
    <div style="
      border:1px solid #e6edf6;
      background:#fff;
      border-radius:14px;
      padding:14px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
    ">
      <div>
        <div style="font-weight:800; display:flex; align-items:center; gap:8px;">
          <i class="fa-solid fa-circle-play"></i>
          Próximo passo
        </div>
        <div class="muted" id="nextStepDesc" style="margin-top:4px;">
          —
        </div>
      </div>

      <button class="btn btn-primary" id="nextStepBtn" style="display:none;">
        <i class="fa-solid fa-wand-magic-sparkles"></i> —
      </button>
    </div>
  `;

    secTimes.appendChild(wrap);
    return wrap;
}

function setNextStepCTA({ show, label, desc, onClick }) {
    const wrap = ensureNextStepContainer();
    if (!wrap) return;

    const btn = document.getElementById("nextStepBtn");
    const d = document.getElementById("nextStepDesc");

    if (d) d.textContent = desc || "—";
    if (!btn) return;

    btn.onclick = null;

    if (!show) {
        btn.style.display = "none";
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Tudo certo`;
        return;
    }

    btn.style.display = "inline-flex";
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> ${escapeHTML(label || "Continuar")}`;
    btn.onclick = onClick;
}

// ============================
// Carregamento geral
// ============================
async function carregarDetalhes(force = false) {
    if (busy.carregar && !force) return;
    busy.carregar = true;

    const btnAtualizar = document.getElementById("btnAtualizar");
    setBtnLoading(btnAtualizar, true);

    try {
        setLoading(true);

        const c = await safeFetchJSON(`${BASE_URL}/campeonato/${campeonatoId}`);
        campeonatoAtual = c;

        renderCampeonatoInfo(c);

        const titulo = document.getElementById("titulo");
        if (titulo) titulo.textContent = c.nome || "Campeonato";

        await carregarSelectTimes();

        renderTimes(c);
        renderGrupos(c);
        renderJogos(c);

        await renderRanking();
        await renderFinal(c);

        ajustarAcoesPorTipo(c);
    } catch (err) {
        console.error(err);
        alert(err?.message || "Erro ao carregar campeonato");
    } finally {
        setLoading(false);
        setBtnLoading(btnAtualizar, false);
        busy.carregar = false;
    }
}

// ============================
// Regras de ações por tipo (botões + Próximo passo)
// ============================
function ajustarAcoesPorTipo(c) {
    const btnGerarGrupos = document.getElementById("btnGerarGrupos");
    const btnGerarJogosGrupos = document.getElementById("btnGerarJogosGrupos");
    const btnGerarMataMata = document.getElementById("btnGerarMataMata");

    if (btnGerarGrupos) btnGerarGrupos.style.display = "none";
    if (btnGerarJogosGrupos) btnGerarJogosGrupos.style.display = "none";
    if (btnGerarMataMata) btnGerarMataMata.style.display = "none";

    if (c.faseAtual === "FINALIZADO" || c.status === "FINALIZADO") {
        setNextStepCTA({ show: false, desc: "Campeonato finalizado." });
        return;
    }

    const tipo = String(c.tipo || "").toUpperCase();
    const totalTimes = c.times?.length || 0;
    const totalGrupos = c.grupos?.length || 0;
    const totalJogos = c.jogos?.length || 0;

    const max = Number(c.maxTimes || 0);
    const lotado = max > 0 && totalTimes >= max;

    const minLiga = 2;
    const minGrupos = 4;

    const notReadyDesc = lotado
        ? "Times completos, mas ainda não há uma ação disponível no fluxo."
        : `Adicione times para liberar a próxima etapa. (${totalTimes}/${max || "∞"})`;

    // GRUPOS / GRUPOS_MATA_MATA / COPA
    if (tipo === "GRUPOS" || tipo === "GRUPOS_MATA_MATA" || tipo === "COPA") {
        if (totalTimes >= minGrupos && totalGrupos === 0) {
            if (btnGerarGrupos) btnGerarGrupos.style.display = "inline-flex";

            setNextStepCTA({
                show: true,
                label: "Gerar grupos",
                desc: lotado
                    ? "Times completos. Clique para gerar os grupos automaticamente."
                    : `Mínimo ${minGrupos} times. Clique para gerar os grupos.`,
                onClick: () => gerarGrupos(),
            });
            return;
        }

        if (totalGrupos > 0 && totalJogos === 0) {
            if (btnGerarJogosGrupos) btnGerarJogosGrupos.style.display = "inline-flex";

            // ⚠️ AVISO DO TEU CASO (4 times em 2 grupos => só 2 jogos)
            if ((c.times?.length || 0) === 4 && (c.grupos?.length || 0) === 2) {
                setNextStepCTA({
                    show: true,
                    label: "Gerar jogos (grupos)",
                    desc:
                        "ATENÇÃO: com 4 times e 2 grupos, cada grupo fica com 2 times, então o round-robin gera 1 jogo por grupo (2 jogos no total). " +
                        "Se você quer mais jogos, o backend precisa colocar 1 grupo com 4 times ou habilitar ida/volta.",
                    onClick: () => gerarJogosGrupos(),
                });
            } else {
                setNextStepCTA({
                    show: true,
                    label: "Gerar jogos (grupos)",
                    desc: "Grupos prontos. Clique para gerar os jogos da fase de grupos.",
                    onClick: () => gerarJogosGrupos(),
                });
            }
            return;
        }

        // Só habilita gerar mata-mata se for GRUPOS_MATA_MATA
        if (tipo === "GRUPOS_MATA_MATA") {
            // Se já tem jogos, pode gerar mata-mata (o backend decide se já pode ou não)
            if (totalJogos > 0) {
                if (btnGerarMataMata) btnGerarMataMata.style.display = "inline-flex";
                setNextStepCTA({
                    show: true,
                    label: "Gerar mata-mata",
                    desc: "Após a fase de grupos, gere o mata-mata (chaveamento).",
                    onClick: () => gerarMataMata(),
                });
                return;
            }
        }

        setNextStepCTA({ show: false, desc: notReadyDesc });
        return;
    }

    // LIGA / PONTOS CORRIDOS / IDA-VOLTA
    if (tipo === "PONTOS_CORRIDOS" || tipo === "LIGA_IDA_VOLTA") {
        if (totalTimes >= minLiga && totalJogos === 0) {
            if (btnGerarJogosGrupos) btnGerarJogosGrupos.style.display = "inline-flex";

            setNextStepCTA({
                show: true,
                label: tipo === "LIGA_IDA_VOLTA" ? "Gerar jogos (ida e volta)" : "Gerar jogos (liga)",
                desc: lotado
                    ? "Times completos. Clique para gerar os confrontos."
                    : `Mínimo ${minLiga} times. Clique para gerar os confrontos.`,
                onClick: () => gerarJogosGrupos(),
            });
            return;
        }

        setNextStepCTA({ show: false, desc: notReadyDesc });
        return;
    }

    // MATA-MATA puro
    if (tipo === "MATA_MATA" || tipo === "MATA-MATA") {
        const podeGerar = totalTimes >= minLiga && totalJogos === 0;

        if (podeGerar) {
            if (btnGerarMataMata) btnGerarMataMata.style.display = "inline-flex";

            setNextStepCTA({
                show: true,
                label: "Gerar mata-mata",
                desc: lotado
                    ? "Times completos. Clique para gerar os jogos do round 1."
                    : `Mínimo ${minLiga} times. Clique para gerar o mata-mata.`,
                onClick: () => gerarMataMata(),
            });
            return;
        }

        if (totalJogos > 0) {
            setNextStepCTA({
                show: false,
                desc: "Mata-mata gerado. Agora finalize os jogos para avançar os rounds.",
            });
            return;
        }

        setNextStepCTA({ show: false, desc: notReadyDesc });
        return;
    }

    setNextStepCTA({ show: false, desc: notReadyDesc });
}

// ============================
// TIMES
// ============================
function renderTimes(c) {
    const div = document.getElementById("listaTimes");
    const total = c.times?.length || 0;

    const chip = document.getElementById("chipTimes");
    if (chip) chip.textContent = `${total} time(s)`;

    const max = Number(c.maxTimes || 0);
    const btnAdd = document.getElementById("btnAddTime");
    const btnCriar = document.getElementById("btnCriarEAddTime");
    const select = document.getElementById("timeId");
    const inputNovo = document.getElementById("novoTimeNome");

    const lotado = max > 0 && total >= max;

    if (btnAdd) btnAdd.disabled = lotado;
    if (btnCriar) btnCriar.disabled = lotado;
    if (select) select.disabled = lotado;
    if (inputNovo) inputNovo.disabled = lotado;

    if (lotado && select) {
        select.innerHTML = `<option value="">Limite de times atingido (${total}/${max})</option>`;
    }

    if (!div) return;

    if (!total) {
        div.innerHTML = `<div class="empty">Nenhum time adicionado ainda.</div>`;
        return;
    }

    div.innerHTML = (c.times || [])
        .map((t) => {
            const nome = t?.time?.nome ?? "Time";
            return `
        <div class="item">
          <div>
            <strong>${escapeHTML(nome)}</strong>
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
    if (!select) return;

    try {
        const societyId = campeonatoAtual?.societyId;
        if (!societyId) throw new Error("societyId não encontrado no campeonato.");

        const times = await safeFetchJSON(`${BASE_URL}/time/society/${societyId}`);

        const inscritos = new Set(
            (campeonatoAtual?.times || [])
                .map((t) => t?.time?.id ?? t?.timeId)
                .filter((x) => x !== null && x !== undefined)
                .map((x) => Number(x))
        );

        select.innerHTML = `<option value="">Selecione...</option>`;

        (times || [])
            .filter((t) => !inscritos.has(Number(t.id)))
            .forEach((t) => {
                select.innerHTML += `<option value="${Number(t.id)}">${escapeHTML(t.nome)}</option>`;
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
    if (busy.addTime) return;
    busy.addTime = true;

    const btnAddTime = document.getElementById("btnAddTime");
    setBtnLoading(btnAddTime, true);

    try {
        const select = document.getElementById("timeId");
        const timeId = select?.value;

        if (!timeId) {
            alert("Selecione um time");
            return;
        }

        await safeFetchJSON(`${BASE_URL}/campeonato/${campeonatoId}/add-time`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ timeId: Number(timeId) }),
        });

        await carregarDetalhes(true);
    } catch (err) {
        console.error(err);
        alert(err?.message || "Não foi possível adicionar o time.");
    } finally {
        setBtnLoading(btnAddTime, false);
        busy.addTime = false;
    }
}

async function criarEAdicionarTime() {
    if (busy.criarTime) return;
    busy.criarTime = true;

    const btnCriar = document.getElementById("btnCriarEAddTime");
    setBtnLoading(btnCriar, true);

    try {
        const input = document.getElementById("novoTimeNome");
        const nome = (input?.value || "").trim();
        if (!nome) {
            alert("Digite o nome do time.");
            return;
        }

        const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
        if (!usuarioLogado?.id) {
            alert("Sessão expirada. Faça login novamente.");
            return;
        }

        const jaExisteNoCampeonato = (campeonatoAtual?.times || []).some((t) => {
            const n = String(t?.time?.nome || "").trim().toLowerCase();
            return n === nome.toLowerCase();
        });

        if (jaExisteNoCampeonato) {
            input.value = "";
            alert("Esse time já está inscrito no campeonato.");
            return;
        }

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
        await carregarDetalhes(true);
        abrirSecao("sec-times");
    } catch (err) {
        console.error(err);
        alert(err?.message || "Erro ao criar e adicionar time.");
    } finally {
        setBtnLoading(btnCriar, false);
        busy.criarTime = false;
    }
}

// ============================
// GRUPOS
// ============================
function renderGrupos(c) {
    const div = document.getElementById("listaGrupos");
    const total = c.grupos?.length || 0;

    const chip = document.getElementById("chipGrupos");
    if (chip) chip.textContent = `${total} grupo(s)`;

    if (!div) return;

    if (!total) {
        div.innerHTML = `<div class="empty">Nenhum grupo disponível no momento.</div>`;
        return;
    }

    div.innerHTML = (c.grupos || [])
        .map((g) => {
            const times = g.timesGrupo || [];
            return `
        <div class="item" style="align-items:flex-start;">
          <div style="width:100%;">
            <strong>${escapeHTML(g.nome || "Grupo")}</strong>
            <div class="muted" style="font-size:12px; margin-top:4px;">Times</div>

            <div style="margin-top:8px; display:flex; flex-direction:column; gap:6px;">
              ${times
                    .map(
                        (tg) => `
                    <div style="padding:10px; border:1px solid #eef2f6; border-radius:12px;">
                      ${escapeHTML(tg?.time?.nome ?? "Time")}
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
    if (busy.gerarGrupos) return;
    busy.gerarGrupos = true;

    const btn = document.getElementById("btnGerarGrupos");
    setBtnLoading(btn, true);

    try {
        await safeFetchJSON(`${BASE_URL}/campeonato/${campeonatoId}/gerar-grupos`, { method: "POST" });
        await carregarDetalhes(true);
        abrirSecao("sec-grupos");
    } catch (err) {
        console.error(err);
        alert(err?.message || "Não foi possível gerar os grupos.");
    } finally {
        setBtnLoading(btn, false);
        busy.gerarGrupos = false;
    }
}

async function gerarJogosGrupos() {
    if (busy.gerarJogos) return;
    busy.gerarJogos = true;

    const btn = document.getElementById("btnGerarJogosGrupos");
    setBtnLoading(btn, true);

    try {
        await safeFetchJSON(`${BASE_URL}/campeonato/${campeonatoId}/gerar-jogos-grupos`, { method: "POST" });
        await carregarDetalhes(true);
        abrirSecao("sec-jogos");
    } catch (err) {
        console.error(err);
        alert(err?.message || "Não foi possível gerar os jogos.");
    } finally {
        setBtnLoading(btn, false);
        busy.gerarJogos = false;
    }
}

// ============================
// JOGOS
// ============================
function renderJogos(c) {
    const div = document.getElementById("listaJogos");
    const total = c.jogos?.length || 0;

    const chip = document.getElementById("chipJogos");
    if (chip) chip.textContent = `${total} jogo(s)`;

    if (!div) return;

    if (!total) {
        div.innerHTML = `
      <div class="empty">
        Nenhum jogo disponível no momento.<br/>
        <small class="muted">
          Se você gerou grupos e apareceu "só 2 jogos" com 4 times, é porque seu backend dividiu em 2 grupos de 2 times.
        </small>
      </div>
    `;
        return;
    }

    div.innerHTML = (c.jogos || [])
        .map((j) => {
            const nomeA = j?.timeA?.nome ?? "Time A";
            const nomeB = j?.timeB?.nome ?? "Time B";
            const placarA = j.golsA ?? "";
            const placarB = j.golsB ?? "";
            const status = j.finalizado ? `<span class="chip">Finalizado</span>` : `<span class="chip">Em aberto</span>`;
            const isMataMata = j.grupoId === null;

            return `
        <div class="match">
          <div class="match-main">
            <div class="match-title">${escapeHTML(nomeA)} ${escapeHTML(placarA)} x ${escapeHTML(placarB)} ${escapeHTML(nomeB)}</div>
            <div class="match-sub">Jogo #${Number(j.id)}</div>
            ${isMataMata
                    ? `<div class="muted" style="font-size:12px; margin-top:6px;">Mata-mata • Round ${Number(j.round || 1)}</div>`
                    : `<div class="muted" style="font-size:12px; margin-top:6px;">Fase de grupos • Rodada ${Number(j.round || 1)}</div>`
                }
          </div>

          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            ${status}

            <button class="btn btn-light" onclick="abrirDetalhesJogo(${Number(j.id)})">
              <i class="fa-solid fa-eye"></i> Detalhes
            </button>

            ${j.finalizado
                    ? ``
                    : `
              <div class="score-inputs" style="flex-wrap:wrap;">
                <input id="gA${Number(j.id)}" type="number" min="0" placeholder="Gols A" />
                <input id="gB${Number(j.id)}" type="number" min="0" placeholder="Gols B" />

                <button class="btn btn-light" onclick="toggleDesempate(${Number(j.id)})" title="Usar desempate (se empate no mata-mata)">
                  <i class="fa-solid fa-scale-balanced"></i> Desempate
                </button>

                <button class="btn btn-primary" onclick="finalizarJogo(${Number(j.id)})" id="btnFinalizar${Number(j.id)}">
                  <i class="fa-solid fa-check"></i> Finalizar
                </button>

                <div id="desempateBox${Number(j.id)}" style="display:none; width:100%; margin-top:10px; padding:12px; border:1px solid #eef2f6; border-radius:12px; background:#fff;">
                  <div class="muted" style="font-size:12px; margin-bottom:10px;">
                    Empate no mata-mata exige vencedor e tipo de desempate.
                  </div>

                  <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <select id="vencedorId${Number(j.id)}" style="padding:10px; border-radius:10px; border:1px solid #dbe3ef;">
                      <option value="">Selecione o vencedor...</option>
                      <option value="${Number(j.timeAId)}">${escapeHTML(j?.timeA?.nome ?? "Time A")}</option>
                      <option value="${Number(j.timeBId)}">${escapeHTML(j?.timeB?.nome ?? "Time B")}</option>
                    </select>

                    <select id="desempateTipo${Number(j.id)}" style="padding:10px; border-radius:10px; border:1px solid #dbe3ef;">
                      <option value="">Tipo de desempate...</option>
                      <option value="PENALTIS">Pênaltis</option>
                      <option value="WO">W.O.</option>
                      <option value="MELHOR_CAMPANHA">Melhor campanha</option>
                      <option value="OUTRO">Outro</option>
                    </select>

                    <input id="penaltisA${Number(j.id)}" type="number" min="0" placeholder="Pênaltis A (opcional)"
                      style="padding:10px; border-radius:10px; border:1px solid #dbe3ef; width:180px;" />
                    <input id="penaltisB${Number(j.id)}" type="number" min="0" placeholder="Pênaltis B (opcional)"
                      style="padding:10px; border-radius:10px; border:1px solid #dbe3ef; width:180px;" />
                    <input id="observacao${Number(j.id)}" type="text" placeholder="Observação (opcional)"
                      style="padding:10px; border-radius:10px; border:1px solid #dbe3ef; flex:1; min-width:220px;" />
                  </div>
                </div>
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
    const jogoId = Number(id);
    if (!Number.isFinite(jogoId)) return;

    if (busy.finalizarJogo.has(jogoId)) return;
    busy.finalizarJogo.add(jogoId);

    const btn = document.getElementById(`btnFinalizar${jogoId}`);
    setBtnLoading(btn, true);

    try {
        const golsA = Number(document.getElementById(`gA${jogoId}`)?.value);
        const golsB = Number(document.getElementById(`gB${jogoId}`)?.value);

        if (!Number.isFinite(golsA) || !Number.isFinite(golsB) || golsA < 0 || golsB < 0) {
            alert("Informe os gols corretamente (0 ou mais).");
            return;
        }

        const jogo = (campeonatoAtual?.jogos || []).find((x) => Number(x.id) === jogoId);
        const isMataMata = jogo ? jogo.grupoId === null : false;

        const payload = { golsA, golsB };

        if (isMataMata && golsA === golsB) {
            const box = document.getElementById(`desempateBox${jogoId}`);
            if (box) box.style.display = "block";

            const vencedorId = Number(document.getElementById(`vencedorId${jogoId}`)?.value || 0) || null;
            const desempateTipo = document.getElementById(`desempateTipo${jogoId}`)?.value || null;

            const penaltisAraw = document.getElementById(`penaltisA${jogoId}`)?.value;
            const penaltisBraw = document.getElementById(`penaltisB${jogoId}`)?.value;
            const observacao = (document.getElementById(`observacao${jogoId}`)?.value || "").trim() || null;

            const penaltisA = penaltisAraw !== "" ? Number(penaltisAraw) : null;
            const penaltisB = penaltisBraw !== "" ? Number(penaltisBraw) : null;

            if (!vencedorId || !desempateTipo) {
                alert("Empate no mata-mata: selecione o vencedor e o tipo de desempate.");
                return;
            }

            payload.vencedorId = vencedorId;
            payload.desempateTipo = desempateTipo;
            payload.penaltisA = Number.isFinite(penaltisA) ? penaltisA : null;
            payload.penaltisB = Number.isFinite(penaltisB) ? penaltisB : null;
            payload.observacao = observacao;
        }

        await safeFetchJSON(`${BASE_URL}/campeonato/jogo/${jogoId}/finalizar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        await carregarDetalhes(true);
    } catch (err) {
        console.error(err);
        alert(err?.message || "Não foi possível finalizar o jogo.");
    } finally {
        setBtnLoading(btn, false);
        busy.finalizarJogo.delete(jogoId);
    }
}

async function gerarMataMata() {
    if (busy.gerarMataMata) return;
    busy.gerarMataMata = true;

    const btn = document.getElementById("btnGerarMataMata");
    setBtnLoading(btn, true);

    try {
        await safeFetchJSON(`${BASE_URL}/campeonato/${campeonatoId}/gerar-mata-mata`, { method: "POST" });
        await carregarDetalhes(true);
        abrirSecao("sec-jogos");
    } catch (err) {
        console.error(err);
        alert(err?.message || "Não foi possível gerar o mata-mata.");
    } finally {
        setBtnLoading(btn, false);
        busy.gerarMataMata = false;
    }
}

// ============================
// RANKING
// ============================
async function renderRanking() {
    const wrap = document.getElementById("rankingWrap");
    const chip = document.getElementById("chipRanking");
    if (!wrap || !chip) return;

    const tipo = String(campeonatoAtual?.tipo || "").toUpperCase();

    // Mata-mata não tem ranking por pontos
    if (tipo === "MATA_MATA" || tipo === "MATA-MATA") {
        chip.textContent = "—";
        wrap.innerHTML = `
      <div class="empty">
        No mata-mata, não existe ranking por pontos. Use a aba <strong>Chaveamento</strong> para acompanhar o campeonato.
      </div>
    `;
        return;
    }

    // Ranking por grupos
    if (tipo === "GRUPOS" || tipo === "GRUPOS_MATA_MATA" || tipo === "COPA") {
        try {
            // ✅ rota correta (e seu routes.js precisa estar corrigido)
            const grupos = await safeFetchJSON(`${BASE_URL}/campeonato/${campeonatoId}/ranking-grupos`);

            const totalTimes = (grupos || []).reduce((acc, g) => acc + (g.tabela?.length || 0), 0);
            chip.textContent = `${totalTimes} time(s)`;

            if (!grupos?.length) {
                wrap.innerHTML = `<div class="empty">Sem grupos ainda. Gere os grupos para ver a classificação.</div>`;
                return;
            }

            wrap.innerHTML = grupos
                .map((g) => {
                    const rows = g.tabela || [];
                    if (!rows.length) {
                        return `
              <div style="margin-bottom:14px;">
                <div style="font-weight:800; margin:10px 0;">${escapeHTML(g.nome)}</div>
                <div class="empty">Nenhum time no grupo.</div>
              </div>
            `;
                    }

                    return `
            <div style="margin-bottom:14px;">
              <div style="font-weight:800; margin:10px 0;">${escapeHTML(g.nome)}</div>

              <div class="item" style="font-weight:700; background:#f7f9fc;">
                <div style="width:34px;">#</div>
                <div style="flex:1;">Time</div>
                <div style="width:50px; text-align:center;">PTS</div>
                <div style="width:40px; text-align:center;">J</div>
                <div style="width:40px; text-align:center;">V</div>
                <div style="width:40px; text-align:center;">E</div>
                <div style="width:40px; text-align:center;">D</div>
                <div style="width:55px; text-align:center;">GP</div>
                <div style="width:55px; text-align:center;">GC</div>
                <div style="width:55px; text-align:center;">SG</div>
              </div>

              ${rows
                            .map(
                                (r, i) => `
                  <div class="item">
                    <div style="width:34px;">${i + 1}</div>
                    <div style="flex:1;"><strong>${escapeHTML(r.nome)}</strong></div>
                    <div style="width:50px; text-align:center;"><strong>${Number(r.pontos ?? 0)}</strong></div>
                    <div style="width:40px; text-align:center;">${Number(r.jogos ?? 0)}</div>
                    <div style="width:40px; text-align:center;">${Number(r.vitorias ?? 0)}</div>
                    <div style="width:40px; text-align:center;">${Number(r.empates ?? 0)}</div>
                    <div style="width:40px; text-align:center;">${Number(r.derrotas ?? 0)}</div>
                    <div style="width:55px; text-align:center;">${Number(r.golsPro ?? 0)}</div>
                    <div style="width:55px; text-align:center;">${Number(r.golsContra ?? 0)}</div>
                    <div style="width:55px; text-align:center;">${Number(r.saldo ?? 0)}</div>
                  </div>
                `
                            )
                            .join("")}
            </div>
          `;
                })
                .join("");

            return;
        } catch (err) {
            console.error(err);
            wrap.innerHTML = `<div class="empty">Erro ao carregar ranking por grupos.</div>`;
            chip.textContent = "—";
            return;
        }
    }

    // Liga / pontos corridos = ranking geral
    try {
        const ranking = await safeFetchJSON(`${BASE_URL}/campeonato/${campeonatoId}/ranking`);
        chip.textContent = `${(ranking || []).length} time(s)`;

        if (!ranking?.length) {
            wrap.innerHTML = `<div class="empty">Sem dados no ranking ainda.</div>`;
            return;
        }

        wrap.innerHTML = `
      <div class="item" style="font-weight:700; background:#f7f9fc;">
        <div style="width:34px;">#</div>
        <div style="flex:1;">Time</div>
        <div style="width:50px; text-align:center;">PTS</div>
        <div style="width:40px; text-align:center;">J</div>
        <div style="width:40px; text-align:center;">V</div>
        <div style="width:40px; text-align:center;">E</div>
        <div style="width:40px; text-align:center;">D</div>
        <div style="width:55px; text-align:center;">GP</div>
        <div style="width:55px; text-align:center;">GC</div>
        <div style="width:55px; text-align:center;">SG</div>
      </div>
      ${(ranking || [])
                .map(
                    (r, i) => `
          <div class="item">
            <div style="width:34px;">${i + 1}</div>
            <div style="flex:1;"><strong>${escapeHTML(r.nome)}</strong></div>
            <div style="width:50px; text-align:center;"><strong>${Number(r.pontos ?? 0)}</strong></div>
            <div style="width:40px; text-align:center;">${Number(r.jogos ?? 0)}</div>
            <div style="width:40px; text-align:center;">${Number(r.vitorias ?? 0)}</div>
            <div style="width:40px; text-align:center;">${Number(r.empates ?? 0)}</div>
            <div style="width:40px; text-align:center;">${Number(r.derrotas ?? 0)}</div>
            <div style="width:55px; text-align:center;">${Number(r.golsPro ?? 0)}</div>
            <div style="width:55px; text-align:center;">${Number(r.golsContra ?? 0)}</div>
            <div style="width:55px; text-align:center;">${Number(r.saldo ?? 0)}</div>
          </div>
        `
                )
                .join("")}
    `;
    } catch (err) {
        console.error(err);
        wrap.innerHTML = `<div class="empty">Erro ao carregar ranking.</div>`;
        chip.textContent = "—";
    }
}

// ============================
// FINAL / CHAVEAMENTO
// ============================
async function renderFinal(c) {
    const finalInfo = document.getElementById("finalInfo");
    const btnVerChaveamento = document.getElementById("btnVerChaveamento");
    if (!finalInfo || !btnVerChaveamento) return;

    if (c.faseAtual === "FINALIZADO") {
        const campeao = c?.campeao?.nome || "—";
        const vice = c?.viceCampeao?.nome || "—";

        finalInfo.innerHTML = `
      <div style="border:1px solid #cfead5;background:#f2fff5;border-radius:14px;padding:14px;">
        <div style="font-weight:800;font-size:14px;margin-bottom:6px;">🏆 Campeonato finalizado</div>
        <div style="margin:6px 0;"><strong>Campeão:</strong> ${escapeHTML(campeao)}</div>
        <div style="margin:6px 0;"><strong>Vice:</strong> ${escapeHTML(vice)}</div>
      </div>
    `;
        btnVerChaveamento.style.display = "inline-flex";
        return;
    }

    try {
        const jogos = await safeFetchJSON(`${BASE_URL}/campeonato/${campeonatoId}/bracket`);
        const temBracket = Array.isArray(jogos) && jogos.length > 0;

        if (!temBracket) {
            finalInfo.innerHTML = `<div class="empty">Chaveamento ainda não gerado. Gere o mata-mata para visualizar.</div>`;
            btnVerChaveamento.style.display = "none";
            return;
        }

        finalInfo.innerHTML = `<div class="empty">Chaveamento disponível. Você já pode abrir a tela do chaveamento.</div>`;
        btnVerChaveamento.style.display = "inline-flex";
    } catch (err) {
        console.error(err);
        finalInfo.innerHTML = `<div class="empty">Não consegui verificar o chaveamento agora. Clique em Atualizar.</div>`;
        btnVerChaveamento.style.display = "inline-flex";
    }
}

// ============================
// Navegação entre páginas
// ============================
function abrirBracket() {
    location.href = `campeonato-bracket.html?campeonatoId=${campeonatoId}`;
}

function abrirDetalhesJogo(jogoId) {
    location.href = `jogo-detalhe.html?jogoId=${Number(jogoId)}`;
}

function toggleDesempate(jogoId) {
    const id = Number(jogoId);
    const box = document.getElementById(`desempateBox${id}`);
    if (!box) return;
    box.style.display = box.style.display === "none" ? "block" : "none";
}

// ✅ deixa as funções acessíveis pros onclick do HTML
window.abrirDetalhesJogo = abrirDetalhesJogo;
window.toggleDesempate = toggleDesempate;
window.finalizarJogo = finalizarJogo;
window.abrirBracket = abrirBracket;
