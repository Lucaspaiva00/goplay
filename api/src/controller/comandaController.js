const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/* =========================
   HELPERS
========================= */
const toId = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
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
            return res.status(400).json({ error: "Dados incompletos." });
        }

        const comanda = await prisma.comanda.create({
            data: {
                usuarioId,
                societyId,
                timeId: timeId || null,
                status: "ABERTA"
            }
        });

        return res.status(201).json(comanda);

    } catch (err) {
        console.error(err);
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

        if (!comandaId || !cardapioId || quantidade <= 0) {
            return res.status(400).json({ error: "Dados inválidos." });
        }

        const result = await prisma.$transaction(async (tx) => {

            const comanda = await tx.comanda.findUnique({
                where: { id: comandaId }
            });

            if (!comanda || comanda.status !== "ABERTA") {
                throw new Error("Comanda inválida ou fechada.");
            }

            const produto = await tx.cardapio.findUnique({
                where: { id: cardapioId }
            });

            if (!produto) {
                throw new Error("Produto não encontrado.");
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
                data: {
                    total: {
                        increment: total
                    }
                }
            });

            return { ok: true };
        });

        return res.json(result);

    } catch (err) {
        console.error(err);
        return res.status(400).json({ error: err.message });
    }
};

/* =========================
   REMOVER ITEM
========================= */
const removerItem = async (req, res) => {
    try {
        const itemId = toId(req.params.itemId);

        const item = await prisma.comandaItem.findUnique({
            where: { id: itemId }
        });

        if (!item) {
            return res.status(404).json({ error: "Item não encontrado." });
        }

        await prisma.$transaction(async (tx) => {
            await tx.comandaItem.delete({
                where: { id: itemId }
            });

            await tx.comanda.update({
                where: { id: item.comandaId },
                data: {
                    total: {
                        decrement: item.total
                    }
                }
            });
        });

        return res.json({ ok: true });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro ao remover item." });
    }
};

/* =========================
   LISTAR COMANDAS DO SOCIETY
========================= */
const listBySociety = async (req, res) => {
    try {
        const societyId = toId(req.params.societyId);

        const lista = await prisma.comanda.findMany({
            where: { societyId },
            include: {
                usuario: true,
                time: true
            },
            orderBy: { createdAt: "desc" }
        });

        return res.json(lista);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro ao listar comandas." });
    }
};

/* =========================
   DETALHE DA COMANDA
========================= */
const readOne = async (req, res) => {
    try {
        const id = toId(req.params.id);

        const comanda = await prisma.comanda.findUnique({
            where: { id },
            include: {
                itens: true,
                usuario: true,
                time: true,
                pagamento: true
            }
        });

        if (!comanda) {
            return res.status(404).json({ error: "Comanda não encontrada." });
        }

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
            where: { id }
        });

        if (!comanda || comanda.status !== "ABERTA") {
            return res.status(400).json({ error: "Comanda inválida." });
        }

        await prisma.comanda.update({
            where: { id },
            data: {
                status: "FECHADA",
                fechadaEm: new Date()
            }
        });

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

        const comanda = await prisma.comanda.findUnique({
            where: { id }
        });

        if (!comanda || comanda.status !== "FECHADA") {
            return res.status(400).json({ error: "Comanda precisa estar fechada." });
        }

        const pagamento = await prisma.pagamento.create({
            data: {
                usuarioId: comanda.usuarioId,
                societyId: comanda.societyId,
                timeId: comanda.timeId,
                tipo: "CONSUMO_BAR",
                valor: comanda.total,
                status: "PENDENTE",
                descricao: "Consumo de bar",
                comanda: {
                    connect: { id: comanda.id }
                }
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

        const comanda = await prisma.comanda.findUnique({
            where: { id },
            include: { pagamento: true }
        });

        if (!comanda || !comanda.pagamento) {
            return res.status(400).json({ error: "Pagamento não encontrado." });
        }

        await prisma.$transaction(async (tx) => {

            await tx.pagamento.update({
                where: { id: comanda.pagamento.id },
                data: {
                    status: "PAGO",
                    pagoEm: new Date()
                }
            });

            await tx.comanda.update({
                where: { id },
                data: {
                    status: "PAGA",
                    pagaEm: new Date()
                }
            });

        });

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
    readOne,
    fechar,
    gerarPagamento,
    pagar
};