const BASE_URL = "https://goplay-dzlr.onrender.com";

const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
if (!usuarioLogado?.id) window.location.href = "login.html";

let empresas = [];
let societyId = null;
let empresaAtual = null;
let comandaAtual = null;
let produtoSelecionado = null;
let quantidadeSelecionada = 1;

function el(id) { return document.getElementById(id); }
function money(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function escapeHtml(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
    return data;
}

function salvarContextoEmpresa(empresa) {
    if (!empresa?.id) {
        localStorage.removeItem("societyId");
        localStorage.removeItem("societyContextName");
        societyId = null;
        empresaAtual = null;
        return;
    }
    societyId = Number(empresa.id);
    empresaAtual = empresa;
    localStorage.setItem("societyId", String(empresa.id));
    localStorage.setItem("societyContextName", empresa.nome || "Empresa");
}

function renderContexto() {
    const nome = el("empresaComandaNome");
    const endereco = el("empresaComandaEndereco");
    if (nome) nome.textContent = empresaAtual?.nome || "Selecione uma empresa";
    if (endereco) {
        endereco.textContent = empresaAtual
            ? [empresaAtual.endereco, empresaAtual.cidade, empresaAtual.estado].filter(Boolean).join(" • ") || "Empresa selecionada."
            : "Nenhuma empresa selecionada.";
    }
}

async function carregarEmpresas() {
    const select = el("empresaComandaSelect");
    select.innerHTML = `<option value="">Carregando empresas...</option>`;

    // Usa a lista do seletor global quando já estiver pronta; caso contrário consulta a API.
    try {
        const ctx = window.GoPlayEmpresaContextReady ? await window.GoPlayEmpresaContextReady : null;
        empresas = Array.isArray(ctx?.empresas) && ctx.empresas.length
            ? ctx.empresas
            : await fetchJSON(`${BASE_URL}/society`);
    } catch {
        empresas = await fetchJSON(`${BASE_URL}/society`);
    }

    select.innerHTML = `<option value="">Selecione a empresa</option>`;
    empresas.forEach(e => {
        select.innerHTML += `<option value="${e.id}">${escapeHtml(e.nome)}${e.cidade ? ` — ${escapeHtml(e.cidade)}` : ""}</option>`;
    });

    const salvo = Number(localStorage.getItem("societyId") || 0);
    const selecionada = empresas.find(e => Number(e.id) === salvo) || null;
    if (selecionada) {
        select.value = String(selecionada.id);
        await selecionarEmpresa(selecionada.id, false);
    } else {
        salvarContextoEmpresa(null);
        renderContexto();
        renderSemComanda();
        renderCardapioBloqueado();
    }
}

async function selecionarEmpresa(id, limpar = true) {
    const empresaBase = empresas.find(e => Number(e.id) === Number(id));
    if (!empresaBase) {
        salvarContextoEmpresa(null);
        renderContexto();
        renderSemComanda();
        renderCardapioBloqueado();
        return;
    }

    if (limpar) {
        comandaAtual = null;
        produtoSelecionado = null;
        renderSemComanda();
    }

    // Busca detalhe para PIX/endereço/cardápio/quadras quando a listagem pública vier resumida.
    try {
        empresaAtual = await fetchJSON(`${BASE_URL}/society/${empresaBase.id}`);
    } catch {
        empresaAtual = empresaBase;
    }
    salvarContextoEmpresa(empresaAtual);
    renderContexto();
    await Promise.all([buscarComandaAbertaDoUsuario(), carregarCardapio()]);
}

async function descobrirTimeIdDoUsuario() {
    if (usuarioLogado.tipo === "DONO_TIME") {
        const times = await fetchJSON(`${BASE_URL}/time/dono/${usuarioLogado.id}`);
        return Array.isArray(times) && times[0]?.id ? Number(times[0].id) : null;
    }
    if (usuarioLogado.tipo === "PLAYER") {
        try {
            const payload = await fetchJSON(`${BASE_URL}/time/details/by-player/${usuarioLogado.id}`);
            return payload?.time?.id ? Number(payload.time.id) : null;
        } catch { return null; }
    }
    return null;
}

async function abrirComanda() {
    try {
        if (!societyId) {
            alert("Selecione em qual empresa você está antes de abrir a comanda.");
            el("empresaComandaSelect")?.focus();
            return;
        }
        const timeId = await descobrirTimeIdDoUsuario();
        const nova = await fetchJSON(`${BASE_URL}/comanda`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuarioId: usuarioLogado.id, societyId, timeId })
        });
        comandaAtual = nova;
        await carregarComanda(nova.id);
        await carregarHistorico();
        alert(nova.reutilizada ? "Você já tinha uma comanda aberta nesta empresa." : "Comanda aberta com sucesso.");
    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao abrir comanda.");
    }
}

async function carregarComanda(id) {
    if (!id) return renderSemComanda();
    try {
        comandaAtual = await fetchJSON(`${BASE_URL}/comanda/${id}`);
        renderComanda();
    } catch (e) {
        console.error(e);
        renderSemComanda();
    }
}

async function buscarComandaAbertaDoUsuario() {
    if (!societyId) return renderSemComanda();
    try {
        const aberta = await fetchJSON(`${BASE_URL}/comanda/usuario/${usuarioLogado.id}/empresa/${societyId}/aberta`);
        if (aberta?.id) return carregarComanda(aberta.id);
        renderSemComanda();
    } catch (e) {
        console.error(e);
        renderSemComanda();
    }
}

async function carregarCardapio() {
    const wrap = el("listaProdutos");
    if (!wrap) return;
    if (!societyId) return renderCardapioBloqueado();

    wrap.innerHTML = `<div class="loading">Carregando cardápio...</div>`;
    try {
        const produtos = await fetchJSON(`${BASE_URL}/cardapio/society/${societyId}`);
        window.__PRODUTOS_COMANDA__ = Array.isArray(produtos) ? produtos : [];
        if (!window.__PRODUTOS_COMANDA__.length) {
            wrap.innerHTML = `<div class="empty-state">Esta empresa ainda não possui itens no cardápio.</div>`;
            return;
        }
        wrap.innerHTML = window.__PRODUTOS_COMANDA__.map(p => `
            <div class="produto-card">
                <h4>${escapeHtml(p.nome)}</h4>
                <strong>${money(p.preco)}</strong>
                <button type="button" onclick="abrirModalProduto(${p.id})"><i class="fa-solid fa-plus"></i> Adicionar</button>
            </div>`).join("");
    } catch (e) {
        wrap.innerHTML = `<div class="empty-state">${escapeHtml(e.message || "Erro ao carregar cardápio.")}</div>`;
    }
}

function renderCardapioBloqueado() {
    const wrap = el("listaProdutos");
    if (wrap) wrap.innerHTML = `<div class="empty-state">Selecione uma empresa para visualizar o cardápio.</div>`;
    window.__PRODUTOS_COMANDA__ = [];
}

function abrirModalProduto(produtoId) {
    const produto = (window.__PRODUTOS_COMANDA__ || []).find(p => Number(p.id) === Number(produtoId));
    if (!produto) return alert("Produto não encontrado.");
    if (!comandaAtual || String(comandaAtual.status).toUpperCase() !== "ABERTA") {
        return alert("Abra sua comanda nesta empresa antes de adicionar itens.");
    }
    produtoSelecionado = produto;
    quantidadeSelecionada = 1;
    el("modalProdutoNome").textContent = produto.nome;
    el("modalProdutoPreco").textContent = money(produto.preco);
    el("quantidadeProduto").textContent = "1";
    el("modalProduto").classList.add("show");
}

function fecharModalProduto() {
    el("modalProduto")?.classList.remove("show");
    produtoSelecionado = null;
    quantidadeSelecionada = 1;
}

function alterarQuantidade(delta) {
    quantidadeSelecionada = Math.min(99, Math.max(1, quantidadeSelecionada + Number(delta)));
    if (el("quantidadeProduto")) el("quantidadeProduto").textContent = String(quantidadeSelecionada);
}

async function confirmarItem() {
    try {
        if (!comandaAtual?.id || String(comandaAtual.status).toUpperCase() !== "ABERTA") return alert("Abra uma comanda primeiro.");
        if (!produtoSelecionado?.id) return alert("Selecione um produto.");
        await fetchJSON(`${BASE_URL}/comanda/${comandaAtual.id}/item`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cardapioId: produtoSelecionado.id, quantidade: quantidadeSelecionada })
        });
        fecharModalProduto();
        await carregarComanda(comandaAtual.id);
    } catch (e) { console.error(e); alert(e.message || "Erro ao adicionar item."); }
}

async function removerItem(itemId) {
    try {
        if (!confirm("Remover este item da comanda?")) return;
        await fetchJSON(`${BASE_URL}/comanda/item/${itemId}`, { method: "DELETE" });
        await carregarComanda(comandaAtual.id);
    } catch (e) { console.error(e); alert(e.message || "Erro ao remover item."); }
}

async function fecharComanda() {
    try {
        if (!comandaAtual?.id) return alert("Nenhuma comanda aberta.");
        if (!Array.isArray(comandaAtual.itens) || !comandaAtual.itens.length) return alert("Adicione pelo menos um item antes de fechar a comanda.");
        if (!confirm("Fechar esta comanda? Depois disso não será possível adicionar itens.")) return;
        await fetchJSON(`${BASE_URL}/comanda/${comandaAtual.id}/fechar`, { method: "POST" });
        const pagamento = await fetchJSON(`${BASE_URL}/comanda/${comandaAtual.id}/gerar-pagamento`, { method: "POST" });
        await carregarComanda(comandaAtual.id);
        await carregarHistorico();
        if (pagamento?.id) window.location.href = `pagamentos.html?pagamentoId=${encodeURIComponent(pagamento.id)}`;
    } catch (e) { console.error(e); alert(e.message || "Erro ao fechar comanda."); }
}

function renderSemComanda() {
    comandaAtual = null;
    if (el("statusComanda")) el("statusComanda").textContent = societyId ? "Nenhuma comanda aberta" : "Selecione uma empresa";
    if (el("totalComandaHero")) el("totalComandaHero").textContent = money(0);
    if (el("totalComanda")) el("totalComanda").textContent = money(0);
    if (el("itensComanda")) el("itensComanda").innerHTML = `<div class="empty-state">${societyId ? "Abra uma comanda para iniciar o consumo." : "Selecione uma empresa primeiro."}</div>`;
    if (el("btnFecharComanda")) el("btnFecharComanda").disabled = true;
    if (el("btnAbrirComanda")) el("btnAbrirComanda").disabled = !societyId;
}

function renderComanda() {
    const status = String(comandaAtual?.status || "").toUpperCase();
    if (el("statusComanda")) el("statusComanda").textContent = status;
    const total = Number(comandaAtual?.total || 0);
    if (el("totalComandaHero")) el("totalComandaHero").textContent = money(total);
    if (el("totalComanda")) el("totalComanda").textContent = money(total);

    const itens = Array.isArray(comandaAtual?.itens) ? comandaAtual.itens : [];
    const wrap = el("itensComanda");
    if (wrap) {
        wrap.innerHTML = itens.length ? itens.map(i => `
            <div class="item-comanda">
                <div><strong>${escapeHtml(i.nomeProduto)}</strong><br><small>${i.quantidade}x ${money(i.precoUnitario)}</small></div>
                <div style="text-align:right"><strong>${money(i.total)}</strong>${status === "ABERTA" ? `<br><button type="button" onclick="removerItem(${i.id})" style="margin-top:6px;border:0;background:transparent;color:#b91c1c;cursor:pointer;font-weight:800">Remover</button>` : ""}</div>
            </div>`).join("") : `<div class="empty-state">Nenhum item consumido ainda.</div>`;
    }
    if (el("btnAbrirComanda")) el("btnAbrirComanda").disabled = status === "ABERTA";
    if (el("btnFecharComanda")) el("btnFecharComanda").disabled = status !== "ABERTA";
}

async function carregarHistorico() {
    const wrap = el("historicoComandas");
    if (!wrap) return;
    try {
        const lista = await fetchJSON(`${BASE_URL}/comanda/usuario/${usuarioLogado.id}`);
        const recentes = Array.isArray(lista) ? lista.slice(0, 6) : [];
        if (!recentes.length) {
            wrap.innerHTML = `<div class="comanda-history-empty">Você ainda não possui comandas.</div>`;
            return;
        }
        wrap.innerHTML = recentes.map(c => `
            <div class="comanda-history-item">
                <div class="row"><h4>${escapeHtml(c.society?.nome || "Empresa")}</h4><span class="badge ${String(c.status || "").toLowerCase()}">${escapeHtml(c.status || "-")}</span></div>
                <p>Comanda #${escapeHtml(c.codigo || c.id)}</p>
                <p>${new Date(c.createdAt).toLocaleString("pt-BR")}</p>
                <strong>${money(c.total)}</strong>
            </div>`).join("");
    } catch (e) {
        wrap.innerHTML = `<div class="empty-state">Não foi possível carregar o histórico.</div>`;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    el("btnAbrirComanda")?.addEventListener("click", abrirComanda);
    el("btnFecharComanda")?.addEventListener("click", fecharComanda);
    el("btnFecharModal")?.addEventListener("click", fecharModalProduto);
    el("btnMenos")?.addEventListener("click", () => alterarQuantidade(-1));
    el("btnMais")?.addEventListener("click", () => alterarQuantidade(1));
    el("btnConfirmarItem")?.addEventListener("click", confirmarItem);
    el("modalProduto")?.addEventListener("click", e => { if (e.target.id === "modalProduto") fecharModalProduto(); });

    el("empresaComandaSelect")?.addEventListener("change", async e => {
        const id = Number(e.target.value || 0);
        await selecionarEmpresa(id, true);
    });

    renderSemComanda();
    await Promise.all([carregarEmpresas(), carregarHistorico()]);
});

window.abrirModalProduto = abrirModalProduto;
window.removerItem = removerItem;
