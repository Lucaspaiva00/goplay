/******************************************************
 * bracket.js — ATUALIZADO (BOTÃO “DETALHES” EM CADA JOGO)
 * - Mantém tudo
 * - Adiciona botão Detalhes em cada card do jogo
 ******************************************************/

const BASE_URL = "http://localhost:3000";

(() => {
    const campeonatoId = new URLSearchParams(location.search).get("campeonatoId");

    const elBracket = document.getElementById("bracket");
    const elMsg = document.getElementById("mensagem");

    if (!campeonatoId) {
        renderMessage("error", "Campeonato inválido (campeonatoId não informado).");
        return;
    }

    // Se existirem botões na sua versão “bonita”, ele usa.
    const btnAtualizar = document.getElementById("btnAtualizar");
    const btnVoltar = document.getElementById("btnVoltar");

    if (btnAtualizar) btnAtualizar.addEventListener("click", () => loadBracket(true));
    if (btnVoltar) btnVoltar.addEventListener("click", () => history.back());

    // ==========================
    // Helpers de UI
    // ==========================
    function clearUI() {
        if (elBracket) elBracket.innerHTML = "";
        if (elMsg) elMsg.innerHTML = "";
    }

    function renderMessage(type, text, extraHtml = "") {
        if (!elMsg) return;

        const styles = {
            info: "padding:12px 14px;border-radius:12px;border:1px solid #dbe7ff;background:#f3f7ff;color:#0b2a66;",
            warn: "padding:12px 14px;border-radius:12px;border:1px solid #ffe4b5;background:#fff7e6;color:#5a3a00;",
            error: "padding:12px 14px;border-radius:12px;border:1px solid #ffd0d0;background:#fff2f2;color:#7a0b0b;",
            ok: "padding:12px 14px;border-radius:12px;border:1px solid #cfead5;background:#f2fff5;color:#0b5a1a;",
            loading: "padding:12px 14px;border-radius:12px;border:1px solid #e6eaf2;background:#fafbff;color:#223;",
        };

        const label =
            {
                info: "Info",
                warn: "Aviso",
                error: "Erro",
                ok: "Ok",
                loading: "Carregando",
            }[type] || "Info";

        elMsg.innerHTML = `
      <div style="${styles[type] || styles.info}">
        <strong style="display:block;margin-bottom:4px;">${label}</strong>
        <div>${escapeHtml(text)}</div>
        ${extraHtml || ""}
      </div>
    `;
    }

    function setLoading(on) {
        if (!on) return;
        renderMessage("loading", "Carregando chaveamento...");
    }

    function escapeHtml(str) {
        return String(str ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    async function safeFetchJson(url) {
        const res = await fetch(url);
        const contentType = res.headers.get("content-type") || "";
        let body = null;

        if (contentType.includes("application/json")) {
            body = await res.json().catch(() => null);
        } else {
            const txt = await res.text().catch(() => "");
            body = { raw: txt };
        }

        if (!res.ok) {
            const msg = body?.error || body?.message || body?.raw || `HTTP ${res.status}`;
            throw new Error(msg);
        }

        return body;
    }

    // ==========================
    // “Nome humano” da rodada
    // ==========================
    function getRoundLabel(roundNumber, totalRounds) {
        const n = Number(roundNumber);
        if (!Number.isFinite(n)) return `Rodada ${roundNumber}`;

        if (totalRounds === 1) return "Final";
        if (totalRounds === 2) return n === 1 ? "Semifinal" : "Final";
        if (totalRounds === 3) return n === 1 ? "Quartas" : n === 2 ? "Semifinal" : "Final";
        if (totalRounds >= 4)
            return n === 1
                ? "Oitavas"
                : n === totalRounds - 2
                    ? "Quartas"
                    : n === totalRounds - 1
                        ? "Semifinal"
                        : n === totalRounds
                            ? "Final"
                            : `Rodada ${roundNumber}`;

        return `Rodada ${roundNumber}`;
    }

    // ==========================
    // Winner/Status
    // ==========================
    function getMatchMeta(j) {
        const finalizado = !!j.finalizado;

        const golsA = j.golsA ?? null;
        const golsB = j.golsB ?? null;

        const hasScore = Number.isFinite(golsA) && Number.isFinite(golsB);

        let winner = null; // "A" | "B" | null
        let empate = false;

        if (finalizado && hasScore) {
            if (golsA > golsB) winner = "A";
            else if (golsB > golsA) winner = "B";
            else empate = true;
        }

        const statusText = finalizado ? "Finalizado" : "Em aberto";

        return { finalizado, golsA, golsB, hasScore, winner, empate, statusText };
    }

    // ==========================
    // Render
    // ==========================
    function renderBracket(jogos) {
        clearUI();

        if (!Array.isArray(jogos) || jogos.length === 0) {
            renderMessage("warn", "Mata-mata ainda não foi gerado para este campeonato.");
            return;
        }

        // Agrupa por round
        const roundsMap = new Map();
        for (const j of jogos) {
            const r = Number(j.round ?? 0) || 0;
            if (!roundsMap.has(r)) roundsMap.set(r, []);
            roundsMap.get(r).push(j);
        }

        // Ordena rounds
        const rounds = Array.from(roundsMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([round, list]) => ({
                round,
                jogos: list.sort((x, y) => Number(x.id) - Number(y.id)),
            }));

        const totalRounds = rounds.length;

        renderMessage(
            "ok",
            `Chaveamento carregado. Total de ${jogos.length} jogo(s) no mata-mata.`,
            `<div style="margin-top:8px;font-size:12px;opacity:.85;">Dica: clique em “Atualizar” para recarregar se alguém finalizou jogos agora.</div>`
        );

        // Container flex “colunas”
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.gap = "14px";
        wrapper.style.flexWrap = "wrap";
        wrapper.style.alignItems = "flex-start";

        rounds.forEach((rObj, idx) => {
            const col = document.createElement("section");
            col.style.flex = "1 1 260px";
            col.style.minWidth = "260px";
            col.style.maxWidth = "420px";
            col.style.background = "#fff";
            col.style.border = "1px solid #e8eef7";
            col.style.borderRadius = "16px";
            col.style.padding = "12px";
            col.style.boxShadow = "0 6px 18px rgba(16,24,40,0.06)";

            const title = document.createElement("div");
            title.style.display = "flex";
            title.style.alignItems = "center";
            title.style.justifyContent = "space-between";
            title.style.marginBottom = "10px";

            const left = document.createElement("div");
            left.innerHTML = `
        <div style="font-weight:800;font-size:14px;">${escapeHtml(getRoundLabel(rObj.round, totalRounds))}</div>
        <div style="font-size:12px;opacity:.7;">Rodada ${escapeHtml(rObj.round)}</div>
      `;

            const badge = document.createElement("span");
            badge.textContent = `${rObj.jogos.length} jogo(s)`;
            badge.style.fontSize = "12px";
            badge.style.padding = "6px 10px";
            badge.style.borderRadius = "999px";
            badge.style.border = "1px solid #e6edf7";
            badge.style.background = "#f7faff";

            title.appendChild(left);
            title.appendChild(badge);
            col.appendChild(title);

            // Matches
            rObj.jogos.forEach((j) => {
                col.appendChild(renderMatchCard(j));
            });

            // Mini footer (pro)
            const footer = document.createElement("div");
            footer.style.marginTop = "10px";
            footer.style.fontSize = "12px";
            footer.style.opacity = ".7";
            footer.textContent = idx === totalRounds - 1 ? "Última fase" : "Próxima fase após finalizar";
            col.appendChild(footer);

            wrapper.appendChild(col);
        });

        if (elBracket) elBracket.appendChild(wrapper);
    }

    function renderMatchCard(j) {
        const meta = getMatchMeta(j);

        const nomeA = j?.timeA?.nome ?? "Time A";
        const nomeB = j?.timeB?.nome ?? "Time B";

        const box = document.createElement("article");
        box.style.border = "1px solid #eef2f6";
        box.style.borderRadius = "14px";
        box.style.padding = "10px";
        box.style.marginBottom = "10px";
        box.style.background = "#fff";

        const header = document.createElement("div");
        header.style.display = "flex";
        header.style.alignItems = "center";
        header.style.justifyContent = "space-between";
        header.style.marginBottom = "8px";

        const id = document.createElement("div");
        id.style.fontSize = "12px";
        id.style.opacity = ".75";
        id.innerHTML = `<strong>Jogo #${escapeHtml(j.id)}</strong>`;

        const status = document.createElement("span");
        status.textContent = meta.statusText;
        status.style.fontSize = "12px";
        status.style.padding = "5px 10px";
        status.style.borderRadius = "999px";
        status.style.border = "1px solid #e6edf7";
        status.style.background = meta.finalizado ? "#f2fff5" : "#fff7e6";
        status.style.color = meta.finalizado ? "#0b5a1a" : "#5a3a00";

        header.appendChild(id);
        header.appendChild(status);

        const body = document.createElement("div");
        body.style.display = "grid";
        body.style.gridTemplateColumns = "1fr auto 1fr";
        body.style.gap = "8px";
        body.style.alignItems = "center";

        const sideA = document.createElement("div");
        sideA.style.textAlign = "right";
        sideA.style.fontWeight = meta.winner === "A" ? "800" : "600";
        sideA.style.color = meta.winner === "A" ? "#0b5a1a" : "#111";
        sideA.innerHTML = `
      <div style="font-size:13px;">${escapeHtml(nomeA)}</div>
      <div style="font-size:18px;line-height:1.1;">${meta.hasScore ? escapeHtml(meta.golsA) : "-"}</div>
    `;

        const mid = document.createElement("div");
        mid.style.textAlign = "center";
        mid.style.fontWeight = "800";
        mid.style.opacity = ".6";
        mid.textContent = "x";

        const sideB = document.createElement("div");
        sideB.style.textAlign = "left";
        sideB.style.fontWeight = meta.winner === "B" ? "800" : "600";
        sideB.style.color = meta.winner === "B" ? "#0b5a1a" : "#111";
        sideB.innerHTML = `
      <div style="font-size:13px;">${escapeHtml(nomeB)}</div>
      <div style="font-size:18px;line-height:1.1;">${meta.hasScore ? escapeHtml(meta.golsB) : "-"}</div>
    `;

        body.appendChild(sideA);
        body.appendChild(mid);
        body.appendChild(sideB);

        // Observação
        const note = document.createElement("div");
        note.style.marginTop = "8px";
        note.style.fontSize = "12px";
        note.style.opacity = ".8";

        if (meta.finalizado && meta.empate) {
            note.innerHTML = `⚠️ Empate — defina critério (pênaltis/WO) se necessário.`;
            note.style.color = "#5a3a00";
        } else if (meta.finalizado && meta.winner) {
            const winnerName = meta.winner === "A" ? nomeA : nomeB;
            note.innerHTML = `✅ Vencedor: <strong>${escapeHtml(winnerName)}</strong>`;
            note.style.color = "#0b5a1a";
        } else {
            note.innerHTML = `⏳ Aguardando resultado para avançar.`;
            note.style.color = "#223";
        }

        // Borda destacada quando finalizado
        if (meta.finalizado) {
            box.style.border = "1px solid #cfead5";
            box.style.background = "#fbfffc";
        }

        box.appendChild(header);
        box.appendChild(body);
        box.appendChild(note);

        // ✅ BOTÃO DETALHES (NOVO)
        const btn = document.createElement("button");
        btn.className = "btn btn-light";
        btn.style.marginTop = "10px";
        btn.innerHTML = `<i class="fa-solid fa-eye"></i> Detalhes`;
        btn.addEventListener("click", () => {
            location.href = `jogo-detalhe.html?jogoId=${j.id}`;
        });
        box.appendChild(btn);

        return box;
    }

    // ==========================
    // Load
    // ==========================
    async function loadBracket(forceMessage = false) {
        try {
            clearUI();
            setLoading(true);

            const url = `${BASE_URL}/campeonato/${campeonatoId}/bracket`;
            const jogos = await safeFetchJson(url);

            // Se o endpoint retornar objeto { jogos: [] }, trata:
            const list = Array.isArray(jogos) ? jogos : Array.isArray(jogos?.jogos) ? jogos.jogos : [];

            renderBracket(list);
        } catch (err) {
            console.error(err);
            clearUI();
            renderMessage(
                "error",
                `Não foi possível carregar o chaveamento. ${err?.message || ""}`.trim(),
                `<div style="margin-top:8px;font-size:12px;opacity:.85;">Verifique se o servidor está rodando e se a rota GET /campeonato/:id/bracket está respondendo.</div>`
            );
        } finally {
            // nada
        }
    }

    // Inicial
    loadBracket();
})();
