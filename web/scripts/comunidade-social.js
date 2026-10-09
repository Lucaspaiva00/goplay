(()=>{
 const BASE='https://goplay-dzlr.onrender.com';
 const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
 function image(v){try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?esc(u.href):'';}catch{return '';}}
 function avatar(p,large=false){const url=image(p.fotoUrl||p.brasao);return `<span class="society-avatar ${large?'society-avatar-large':''}"><span>${esc(String(p.nome||'G').slice(0,2).toUpperCase())}</span>${url?`<img src="${url}" alt="" loading="lazy" onerror="this.hidden=true">`:''}</span>`;}
 function card(p){return `<a class="society-member-card social-player-card" href="jogador-perfil.html?usuarioId=${p.id}">${avatar(p)}<strong>${esc(p.nome)}</strong><small>${esc(p.posicaoCampo||(p.tipo==='DONO_TIME'?'Organizador de time':'Jogador GoPlay'))}</small><span class="social-profile-link">Ver perfil →</span></a>`;}
 async function api(path,options={}){const r=await fetch(BASE+path,options);const d=await r.json();if(!r.ok)throw new Error(d.error||'Não foi possível carregar o perfil.');return d;}
 window.GoPlaySocial={esc,avatar,card,api};
})();
