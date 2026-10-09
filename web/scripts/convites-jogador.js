(() => {
  const { api, esc, avatar } = window.GoPlaySocial,
    { send, user } = window.GoPlayEsporteSocial;
  const $ = (id) => document.getElementById(id);
  let busy = false;
  const statusText = {
    PENDENTE: "Aguardando resposta",
    ACEITO: "Aceito",
    RECUSADO: "Recusado",
    CANCELADO: "Cancelado",
  };
  function actions(row, inbound, kind) {
    const pending =
        row.status === "PENDENTE" &&
        (kind !== "goleiro" || new Date(row.dataHora) > new Date()),
      cancelable =
        (!inbound && pending) ||
        (kind === "goleiro" &&
          ["PENDENTE", "ACEITO"].includes(row.status) &&
          new Date(row.dataHora) > new Date());
    return `<footer>${pending && inbound ? `<button data-kind="${kind}" data-id="${row.id}" data-answer="true">Aceitar</button><button data-kind="${kind}" data-id="${row.id}" data-answer="false">Recusar</button>` : ""}${cancelable ? `<button data-kind="${kind}" data-id="${row.id}" data-cancel>Cancelar</button>` : ""}</footer>`;
  }
  function teamCard(r, inbound) {
    return `<article class="social-invite-card"><span class="social-invite-status">${statusText[r.status]}</span><h3>${esc(r.time.nome)}</h3><p>${inbound ? "Você foi convidado para este elenco. Aceitar preserva seus outros times." : `Convite para ${esc(r.usuario.nome)}.`}</p><a href="jogador-perfil.html?usuarioId=${inbound ? r.time.donoId : r.usuarioId}">${inbound ? "Ver dono do time" : "Ver jogador"} →</a>${actions(r, inbound, "time")}</article>`;
  }
  function goalieCard(r) {
    const inbound = r.goleiroId === user().id,
      p = inbound ? r.solicitante : r.goleiro;
    return `<article class="social-invite-card"><span class="social-invite-status">${statusText[r.status]}</span><h3>${esc(r.time.nome)} · Goleiro</h3><a href="jogador-perfil.html?usuarioId=${p.id}">${avatar(p)} ${esc(p.nome)}</a><p><strong>${esc(new Date(r.dataHora).toLocaleString("pt-BR"))}</strong> · ${r.duracaoMinutos} min<br>${esc(r.local)}</p><p>${r.valorProposto !== null ? Number(r.valorProposto).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Valor a combinar"}${r.mensagem ? `<br>${esc(r.mensagem)}` : ""}</p>${r.amistosoId ? `<a href="amistosos.html?amistosoId=${r.amistosoId}">Abrir amistoso →</a>` : ""}${actions(r, inbound, "goleiro")}</article>`;
  }
  async function load() {
    try {
      const [t, g] = await Promise.all([
        api("/convites-time/meus"),
        api("/goleiros/pedidos/meus"),
      ]);
      $("teamReceived").innerHTML =
        t.recebidos.map((r) => teamCard(r, true)).join("") ||
        '<p class="society-empty">Seus convites de time aparecerão aqui.</p>';
      $("teamSent").innerHTML =
        t.enviados.map((r) => teamCard(r, false)).join("") ||
        '<p class="society-empty">Abra o perfil de um jogador para convidá-lo.</p>';
      $("teamSentSection").hidden = user()?.tipo !== "DONO_TIME";
      $("goalieRequests").innerHTML =
        g.pedidos.map(goalieCard).join("") ||
        '<p class="society-empty">Pedidos enviados e recebidos para atuar no gol aparecerão aqui.</p>';
    } catch (e) {
      $("inviteStatus").textContent = e.message;
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    load();
    $("invitePage").addEventListener("click", async (e) => {
      const b = e.target.closest("button[data-id]");
      if (!b || busy) return;
      if (
        b.hasAttribute("data-cancel") &&
        !confirm("Cancelar este convite ou pedido?")
      )
        return;
      busy = true;
      b.disabled = true;
      $("inviteStatus").textContent = "Atualizando…";
      try {
        await send(
          `${b.dataset.kind === "time" ? "/convites-time" : "/goleiros/pedidos"}/${b.dataset.id}/${b.hasAttribute("data-cancel") ? "cancelar" : "responder"}`,
          b.hasAttribute("data-cancel")
            ? {}
            : { aceitar: b.dataset.answer === "true" },
        );
        await load();
        $("inviteStatus").textContent = "Resposta registrada.";
      } catch (err) {
        $("inviteStatus").textContent = err.message;
        b.disabled = false;
      } finally {
        busy = false;
      }
    });
  });
})();
