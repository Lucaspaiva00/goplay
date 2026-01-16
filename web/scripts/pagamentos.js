const BASE_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
    init();
});

function el(id) { return document.getElementById(id); }

async function safeFetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { }

    if (!res.ok) {
        const msg = data?.error || data?.message || text || `Erro HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}

function moneyBR(v) {
    const n = Number(v || 0);
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dtBR(d) {
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return "-";
    return x.toLocaleString("pt-BR");
}

async function init() {
    el("btnFiltrar").onclick = carregarPagamentos;
    el("btnAbrirNovo").onclick = abrirModal;
    el("btnFecharModal").onclick = fecharModal;
    el("btnCancelar").onclick = fecharModal;
    el("btnSalvar").onclick = salvarPagamento;

    await carregarSocietiesDoDono();
    await carregarUsuariosBasicos();
    await carregarPagamentos();
}

async function carregarSocietiesDoDono() {
    // ajuste conforme seu login: você deve ter usuarioLogado no localStorage
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
    if (!usuario?.id) {
        el("msg").textContent = "Sessão expirada. Faça login novamente.";
        return;
    }

    // você já tem rota /society/owner/:usuarioId
    const list = await safeFetchJSON(`${BASE_URL}/society/owner/${usuario.id}`);

    const select = el("societyId");
    select.innerHTML = "";

    (list || []).forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.nome;
        select.appendChild(opt);
    });

    if (!select.options.length) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Nenhuma society encontrada";
        select.appendChild(opt);
    }
}

async function carregarUsuariosBasicos() {
    // Sem rota de "listar usuários", então vamos colocar pelo menos o usuário logado
    // Depois você pode criar rota /society/:id/players ou /usuarios etc.
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
    const select = el("usuarioId");
    select.innerHTML = "";

    if (usuario?.id) {
        const opt = document.createElement("option");
        opt.value = usuario.id;
        opt.textContent = `${usuario.nome} (você)`;
        select.appendChild(opt);
    } else {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Carregue um usuário";
        select.appendChild(opt);
    }
}

async function carregarPagamentos() {
    const societyId = el("societyId").value;
    if (!societyId) return;

    const tipo = el("filtroTipo").value;
    const from = el("filtroFrom").value;
    const to = el("filtroTo").value;

    const qs = new URLSearchParams();
    if (tipo) qs.set("tipo", tipo);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);

    el("msg").textContent = "Carregando...";
    el("tbodyPag").innerHTML = "";

    try {
        const data = await safeFetchJSON(`${BASE_URL}/pagamentos/society/${societyId}?${qs.toString()}`);

        const lista = data?.pagamentos || [];
        const total = Number(data?.total || 0);

        el("chipResumo").textContent = `${lista.length} pagamento(s) • Total ${moneyBR(total)}`;

        if (!lista.length) {
            el("msg").textContent = "Nenhum pagamento encontrado.";
            return;
        }

        el("msg").textContent = "";

        el("tbodyPag").innerHTML = lista.map((p) => `
      <tr>
        <td>${dtBR(p.createdAt)}</td>
        <td>${p.tipo}</td>
        <td>${p?.usuario?.nome || "-"}</td>
        <td>${p.descricao ? String(p.descricao) : "-"}</td>
        <td class="right"><strong>${moneyBR(p.valor)}</strong></td>
      </tr>
    `).join("");
    } catch (err) {
        console.error(err);
        el("msg").textContent = err?.message || "Erro ao carregar pagamentos.";
    }
}

function abrirModal() {
    el("modal").style.display = "block";
}

function fecharModal() {
    el("modal").style.display = "none";
    el("tipo").value = "AVULSO";
    el("valor").value = "";
    el("descricao").value = "";
}

async function salvarPagamento() {
    const usuarioId = el("usuarioId").value;
    const societyId = el("societyId").value;
    const tipo = el("tipo").value;
    const valor = el("valor").value;
    const descricao = el("descricao").value;

    if (!usuarioId || !societyId || !tipo || !valor) {
        return alert("Preencha usuário, society, tipo e valor.");
    }

    try {
        await safeFetchJSON(`${BASE_URL}/pagamentos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                usuarioId: Number(usuarioId),
                societyId: Number(societyId),
                tipo,
                valor: Number(valor),
                descricao: descricao ? String(descricao) : null,
            }),
        });

        fecharModal();
        await carregarPagamentos();
    } catch (err) {
        console.error(err);
        alert(err?.message || "Erro ao salvar pagamento.");
    }
}
