const BASE_URL = "https://goplay-dzlr.onrender.com";

let campeonatoId = null;
let campeonatoAtual = null;

const busy = {
    carregar: false,
    addTime: false,
    criarTime: false,
    gerarLiga: false,
    finalizarJogo: new Set(),
};

/* =====================================================
   INIT
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
    campeonatoId = new URLSearchParams(location.search).get("campeonatoId");

    if (!campeonatoId) {
        alert("Campeonato inválido");
        return;
    }

    document.querySelectorAll(".nav-pill").forEach((btn) => {
        btn.addEventListener("click", () => abrirSecao(btn.dataset.target));
    });

    const btnVoltar = document.getElementById("btnVoltar");
    if (btnVoltar) btnVoltar.addEventListener("click", () => location.href = "campeonatos.html");

    const btnAtualizar = document.getElementById("btnAtualizar");
    if (btnAtualizar) btnAtualizar.addEventListener("click", () => carregarDetalhes(true));

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

    const btnGerarJogosGrupos = document.getElementById("btnGerarJogosGrupos");
    if (btnGerarJogosGrupos) {
        btnGerarJogosGrupos.addEventListener("click", gerarLiga);
    }

    esconderElementosAntigos();

    carregarDetalhes();
});

/* =====================================================
   HELPERS
===================================================== */

function abrirSecao(idSecao) {
    document.querySelectorAll(".nav-pill").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));

    const pill = document.querySelector(`.nav-pill[data-target="${idSecao}"]`);
    const sec = document.getElementById(idSecao);

    if (pill) pill.classList.add("active");
    if (sec) sec.classList.add("active");

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function esconderElementosAntigos() {
    const btnGerarGrupos = document.getElementById("btnGerarGrupos");
    if (btnGerarGrupos) btnGerarGrupos.style.display = "none";

    const btnGerarMataMata = document.getElementById("btnGerarMataMata");
    if (btnGerarMataMata) btnGerarMataMata.style.display = "none";

    const btnVerChaveamento = document.getElementById("btnVerChaveamento");
    if (btnVerChaveamento) btnVerChaveamento.style.display = "none";

    const btnAbrirBracket = document.getElementById("btnAbrirBracket");
    if (btnAbrirBracket) btnAbrirBracket.style.display = "none";
}

function escapeHTML(str) {
    return String(str ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function setBtnLoading(btn, loading) {
    if (!btn) return;

    btn.disabled = !!loading;

    if (loading) {
        btn.dataset.oldHTML = btn.innerHTML;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Aguarde...`;
    } else {
        btn.innerHTML = btn.dataset.oldHTML || btn.innerHTML;
        delete btn.dataset.oldHTML;
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
        throw new Error(data?.error || data?.message || text || `Erro HTTP ${res.status}`);
    }

    return data;
}

function formatDate(value) {
    if (!value) return "—";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleDateString("pt-BR");
}

function getStatusLabel(status) {
    const s = String(status || "").toUpperCase();

    if (s === "EM_CRIACAO") return "Em criação";
    if (s === "INSCRICOES_ABERTAS") return "Inscrições abertas";
    if (s === "EM_ANDAMENTO") return "Em andamento";
    if (s === "FINALIZADO") return "Finalizado";

    return status || "—";
}

/* =====================================================
   CARREGAMENTO
===================================================== */

async function carregarDetalhes(force = false) {
    if (busy.carregar && !force) return;

    busy.carregar = true;

    const btnAtualizar = document.getElementById("btnAtualizar");
    setBtnLoading(btnAtualizar, true);

    try {
        const c = await safeFetchJSON(`${BASE_URL}/campeonato/${campeonatoId}`);
        campeonatoAtual = c;

        const titulo = document.getElementById("titulo");
        if (titulo) titulo.textContent = c.nome || "Campeonato";

        renderCampeonatoInfo(c);
        await carregarSelectTimes();
        renderTimes(c);
        renderJogos(c);
        await renderRanking(c);
        renderAreaFinal(c);
        renderAreaGrupos(c);
        ajustarAcoes(c);

    } catch (err) {
        console.error(err);
        alert(err?.message || "Erro ao carregar campeonato");
    } finally {
        setBtnLoading(btnAtualizar, false);
        busy.carregar = false;
    }
}

/* =====================================================
   INFO
===================================================== */

function renderCampeonatoInfo(c) {
    const el = document.getElementById("campeonatoInfo");
    if (!el) return;

    const totalTimes = c.times?.length || 0;
    const totalJogos = c.jogos?.length || 0;
    const jogosFinalizados = (c.jogos || []).filter(j => j.finalizado).length;
    const jogosPendentes = totalJogos - jogosFinalizados;

    el.innerHTML = `
        <div class="item">
            <strong>Nome:</strong>
            ${escapeHTML(c.nome || "—")}
        </div>

        <div class="item">
            <strong>Formato:</strong>
            Liga Ida e Volta
        </div>

        <div class="item">
            <strong>Times:</strong>
            ${totalTimes}/${c.maxTimes}
        </div>

        <div class="item">
            <strong>Jogos:</strong>
            ${totalJogos}/${(c.maxTimes / 4) * 12}
        </div>

        <div class="item">
            <strong>Finalizados:</strong>
            ${jogosFinalizados}
        </div>

        <div class="item">
            <strong>Pendentes:</strong>
            ${jogosPendentes}
        </div>

        <div class="item">
            <strong>Status:</strong>
            ${escapeHTML(getStatusLabel(c.status))}
        </div>

        <div class="item">
            <strong>Fase atual:</strong>
            ${escapeHTML(c.faseAtual || "LIGA")}
        </div>

        <div class="item">
            <strong>Início:</strong>
            ${escapeHTML(formatDate(c.dataInicio))}
        </div>

        <div class="item">
            <strong>Fim:</strong>
            ${escapeHTML(formatDate(c.dataFim))}
        </div>
    `;
}

/* =====================================================
   AÇÕES
===================================================== */

function ajustarAcoes(c) {
    const totalTimes = c.times?.length || 0;
    const totalJogos = c.jogos?.length || 0;

    const btnGerarJogosGrupos = document.getElementById("btnGerarJogosGrupos");

    if (btnGerarJogosGrupos) {
        if (totalTimes === c.maxTimes && totalJogos === 0) {
            btnGerarJogosGrupos.style.display = "inline-flex";
            btnGerarJogosGrupos.innerHTML = `
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                Gerar Liga Ida e Volta
            `;
        } else {
            btnGerarJogosGrupos.style.display = "none";
        }
    }

    ensureNextStepCTA(c);
}

function ensureNextStepCTA(c) {
    const secTimes = document.getElementById("sec-times");
    if (!secTimes) return;

    let wrap = document.getElementById("nextStepWrap");

    if (!wrap) {
        wrap = document.createElement("div");
        wrap.id = "nextStepWrap";
        wrap.style.marginTop = "14px";
        secTimes.appendChild(wrap);
    }

    const totalTimes = c.times?.length || 0;
    const totalJogos = c.jogos?.length || 0;
    const jogosFinalizados = (c.jogos || []).filter(j => j.finalizado).length;

    if (totalJogos > 0) {
        wrap.innerHTML = `
            <div class="empty">
                Liga gerada com sucesso. 
                Jogos finalizados: <strong>${jogosFinalizados}/${totalJogos}</strong>.
                Agora acompanhe a aba <strong>Jogos</strong> e o <strong>Ranking</strong>.
            </div>
        `;
        return;
    }

    if (totalTimes < c.maxTimes) {
        wrap.innerHTML = `
            <div class="empty">
                Adicione exatamente 4 times para liberar a geração da Liga Ida e Volta. 
                <strong>${totalTimes}/${c.maxTimes}</strong>
            </div>
        `;
        return;
    }

    wrap.innerHTML = `
        <div style="border:1px solid #e6edf6;background:#fff;border-radius:14px;padding:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <div>
                <div style="font-weight:800;">
                    <i class="fa-solid fa-circle-play"></i> Próximo passo
                </div>
                <div class="muted" style="margin-top:4px;">
                    Times completos. Gere os jogos da Liga Ida e Volta.
                </div>
            </div>

            <button class="btn btn-primary" onclick="gerarLiga()">
                <i class="fa-solid fa-wand-magic-sparkles"></i> Gerar Liga
            </button>
        </div>
    `;
}

/* =====================================================
   TIMES
===================================================== */

function renderTimes(c) {
    const div = document.getElementById("listaTimes");
    const total = c.times?.length || 0;

    const chip = document.getElementById("chipTimes");
    if (chip) chip.textContent = `${total}/${c.maxTimes} time(s)`

    const btnAdd = document.getElementById("btnAddTime");
    const btnCriar = document.getElementById("btnCriarEAddTime");
    const select = document.getElementById("timeId");
    const inputNovo = document.getElementById("novoTimeNome");

    const lotado = total >= c.maxTimes || (c.jogos?.length || 0) > 0;

    if (btnAdd) btnAdd.disabled = lotado;
    if (btnCriar) btnCriar.disabled = lotado;
    if (select) select.disabled = lotado;
    if (inputNovo) inputNovo.disabled = lotado;

    if (!div) return;

    if (!total) {
        div.innerHTML = `<div class="empty">Nenhum time adicionado ainda.</div>`;
        return;
    }

    div.innerHTML = (c.times || []).map((t, index) => `
        <div class="item">
            <div>
                <strong>${index + 1}. ${escapeHTML(t?.time?.nome ?? "Time")}</strong>
                <div class="muted" style="font-size:12px;">Inscrito na liga</div>
            </div>
            <span class="chip">OK</span>
        </div>
    `).join("");
}

async function carregarSelectTimes() {
    const select = document.getElementById("timeId");
    if (!select) return;

    try {
        const societyId = campeonatoAtual?.societyId;
        if (!societyId) throw new Error("societyId não encontrado.");

        const times = await safeFetchJSON(`${BASE_URL}/time/society/${societyId}`);

        const inscritos = new Set(
            (campeonatoAtual?.times || [])
                .map((t) => Number(t?.time?.id ?? t?.timeId))
                .filter(Boolean)
        );

        select.innerHTML = `<option value="">Selecione...</option>`;

        (times || [])
            .filter((t) => !inscritos.has(Number(t.id)))
            .forEach((t) => {
                select.innerHTML += `<option value="${Number(t.id)}">${escapeHTML(t.nome)}</option>`;
            });

        if (select.options.length === 1) {
            select.innerHTML = `<option value="">Nenhum time disponível</option>`;
        }

    } catch (err) {
        console.error(err);
        select.innerHTML = `<option value="">Erro ao carregar times</option>`;
    }
}

async function addTime() {
    if (busy.addTime) return;

    busy.addTime = true;

    const btn = document.getElementById("btnAddTime");
    setBtnLoading(btn, true);

    try {
        const timeId = document.getElementById("timeId")?.value;

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
        setBtnLoading(btn, false);
        busy.addTime = false;
    }
}

async function criarEAdicionarTime() {
    if (busy.criarTime) return;

    busy.criarTime = true;

    const btn = document.getElementById("btnCriarEAddTime");
    setBtnLoading(btn, true);

    try {
        const input = document.getElementById("novoTimeNome");
        const nome = (input?.value || "").trim();

        if (!nome) {
            alert("Digite o nome do time.");
            return;
        }

        const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado") || "null");

        if (!usuarioLogado?.id) {
            alert("Sessão expirada.");
            return;
        }

        const societyId = campeonatoAtual?.societyId;

        const novoTime = await safeFetchJSON(`${BASE_URL}/time`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nome,
                societyId: Number(societyId),
                donoId: Number(usuarioLogado.id),
            }),
        });

        await safeFetchJSON(`${BASE_URL}/campeonato/${campeonatoId}/add-time`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ timeId: Number(novoTime.id) }),
        });

        input.value = "";
        await carregarDetalhes(true);

    } catch (err) {
        console.error(err);
        alert(err?.message || "Erro ao criar e adicionar time.");
    } finally {
        setBtnLoading(btn, false);
        busy.criarTime = false;
    }
}

/* =====================================================
   GRUPOS / FINAL
===================================================== */

function renderAreaGrupos(c) {

    const listaGrupos = document.getElementById("listaGrupos");
    const chipGrupos = document.getElementById("chipGrupos");

    if (!listaGrupos) return;

    const grupos = c.grupos || [];

    if (chipGrupos) {
        chipGrupos.textContent = `${grupos.length} grupo(s)`;
    }

    if (!grupos.length) {

        listaGrupos.innerHTML = `
            <div class="empty">
                Nenhum grupo gerado ainda.
            </div>
        `;

        return;
    }

    listaGrupos.innerHTML = grupos.map((grupo, index) => {

        const times = grupo.timesGrupo || [];

        return `
            <div style="
                background:#fff;
                border:1px solid #e5e7eb;
                border-radius:18px;
                padding:18px;
                margin-bottom:18px;
            ">

                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    margin-bottom:14px;
                ">

                    <h3 style="
                        margin:0;
                        font-size:18px;
                        font-weight:900;
                        color:#052845;
                    ">
                        Grupo ${grupo.nome || String.fromCharCode(65 + index)}
                    </h3>

                    <span class="chip">
                        ${times.length} times
                    </span>

                </div>

                <div style="
                    display:flex;
                    flex-direction:column;
                    gap:10px;
                ">

                    ${times.map((t, idx) => `

                        <div style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            background:#f8fafc;
                            border-radius:12px;
                            padding:12px;
                        ">

                            <div>
                                <strong>
                                    ${idx + 1}. ${t.time?.nome || "Time"}
                                </strong>
                            </div>

                            <span class="chip">
                                Liga
                            </span>

                        </div>

                    `).join("")}

                </div>

                <div style="
                    margin-top:14px;
                    padding-top:14px;
                    border-top:1px solid #eef2f7;
                    font-size:14px;
                    color:#64748b;
                ">
                    Este grupo gera automaticamente 12 jogos ida e volta.
                </div>

            </div>
        `;

    }).join("");
}

function renderAreaFinal(c) {
    const finalInfo = document.getElementById("finalInfo");
    const chipFinal = document.getElementById("chipFinal");

    if (chipFinal) {
        chipFinal.textContent = c.status === "FINALIZADO" ? "Finalizado" : "Por pontos";
    }

    if (!finalInfo) return;

    if (c.status === "FINALIZADO") {
        finalInfo.innerHTML = `
            <div class="empty">
                🏆 Campeonato finalizado. O campeão será definido pela liderança da tabela.
            </div>
        `;
        return;
    }

    finalInfo.innerHTML = `
        <div class="empty">
            Este campeonato ainda está em formato de <strong>pontos corridos</strong>.
            Após estabilizarmos a liga, podemos adicionar semifinal e final.
        </div>
    `;
}

/* =====================================================
   GERAR LIGA
===================================================== */

async function gerarLiga() {
    if (busy.gerarLiga) return;

    busy.gerarLiga = true;

    const btn = document.getElementById("btnGerarJogosGrupos");
    setBtnLoading(btn, true);

    try {
        await safeFetchJSON(`${BASE_URL}/campeonato/${campeonatoId}/generate-league`, {
            method: "POST",
        });

        await carregarDetalhes(true);
        abrirSecao("sec-jogos");

    } catch (err) {
        console.error(err);
        alert(err?.message || "Não foi possível gerar a liga.");
    } finally {
        setBtnLoading(btn, false);
        busy.gerarLiga = false;
    }
}

/* =====================================================
   JOGOS
===================================================== */

function renderJogos(c) {
    const jogosDiv = document.getElementById("listaJogos");
    const chip = document.getElementById("chipJogos");

    const jogos = [...(c.jogos || [])].sort((a, b) => {
        if ((a.rodada || 0) !== (b.rodada || 0)) return (a.rodada || 0) - (b.rodada || 0);
        return (a.id || 0) - (b.id || 0);
    });

    if (chip) chip.textContent =
        `${jogos.length}/${(c.maxTimes / 4) * 12} jogo(s)`;

    if (!jogosDiv) return;

    if (!jogos.length) {
        jogosDiv.innerHTML = `
            <div class="empty">
                Nenhum jogo gerado ainda.
            </div>
        `;
        return;
    }

    const agrupados = {};

    jogos.forEach((j) => {
        const rodada = j.rodada || 1;
        if (!agrupados[rodada]) agrupados[rodada] = [];
        agrupados[rodada].push(j);
    });

    jogosDiv.innerHTML = Object.keys(agrupados)
        .sort((a, b) => Number(a) - Number(b))
        .map((rodada) => {
            const jogosRodada = agrupados[rodada];

            return `
                <div class="rodada-box" style="margin-bottom:22px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
                        <h3 style="margin:0;color:#052845;font-size:18px;font-weight:900;">
                            Rodada ${rodada}
                        </h3>
                        <span class="chip">${jogosRodada.length} jogo(s)</span>
                    </div>

                    <div style="display:flex;flex-direction:column;gap:12px;">
                        ${jogosRodada.map(renderJogoCard).join("")}
                    </div>
                </div>
            `;
        }).join("");
}

function renderJogoCard(j) {
    const isVolta = j.tipoJogo === "VOLTA";
    const badge = isVolta ? "🔁 Volta" : "➡️ Ida";

    const timeA = j.timeA?.nome || "Time A";
    const timeB = j.timeB?.nome || "Time B";

    const statusLabel = j.finalizado ? "Finalizado" : "Em aberto";
    const statusColor = j.finalizado ? "#065f46" : "#92400e";
    const statusBg = j.finalizado ? "#ecfdf5" : "#fffbeb";

    return `
        <div class="match" style="
            background:#fff;
            border:1px solid #e8eef7;
            border-radius:18px;
            padding:16px;
            box-shadow:0 6px 18px rgba(15,23,42,.05);
        ">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <span class="chip">${badge}</span>
                    <span class="chip" style="background:${statusBg};color:${statusColor};">
                        ${statusLabel}
                    </span>
                </div>

                <button class="btn btn-light" onclick="abrirDetalhesJogo(${Number(j.id)})">
                    <i class="fa-solid fa-eye"></i> Detalhes
                </button>
            </div>

            <div style="
                display:grid;
                grid-template-columns:1fr auto 1fr;
                align-items:center;
                gap:14px;
                margin:10px 0 14px;
            ">
                <div style="font-weight:900;color:#052845;font-size:16px;text-align:right;">
                    ${escapeHTML(timeA)}
                </div>

                <div style="
                    min-width:120px;
                    text-align:center;
                    font-weight:900;
                    font-size:22px;
                    background:#f8fafc;
                    border:1px solid #e5e7eb;
                    border-radius:14px;
                    padding:10px 14px;
                    color:#052845;
                ">
                    ${j.finalizado ? `${j.golsA ?? 0} x ${j.golsB ?? 0}` : "x"}
                </div>

                <div style="font-weight:900;color:#052845;font-size:16px;">
                    ${escapeHTML(timeB)}
                </div>
            </div>

            ${j.finalizado ? "" : `
                <div style="
                    display:flex;
                    justify-content:flex-end;
                    align-items:center;
                    gap:10px;
                    flex-wrap:wrap;
                    border-top:1px solid #eef2f6;
                    padding-top:14px;
                ">
                    <input
                        id="gA${Number(j.id)}"
                        type="number"
                        min="0"
                        placeholder="Gols ${escapeHTML(timeA)}"
                        style="width:150px;padding:11px;border-radius:12px;border:1px solid #dbe3ef;"
                    />

                    <span style="font-weight:900;">x</span>

                    <input
                        id="gB${Number(j.id)}"
                        type="number"
                        min="0"
                        placeholder="Gols ${escapeHTML(timeB)}"
                        style="width:150px;padding:11px;border-radius:12px;border:1px solid #dbe3ef;"
                    />

                    <button class="btn btn-primary" onclick="finalizarJogo(${Number(j.id)})" id="btnFinalizar${Number(j.id)}">
                        <i class="fa-solid fa-check"></i> Finalizar
                    </button>
                </div>
            `}
        </div>
    `;
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
            alert("Informe os gols corretamente.");
            return;
        }

        await safeFetchJSON(`${BASE_URL}/jogo/${jogoId}/finalizar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ golsA, golsB }),
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

/* =====================================================
   RANKING
===================================================== */
function renderRanking(campeonato) {

    const container =
        document.getElementById("tab-ranking");

    const grupos =
        campeonato.grupos || [];

    if (!grupos.length) {

        container.innerHTML = `
            <div class="empty-state">
                Nenhum grupo gerado ainda.
            </div>
        `;

        return;
    }

    container.innerHTML = grupos.map(grupo => {

        const rankingGrupo =
            (campeonato.tabela || [])
                .filter(t =>
                    grupo.timesGrupo.some(
                        tg => tg.timeId === t.timeId
                    )
                )
                .sort((a, b) => {

                    if (b.pontos !== a.pontos)
                        return b.pontos - a.pontos;

                    if (b.saldoGols !== a.saldoGols)
                        return b.saldoGols - a.saldoGols;

                    return b.golsPro - a.golsPro;
                });

        return `
            <div class="grupo-ranking-card">

                <div class="grupo-ranking-header">

                    <div>
                        <h3>${grupo.nome}</h3>
                        <span>
                            ${rankingGrupo.length} times
                        </span>
                    </div>

                </div>

                <div class="ranking-table">

                    <div class="ranking-head">
                        <div>#</div>
                        <div>Time</div>
                        <div>PTS</div>
                        <div>J</div>
                        <div>V</div>
                        <div>E</div>
                        <div>D</div>
                        <div>GP</div>
                        <div>GC</div>
                        <div>SG</div>
                    </div>

                    ${rankingGrupo.map((item, index) => `

                        <div class="ranking-row">

                            <div>${index + 1}</div>

                            <div>
                                ${item.time?.nome || "-"}
                            </div>

                            <div>${item.pontos}</div>
                            <div>${item.jogos}</div>
                            <div>${item.vitorias}</div>
                            <div>${item.empates}</div>
                            <div>${item.derrotas}</div>
                            <div>${item.golsPro}</div>
                            <div>${item.golsContra}</div>
                            <div>${item.saldoGols}</div>

                        </div>

                    `).join("")}

                </div>

            </div>
        `;

    }).join("");
}

/* =====================================================
   NAVEGAÇÃO
===================================================== */

function abrirDetalhesJogo(jogoId) {
    location.href = `jogo-detalhe.html?jogoId=${Number(jogoId)}`;
}

window.finalizarJogo = finalizarJogo;
window.abrirDetalhesJogo = abrirDetalhesJogo;
window.gerarLiga = gerarLiga;