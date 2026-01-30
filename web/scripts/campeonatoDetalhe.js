/************************************************************
 * campeonatoDetalhe.js — COMPLETO (melhorado / robusto)
 * - Ranking (tabelaCampeonato)
 * - Proteção contra duplo clique / requisições concorrentes
 * - Render seguro (escape HTML)
 * - Mensagens melhores e fallbacks
 * - Mantém seu layout / ids do HTML
 ************************************************************/
const BASE_URL = "http://localhost:3000";

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
    finalizarJogo: new Set(), // ids em andamento
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

function showInlineMessage(el, type, title, desc) {
    if (!el) return;
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
        <div style="font-weight:700;">${escapeHTML(title)}</div>
        ${desc ? `<div class="muted" style="margin-top:4px;">${escapeHTML(desc)}</div>` : ""}
      </div>
    </div>
  `;
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

        const titulo = document.getElementById("titulo");
        if (titulo) titulo.textContent = c.nome || "Campeonato";

        await carregarSelectTimes();

        renderTimes(c);
        renderGrupos(c);
        renderJogos(c);

        await renderRanking();
        await renderFinal(c);

        ajustarAcoesSemFluxo(c);
    } catch (err) {
        console.error(err);
        alert(err?.message || "Erro ao carregar campeonato");
    } finally {
        setLoading(false);
        setBtnLoading(btnAtualizar, false);
        busy.carregar = false;
    }
}

function ajustarAcoesSemFluxo(c) {
    const btnGerarGrupos = document.getElementById("btnGerarGrupos");
    const btnGerarJogosGrupos = document.getElementById("btnGerarJogosGrupos");
    const btnGerarMataMata = document.getElementById("btnGerarMataMata");

    if (!btnGerarGrupos || !btnGerarJogosGrupos || !btnGerarMataMata) return;

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

    const chip = document.getElementById("chipTimes");
    if (chip) chip.textContent = `${total} time(s)`;

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

        // inscritos: usa time.id OU timeId (caso venha diferente)
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
        alert(err?.message || "Não foi possível gerar os jogos dos grupos.");
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
        div.innerHTML = `<div class="empty">Nenhum jogo disponível no momento.</div>`;
        return;
    }

    // Render
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
            <div class="match-title">${escapeHTML(nomeA)} ${escapeHTML(placarA)} x ${escapeHTML(
                placarB
            )} ${escapeHTML(nomeB)}</div>
            <div class="match-sub">Jogo #${Number(j.id)}</div>
            ${isMataMata
                    ? `<div class="muted" style="font-size:12px; margin-top:6px;">Mata-mata • Round ${Number(j.round || 1)}</div>`
                    : `<div class="muted" style="font-size:12px; margin-top:6px;">Fase de grupos</div>`
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

                <button class="btn btn-light" onclick="toggleDesempate(${Number(
                        j.id
                    )})" title="Usar desempate (se empate no mata-mata)">
                  <i class="fa-solid fa-scale-balanced"></i> Desempate
                </button>

                <button class="btn btn-primary" onclick="finalizarJogo(${Number(j.id)})" id="btnFinalizar${Number(
                        j.id
                    )}">
                  <i class="fa-solid fa-check"></i> Finalizar
                </button>

                <!-- ✅ BLOCO DESEMPATE -->
                <div id="desempateBox${Number(
                        j.id
                    )}" style="display:none; width:100%; margin-top:10px; padding:12px; border:1px solid #eef2f6; border-radius:12px; background:#fff;">
                  <div class="muted" style="font-size:12px; margin-bottom:10px;">
                    Empate no mata-mata exige vencedor e tipo de desempate.
                  </div>

                  <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <select id="vencedorId${Number(
                        j.id
                    )}" style="padding:10px; border-radius:10px; border:1px solid #dbe3ef;">
                      <option value="">Selecione o vencedor...</option>
                      <option value="${Number(j.timeAId)}">${escapeHTML(j?.timeA?.nome ?? "Time A")}</option>
                      <option value="${Number(j.timeBId)}">${escapeHTML(j?.timeB?.nome ?? "Time B")}</option>
                    </select>

                    <select id="desempateTipo${Number(
                        j.id
                    )}" style="padding:10px; border-radius:10px; border:1px solid #dbe3ef;">
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

        // Descobre se é mata-mata via campeonatoAtual
        const jogo = (campeonatoAtual?.jogos || []).find((x) => Number(x.id) === jogoId);
        const isMataMata = jogo ? jogo.grupoId === null : false;

        const payload = { golsA, golsB };

        // empate no mata-mata exige extra
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
        abrirSecao("sec-final");
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
      ${ranking
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
            showInlineMessage(
                finalInfo,
                "info",
                "Chaveamento ainda não gerado",
                "Quando você gerar o mata-mata, o chaveamento aparece aqui para visualização."
            );
            btnVerChaveamento.style.display = "none";
            return;
        }

        showInlineMessage(finalInfo, "success", "Chaveamento disponível", "Você já pode abrir a tela do chaveamento.");
        btnVerChaveamento.style.display = "inline-flex";
    } catch (err) {
        console.error(err);
        showInlineMessage(finalInfo, "warn", "Não consegui verificar o chaveamento agora", "Clique em “Atualizar”.");
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
