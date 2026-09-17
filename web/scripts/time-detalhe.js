const BASE_URL = "https://goplay-dzlr.onrender.com";

function getParam(name) {
    return new URLSearchParams(location.search).get(name);
}

function getUsuarioLogado() {
    try {
        return JSON.parse(localStorage.getItem("usuarioLogado") || "null");
    } catch {
        return null;
    }
}

function escapeHtml(s) {
    return String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch { }

    if (!res.ok) {
        const msg = data?.error || data?.message || text || `Erro HTTP ${res.status}`;
        throw new Error(msg);
    }

    return data;
}

function pillStatus(status) {
    const s = String(status || "").toUpperCase();

    if (s === "APROVADO") {
        return `<span style="font-weight:900;font-size:12px;padding:6px 10px;border-radius:999px;border:1px solid #bbf7d0;background:#ecfdf5;color:#065f46;">APROVADO</span>`;
    }

    if (s === "RECUSADO") {
        return `<span style="font-weight:900;font-size:12px;padding:6px 10px;border-radius:999px;border:1px solid #fecaca;background:#fee2e2;color:#7f1d1d;">RECUSADO</span>`;
    }

    if (s === "INATIVO") {
        return `<span style="font-weight:900;font-size:12px;padding:6px 10px;border-radius:999px;border:1px solid #e5e7eb;background:#f3f4f6;color:#374151;">INATIVO</span>`;
    }

    return `<span style="font-weight:900;font-size:12px;padding:6px 10px;border-radius:999px;border:1px solid #fed7aa;background:#fff7ed;color:#9a3412;">PENDENTE</span>`;
}

function pillTipo(tipo) {
    const t = String(tipo || "").toUpperCase();

    if (t === "MENSALISTA") {
        return `<span style="font-weight:900;font-size:12px;padding:6px 10px;border-radius:999px;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;">MENSALISTA</span>`;
    }

    return `<span style="font-weight:900;font-size:12px;padding:6px 10px;border-radius:999px;border:1px solid #e5e7eb;background:#f9fafb;color:#111827;">AVULSO</span>`;
}

function pickDateField(a) {
    return (
        a?.data ||
        a?.dataJogo ||
        a?.dataDoJogo ||
        a?.dia ||
        a?.date ||
        a?.dataHora ||
        a?.createdAt ||
        null
    );
}

function toBRDateOnly(value) {
    if (!value) return "-";

    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const d = new Date(value + "T00:00:00");
        if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("pt-BR");
    }

    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("pt-BR");

    return "-";
}

function statusPill(status) {
    const s = String(status || "").toUpperCase();

    if (s === "CONFIRMADO") {
        return `<span style="font-weight:900;font-size:12px;padding:6px 10px;border-radius:999px;display:inline-flex;align-items:center;gap:6px;border:1px solid #bbf7d0;background:#ecfdf5;color:#065f46;">
          <i class="fa-solid fa-circle-check"></i> CONFIRMADO
        </span>`;
    }

    if (s === "CANCELADO") {
        return `<span style="font-weight:900;font-size:12px;padding:6px 10px;border-radius:999px;display:inline-flex;align-items:center;gap:6px;border:1px solid #fecaca;background:#fee2e2;color:#7f1d1d;">
          <i class="fa-solid fa-circle-xmark"></i> CANCELADO
        </span>`;
    }

    return `<span style="font-weight:900;font-size:12px;padding:6px 10px;border-radius:999px;display:inline-flex;align-items:center;gap:6px;border:1px solid #fed7aa;background:#fff7ed;color:#9a3412;">
      <i class="fa-solid fa-hourglass-half"></i> PENDENTE
    </span>`;
}

function btnMini(label, icon, kind = "neutral", onClickJs = "") {
    const base = "border:none;border-radius:10px;padding:8px 10px;font-weight:900;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-size:12px;";
    let style = "background:#f3f4f6;color:#111827;border:1px solid #e5e7eb;";

    if (kind === "ok") {
        style = "background:#ecfdf5;border:1px solid #bbf7d0;color:#065f46;";
    }

    if (kind === "danger") {
        style = "background:#fee2e2;border:1px solid #fecaca;color:#7f1d1d;";
    }

    return `<button style="${base}${style}" onclick="${onClickJs}"><i class="${icon}"></i> ${label}</button>`;
}

async function cancelarAgendamento(id) {
    if (!confirm("Cancelar este agendamento?")) return;

    try {
        await fetchJSON(`${BASE_URL}/agendamentos/${id}/cancelar`, { method: "POST" });
        alert("Agendamento cancelado!");

        const timeId = getParam("timeId");
        await carregarAgendamentos(timeId);
    } catch (e) {
        console.error(e);
        alert(e?.message || "Erro ao cancelar agendamento.");
    }
}

function abrirPagamentoPorLink(pagamentoId) {
    location.href = `pagamentos.html?pagamentoId=${encodeURIComponent(pagamentoId)}`;
}

function irMeusPagamentos(timeId) {
    location.href = `meus-pagamentos.html?timeId=${encodeURIComponent(timeId)}`;
}

async function aprovarTime(timeId) {
    try {
        await fetchJSON(`${BASE_URL}/time/${timeId}/aprovar`, { method: "POST" });
        alert("Time aprovado com sucesso!");
        await carregarTime(timeId);
    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao aprovar time.");
    }
}

async function recusarTime(timeId) {
    try {
        await fetchJSON(`${BASE_URL}/time/${timeId}/recusar`, { method: "POST" });
        alert("Time recusado com sucesso!");
        await carregarTime(timeId);
    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao recusar time.");
    }
}

async function inativarTime(timeId) {
    try {
        await fetchJSON(`${BASE_URL}/time/${timeId}/inativar`, { method: "POST" });
        alert("Time inativado com sucesso!");
        await carregarTime(timeId);
    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao inativar time.");
    }
}

async function solicitarEntradaTime(timeId) {
    if (!confirm("Enviar solicitação para entrar neste time? O dono precisa aprovar antes de você entrar.")) return;
    try {
        const d = await fetchJSON(`${BASE_URL}/time/${timeId}/solicitar-entrada`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}"
        });
        alert(d?.message || "Solicitação enviada ao dono do time.");
        await carregarTime(timeId);
    } catch (e) {
        alert(e.message || "Erro ao solicitar entrada.");
    }
}

async function carregarSolicitacaoDoJogador(timeId, isMembro) {
    const box = document.getElementById("blocoSolicitacaoJogador");
    const statusEl = document.getElementById("statusSolicitacaoJogador");
    const btn = document.getElementById("btnSolicitarEntradaTime");
    if (!box) return;
    box.style.display = "block";

    if (isMembro) {
        if (statusEl) statusEl.innerHTML = "<strong>✓ Você já faz parte deste time.</strong>";
        if (btn) btn.style.display = "none";
        return;
    }

    try {
        const rows = await fetchJSON(`${BASE_URL}/time/solicitacoes/minhas`);
        const req = (Array.isArray(rows) ? rows : []).find(x => Number(x.timeId) === Number(timeId));
        if (req?.status === "PENDENTE") {
            if (statusEl) statusEl.textContent = "Sua solicitação está aguardando o dono do time.";
            if (btn) { btn.disabled = true; btn.textContent = "⏳ Solicitação enviada"; btn.style.opacity = ".65"; }
        } else {
            if (statusEl) statusEl.textContent = req?.status === "RECUSADA"
                ? "Sua solicitação anterior não foi aprovada. Você pode solicitar novamente."
                : "Você ainda não faz parte deste time. Envie uma solicitação ao dono.";
            if (btn) {
                btn.style.display = "inline-flex";
                btn.disabled = false;
                btn.style.opacity = "1";
                btn.textContent = req?.status === "RECUSADA" ? "Solicitar novamente" : "Solicitar entrada";
                btn.onclick = () => solicitarEntradaTime(timeId);
            }
        }
    } catch (e) {
        if (statusEl) statusEl.textContent = e.message;
    }
}

async function carregarSolicitacoesEntrada(timeId) {
    const box = document.getElementById("blocoSolicitacoesEntrada");
    const list = document.getElementById("listaSolicitacoesEntrada");
    const chip = document.getElementById("chipSolicitacoesEntrada");
    if (!box || !list) return;
    box.style.display = "block";
    try {
        const rows = await fetchJSON(`${BASE_URL}/time/${timeId}/solicitacoes`);
        const data = Array.isArray(rows) ? rows : [];
        if (chip) chip.textContent = `${data.length} pendente${data.length === 1 ? "" : "s"}`;
        if (!data.length) {
            list.innerHTML = `<div style="color:#64748b;padding:10px 0;">Nenhuma solicitação pendente.</div>`;
            return;
        }
        list.innerHTML = data.map(s => `
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid #e8eef3;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:10px;">
                    ${s.usuario?.fotoUrl ? `<img src="${escapeHtml(s.usuario.fotoUrl)}" style="width:42px;height:42px;border-radius:50%;object-fit:cover;">` : `<div style="width:42px;height:42px;border-radius:50%;background:#e5e7eb;display:grid;place-items:center;font-weight:900;">${escapeHtml((s.usuario?.nome || "?")[0])}</div>`}
                    <div><strong>${escapeHtml(s.usuario?.nome || "Jogador")}</strong><div style="color:#64748b;font-size:13px;">${escapeHtml(s.usuario?.posicaoCampo || s.usuario?.email || "Jogador")}</div></div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn green" onclick="responderSolicitacaoTime(${s.id}, 'APROVADA')">✓ Aprovar</button>
                    <button class="btn navy" onclick="responderSolicitacaoTime(${s.id}, 'RECUSADA')">Recusar</button>
                </div>
            </div>`).join("");
    } catch (e) {
        list.innerHTML = `<div style="color:#b91c1c;">${escapeHtml(e.message)}</div>`;
    }
}

async function responderSolicitacaoTime(id, status) {
    const aceitar = status === "APROVADA";
    if (!confirm(aceitar ? "Aprovar este jogador e adicioná-lo ao elenco?" : "Recusar esta solicitação?")) return;
    try {
        await fetchJSON(`${BASE_URL}/time/solicitacoes/${id}/responder`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status })
        });
        await carregarTime(getParam("timeId"));
    } catch (e) { alert(e.message || "Erro ao responder solicitação."); }
}

async function criarRotinaDoTime(time) {
    if (!confirm(`Criar a rotina recorrente do ${time.nome}? O elenco atual será usado nas confirmações 👍/👎.`)) return;
    try {
        const group = await fetchJSON(`${BASE_URL}/grupos-horario`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                timeId: Number(time.id),
                societyId: Number(time.society?.id || 0),
                nome: `${time.nome} • Rotina`,
                descricao: `Horário recorrente e confirmações do ${time.nome}.`,
                maxJogadores: Math.max(20, (time.jogadores || []).length + 5)
            })
        });
        location.href = `horario-grupo.html?grupoId=${group.id}`;
    } catch (e) {
        if (e.message?.includes("já possui")) {
            await carregarTime(time.id);
        } else alert(e.message || "Erro ao criar rotina do time.");
    }
}

function renderRotinaTime(time, podeGerenciar, isMembro) {
    const box = document.getElementById("blocoRotinaTime");
    const actions = document.getElementById("acoesRotinaTime");
    const text = document.getElementById("textoRotinaTime");
    if (!box || !actions) return;
    const rotina = time.rotinaHorario;
    const podeVer = podeGerenciar || isMembro;
    box.style.display = podeVer ? "block" : "none";
    if (!podeVer) return;

    if (rotina?.id) {
        if (text) text.textContent = "A lista de jogadores vem do elenco do time. Aqui ficam o horário recorrente e a enquete semanal 👍/👎.";
        actions.innerHTML = `<button class="btn green" onclick="location.href='horario-grupo.html?grupoId=${rotina.id}'"><i class="fa fa-thumbs-up"></i> Abrir rotina e presenças</button>`;
    } else if (podeGerenciar) {
        if (text) text.textContent = "Crie uma única rotina vinculada a este time. Os jogadores aprovados entram automaticamente nas confirmações semanais.";
        actions.innerHTML = `<button class="btn green" id="btnCriarRotinaTime"><i class="fa fa-rotate"></i> Criar rotina do time</button>`;
        document.getElementById("btnCriarRotinaTime").onclick = () => criarRotinaDoTime(time);
    } else {
        if (text) text.textContent = "O dono do time ainda não configurou a rotina semanal.";
        actions.innerHTML = "";
    }
}

window.responderSolicitacaoTime = responderSolicitacaoTime;

async function carregarAgendamentos(timeId, mostrarAcoes = false) {
    const wrap = document.getElementById("listaAgendamentos");
    const chip = document.getElementById("chipAgendamentos");

    if (!wrap) return;

    wrap.innerHTML = "Carregando agendamentos...";
    if (chip) chip.textContent = "0";

    try {
        const lista = await fetchJSON(`${BASE_URL}/agendamentos/time/${timeId}`);
        const ags = Array.isArray(lista) ? lista : [];

        ags.sort((a, b) => {
            const da = new Date(String(pickDateField(a) || "")).getTime();
            const db = new Date(String(pickDateField(b) || "")).getTime();

            if (Number.isFinite(db) && Number.isFinite(da) && db !== da) {
                return db - da;
            }

            return String(a?.horaInicio || "").localeCompare(String(b?.horaInicio || ""));
        });

        if (chip) chip.textContent = String(ags.length);

        if (!ags.length) {
            wrap.innerHTML = `<div style="color:#6b7280;">Nenhum agendamento desse time ainda.</div>`;
            return;
        }

        wrap.innerHTML = `
          <div style="overflow:auto;border-radius:14px;">
            <table style="width:100%;border-collapse:collapse;min-width:860px;background:#fff;border-radius:14px;overflow:hidden;">
              <thead>
                <tr>
                  <th style="text-align:left;padding:12px;border-bottom:1px solid #eef2f6;font-size:12px;opacity:.7;font-weight:900;">Data</th>
                  <th style="text-align:left;padding:12px;border-bottom:1px solid #eef2f6;font-size:12px;opacity:.7;font-weight:900;">Horário</th>
                  <th style="text-align:left;padding:12px;border-bottom:1px solid #eef2f6;font-size:12px;opacity:.7;font-weight:900;">Empresa</th>
                  <th style="text-align:left;padding:12px;border-bottom:1px solid #eef2f6;font-size:12px;opacity:.7;font-weight:900;">Quadra</th>
                  <th style="text-align:left;padding:12px;border-bottom:1px solid #eef2f6;font-size:12px;opacity:.7;font-weight:900;">Status</th>
                  <th style="text-align:right;padding:12px;border-bottom:1px solid #eef2f6;font-size:12px;opacity:.7;font-weight:900;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${ags.map(a => {
            const dt = toBRDateOnly(pickDateField(a));
            const hr = `${escapeHtml(a?.horaInicio || "-")} - ${escapeHtml(a?.horaFim || "-")}`;
            const societyNome = escapeHtml(a?.society?.nome || a?.societyNome || "-");
            const campoNome = escapeHtml(a?.campo?.nome || a?.campoNome || a?.campo || "-");
            const st = statusPill(a?.status);

            const pagamentoId =
                a?.pagamentoId ??
                a?.pagamento?.id ??
                a?.pagamento?.pagamentoId ??
                null;

            const podeCancelar = String(a?.status || "").toUpperCase() !== "CANCELADO";
            const actions = [];

            if (pagamentoId && mostrarAcoes) {
                actions.push(
                    btnMini(
                        "Pagamento",
                        "fa-solid fa-receipt",
                        "ok",
                        `abrirPagamentoPorLink(${JSON.stringify(pagamentoId)})`
                    )
                );
            }

            if (podeCancelar && mostrarAcoes) {
                actions.push(
                    btnMini(
                        "Cancelar",
                        "fa-solid fa-ban",
                        "danger",
                        `cancelarAgendamento(${Number(a.id)})`
                    )
                );
            }

            return `
                      <tr>
                        <td style="text-align:left;padding:12px;border-bottom:1px solid #eef2f6;font-size:14px;">${dt}</td>
                        <td style="text-align:left;padding:12px;border-bottom:1px solid #eef2f6;font-size:14px;">${hr}</td>
                        <td style="text-align:left;padding:12px;border-bottom:1px solid #eef2f6;font-size:14px;">${societyNome}</td>
                        <td style="text-align:left;padding:12px;border-bottom:1px solid #eef2f6;font-size:14px;">${campoNome}</td>
                        <td style="text-align:left;padding:12px;border-bottom:1px solid #eef2f6;font-size:14px;">${st}</td>
                        <td style="text-align:right;padding:12px;border-bottom:1px solid #eef2f6;font-size:14px;">
                          <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
                            ${actions.join("")}
                          </div>
                        </td>
                      </tr>
                    `;
        }).join("")}
              </tbody>
            </table>
          </div>
        `;
    } catch (e) {
        console.error(e);
        wrap.innerHTML = `<div style="color:#b91c1c;font-weight:800;">Erro ao carregar agendamentos: ${escapeHtml(e.message)}</div>`;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    init();
});

async function init() {
    const timeId = getParam("timeId");

    if (!timeId) {
        document.getElementById("info").innerHTML = `<p>timeId não informado na URL.</p>`;
        document.getElementById("listaJogadores").innerHTML = `<p>-</p>`;
        const la = document.getElementById("listaAgendamentos");
        if (la) la.innerHTML = `<p>-</p>`;
        return;
    }

    const btnAgendar = document.getElementById("btnAgendar");
    const btnPagamentos = document.getElementById("btnPagamentos");
    const btnAprovarTime = document.getElementById("btnAprovarTime");
    const btnRecusarTime = document.getElementById("btnRecusarTime");
    const btnInativarTime = document.getElementById("btnInativarTime");

    if (btnAgendar) {
        btnAgendar.onclick = () => {
            location.href = `time-agendamento.html?timeId=${timeId}`;
        };
    }

    if (btnPagamentos) {
        btnPagamentos.onclick = () => {
            irMeusPagamentos(timeId);
        };
    }

    if (btnAprovarTime) btnAprovarTime.onclick = () => aprovarTime(timeId);
    if (btnRecusarTime) btnRecusarTime.onclick = () => recusarTime(timeId);
    if (btnInativarTime) btnInativarTime.onclick = () => inativarTime(timeId);

    await carregarTime(timeId);
}

async function carregarTime(timeId) {
    const infoEl = document.getElementById("info");
    const listEl = document.getElementById("listaJogadores");
    const usuario = getUsuarioLogado();

    infoEl.innerHTML = "Carregando...";
    listEl.innerHTML = "Carregando jogadores...";

    try {
        const time = await fetchJSON(`${BASE_URL}/time/${timeId}`);

        const tipoUsuario = String(usuario?.tipo || "").toUpperCase();
        const isDonoSociety = tipoUsuario === "DONO_SOCIETY" && Number(time?.society?.usuarioId) === Number(usuario?.id);
        const isDonoTime = tipoUsuario === "DONO_TIME";
        const isPlayer = tipoUsuario === "PLAYER";
        const isDonoDesteTime = isDonoTime && Number(time?.dono?.id) === Number(usuario?.id);
        const isMembro = isPlayer && (time.jogadores || []).some(j => Number(j.id) === Number(usuario?.id));

        const acoesVinculo = document.getElementById("acoesVinculoSociety");
        const acoesDonoTime = document.getElementById("acoesDonoTime");
        const blocoAgendamentos = document.getElementById("blocoAgendamentos");

        if (acoesVinculo) {
            acoesVinculo.style.display = isDonoSociety ? "block" : "none";
        }

        if (acoesDonoTime) {
            acoesDonoTime.style.display = isDonoDesteTime ? "block" : "none";
        }

        const podeVerAgendamentos = isDonoDesteTime || isDonoSociety || isMembro;
        if (blocoAgendamentos) {
            blocoAgendamentos.style.display = podeVerAgendamentos ? "block" : "none";
        }

        const podeVerDadosVinculo = isDonoDesteTime || isDonoSociety;
        infoEl.innerHTML = `
          <div style="text-align:left;">
            ${time.brasao ? `<img src="${escapeHtml(time.brasao)}" alt="Brasão" style="width:72px;height:72px;border-radius:12px;object-fit:cover;border:1px solid #e5e7eb;margin-bottom:12px;">` : ""}
            <p><strong>Nome:</strong> ${escapeHtml(time.nome)}</p>
            <p><strong>Empresa:</strong> ${escapeHtml(time?.society?.nome || "-")}</p>
            <p><strong>Cidade:</strong> ${escapeHtml(time.cidade || "-")} / ${escapeHtml(time.estado || "-")}</p>
            <p><strong>Modalidade:</strong> ${escapeHtml(time.modalidade || "-")}</p>
            ${podeVerDadosVinculo ? `
              <p><strong>Tipo de vínculo:</strong> ${pillTipo(time.tipoVinculo)}</p>
              <p><strong>Status:</strong> ${pillStatus(time.statusVinculo)}</p>
              <p><strong>Mensalidade:</strong> ${time.valorMensalidade ? `R$ ${Number(time.valorMensalidade).toFixed(2).replace(".", ",")}` : "-"}</p>
              <p><strong>Vencimento:</strong> ${time.diaVencimento || "-"}</p>
              <p><strong>Observação:</strong> ${escapeHtml(time.observacaoVinculo || "-")}</p>
            ` : ""}
          </div>
        `;

        const jogadores = time.jogadores || [];

        if (!jogadores.length) {
            listEl.innerHTML = `<p>Nenhum jogador no time ainda.</p>`;
        } else {
            listEl.innerHTML = `
              <div style="text-align:left;">
                ${jogadores.map(j => `
                  <div style="padding:10px 0;border-bottom:1px solid #eee;display:flex;gap:10px;align-items:center;">
                    ${j.fotoUrl
                        ? `<img src="${escapeHtml(j.fotoUrl)}" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">`
                        : `<div style="width:36px;height:36px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:14px;">${escapeHtml((j.nome || "?").charAt(0))}</div>`}
                    <div style="flex:1;">
                      <strong>${escapeHtml(j.nome)}</strong><br/>
                      <span style="color:#6b7280;font-size:13px;">
                        ${escapeHtml(j.posicaoCampo || "—")} ${j.goleiro ? "• Goleiro" : ""}
                      </span>
                    </div>
                    ${isDonoDesteTime ? `<button class="btn navy" style="padding:7px 10px;font-size:12px" onclick="removerJogadorDoTime(${time.id}, ${j.id})">Remover</button>` : ""}
                  </div>
                `).join("")}
              </div>
            `;
        }

        renderRotinaTime(time, isDonoDesteTime, isMembro);
        const reqBox = document.getElementById("blocoSolicitacoesEntrada");
        const playerBox = document.getElementById("blocoSolicitacaoJogador");
        if (reqBox) reqBox.style.display = isDonoDesteTime ? "block" : "none";
        if (playerBox) playerBox.style.display = isPlayer ? "block" : "none";
        if (isDonoDesteTime) await carregarSolicitacoesEntrada(timeId);
        if (isPlayer) await carregarSolicitacaoDoJogador(timeId, isMembro);

        if (podeVerAgendamentos) await carregarAgendamentos(timeId, isDonoDesteTime);
    } catch (err) {
        console.error(err);
        infoEl.innerHTML = `<p style="color:#b91c1c;"><strong>Erro:</strong> ${escapeHtml(err.message)}</p>`;
        listEl.innerHTML = `<p>-</p>`;
    }
}

async function removerJogadorDoTime(timeId, usuarioId) {
    if (!confirm("Remover este jogador do time? Ele também sairá das próximas confirmações da rotina.")) return;
    try {
        await fetchJSON(`${BASE_URL}/time/${timeId}/jogadores/${usuarioId}/remover`, { method: "POST" });
        await carregarTime(timeId);
    } catch (e) { alert(e.message || "Erro ao remover jogador."); }
}

window.removerJogadorDoTime = removerJogadorDoTime;
window.cancelarAgendamento = cancelarAgendamento;
window.abrirPagamentoPorLink = abrirPagamentoPorLink;