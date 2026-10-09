(() => {
  const BASE = 'https://goplay-dzlr.onrender.com';
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const live = j => ['AO_VIVO','PAUSADA','INTERVALO'].includes(j?.statusOperacao) && !j.finalizado;
  const label = j => ({ AO_VIVO:'Ao vivo', PAUSADA:'Pausada', INTERVALO:'Intervalo', ENCERRADO:'Encerrado', AGENDADO:'Em breve' })[j?.statusOperacao] || 'Agendado';
  function avatar(team) {
    let url = '';
    try { const u = new URL(team?.brasao); if (['https:','http:'].includes(u.protocol)) url = u.href; } catch {}
    return `<span class="sport-avatar">${url ? `<img src="${esc(url)}" alt="" loading="lazy" onerror="this.hidden=true">` : esc(String(team?.nome || 'T').slice(0,2).toUpperCase())}</span>`;
  }
  function card(a) {
    const j = a.jogo, active = live(j), done = j.finalizado;
    const url = `jogo-detalhe.html?jogoId=${j.id}`;
    const date = new Date(a.dataHora).toLocaleString('pt-BR', { timeZone:'America/Sao_Paulo', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
    const e = j.eventos?.[0];
    const event = e ? `${e.minuto ?? 0}' • ${({GOL:'⚽ Gol',CARTAO_AMARELO:'🟨 Cartão amarelo',CARTAO_VERMELHO:'🟥 Cartão vermelho',SUBSTITUICAO:'🔄 Substituição'})[e.tipo] || 'Novo lance'}${e.jogador?.nome ? ' de '+e.jogador.nome : ''}${e.time?.nome ? ' · '+e.time.nome : ''}` : (done ? 'Confira os lances e as estatísticas desta partida.' : active ? 'Acompanhe cada lance registrado pela Mesa.' : 'Os lances aparecerão aqui quando o jogo começar.');
    return `<article class="sport-post ${active?'is-live':''}">
      <header class="sport-post-head"><span class="sport-post-type">🤝 AMISTOSO</span><span class="sport-badge ${active?'live':''}">${active?'<span class="sport-live-dot"></span>':''}${esc(label(j))}</span></header>
      <div class="sport-place">${esc(a.society?.nome || 'Amistoso independente')}${a.society?.cidade?' · '+esc(a.society.cidade):''} <span>· ${esc(date)}</span></div>
      <a class="sport-score" href="${url}" aria-label="Acompanhar ${esc(a.timeA.nome)} contra ${esc(a.timeB.nome)}">
        <div>${avatar(a.timeA)}<strong>${esc(a.timeA.nome)}</strong></div><b>${active||done?`${j.golsA??0}<span>:</span>${j.golsB??0}`:'<span>VS</span>'}</b><div>${avatar(a.timeB)}<strong>${esc(a.timeB.nome)}</strong></div>
      </a><div class="sport-latest">${esc(event)}</div>
      <footer class="sport-post-actions"><a class="sport-watch" href="${url}"><i class="fa fa-play"></i> ${done?'Ver resultado':active?'Assistir ao vivo':'Acompanhar partida'}</a><button type="button" data-share="${j.id}" aria-label="Compartilhar esta partida"><i class="fa fa-share-nodes"></i> Compartilhar</button></footer>
    </article>`;
  }
  function mount(root, { compact=false, take=30, societyId=null } = {}) {
    if (!root) return;
    let aba='todos', q='', generation=0, currentRequest, debounce;
    root.innerHTML = `<section class="sport-community"><div class="sport-section-head"><div><span class="sport-eyebrow">NA COMUNIDADE GOPLAY</span><h2>${compact?'O futebol está acontecendo':'Acompanhe as partidas'}</h2><p>Placar, lances e resultados dos amistosos.</p></div>${compact?'<a class="sport-inline-link" href="acompanhar.html">Ver todos ↗</a>':'<button class="sport-inline-link" type="button" data-refresh>Atualizar</button>'}</div>
      <div class="sport-feed-toolbar"><div class="sport-tabs" role="group" aria-label="Filtrar partidas">${[['todos','Para você'],['ao-vivo','Ao vivo'],['proximos','Próximos'],['resultados','Resultados']].map(([v,t])=>`<button type="button" data-tab="${v}" aria-pressed="${v===aba}">${t}</button>`).join('')}</div>${compact?'':'<input type="search" data-search placeholder="Buscar time, Society ou cidade" aria-label="Buscar partidas">'}</div>
      <div class="sport-feed-status" role="status"></div><div class="sport-feed-grid"><div class="home-empty">Carregando partidas…</div></div></section>`;
    const grid=root.querySelector('.sport-feed-grid'), note=root.querySelector('.sport-feed-status');
    async function load() {
      const gen=++generation;
      currentRequest?.abort(); currentRequest=new AbortController();
      try {
        const params=new URLSearchParams({aba,take:String(take),q});
        if(societyId)params.set('societyId',String(societyId));
        const r=await fetch(`${BASE}/amistosos/acompanhar?${params}`,{signal:currentRequest.signal});
        if(!r.ok)throw new Error('Não foi possível atualizar as partidas.');
        const data=await r.json();
        if(gen!==generation)return;
        grid.innerHTML=data.length?data.map(card).join(''):`<div class="sport-feed-empty"><i class="fa fa-futbol"></i><h3>${aba==='ao-vivo'?'Nenhum amistoso ao vivo agora':'Nenhuma partida encontrada'}</h3><p>${q?'Tente outro time ou cidade.':'Os jogos confirmados aparecerão aqui. Explore os próximos jogos ou volte mais tarde.'}</p><a href="campeonatos-view.html">Explorar campeonatos →</a></div>`;
        note.textContent=`Atualizado às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · atualização automática`;
      } catch(e) { if(e.name!=='AbortError'&&gen===generation) {note.textContent=e.message+' Tente atualizar novamente.';if(!grid.querySelector('.sport-post'))grid.innerHTML='<div class="home-empty">Partidas indisponíveis neste momento.</div>';} }
    }
    root.addEventListener('click',async e=>{
      const tab=e.target.closest('[data-tab]');
      if(tab){aba=tab.dataset.tab;root.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b===tab)));load();}
      if(e.target.closest('[data-refresh]'))load();
      const share=e.target.closest('[data-share]');
      if(share){const url=new URL(`jogo-detalhe.html?jogoId=${share.dataset.share}`,location.href).href;try{if(navigator.share)await navigator.share({title:'Partida GoPlay',url});else{await navigator.clipboard.writeText(url);note.textContent='Link da partida copiado!';}}catch(err){if(err.name!=='AbortError'){note.textContent='Copie o link da partida:';prompt('Link para compartilhar',url);}}}
    });
    root.querySelector('[data-search]')?.addEventListener('input',e=>{q=e.target.value;clearTimeout(debounce);debounce=setTimeout(load,300);});
    const timer=setInterval(()=>{if(!root.isConnected){destroy();return;}if(!document.hidden)load();},15000);
    function destroy(){clearInterval(timer);clearTimeout(debounce);currentRequest?.abort();}
    window.addEventListener('beforeunload',destroy,{once:true});
    load();return {destroy,refresh:load};
  }
  window.GoPlayPartidas={mount,card};
})();
