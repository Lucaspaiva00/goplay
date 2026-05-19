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
    if (btnGerarJogosGrupos) btnGerarJogosGrupos.addEventListener("click", gerarLiga);

    const btnGerarGrupos = document.getElementById("btnGerarGrupos");
    if (btnGerarGrupos) btnGerarGrupos.style.display = "none";

    const btnGerarMataMata = document.getElementById("btnGerarMataMata");
    if (btnGerarMataMata) btnGerarMataMata.style.display = "none";

    const btnVerChaveamento = document.getElementById("btnVerChaveamento");
    if (btnVerChaveamento) btnVerChaveamento.style.display = "none";

    const btnAbrirBracket = document.getElementById("btnAbrirBracket");
    if (btnAbrirBracket) btnAbrirBracket.style.display = "none";

    carregarDetalhes();
});

function abrirSecao(idSecao) {
    document.querySelectorAll(".nav-pill").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));

    const pill = document.querySelector(`.nav-pill[data-target="${idSecao}"]`);
    const sec = document.getElementById(idSecao);

    if (pill) pill.classList.add("active");
    if (sec) sec.classList.add("active");

    window.scrollTo({ top: 0, behavior: "smooth" });
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

function renderCampeonatoInfo(c) {
    const el = document.getElementById("campeonatoInfo");
    if (!el) return;

    const fmtData = (d) => {
        if (!d) return "—";
        const dt = new Date(d);
        if (Number.isNaN(dt.getTime())) return "—";
        return dt.toLocaleDateString("pt-BR");
    };

    el.innerHTML = `
        <div class="item"><strong>Nome:</strong> ${escapeHTML(c.nome || "—")}</div>
        <div class="item"><strong>Tipo:</strong> Liga ida e volta</div>
        <div class="item"><strong>Times:</strong> ${(c.times?.length || 0)} / ${escapeHTML(c.maxTimes || 4)}</div>
        <div class="item"><strong>Jogos:</strong> ${(c.jogos?.length || 0)} / 12</div>
        <div class="item"><strong>Status:</strong> ${escapeHTML(c.status || "—")}</div>
        <div class="item"><strong>Fase atual:</strong> ${escapeHTML(c.faseAtual || "LIGA")}</div>
        <div class="item"><strong>Início:</strong> ${escapeHTML(fmtData(c.dataInicio))}</div>
        <div class="item"><strong>Fim:</strong> ${escapeHTML(fmtData(c.dataFim))}</div>
    `;
}

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
        ajustarAcoes(c);

        const listaGrupos = document.getElementById("listaGrupos");
        if (listaGrupos) {
            listaGrupos.innerHTML = `<div class="empty">Este campeonato é Liga Ida e Volta. Não usa grupos.</div>`;
        }

        const chipGrupos = document.getElementById("chipGrupos");
        if (chipGrupos) chipGrupos.textContent = "Não usa grupos";

        const finalInfo = document.getElementById("finalInfo");
        if (finalInfo) {
            finalInfo.innerHTML = `<div class="empty">Este campeonato não possui chaveamento. A classificação é por pontos.</div>`;
        }

    } catch (err) {
        console.error(err);
        alert(err?.message || "Erro ao carregar campeonato");
    } finally {
        setBtnLoading(btnAtualizar, false);
        busy.carregar = false;
    }
}

function ajustarAcoes(c) {
    const totalTimes = c.times?.length || 0;
    const totalJogos = c.jogos?.length || 0;

    const btnGerarJogosGrupos = document.getElementById("btnGerarJogosGrupos");

    if (btnGerarJogosGrupos) {
        if (totalTimes === 4 && totalJogos === 0) {
            btnGerarJogosGrupos.style.display = "inline-flex";
            btnGerarJogosGrupos.innerHTML = `<i class="fa-solid fa-futbol"></i> Gerar Liga Ida e Volta`;
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

    if (totalJogos > 0) {
        wrap.innerHTML = `
            <div class="empty">
                Liga gerada com sucesso. Agora finalize os jogos para atualizar a classificação.
            </div>
        `;
        return;
    }

    if (totalTimes < 4) {
        wrap.innerHTML = `
            <div class="empty">
                Adicione exatamente 4 times para liberar a geração da Liga Ida e Volta. (${totalTimes}/4)
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
                    Times completos. Gere os 12 jogos da Liga Ida e Volta.
                </div>
            </div>

            <button class="btn btn-primary" onclick="gerarLiga()">
                <i class="fa-solid fa-wand-magic-sparkles"></i> Gerar Liga
            </button>
        </div>
    `;
}

function renderTimes(c) {
    const div = document.getElementById("listaTimes");
    const total = c.times?.length || 0;

    const chip = document.getElementById("chipTimes");
    if (chip) chip.textContent = `${total}/4 time(s)`;

    const btnAdd = document.getElementById("btnAddTime");
    const btnCriar = document.getElementById("btnCriarEAddTime");
    const select = document.getElementById("timeId");
    const inputNovo = document.getElementById("novoTimeNome");

    const lotado = total >= 4 || (c.jogos?.length || 0) > 0;

    if (btnAdd) btnAdd.disabled = lotado;
    if (btnCriar) btnCriar.disabled = lotado;
    if (select) select.disabled = lotado;
    if (inputNovo) inputNovo.disabled = lotado;

    if (!div) return;

    if (!total) {
        div.innerHTML = `<div class="empty">Nenhum time adicionado ainda.</div>`;
        return;
    }

    div.innerHTML = (c.times || []).map((t) => `
        <div class="item">
            <div>
                <strong>${escapeHTML(t?.time?.nome ?? "Time")}</strong>
                <div class="muted" style="font-size:12px;">Inscrito</div>
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

async function gerarLiga() {
    if (busy.gerarLiga) return;

    busy.gerarLiga = true;

    const btn = document.getElementById("btnGerarJogosGrupos");
    setBtnLoading(btn, true);

    try {
        await safeFetchJSON(`${BASE_URL}/campeonato/${campeonatoId}/generate`, {
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

function renderJogos(c) {
    const jogosDiv = document.getElementById("listaJogos");
    const chip = document.getElementById("chipJogos");

    const jogos = [...(c.jogos || [])].sort((a, b) => {
        if ((a.rodada || 0) !== (b.rodada || 0)) return (a.rodada || 0) - (b.rodada || 0);
        return (a.id || 0) - (b.id || 0);
    });

    if (chip) chip.textContent = `${jogos.length}/12 jogo(s)`;

    if (!jogosDiv) return;

    if (!jogos.length) {
        jogosDiv.innerHTML = `<div class="empty">Nenhum jogo gerado ainda.</div>`;
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
        .map((rodada) => `
            <div style="margin-bottom:16px;">
                <div style="font-weight:900;margin-bottom:10px;">
                    Rodada ${rodada}
                </div>

                ${agrupados[rodada].map((j) => {
            const badge = j.tipoJogo === "VOLTA" ? "🔁 Volta" : "➡️ Ida";

            return `
                        <div class="match">
                            <div class="match-main">
                                <div class="match-title">
                                    ${escapeHTML(j.timeA?.nome || "Time A")}
                                    x
                                    ${escapeHTML(j.timeB?.nome || "Time B")}
                                </div>
                                <div class="match-sub">
                                    ${badge} • Jogo #${Number(j.id)}
                                </div>
                            </div>

                            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                                <span class="chip">
                                    ${j.finalizado ? "Finalizado" : "Em aberto"}
                                </span>

                                <button class="btn btn-light" onclick="abrirDetalhesJogo(${Number(j.id)})">
                                    <i class="fa-solid fa-eye"></i> Detalhes
                                </button>

                                ${j.finalizado ? `
                                    <strong>${j.golsA ?? 0} x ${j.golsB ?? 0}</strong>
                                ` : `
                                    <div class="score-inputs" style="flex-wrap:wrap;">
                                        <input id="gA${Number(j.id)}" type="number" min="0" placeholder="Gols A" />
                                        <input id="gB${Number(j.id)}" type="number" min="0" placeholder="Gols B" />

                                        <button class="btn btn-primary" onclick="finalizarJogo(${Number(j.id)})" id="btnFinalizar${Number(j.id)}">
                                            <i class="fa-solid fa-check"></i> Finalizar
                                        </button>
                                    </div>
                                `}
                            </div>
                        </div>
                    `;
        }).join("")}
            </div>
        `).join("");
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

async function renderRanking(c) {
    const wrap = document.getElementById("rankingWrap");
    const chip = document.getElementById("chipRanking");

    if (!wrap || !chip) return;

    try {
        const ranking = await safeFetchJSON(`${BASE_URL}/campeonato/${campeonatoId}/ranking`);

        chip.textContent = `${ranking.length} time(s)`;

        if (!ranking.length) {
            wrap.innerHTML = `<div class="empty">Sem dados no ranking ainda.</div>`;
            return;
        }

        wrap.innerHTML = `
            <div class="item" style="font-weight:700;background:#f7f9fc;">
                <div style="width:34px;">#</div>
                <div style="flex:1;">Time</div>
                <div style="width:50px;text-align:center;">PTS</div>
                <div style="width:40px;text-align:center;">J</div>
                <div style="width:40px;text-align:center;">V</div>
                <div style="width:40px;text-align:center;">E</div>
                <div style="width:40px;text-align:center;">D</div>
                <div style="width:55px;text-align:center;">GP</div>
                <div style="width:55px;text-align:center;">GC</div>
                <div style="width:55px;text-align:center;">SG</div>
            </div>

            ${ranking.map((r, i) => {
            const time = r.time?.nome || r.nome || "Time";
            const jogos = (r.vitorias || 0) + (r.empates || 0) + (r.derrotas || 0);

            return `
                    <div class="item">
                        <div style="width:34px;">${i + 1}</div>
                        <div style="flex:1;"><strong>${escapeHTML(time)}</strong></div>
                        <div style="width:50px;text-align:center;"><strong>${Number(r.pontos || 0)}</strong></div>
                        <div style="width:40px;text-align:center;">${jogos}</div>
                        <div style="width:40px;text-align:center;">${Number(r.vitorias || 0)}</div>
                        <div style="width:40px;text-align:center;">${Number(r.empates || 0)}</div>
                        <div style="width:40px;text-align:center;">${Number(r.derrotas || 0)}</div>
                        <div style="width:55px;text-align:center;">${Number(r.golsPro || 0)}</div>
                        <div style="width:55px;text-align:center;">${Number(r.golsContra || 0)}</div>
                        <div style="width:55px;text-align:center;">${Number(r.saldoGols || 0)}</div>
                    </div>
                `;
        }).join("")}
        `;
    } catch (err) {
        console.error(err);
        wrap.innerHTML = `<div class="empty">Erro ao carregar ranking.</div>`;
        chip.textContent = "—";
    }
}

function abrirDetalhesJogo(jogoId) {
    location.href = `jogo-detalhe.html?jogoId=${Number(jogoId)}`;
}

window.finalizarJogo = finalizarJogo;
window.abrirDetalhesJogo = abrirDetalhesJogo;
window.gerarLiga = gerarLiga;