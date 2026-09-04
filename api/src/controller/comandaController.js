const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { notifyUsuario, notifyStaff } = require("../notifications");

const toId = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};


async function podeOperar(req, comanda, roles = ["ADMIN", "CAIXA", "BAR", "RECEPCAO"], allowSelf = true) {
    const a = req.actor;
    if (!a || !comanda) return false;
    if (allowSelf && a.kind === "USER" && Number(a.id) === Number(comanda.usuarioId)) return true;
    if (a.kind === "STAFF") return Number(a.societyId) === Number(comanda.societyId) && roles.includes(a.funcao);
    if (a.kind === "USER" && a.tipo === "DONO_SOCIETY") {
        const own = await prisma.society.findFirst({ where: { id: Number(comanda.societyId), usuarioId: Number(a.id) }, select: { id: true } });
        return !!own;
    }
    return false;
}
async function podeGerirEmpresa(req, societyId, roles=["ADMIN","CAIXA","BAR","RECEPCAO"]) {
    const a=req.actor;
    if(a?.kind==="STAFF") return Number(a.societyId)===Number(societyId)&&roles.includes(a.funcao);
    if(a?.kind==="USER"&&a.tipo==="DONO_SOCIETY") return !!(await prisma.society.findFirst({where:{id:Number(societyId),usuarioId:Number(a.id)},select:{id:true}}));
    return false;
}

const includeResumo = {
    usuario: { select: { id: true, nome: true, email: true } },
    society: { select: { id: true, nome: true, imagem: true, pixChave: true, pixTitular: true } },
    time: { select: { id: true, nome: true, brasao: true } },
    pagamento: true,
    itens: true
};

/* =========================
   ABRIR COMANDA
========================= */
const abrir = async (req, res) => {
    try {
        const usuarioId = toId(req.body.usuarioId);
        const societyId = toId(req.body.societyId);
        const timeId = toId(req.body.timeId);

        if (!usuarioId || !societyId) {
            return res.status(400).json({ error: "Selecione a empresa antes de abrir a comanda." });
        }
        if (!req.actor || req.actor.kind !== "USER" || Number(req.actor.id) !== Number(usuarioId)) {
            return res.status(403).json({ error: "Você só pode abrir uma comanda para o próprio usuário." });
        }

        const [usuario, society] = await Promise.all([
            prisma.usuario.findUnique({ where: { id: usuarioId }, select: { id: true } }),
            prisma.society.findUnique({ where: { id: societyId }, select: { id: true } })
        ]);

        if (!usuario) return res.status(404).json({ error: "Usuário não encontrado." });
        if (!society) return res.status(404).json({ error: "Empresa não encontrada." });

        if (timeId) {
            const time = await prisma.time.findUnique({ where: { id: timeId }, select: { id: true } });
            if (!time) return res.status(404).json({ error: "Time não encontrado." });
        }

        // Uma única comanda aberta por usuário dentro da mesma empresa.
        const existente = await prisma.comanda.findFirst({
            where: { usuarioId, societyId, status: "ABERTA" },
            include: includeResumo,
            orderBy: { createdAt: "desc" }
        });

        if (existente) {
            return res.status(200).json({ ...existente, reutilizada: true });
        }

        const comanda = await prisma.comanda.create({
            data: { usuarioId, societyId, timeId: timeId || null, status: "ABERTA" },
            include: includeResumo
        });
        await notifyStaff(prisma, societyId, "Nova comanda", `${comanda.usuario?.nome || "Cliente"} abriu uma comanda.`, ["ADMIN","CAIXA","BAR"]);
        return res.status(201).json(comanda);
    } catch (err) {
        console.error("Erro ao abrir comanda:", err);
        return res.status(500).json({ error: "Erro ao abrir comanda." });
    }
};

/* =========================
   ADICIONAR ITEM
========================= */
const adicionarItem = async (req, res) => {
    try {
        const comandaId = toId(req.params.id);
        const cardapioId = toId(req.body.cardapioId);
        const quantidade = Number(req.body.quantidade || 1);

        if (!comandaId || !cardapioId || !Number.isInteger(quantidade) || quantidade <= 0) {
            return res.status(400).json({ error: "Dados inválidos." });
        }

        const result = await prisma.$transaction(async (tx) => {
            const comanda = await tx.comanda.findUnique({ where: { id: comandaId } });

            if (!comanda || comanda.status !== "ABERTA") throw new Error("Comanda inválida ou fechada.");
            if (!(await podeOperar(req, comanda, ["ADMIN","CAIXA","BAR"]))) throw new Error("Sem permissão para movimentar esta comanda.");

            const produto = await tx.cardapio.findUnique({ where: { id: cardapioId } });
            if (!produto) throw new Error("Produto não encontrado.");

            // Impede adicionar produto de outra empresa por manipulação de requisição.
            if (Number(produto.societyId) !== Number(comanda.societyId)) {
                throw new Error("Este produto não pertence à empresa da comanda.");
            }

            const total = produto.preco * quantidade;

            await tx.comandaItem.create({
                data: {
                    comandaId,
                    cardapioId,
                    nomeProduto: produto.nome,
                    precoUnitario: produto.preco,
                    quantidade,
                    total
                }
            });

            await tx.comanda.update({
                where: { id: comandaId },
                data: { total: { increment: total } }
            });

            return { ok: true };
        });

        return res.json(result);
    } catch (err) {
        console.error(err);
        return res.status(400).json({ error: err.message || "Erro ao adicionar item." });
    }
};

/* =========================
   REMOVER ITEM
========================= */
const removerItem = async (req, res) => {
    try {
        const itemId = toId(req.params.itemId);
        if (!itemId) return res.status(400).json({ error: "Item inválido." });

        const item = await prisma.comandaItem.findUnique({ where: { id: itemId } });
        if (!item) return res.status(404).json({ error: "Item não encontrado." });

        const comanda = await prisma.comanda.findUnique({ where: { id: item.comandaId } });
        if (!comanda || comanda.status !== "ABERTA") return res.status(400).json({ error: "Só é possível remover itens de uma comanda aberta." });
        if (!(await podeOperar(req, comanda, ["ADMIN","CAIXA","BAR"]))) return res.status(403).json({ error: "Sem permissão para movimentar esta comanda." });

        await prisma.$transaction(async (tx) => {
            await tx.comandaItem.delete({ where: { id: itemId } });
            await tx.comanda.update({
                where: { id: item.comandaId },
                data: { total: { decrement: item.total } }
            });
        });

        return res.json({ ok: true });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro ao remover item." });
    }
};

/* =========================
   LISTAR COMANDAS DA EMPRESA
========================= */
const listBySociety = async (req, res) => {
    try {
        const societyId = toId(req.params.societyId);
        if (!societyId) return res.status(400).json({ error: "Empresa inválida." });
        if (!(await podeGerirEmpresa(req, societyId))) return res.status(403).json({ error: "Sem acesso às comandas desta empresa." });

        const lista = await prisma.comanda.findMany({
            where: { societyId },
            include: includeResumo,
            orderBy: { createdAt: "desc" }
        });

        return res.json(lista);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro ao listar comandas." });
    }
};

/* =========================
   LISTAR COMANDAS DO USUÁRIO
   Não depende de uma empresa selecionada.
========================= */
const listByUsuario = async (req, res) => {
    try {
        const usuarioId = toId(req.params.usuarioId);
        if (!usuarioId) return res.status(400).json({ error: "Usuário inválido." });
        if (!(req.actor?.kind === "USER" && Number(req.actor.id) === Number(usuarioId))) {
            return res.status(403).json({ error: "Sem acesso às comandas deste usuário." });
        }

        const societyId = toId(req.query.societyId);
        const status = req.query.status ? String(req.query.status).toUpperCase() : null;

        const where = { usuarioId };
        if (societyId) where.societyId = societyId;
        if (status) where.status = status;

        const lista = await prisma.comanda.findMany({
            where,
            include: includeResumo,
            orderBy: { createdAt: "desc" }
        });

        return res.json(lista);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro ao listar suas comandas." });
    }
};

/* =========================
   COMANDA ABERTA DO USUÁRIO NA EMPRESA
========================= */
const readOpenByUsuarioSociety = async (req, res) => {
    try {
        const usuarioId = toId(req.params.usuarioId);
        const societyId = toId(req.params.societyId);

        if (!usuarioId || !societyId) {
            return res.status(400).json({ error: "Usuário ou empresa inválidos." });
        }
        if (!(req.actor?.kind === "USER" && Number(req.actor.id) === Number(usuarioId))) {
            return res.status(403).json({ error: "Sem acesso a esta comanda." });
        }

        const comanda = await prisma.comanda.findFirst({
            where: { usuarioId, societyId, status: "ABERTA" },
            include: includeResumo,
            orderBy: { createdAt: "desc" }
        });

        return res.json(comanda || null);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro ao buscar comanda aberta." });
    }
};

/* =========================
   DETALHE DA COMANDA
========================= */
const readOne = async (req, res) => {
    try {
        const id = toId(req.params.id);
        if (!id) return res.status(400).json({ error: "Comanda inválida." });

        const comanda = await prisma.comanda.findUnique({
            where: { id },
            include: includeResumo
        });

        if (!comanda) return res.status(404).json({ error: "Comanda não encontrada." });
        if (!(await podeOperar(req, comanda))) return res.status(403).json({ error: "Sem acesso a esta comanda." });
        return res.json(comanda);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro ao buscar comanda." });
    }
};

/* =========================
   FECHAR COMANDA
========================= */
const fechar = async (req, res) => {
    try {
        const id = toId(req.params.id);
        const comanda = await prisma.comanda.findUnique({
            where: { id },
            include: { itens: { select: { id: true } } }
        });

        if (!comanda || comanda.status !== "ABERTA") return res.status(400).json({ error: "Comanda inválida." });
        if (!(await podeOperar(req, comanda, ["ADMIN","CAIXA","BAR"]))) return res.status(403).json({ error: "Sem permissão para fechar esta comanda." });
        if (!comanda.itens.length) {
            return res.status(400).json({ error: "Adicione pelo menos um item antes de fechar a comanda." });
        }

        await prisma.comanda.update({ where: { id }, data: { status: "FECHADA", fechadaEm: new Date() } });
        await notifyUsuario(prisma, comanda.usuarioId, "Comanda fechada", `Sua comanda foi fechada no valor de R$ ${Number(comanda.total||0).toFixed(2)}.`);
        await notifyStaff(prisma, comanda.societyId, "Comanda aguardando pagamento", `Comanda #${comanda.codigo || comanda.id} foi fechada.`, ["ADMIN","CAIXA"]);
        return res.json({ ok: true });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro ao fechar comanda." });
    }
};

/* =========================
   GERAR PAGAMENTO
========================= */
const gerarPagamento = async (req, res) => {
    try {
        const id = toId(req.params.id);
        const comanda = await prisma.comanda.findUnique({ where: { id }, include: { pagamento: true } });

        if (!comanda || comanda.status !== "FECHADA") return res.status(400).json({ error: "Comanda precisa estar fechada." });
        if (!(await podeOperar(req, comanda, ["ADMIN","CAIXA","BAR"]))) return res.status(403).json({ error: "Sem permissão para gerar pagamento." });

        if (comanda.pagamento) return res.json(comanda.pagamento);

        const pagamento = await prisma.pagamento.create({
            data: {
                usuarioId: comanda.usuarioId,
                societyId: comanda.societyId,
                timeId: comanda.timeId,
                tipo: "CONSUMO_BAR",
                valor: comanda.total,
                status: "PENDENTE",
                descricao: "Consumo de bar",
                comanda: { connect: { id: comanda.id } }
            }
        });

        return res.json(pagamento);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro ao gerar pagamento." });
    }
};

/* =========================
   PAGAR COMANDA
========================= */
const pagar = async (req, res) => {
    try {
        const id = toId(req.params.id);
        const comanda = await prisma.comanda.findUnique({ where: { id }, include: { pagamento: true } });

        if (!comanda || !comanda.pagamento) return res.status(400).json({ error: "Pagamento não encontrado." });
        if (!(await podeOperar(req, comanda, ["ADMIN","CAIXA"], false))) return res.status(403).json({ error: "Somente Caixa/Administrador pode confirmar pagamento." });

        await prisma.$transaction(async (tx) => {
            await tx.pagamento.update({
                where: { id: comanda.pagamento.id },
                data: { status: "PAGO", pagoEm: new Date() }
            });
            await tx.comanda.update({
                where: { id },
                data: { status: "PAGA", pagaEm: new Date() }
            });
        });

        await notifyUsuario(prisma, comanda.usuarioId, "Pagamento confirmado", `Pagamento da comanda #${comanda.codigo || comanda.id} confirmado.`);
        return res.json({ ok: true });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro ao pagar comanda." });
    }
};

module.exports = {
    abrir,
    adicionarItem,
    removerItem,
    listBySociety,
    listByUsuario,
    readOpenByUsuarioSociety,
    readOne,
    fechar,
    gerarPagamento,
    pagar
};
