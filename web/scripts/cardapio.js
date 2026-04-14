const BASE_URL = "https://goplay-dzlr.onrender.com";

let itemEmEdicao = null;

function el(id) {
    return document.getElementById(id);
}

function getSocietyId() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = (params.get("societyId") || "").trim();
    const fromLS = (localStorage.getItem("societyId") || "").trim();
    return fromUrl || fromLS || null;
}

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = {};
    }

    if (!res.ok) {
        throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
    }

    return data;
}

function formatMoney(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "R$ 0,00";
    return `R$ ${num.toFixed(2).replace(".", ",")}`;
}

function renderCardapio(lista) {
    const div = el("listaCardapio");
    if (!div) return;

    if (!Array.isArray(lista) || lista.length === 0) {
        div.innerHTML = `<div class="empty-state">Nenhum item cadastrado.</div>`;
        return;
    }

    div.innerHTML = lista.map(item => `
        <div class="cardapio-card">
            <div class="cardapio-top">
                <div>
                    <h3 class="cardapio-nome">${item.nome || "-"}</h3>
                    <p class="cardapio-preco">${formatMoney(item.preco)}</p>
                </div>

                <div class="cardapio-actions">
                    <button class="icon-btn" onclick="abrirModalEdicaoItem(${item.id})" title="Editar item">
                        <i class="fa fa-pen"></i>
                    </button>
                    <button class="icon-btn danger" onclick="excluirItem(${item.id}, '${(item.nome || "").replace(/'/g, "\\'")}')" title="Excluir item">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join("");
}

async function carregarCardapio() {
    const societyId = getSocietyId();

    if (!societyId) {
        el("listaCardapio").innerHTML = `<p class="error-state">Society não encontrado.</p>`;
        return;
    }

    localStorage.setItem("societyId", societyId);

    try {
        const data = await fetchJSON(`${BASE_URL}/cardapio/society/${encodeURIComponent(societyId)}`);
        renderCardapio(data);
    } catch (e) {
        console.error(e);
        el("listaCardapio").innerHTML = `<p class="error-state">Erro ao carregar cardápio.</p>`;
    }
}

window.salvarItem = async function salvarItem() {
    try {
        const societyId = getSocietyId();

        if (!societyId) {
            alert("Erro: Society não encontrado.");
            return;
        }

        const nome = (el("nome")?.value || "").trim();
        const preco = Number(el("preco")?.value);

        if (!nome || !Number.isFinite(preco)) {
            alert("Informe nome e preço corretamente.");
            return;
        }

        const data = {
            societyId: Number(societyId),
            nome,
            preco
        };

        await fetchJSON(`${BASE_URL}/cardapio`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        alert("Item adicionado ao cardápio!");
        el("nome").value = "";
        el("preco").value = "";

        await carregarCardapio();
    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao salvar item.");
    }
};

window.abrirModalEdicaoItem = async function abrirModalEdicaoItem(itemId) {
    try {
        const item = await fetchJSON(`${BASE_URL}/cardapio/item/${itemId}`);
        itemEmEdicao = item;

        el("editNome").value = item.nome || "";
        el("editPreco").value = item.preco ?? "";

        el("editItemModal").style.display = "flex";
        document.body.style.overflow = "hidden";
    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao carregar item.");
    }
};

window.fecharModalItem = function fecharModalItem() {
    el("editItemModal").style.display = "none";
    document.body.style.overflow = "auto";
    itemEmEdicao = null;
};

window.salvarEdicaoItem = async function salvarEdicaoItem() {
    try {
        if (!itemEmEdicao?.id) {
            alert("Item não encontrado.");
            return;
        }

        const nome = (el("editNome")?.value || "").trim();
        const preco = Number(el("editPreco")?.value);

        if (!nome || !Number.isFinite(preco)) {
            alert("Informe nome e preço corretamente.");
            return;
        }

        await fetchJSON(`${BASE_URL}/cardapio/${itemEmEdicao.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome, preco })
        });

        fecharModalItem();
        alert("Item atualizado com sucesso!");
        await carregarCardapio();
    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao atualizar item.");
    }
};

window.excluirItem = async function excluirItem(itemId, nome) {
    const confirmar = confirm(`Deseja realmente excluir o item "${nome}"?`);
    if (!confirmar) return;

    try {
        await fetchJSON(`${BASE_URL}/cardapio/${itemId}`, {
            method: "DELETE"
        });

        alert("Item excluído com sucesso!");
        await carregarCardapio();
    } catch (e) {
        console.error(e);
        alert(e.message || "Erro ao excluir item.");
    }
};

document.addEventListener("DOMContentLoaded", async () => {
    const modal = el("editItemModal");
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                fecharModalItem();
            }
        });
    }

    await carregarCardapio();
});