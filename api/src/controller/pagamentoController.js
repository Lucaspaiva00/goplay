const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * ============================
 * CRIAR PAGAMENTO (AGENDAMENTO)
 * ============================
 * POST /pagamentos/agendamento
 */
const createPagamentoAgendamento = async (req, res) => {
    try {
        const {
            usuarioId,
            societyId,
            timeId,
            campoId,
            agendamentoId,
            forma = "PIX",
        } = req.body;

        if (!usuarioId || !societyId || !timeId || !campoId || !agendamentoId) {
            return res.status(400).json({ error: "Dados incompletos." });
        }

        const agendamento = await prisma.agendamento.findUnique({
            where: { id: Number(agendamentoId) },
            include: { pagamento: true },
        });

        if (!agendamento) {
            return res.status(404).json({ error: "Agendamento não encontrado." });
        }

        if (agendamento.status !== "PENDENTE") {
            return res.status(400).json({ error: "Agendamento não está pendente." });
        }

        if (agendamento.pagamento) {
            return res.status(400).json({ error: "Pagamento já criado para este agendamento." });
        }

        const pagamento = await prisma.pagamento.create({
            data: {
                usuarioId: Number(usuarioId),
                societyId: Number(societyId),
                timeId: Number(timeId),
                campoId: Number(campoId),
                agendamentoId: agendamento.id,
                tipo: "AVULSO",
                valor: agendamento.valor,
                forma,
                status: "PENDENTE",
                descricao: `Pagamento horário ${agendamento.horaInicio} às ${agendamento.horaFim}`,
            },
        });

        res.json(pagamento);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao criar pagamento." });
    }
};

/**
 * ============================
 * CONFIRMAR PAGAMENTO
 * ============================
 * POST /pagamentos/:id/confirmar
 */
const confirmarPagamento = async (req, res) => {
    try {
        const { id } = req.params;

        const pagamento = await prisma.pagamento.findUnique({
            where: { id: Number(id) },
            include: { agendamento: true },
        });

        if (!pagamento) {
            return res.status(404).json({ error: "Pagamento não encontrado." });
        }

        if (pagamento.status === "PAGO") {
            return res.status(400).json({ error: "Pagamento já confirmado." });
        }

        // 1️⃣ Marca pagamento como pago
        await prisma.pagamento.update({
            where: { id: pagamento.id },
            data: {
                status: "PAGO",
                pagoEm: new Date(),
            },
        });

        // 2️⃣ Confirma o agendamento automaticamente
        if (pagamento.agendamentoId) {
            await prisma.agendamento.update({
                where: { id: pagamento.agendamentoId },
                data: { status: "CONFIRMADO" },
            });
        }

        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao confirmar pagamento." });
    }
};

/**
 * ============================
 * LISTAR PAGAMENTOS DA SOCIETY
 * ============================
 * GET /pagamentos/society/:societyId
 */
const listBySociety = async (req, res) => {
    try {
        const { societyId } = req.params;

        const lista = await prisma.pagamento.findMany({
            where: { societyId: Number(societyId) },
            include: {
                time: true,
                campo: true,
                agendamento: true,
                usuario: true,
            },
            orderBy: { createdAt: "desc" },
        });

        res.json(lista);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao listar pagamentos." });
    }
};

/**
 * ============================
 * LISTAR PAGAMENTOS DO TIME
 * ============================
 * GET /pagamentos/time/:timeId
 */
const listByTime = async (req, res) => {
    try {
        const { timeId } = req.params;

        const lista = await prisma.pagamento.findMany({
            where: { timeId: Number(timeId) },
            include: {
                campo: true,
                agendamento: true,
            },
            orderBy: { createdAt: "desc" },
        });

        res.json(lista);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao listar pagamentos." });
    }
};

module.exports = {
    createPagamentoAgendamento,
    confirmarPagamento,
    listBySociety,
    listByTime,
};
