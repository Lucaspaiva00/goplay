(() => {
  const { api, esc } = window.GoPlaySocial;
  const user = () =>
    JSON.parse(localStorage.getItem("usuarioLogado") || "null");
  const send = (path, body) =>
    api(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  function dialog(html) {
    const d = document.createElement("dialog");
    d.className = "social-dialog";
    d.innerHTML = html;
    document.body.appendChild(d);
    d.addEventListener("close", () => d.remove(), { once: true });
    d.addEventListener("click", (e) => {
      if (e.target === d) d.close();
    });
    d.querySelector("[data-close]")?.addEventListener("click", () => d.close());
    d.showModal();
    return d;
  }
  async function invite(profile, goalie = false) {
    const me = user();
    if (me?.tipo !== "DONO_TIME") return;
    const d = dialog(
      `<h2>${goalie ? "Contratar goleiro" : "Convidar para meu time"}</h2><p>${esc(profile.nome)} ${goalie ? "receberá o local, horário e a proposta para decidir se aceita." : "pode participar de vários times. O convite só entra no elenco após o aceite."}</p><form><label for="inviteTeam">Seu time</label><select id="inviteTeam" name="timeId" required><option value="">Carregando times…</option></select>${goalie ? '<label for="goalieMatch">Vincular a um amistoso (opcional)</label><select id="goalieMatch"><option value="">Outra partida</option></select><label for="goalieDate">Data e hora</label><input id="goalieDate" name="dataHora" type="datetime-local" required><label for="goalieDuration">Duração em minutos</label><input id="goalieDuration" name="duracaoMinutos" type="number" min="30" max="240" value="60" required><label for="goaliePlace">Local da partida</label><input id="goaliePlace" name="local" maxlength="280" placeholder="Society, quadra ou endereço" required><label for="goalieValue">Valor proposto (R$, opcional)</label><input id="goalieValue" name="valorProposto" type="number" min="0" max="999999.99" step="0.01" placeholder="A combinar"><label for="goalieMessage">Mensagem</label><textarea id="goalieMessage" name="mensagem" maxlength="500" placeholder="Conte os detalhes do jogo"></textarea><p>O pedido registra o acordo. O pagamento deve ser combinado diretamente entre vocês.</p>' : ""}<p role="status" aria-live="polite"></p><div class="dialog-actions"><button type="button" data-close>Voltar</button><button type="submit" disabled>Enviar ${goalie ? "pedido" : "convite"}</button></div></form>`,
    );
    const form = d.querySelector("form"),
      status = d.querySelector("[role=status]"),
      team = d.querySelector("#inviteTeam"),
      submit = d.querySelector("[type=submit]");
    let matches = [];
    try {
      const rows = await api(`/time/dono/${me.id}`);
      const teams = rows.filter((t) => t.statusVinculo === "APROVADO");
      team.innerHTML = teams
        .map(
          (t) =>
            `<option value="${t.id}">${esc(t.nome)} (${t.jogadores?.length ?? t._count?.jogadores ?? 0}/${t.maxJogadores})</option>`,
        )
        .join("");
      if (!teams.length)
        throw Error(
          "Crie um time e aguarde a aprovação da Society para enviar convites.",
        );
      submit.disabled = false;
      if (goalie) {
        const result = await api("/amistosos/meus");
        matches = (
          Array.isArray(result) ? result : result.amistosos || []
        ).filter(
          (a) => a.status === "CONFIRMADO" && new Date(a.dataHora) > new Date(),
        );
        function fill() {
          d.querySelector("#goalieMatch").innerHTML =
            '<option value="">Outra partida</option>' +
            matches
              .filter((a) =>
                [a.timeAId, a.timeBId].includes(Number(team.value)),
              )
              .map(
                (a) =>
                  `<option value="${a.id}">${esc(a.timeA.nome)} × ${esc(a.timeB.nome)}</option>`,
              )
              .join("");
          d.querySelector("#goalieDate").readOnly = false;
        }
        team.onchange = fill;
        fill();
        d.querySelector("#goalieMatch").onchange = (e) => {
          const a = matches.find((x) => x.id === Number(e.target.value));
          const date = d.querySelector("#goalieDate");
          date.readOnly = !!a;
          if (a) {
            const dt = new Date(a.dataHora);
            date.value = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16);
            d.querySelector("#goalieDuration").value = a.duracaoMinutos;
            d.querySelector("#goaliePlace").value =
              a.society?.nome || a.observacao || "";
          }
        };
      }
    } catch (e) {
      status.textContent = e.message;
      submit.disabled = true;
    }
    form.onsubmit = async (e) => {
      e.preventDefault();
      submit.disabled = true;
      status.textContent = "Enviando…";
      try {
        const values = Object.fromEntries(new FormData(form));
        if (goalie) {
          const match = Number(d.querySelector("#goalieMatch").value) || null;
          await send("/goleiros/pedidos", {
            ...values,
            timeId: Number(values.timeId),
            goleiroId: profile.id,
            dataHora: new Date(values.dataHora).toISOString(),
            duracaoMinutos: Number(values.duracaoMinutos),
            amistosoId: match,
          });
        } else
          await send(`/time/${team.value}/convidar-jogador`, {
            usuarioId: profile.id,
          });
        status.textContent = goalie
          ? "Pedido enviado! Acompanhe a resposta em Meus convites."
          : "Convite enviado! O jogador será avisado para aceitar.";
        submit.hidden = true;
        d.querySelector("[data-close]").textContent = "Concluir";
      } catch (err) {
        status.textContent = err.message;
        submit.disabled = false;
      }
    };
  }
  window.GoPlayEsporteSocial = { invite, dialog, send, user };
})();
