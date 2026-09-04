const BASE_URL = "https://goplay-dzlr.onrender.com";

function el(id) {
    return document.getElementById(id);
}

function getUsuarioLogado() {

    try {

        const u =
            JSON.parse(
                localStorage.getItem("usuarioLogado") || "null"
            );

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

    const text =
        await res.text().catch(() => "");

    let data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch { }

    if (!res.ok) {

        throw new Error(
            data?.error ||
            data?.message ||
            text ||
            `HTTP ${res.status}`
        );
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

    return Number.isFinite(n)
        ? n
        : def;
}

function formatDateTime(value) {

    if (!value) return "-";

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
        return "-";
    }

    return d.toLocaleString("pt-BR");
}

/* ======================================================
   RANKING
====================================================== */

function renderRanking(lista) {

    const tbody = el("tbodyRanking");

    if (!Array.isArray(lista) || !lista.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="muted">
                    Sem ranking.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML = lista.map((r, idx) => {

        const timeNome =
            r?.time?.nome || "-";

        const P =
            safeNum(r?.pontos);

        const V =
            safeNum(r?.vitorias);

        const E =
            safeNum(r?.empates);

        const D =
            safeNum(r?.derrotas);

        const GP =
            safeNum(r?.golsPro);

        const GC =
            safeNum(r?.golsContra);

        const SG =
            safeNum(r?.saldoGols);

        const J = V + E + D;

        return `
            <tr>

                <td>${idx + 1}</td>

                <td>
                    ${escapeHtml(timeNome)}
                </td>

                <td class="right">
                    <b>${P}</b>
                </td>

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

/* ======================================================
   INFO
====================================================== */

function renderInfo(c) {

    const nome =
        c?.nome ?? "Campeonato";

    el("titulo").textContent = nome;

    el("chipId").textContent =
        `#${c?.id ?? "-"}`;

    const status =
        c?.status ?? "—";

    const societyNome =
        c?.society?.nome ?? "—";

    const qtdTimes =
        Array.isArray(c?.times)
            ? c.times.length
            : "—";

    const qtdJogos =
        Array.isArray(c?.jogos)
            ? c.jogos.length
            : "—";

    el("boxInfo").innerHTML = `

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">

            <span class="chip">
                ⚽ Liga Ida e Volta
            </span>

            <span class="chip">
                ${escapeHtml(String(status))}
            </span>

            <span class="chip">
                Jogos: ${escapeHtml(String(qtdJogos))}
            </span>

            <span class="chip">
                Times: ${escapeHtml(String(qtdTimes))}
            </span>

        </div>

        <div style="font-size:14px;line-height:1.7;">

            <div>
                <b>Empresa:</b>
                ${escapeHtml(String(societyNome))}
            </div>

            <div>
                <b>Temporada:</b>
                ${escapeHtml(String(c?.temporada || "-"))}
            </div>

            <div>
                <b>Categoria:</b>
                ${escapeHtml(String(c?.categoria || "-"))}
            </div>

            <div>
                <b>Modalidade:</b>
                ${escapeHtml(String(c?.modalidade || "-"))}
            </div>

            <div>
                <b>Início:</b>
                ${escapeHtml(formatDateTime(c?.dataInicio))}
            </div>

            <div>
                <b>Fim:</b>
                ${escapeHtml(formatDateTime(c?.dataFim))}
            </div>

        </div>
    `;
}

/* ======================================================
   JOGOS
====================================================== */

function renderJogos(jogos) {

    const box =
        el("listaJogos");

    if (!Array.isArray(jogos) || !jogos.length) {

        box.innerHTML = `
            <div class="muted">
                Nenhum jogo cadastrado.
            </div>
        `;

        return;
    }

    const agrupados = {};

    jogos.forEach((j) => {

        const rodada =
            j?.rodada || 1;

        if (!agrupados[rodada]) {
            agrupados[rodada] = [];
        }

        agrupados[rodada].push(j);
    });

    box.innerHTML = Object.keys(agrupados)
        .sort((a, b) => Number(a) - Number(b))
        .map((rodada) => {

            const jogosRodada =
                agrupados[rodada];

            return `

                <div class="rodada-wrap">

                    <div class="rodada-title">
                        Rodada ${rodada}
                    </div>

                    ${jogosRodada.map((j) => {

                const timeA =
                    j?.timeA?.nome || "Time A";

                const timeB =
                    j?.timeB?.nome || "Time B";

                const golsA =
                    j?.golsA ?? "-";

                const golsB =
                    j?.golsB ?? "-";

                const statusMap = { AGENDADO: "Agendado", AO_VIVO: "AO VIVO", INTERVALO: "Intervalo", ENCERRADO: "Encerrado" };
                const status = j?.finalizado ? "Encerrado" : (statusMap[j?.statusOperacao] || "Agendado");

                const tipo =
                    j?.tipoJogo === "VOLTA"
                        ? "🔁 Volta"
                        : "➡️ Ida";

                return `

                            <div class="jogo-item">

                                <div class="jogo-top">

                                    <span class="chip">
                                        ${tipo}
                                    </span>

                                    <span class="chip">
                                        ${status}
                                    </span>

                                </div>

                                <div class="jogo-placar">

                                    ${escapeHtml(timeA)}

                                    <strong>
                                        ${golsA}
                                        x
                                        ${golsB}
                                    </strong>

                                    ${escapeHtml(timeB)}

                                </div>

                                <div class="muted">${escapeHtml(formatDateTime(j?.dataHora))}</div>
                                <div style="margin-top:10px;text-align:right;">
                                  <button onclick="window.open('jogo-detalhe.html?jogoId=${Number(j?.id)}','_blank','noopener')" style="border:0;border-radius:10px;padding:9px 12px;font-weight:800;cursor:pointer;background:#052845;color:#fff;">${j?.statusOperacao === "AO_VIVO" ? "🔴 Assistir ao vivo" : "Ver central da partida"}</button>
                                </div>
                            </div>
                        `;
            }).join("")}

                </div>
            `;
        }).join("");
}

/* ======================================================
   LOAD
====================================================== */

async function carregarTudo() {

    const id = getParam("id");

    if (!id) {

        el("msg").textContent =
            "ID não informado.";

        return;
    }

    el("msg").textContent =
        "Carregando...";

    el("tbodyRanking").innerHTML = `
        <tr>
            <td colspan="10" class="muted">
                Carregando...
            </td>
        </tr>
    `;

    el("listaJogos").innerHTML = `
        <div class="muted">
            Carregando jogos...
        </div>
    `;

    const camp =
        await fetchJSON(
            `${BASE_URL}/campeonato/${encodeURIComponent(id)}`
        );

    renderInfo(camp);

    renderJogos(camp?.jogos || []);

    try {

        const ranking =
            await fetchJSON(
                `${BASE_URL}/campeonato/${encodeURIComponent(id)}/ranking`
            );

        renderRanking(ranking);

    } catch (e) {

        console.error("ranking", e);

        renderRanking([]);
    }

    el("msg").textContent = "";
}

/* ======================================================
   INIT
====================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const u = getUsuarioLogado();

    if (!u?.id) {

        alert("Você precisa fazer login!");

        location.href = "login.html";

        return;
    }

    el("btnVoltar").onclick =
        () => history.back();

    el("btnRecarregar").onclick =
        () => carregarTudo().catch((e) => {

            console.error(e);

            el("msg").textContent =
                e?.message || "Erro ao recarregar.";
        });

    carregarTudo().catch((e) => {

        console.error(e);

        el("msg").textContent =
            e?.message || "Erro ao carregar.";
    });
});