(() => {
  const { api, esc, avatar } = window.GoPlaySocial,
    { dialog, send, user } = window.GoPlayEsporteSocial;
  let viewerGeneration = 0;
  async function photo(file) {
    if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type))
      throw Error("Escolha uma foto JPEG, PNG ou WebP.");
    if (file.size > 12 * 1024 * 1024)
      throw Error("Escolha uma foto de até 12 MB.");
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 1080 / Math.max(bitmap.width, bitmap.height)),
        canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      let quality = 0.82,
        result = canvas.toDataURL("image/jpeg", quality);
      while (result.length > 660000 && quality > 0.3) {
        quality -= 0.1;
        result = canvas.toDataURL("image/jpeg", quality);
      }
      if (result.length > 660000)
        throw Error(
          "Esta imagem ainda está muito grande. Escolha uma foto menor.",
        );
      return result;
    } finally {
      bitmap.close();
    }
  }
  function compose(refresh) {
    const d = dialog(
      '<h2>Seu story de hoje</h2><p>Compartilhe uma foto ou mensagem. O story fica visível por 24 horas.</p><form><label for="storyText">O que está rolando?</label><textarea id="storyText" maxlength="280" rows="4" placeholder="Bora pro jogo! ⚽"></textarea><label for="storyPhoto">Foto (opcional)</label><input id="storyPhoto" type="file" accept="image/jpeg,image/png,image/webp"><img class="story-photo-preview" hidden alt="Prévia da foto"><label for="storyColor">Cor do fundo</label><select id="storyColor"><option value="verde">Verde GoPlay</option><option value="azul">Azul</option><option value="roxo">Roxo</option><option value="laranja">Laranja</option></select><p role="status" aria-live="polite"></p><div class="dialog-actions"><button type="button" data-close>Voltar</button><button type="submit">Publicar story</button></div></form>',
    );
    let imagem = null,
      converting = false,
      generation = 0;
    const status = d.querySelector("[role=status]"),
      submit = d.querySelector("[type=submit]");
    d.querySelector("#storyPhoto").onchange = async (e) => {
      const gen = ++generation;
      imagem = null;
      d.querySelector("img").hidden = true;
      if (!e.target.files[0]) return;
      converting = true;
      submit.disabled = true;
      status.textContent = "Preparando foto…";
      try {
        const result = await photo(e.target.files[0]);
        if (gen !== generation) return;
        imagem = result;
        d.querySelector("img").src = imagem;
        d.querySelector("img").hidden = false;
        status.textContent = "Foto pronta.";
      } catch (err) {
        if (gen === generation) status.textContent = err.message;
      } finally {
        if (gen === generation) {
          converting = false;
          submit.disabled = false;
        }
      }
    };
    d.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      if (converting) return;
      submit.disabled = true;
      status.textContent = "Publicando…";
      try {
        await send("/stories", {
          texto: d.querySelector("#storyText").value,
          imagem,
          cor: d.querySelector("#storyColor").value,
        });
        d.close();
        await refresh?.();
      } catch (err) {
        status.textContent = err.message;
        submit.disabled = false;
      }
    };
  }
  async function view(stories, index, refresh) {
    const d = dialog(
      '<div class="story-view-head"><a data-author></a><button type="button" data-close aria-label="Fechar story">×</button></div><div class="story-stage"></div><div class="story-view-bottom"></div>',
    );
    d.classList.add("story-viewer");
    let i = index,
      busy = false,
      slide = 0;
    const gen = ++viewerGeneration;
    d.addEventListener("close", () => {
      if (gen === viewerGeneration) ++viewerGeneration;
      refresh?.();
    });
    async function show() {
      const activeSlide = ++slide;
      const current = stories[i];
      if (!current) return;
      const stage = d.querySelector(".story-stage"),
        bottom = d.querySelector(".story-view-bottom");
      stage.innerHTML = "<p>Carregando…</p>";
      bottom.innerHTML = "";
      try {
        const s = await api(`/stories/${current.id}`);
        if (!d.open || gen !== viewerGeneration || slide !== activeSlide)
          return;
        stage.className = "story-stage " + s.cor + (s.imagem ? " has-photo" : "");
        stage.innerHTML = `${s.imagem ? `<img src="${esc(s.imagem)}" alt="Foto do story">` : ""}${s.texto ? `<p>${esc(s.texto)}</p>` : ""}`;
        const author = d.querySelector("[data-author]");
        author.href = `jogador-perfil.html?usuarioId=${s.usuarioId}`;
        author.textContent = s.usuario.nome;
        bottom.innerHTML = `<button data-prev ${i === 0 ? "disabled" : ""} aria-label="Story anterior" title="Story anterior">‹</button>${s.usuarioId === user()?.id ? `<button data-views aria-label="Ver visualizações" title="Ver visualizações">◉ ${s.visualizacoes}</button><button data-delete aria-label="Excluir story" title="Excluir story">Excluir</button>` : ""}<button data-next aria-label="${i === stories.length - 1 ? "Concluir stories" : "Próximo story"}" title="${i === stories.length - 1 ? "Concluir" : "Próximo"}">${i === stories.length - 1 ? "✓" : "›"}</button>`;
        bottom.querySelector("[data-prev]").onclick = () => {
          if (i > 0) {
            i--;
            show();
          }
        };
        bottom.querySelector("[data-next]").onclick = () => {
          if (i < stories.length - 1) {
            i++;
            show();
          } else d.close();
        };
        bottom
          .querySelector("[data-delete]")
          ?.addEventListener("click", async () => {
            if (busy || !confirm("Excluir este story?")) return;
            busy = true;
            try {
              await api(`/stories/${s.id}`, { method: "DELETE" });
              d.close();
            } catch (e) {
              stage.innerHTML = `<p>${esc(e.message)}</p>`;
            } finally {
              busy = false;
            }
          });
        bottom
          .querySelector("[data-views]")
          ?.addEventListener("click", async () => {
            try {
              const result = await api(`/stories/${s.id}/visualizacoes`);
              const people = dialog(
                `<h2>Quem viu</h2><div class="society-member-grid">${result.visualizacoes.map((v) => `<a href="jogador-perfil.html?usuarioId=${v.usuario.id}">${avatar(v.usuario)} ${esc(v.usuario.nome)}</a>`).join("") || "<p>As visualizações aparecerão aqui.</p>"}</div><div class="dialog-actions"><button type="button" data-close>Voltar</button></div>`,
              );
              people.focus();
            } catch (e) {
              stage.innerHTML = `<p>${esc(e.message)}</p>`;
            }
          });
        await send(`/stories/${s.id}/visualizar`, {});
      } catch (e) {
        if (d.open) stage.innerHTML = `<p>${esc(e.message)}</p>`;
        bottom.innerHTML = "<button data-end>Fechar</button>";
        bottom.querySelector("[data-end]").onclick = () => d.close();
      }
    }
    await show();
  }
  async function mount(container, { usuarioId = null } = {}) {
    if (!container || !["PLAYER", "DONO_TIME"].includes(user()?.tipo)) return;
    container.className = "story-section";
    container.setAttribute("aria-label", "Stories");
    const own = !usuarioId || Number(usuarioId) === user()?.id;
    container.innerHTML = `<div class="story-section-header"><h2>Stories</h2><small>Momentos de 24 horas</small></div><div class="story-strip"></div><p class="story-empty" role="status">Carregando stories…</p>`;
    async function load() {
      container.classList.remove("story-error");
      try {
        const result = await api(
          "/stories" + (usuarioId ? `?usuarioId=${usuarioId}` : ""),
        );
        const grouped = new Map();
        for (const s of [...result.stories].reverse()) {
          if (!grouped.has(s.usuarioId)) grouped.set(s.usuarioId, []);
          grouped.get(s.usuarioId).push(s);
        }
        container.querySelector(".story-strip").innerHTML =
          `${own ? '<button type="button" data-compose><span class="story-ring">＋</span>Seu story</button>' : ""}` +
          [...grouped]
            .map(
              ([id, items]) =>
                `<button type="button" data-author-id="${id}"><span class="story-ring ${items.every((s) => s.visto) ? "seen" : ""}">${avatar(items[0].usuario)}</span>${esc(items[0].usuario.nome.split(" ")[0])}</button>`,
            )
            .join("");
        container.querySelector("[role=status]").textContent = result.stories
          .length
          ? ""
          : usuarioId
            ? "Este jogador ainda não publicou um story."
            : "Siga jogadores para acompanhar seus stories aqui.";
        container
          .querySelector("[data-compose]")
          ?.addEventListener("click", () => compose(load));
        container
          .querySelectorAll("[data-author-id]")
          .forEach(
            (b) =>
              (b.onclick = () =>
                view(grouped.get(Number(b.dataset.authorId)), 0, load)),
          );
      } catch (e) {
        container.classList.add("story-error");
        container.querySelector("[role=status]").textContent = e.message;
      }
    }
    await load();
    return { refresh: load };
  }
  window.GoPlayStories = { mount, compose };
})();
