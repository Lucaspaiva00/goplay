const BASE_URL = "https://goplay-dzlr.onrender.com";

const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
const societyIdLS = localStorage.getItem("societyId");

if (!usuarioLogado?.id) {
    window.location.href = "login.html";
}

let societyId = societyIdLS ? Number(societyIdLS) : null;
let comandaAtual = null;
let produtoSelecionado = null;
let quantidadeSelecionada = 1;

function el(id) {
    return document.getElementById(id);
}

function money(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = null;
    }

    if (!res.ok) {
        throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
    }

    return data;
}

async function descobrirSocietyId() {
    if (societyId) return societyId;

    const lista = await fetchJSON(`${BASE_URL}/society`);
    const primeiro = Array.isArray(lista) ? lista[0] : null;

    if (primeiro?.id) {
        societyId = Number(primeiro.id);
        localStorage.setItem("societyId", String(societyId));
        return societyId;
    }

    throw new Error("Nenhum society encontrado.");
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
        } catch {
            return null;
        }
    }

    return null;
}

async function abrirComanda() {
    try {
        await descobrirSocietyId();

        const timeId = await descobrirTimeIdDoUsuario();

        const nova = await fetchJSON(`${BASE_URL}/comanda`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                usuarioId: usuarioLogado.id,
                societyId,
                timeId
            })
        });

        comandaAtual = nova;
        await carregarComanda(nova.id);
        await carregarCardapio();

        alert("Comanda aberta com sucesso.");
    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao abrir comanda.");
    }
}

async function carregarComanda(id) {
    try {
        if (!id) {
            renderSemComanda();
            return;
        }

        comandaAtual = await fetchJSON(`${BASE_URL}/comanda/${id}`);
        renderComanda();
    } catch (e) {
        console.error(e);
        renderSemComanda();
    }
}

async function buscarComandaAbertaDoUsuario() {
    try {
        await descobrirSocietyId();

        const lista = await fetchJSON(`${BASE_URL}/comanda/society/${societyId}`);

        const minhaAberta = Array.isArray(lista)
            ? lista.find(c =>
                Number(c.usuarioId) === Number(usuarioLogado.id) &&
                String(c.status).toUpperCase() === "ABERTA"
            )
            : null;

        if (minhaAberta?.id) {
            await carregarComanda(minhaAberta.id);
            return;
        }

        renderSemComanda();
    } catch (e) {
        console.error(e);
        renderSemComanda();
    }
}

async function carregarCardapio() {
    try {
        await descobrirSocietyId();

        const wrap = el("produtosGrid") || el("cardapioList") || el("listaProdutos");
        if (!wrap) return;

        wrap.innerHTML = `<div class="loading">Carregando cardápio...</div>`;

        const produtos = await fetchJSON(`${BASE_URL}/cardapio/society/${societyId}`);

        if (!Array.isArray(produtos) || produtos.length === 0) {
            wrap.innerHTML = `<div class="empty-state">Nenhum produto cadastrado no cardápio.</div>`;
            return;
        }

        wrap.innerHTML = produtos.map(p => `
            <div class="produto-card">
                <h4>${escapeHtml(p.nome)}</h4>
                <strong>${money(p.preco)}</strong>
                <button type="button" onclick="abrirModalProduto(${p.id})">
                    <i class="fa-solid fa-plus"></i> Adicionar
                </button>
            </div>
        `).join("");

        window.__PRODUTOS_COMANDA__ = produtos;
    } catch (e) {
        console.error(e);
        const wrap = el("produtosGrid") || el("cardapioList") || el("listaProdutos");
        if (wrap) wrap.innerHTML = `<div class="empty-state">${escapeHtml(e.message || "Erro ao carregar cardápio.")}</div>`;
    }
}

function abrirModalProduto(produtoId) {
    const produtos = window.__PRODUTOS_COMANDA__ || [];
    const produto = produtos.find(p => Number(p.id) === Number(produtoId));

    if (!produto) {
        alert("Produto não encontrado.");
        return;
    }

    if (!comandaAtual || String(comandaAtual.status).toUpperCase() !== "ABERTA") {
        alert("Abra uma comanda antes de adicionar itens.");
        return;
    }

    produtoSelecionado = produto;
    quantidadeSelecionada = 1;

    // ✅ IDs CORRETOS DO HTML
    const nome = el("modalProdutoNome");
    const preco = el("modalProdutoPreco");
    const qtd = el("quantidadeProduto");

    if (nome) nome.textContent = produto.nome;
    if (preco) preco.textContent = money(produto.preco);
    if (qtd) qtd.textContent = quantidadeSelecionada;

    el("modalProduto").classList.add("show");
}

function fecharModalProduto() {
    const modal = el("modalProduto") || el("modal");
    if (modal) modal.classList.remove("show");

    produtoSelecionado = null;
    quantidadeSelecionada = 1;
}

function alterarQuantidade(delta) {
    quantidadeSelecionada += Number(delta);

    if (quantidadeSelecionada < 1) quantidadeSelecionada = 1;
    if (quantidadeSelecionada > 99) quantidadeSelecionada = 99;

    const qtd = el("quantidadeProduto");
    if (qtd) qtd.textContent = String(quantidadeSelecionada);
}

async function confirmarItem() {
    try {
        if (!comandaAtual?.id) {
            alert("Abra uma comanda primeiro.");
            return;
        }

        if (String(comandaAtual.status).toUpperCase() !== "ABERTA") {
            alert("Esta comanda não está aberta.");
            return;
        }

        if (!produtoSelecionado?.id) {
            alert("Selecione um produto.");
            return;
        }

        await fetchJSON(`${BASE_URL}/comanda/${comandaAtual.id}/item`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                cardapioId: produtoSelecionado.id,
                quantidade: quantidadeSelecionada
            })
        });

        fecharModalProduto();
        await carregarComanda(comandaAtual.id);
    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao adicionar item.");
    }
}

async function removerItem(itemId) {
    try {
        if (!confirm("Remover este item da comanda?")) return;

        await fetchJSON(`${BASE_URL}/comanda/item/${itemId}`, {
            method: "DELETE"
        });

        await carregarComanda(comandaAtual.id);
    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao remover item.");
    }
}

async function fecharComanda() {
    try {
        if (!comandaAtual?.id) {
            alert("Nenhuma comanda aberta.");
            return;
        }

        if (!Array.isArray(comandaAtual.itens) || comandaAtual.itens.length === 0) {
            alert("Adicione pelo menos um item antes de fechar a comanda.");
            return;
        }

        if (!confirm("Fechar esta comanda? Depois disso não será possível adicionar itens.")) return;

        await fetchJSON(`${BASE_URL}/comanda/${comandaAtual.id}/fechar`, {
            method: "POST"
        });

        const pagamento = await fetchJSON(`${BASE_URL}/comanda/${comandaAtual.id}/gerar-pagamento`, {
            method: "POST"
        });

        await carregarComanda(comandaAtual.id);

        alert("Comanda fechada e pagamento gerado.");

        if (pagamento?.id) {
            window.location.href = `pagamentos.html?pagamentoId=${encodeURIComponent(pagamento.id)}`;
        }
    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao fechar comanda.");
    }
}

function renderSemComanda() {
    comandaAtual = null;

    const status = el("statusComanda") || el("statusTexto");
    if (status) status.textContent = "SEM COMANDA";

    const heroTotal = el("heroTotalComanda") || el("totalComanda");
    if (heroTotal) heroTotal.textContent = money(0);

    const itens = el("itensComanda") || el("itensList");
    if (itens) itens.innerHTML = `<div class="empty-state">Nenhuma comanda aberta.</div>`;

    const btnFechar = el("btnFecharComanda");
    if (btnFechar) btnFechar.disabled = true;
}

function renderComanda() {
    const status = String(comandaAtual?.status || "SEM COMANDA").toUpperCase();

    const statusEl = el("statusComanda") || el("statusTexto");
    if (statusEl) statusEl.textContent = status;

    const total = Number(comandaAtual?.total || 0);

    const heroTotal = el("totalComandaHero");
    if (heroTotal) heroTotal.textContent = money(total);

    const totalEl = el("totalComanda") || el("total");
    if (totalEl) totalEl.textContent = money(total);

    const itensWrap = el("itensComanda") || el("itensList");
    if (itensWrap) {
        const itens = Array.isArray(comandaAtual?.itens) ? comandaAtual.itens : [];

        if (!itens.length) {
            itensWrap.innerHTML = `<div class="empty-state">Nenhum item consumido ainda.</div>`;
        } else {
            itensWrap.innerHTML = itens.map(item => `
                <div class="item-comanda">
                    <div>
                        <strong>${escapeHtml(item.nomeProduto)}</strong><br>
                        <small>${Number(item.quantidade)}x ${money(item.precoUnitario)}</small>
                    </div>

                    <div style="text-align:right;">
                        <strong>${money(item.total)}</strong>
                        ${status === "ABERTA" ? `
                            <br>
                            <button class="btn-remover-item" onclick="removerItem(${item.id})">
                                Remover
                            </button>
                        ` : ""}
                    </div>
                </div>
            `).join("");
        }
    }

    const btnFechar = el("btnFecharComanda");
    if (btnFechar) {
        btnFechar.disabled = status !== "ABERTA";
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

document.addEventListener("DOMContentLoaded", async () => {
    const modal = el("modalProduto") || el("modal");
    const modalBox = document.querySelector(".modal-box");

    if (modalBox) {
        modalBox.addEventListener("click", (e) => {
            e.stopPropagation();
        });
    }
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) fecharModalProduto();
        });
    }

    const btnAbrir = el("btnAbrirComanda");
    if (btnAbrir) btnAbrir.onclick = abrirComanda;

    const btnFechar = el("btnFecharComanda");
    if (btnFechar) btnFechar.onclick = fecharComanda;

    const btnConfirmar = el("btnConfirmarItem");
    if (btnConfirmar) btnConfirmar.onclick = confirmarItem;

    const btnModalClose = el("btnFecharModal") || el("btnCancelarModal");
    if (btnModalClose) btnModalClose.onclick = fecharModalProduto;

    const btnMais = el("btnMais");
    const btnMenos = el("btnMenos");

    if (btnMais) {
        btnMais.addEventListener("click", (e) => {
            e.stopPropagation();
            alterarQuantidade(1);
        });
    }

    if (btnMenos) {
        btnMenos.addEventListener("click", (e) => {
            e.stopPropagation();
            alterarQuantidade(-1);
        });
    }

    await buscarComandaAbertaDoUsuario();
    await carregarCardapio();
});

window.abrirComanda = abrirComanda;
window.fecharComanda = fecharComanda;
window.abrirModalProduto = abrirModalProduto;
window.fecharModalProduto = fecharModalProduto;
window.confirmarItem = confirmarItem;
window.removerItem = removerItem;
window.alterarQuantidade = alterarQuantidade;
window.aumentarQtd = () => alterarQuantidade(1);
window.diminuirQtd = () => alterarQuantidade(-1);