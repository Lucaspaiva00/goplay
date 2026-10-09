const BASE_URL = "https://goplay-dzlr.onrender.com";

let societyAtual = null;

function getUsuarioLogado() {
    const keys = ["usuarioLogado", "USUARIO_LOGADO", "OPERADOR_LOGADO"];
    for (const k of keys) {
        try {
            const u = JSON.parse(localStorage.getItem(k) || "null");
            if (u?.id) return u;
        } catch { }
    }
    return null;
}

function el(id) {
    return document.getElementById(id);
}

const DIAS_SEMANA = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
function horariosNormalizados(data){
    const lista=Array.isArray(data?.horariosFuncionamento)?data.horariosFuncionamento:[];
    if(!lista.length) return DIAS_SEMANA.map((_,diaSemana)=>({diaSemana,ativo:true,horaInicio:"18:00",horaFim:"23:00",fallback:true}));
    return DIAS_SEMANA.map((_,diaSemana)=>lista.find(h=>Number(h.diaSemana)===diaSemana)||{diaSemana,ativo:false,horaInicio:"08:00",horaFim:"18:00"});
}
function renderEditorHorarios(data){
    const wrap=el("editHorariosFuncionamento"); if(!wrap)return;
    wrap.innerHTML=horariosNormalizados(data).map(h=>`<div class="hours-row ${h.ativo?"":"closed"}" data-dia="${h.diaSemana}"><div class="hours-day">${DIAS_SEMANA[h.diaSemana]}</div><label class="hours-open"><input type="checkbox" class="hours-active" ${h.ativo?"checked":""}> Aberto</label><input type="time" class="hours-start" value="${h.horaInicio||"08:00"}"><input type="time" class="hours-end" value="${h.horaFim||"18:00"}"></div>`).join("");
    wrap.querySelectorAll('.hours-active').forEach(ch=>ch.addEventListener('change',()=>ch.closest('.hours-row').classList.toggle('closed',!ch.checked)));
}
function coletarHorarios(){
    return [...document.querySelectorAll('#editHorariosFuncionamento .hours-row')].map(row=>{const ativo=row.querySelector('.hours-active').checked;return {diaSemana:Number(row.dataset.dia),ativo,horaInicio:ativo?row.querySelector('.hours-start').value:null,horaFim:ativo?row.querySelector('.hours-end').value:null};});
}
function htmlHorarios(data){
    const lista=horariosNormalizados(data);
    return `<div class="business-hours-view"><strong><i class="fa fa-clock"></i> Funcionamento</strong><div class="business-hours-list">${lista.map(h=>`<div><b>${DIAS_SEMANA[h.diaSemana]}:</b> ${h.ativo?`${h.horaInicio} às ${h.horaFim}`:'Fechado'}</div>`).join('')}</div></div>`;
}

function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

function lockButton(btn, msg) {
    if (!btn) return;
    btn.disabled = true;
    btn.style.opacity = "0.55";
    btn.style.cursor = "not-allowed";
    btn.title = msg || "Ação não permitida.";
    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        alert(msg || "Ação não permitida.");
        return false;
    };
}

function hideButton(btn) {
    if (!btn) return;
    btn.style.display = "none";
}

const profileEsc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
function profileImage(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?profileEsc(u.href):'';}catch{return '';}}
function profileAvatar(name,url,css=''){const image=profileImage(url);return `<span class="society-avatar ${css}"><span>${profileEsc(String(name||'G').slice(0,2).toUpperCase())}</span>${image?`<img src="${image}" alt="" onerror="this.hidden=true">`:''}</span>`;}
let communityData=null,profileFeed;
function showProfileTab(name){document.querySelectorAll('[data-profile-tab]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.profileTab===name));b.tabIndex=b.dataset.profileTab===name?0:-1;});document.querySelectorAll('[data-profile-panel]').forEach(p=>p.hidden=p.dataset.profilePanel!==name);}
function renderCommunity(data){
 communityData=data;
 el('totalJogadores').textContent=data.totalJogadores;el('totalTimes').textContent=data.totalTimes;
 el('profileTimes').innerHTML=data.times.length?data.times.map(t=>`<a class="society-member-card" href="time-detalhe.html?timeId=${t.id}">${profileAvatar(t.nome,t.brasao)}<strong>${profileEsc(t.nome)}</strong><small>${t._count.jogadores} jogadores</small></a>`).join(''):'<p class="society-empty">Esta Society ainda não tem times aprovados.</p>';
 el('profileJogadores').innerHTML=data.jogadores.length?data.jogadores.map(p=>`<a class="society-member-card social-player-card" href="jogador-perfil.html?usuarioId=${p.id}">${profileAvatar(p.nome,p.fotoUrl)}<strong>${profileEsc(p.nome)}</strong><small>${profileEsc(p.posicaoCampo||'Jogador da comunidade')}</small><span class="social-profile-link">Ver perfil →</span></a>`).join(''):'<p class="society-empty">Os jogadores vinculados aparecerão aqui.</p>';
}
function renderSocietyInfo(data) {
 const usuario=getUsuarioLogado(),owner=usuario?.tipo==='DONO_SOCIETY'&&Number(data.usuarioId)===Number(usuario.id),canBook=usuario?.tipo==='DONO_TIME';
 const e=profileEsc;
 el('societyInfo').innerHTML=`<div class="society-social-header">${profileAvatar(data.nome,data.imagem,'society-avatar-large')}<div class="society-social-main"><div class="society-name-row"><h1>${e(data.nome)}</h1>${owner?'<button class="icon-edit-btn" onclick="abrirEdicaoSociety()" aria-label="Editar Society"><i class="fa fa-pen"></i></button>':''}<button class="society-share-btn" onclick="compartilharSociety()" aria-label="Compartilhar perfil"><i class="fa fa-share-nodes"></i></button></div><div class="society-profile-stats"><button onclick="showProfileTab('jogadores')"><strong id="totalJogadores">—</strong> jogadores</button><button onclick="showProfileTab('times')"><strong id="totalTimes">—</strong> times</button><button onclick="showProfileTab('quadras')"><strong>${(data.campos||[]).length}</strong> quadras</button></div><p class="society-category">COMUNIDADE ESPORTIVA · ${e(data.cidade||'Society')}${data.estado?' / '+e(data.estado):''}</p><p class="society-profile-bio">${e(data.descricao||'O ponto de encontro da sua galera. Entre em campo com a comunidade!')}</p><div class="society-profile-actions"><button onclick="showProfileTab('partidas')">▶ Acompanhar partidas</button><button onclick="showProfileTab('jogadores')">👥 Ver jogadores</button><button onclick="showProfileTab('times')">⚽ Encontrar um time</button>${canBook?`<a href="campos-view.html?societyId=${data.id}">Reservar quadra</a>`:''}<a href="campeonatos-view.html">Campeonatos</a>${owner?'<a href="operacao.html">Painel de operação</a>':''}</div><div id="profileShareStatus" role="status"></div></div></div>`;
 el('profileSobre').innerHTML=`<div class="society-about"><h2>Sobre a Society</h2>${owner?`<p><a href="cardapio.html">Gerenciar cardápio · ${(data.cardapio||[]).length} itens</a></p>`:''}<p>${e(data.descricao||'Sem descrição cadastrada.')}</p><div class="society-details-grid">${[['Cidade',[data.cidade,data.estado].filter(Boolean).join(' / ')],['Endereço',data.endereco],['CEP',data.cep],['Telefone',data.telefone],['WhatsApp',data.whatsapp],['E-mail',data.email],['Website',data.website],['Instagram',data.instagram],['Facebook',data.facebook],['YouTube',data.youtube],...(owner?[['PIX',data.pixChave],['Titular do PIX',data.pixTitular]]:[])].map(([k,v])=>`<div><b>${k}:</b> ${e(v||'Não informado')}</div>`).join('')}${htmlHorarios(data)}</div></div>`;
 el('profileQuadras').innerHTML=(data.campos||[]).length?data.campos.map(c=>`<article class="society-court-card"><div class="society-court-photo">${profileImage(c.fotoUrl)?`<img src="${profileImage(c.fotoUrl)}" alt="${e(c.nome)}" loading="lazy">`:'<span>⚽</span>'}</div><div><h3>${e(c.nome)}</h3><p>${e(c.dimensoes||'Quadra da comunidade')}</p><p>Avulso: ${Number(c.valorAvulso||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p><a href="campos-view.html?societyId=${data.id}">${canBook?'Consultar horários e reservar':'Consultar quadra'}</a></div></article>`).join(''):'<p class="society-empty">As quadras cadastradas aparecerão aqui.</p>';
 if(communityData)renderCommunity(communityData);
 profileFeed?.destroy();profileFeed=window.GoPlayPartidas?.mount(el('profileFeed'),{societyId:data.id});
}
async function compartilharSociety(){const url=new URL(`society-detalhe.html?societyId=${societyAtual.id}`,location.href).href;try{if(navigator.share)await navigator.share({title:societyAtual.nome,url});else{await navigator.clipboard.writeText(url);el('profileShareStatus').textContent='Link do perfil copiado!';}}catch(e){if(e.name!=='AbortError')el('profileShareStatus').textContent=`Compartilhe: ${url}`;}}

function preencherFormularioEdicao(data) {
    el("editNome").value = data.nome || "";
    el("editDescricao").value = data.descricao || "";
    el("editTelefone").value = data.telefone || "";
    el("editWhatsapp").value = data.whatsapp || "";
    el("editEmail").value = data.email || "";
    el("editWebsite").value = data.website || "";
    el("editInstagram").value = data.instagram || "";
    el("editFacebook").value = data.facebook || "";
    el("editYoutube").value = data.youtube || "";
    el("editCep").value = data.cep || "";
    el("editEndereco").value = data.endereco || "";
    el("editCidade").value = data.cidade || "";
    el("editEstado").value = data.estado || "";
    el("editPixTitular").value = data.pixTitular || "";
    el("editPixChave").value = data.pixChave || "";
    renderEditorHorarios(data);
    if (el("editImagem")) el("editImagem").value = "";
}

async function carregarSociety() {
    const societyId = getQueryParam("societyId");

    if (!societyId) {
        alert("Empresa inválida.");
        return;
    }

    localStorage.setItem("societyId", String(societyId));

    const res = await fetch(`${BASE_URL}/society/${societyId}`);
    const data = await res.json();

    if (data?.error) {
        el("societyInfo").innerHTML = `<p>${data.error}</p>`;
        return;
    }

    societyAtual = data;
    localStorage.setItem("societyId", String(data.id));
    localStorage.setItem("societyContextName", data.nome || "Empresa");
    renderSocietyInfo(data);
    try {
        const r=await fetch(`${BASE_URL}/society/${data.id}/comunidade`);
        if(!r.ok)throw new Error('Não foi possível carregar a comunidade.');
        renderCommunity(await r.json());
    }catch(e){el('profileTimes').textContent=e.message;el('profileJogadores').textContent=e.message;}
}

document.addEventListener("DOMContentLoaded", async () => {
    const usuarioLogado = getUsuarioLogado();

    if (!usuarioLogado?.id) {
        alert("Você precisa fazer login!");
        window.location.href = "login.html";
        return;
    }

    try {
        const tabs=[...document.querySelectorAll('[data-profile-tab]')];
        tabs.forEach((b,index)=>{b.tabIndex=index===0?0:-1;b.addEventListener('click',()=>showProfileTab(b.dataset.profileTab));b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const target=tabs[e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];showProfileTab(target.dataset.profileTab);target.focus();});});
        await carregarSociety();
        const modalOverlay = el("editModalOverlay");
        if (modalOverlay) {
            modalOverlay.addEventListener("click", (e) => {
                if (e.target === modalOverlay) cancelarEdicaoSociety();
            });
        }
    } catch (e) {
        console.error(e);
        el("societyInfo").innerHTML = "<p>Erro ao carregar empresa.</p>";
    }
});

function abrirEdicaoSociety() {
    const usuario = getUsuarioLogado();
    const tipo = String(usuario?.tipo || "").trim().toUpperCase();

    if (tipo !== "DONO_SOCIETY" || Number(societyAtual?.usuarioId) !== Number(usuario?.id)) {
        alert("Apenas o dono desta empresa pode editar.");
        return;
    }

    if (!societyAtual) {
        alert("Empresa ainda não carregada.");
        return;
    }

    preencherFormularioEdicao(societyAtual);
    el("editModalOverlay").style.display = "flex";
    document.body.style.overflow = "hidden";
}

function cancelarEdicaoSociety() {
    el("editModalOverlay").style.display = "none";
    document.body.style.overflow = "auto";
}

async function salvarEdicaoSociety() {
    try {
        if (!societyAtual?.id) {
            alert("Empresa inválida.");
            return;
        }

        const body = {
            nome: el("editNome").value.trim(),
            descricao: el("editDescricao").value.trim(),
            telefone: el("editTelefone").value.trim(),
            whatsapp: el("editWhatsapp").value.trim(),
            email: el("editEmail").value.trim(),
            website: el("editWebsite").value.trim(),
            instagram: el("editInstagram").value.trim(),
            facebook: el("editFacebook").value.trim(),
            youtube: el("editYoutube").value.trim(),
            cep: el("editCep").value.trim(),
            endereco: el("editEndereco").value.trim(),
            cidade: el("editCidade").value.trim(),
            estado: el("editEstado").value.trim(),
            pixTitular: el("editPixTitular").value.trim(),
            pixChave: el("editPixChave").value.trim(),
            horariosFuncionamento: coletarHorarios(),
            imagem: societyAtual.imagem || null
        };

        if (!body.nome) {
            alert("O nome da empresa é obrigatório.");
            return;
        }

        const imagemFile = el("editImagem")?.files?.[0] || null;
        if (imagemFile) {
            body.imagem = await uploadImage(imagemFile);
        }

        const res = await fetch(`${BASE_URL}/society/${societyAtual.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok || data?.error) {
            alert(data?.error || "Erro ao atualizar empresa.");
            return;
        }

        societyAtual = {
            ...societyAtual,
            ...data
        };

        renderSocietyInfo(societyAtual);
        cancelarEdicaoSociety();
        alert("Empresa atualizada com sucesso!");
    } catch (error) {
        console.error(error);
        alert("Erro ao atualizar empresa.");
    }
}
