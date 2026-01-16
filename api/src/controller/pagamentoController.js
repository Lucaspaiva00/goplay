// ✅ api/src/controller/pagamentoController.js  (ARQUIVO TODO)
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/* =========================
   GET /pagamentos/:id  ✅ (DETALHE POR LINK)
========================= */
const readOne = async (req, res) => {
    try {
        const { id } = req.params;

        const pagamento = await prisma.pagamento.findUnique({
            where: { id: Number(id) },
            include: {
                society: true,
                time: true,
                campo: true,
                agendamento: true,
                usuario: true,
            },
        });

        if (!pagamento) return res.status(404).json({ error: "Pagamento não encontrado." });

        res.json(pagamento);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro ao buscar pagamento." });
    }
};

/* =========================
   CRIAR PAGAMENTO (AGENDAMENTO)
========================= */
const createPagamentoAgendamento = async (req, res) => {
    try {
        const {
            usuarioId,
            societyId,
            timeId,
            campoId,
            agendamentoId,
            forma = "PIX",
            recorrente = false,
        } = req.body;

        if (!usuarioId || !societyId || !timeId || !campoId || !agendamentoId) {
            return res.status(400).json({ error: "Dados incompletos." });
        }

        const agendamento = await prisma.agendamento.findUnique({
            where: { id: Number(agendamentoId) },
            include: { pagamento: true, campo: true },
        });

        if (!agendamento) return res.status(404).json({ error: "Agendamento não encontrado." });
        if (agendamento.pagamento) return res.status(400).json({ error: "Pagamento já existe." });

        const tipo = recorrente ? "MENSALISTA" : "AVULSO";
        const valor = recorrente
            ? Number(agendamento?.campo?.valorMensal || 0)
            : Number(agendamento?.valor || 0);

        const pagamento = await prisma.pagamento.create({
            data: {
                usuarioId: Number(usuarioId),
                societyId: Number(societyId),
                timeId: Number(timeId),
                campoId: Number(campoId),
                agendamentoId: Number(agendamentoId),
                tipo,
                valor,
                forma,
                status: "PENDENTE",
                descricao: recorrente
                    ? "Mensalidade de horário fixo"
                    : `Pagamento horário ${agendamento.horaInicio} às ${agendamento.horaFim}`,
            },
        });

        return res.json(pagamento);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Erro ao criar pagamento." });
    }
};

/* =========================
   CONFIRMAR PAGAMENTO
========================= */
const confirmarPagamento = async (req, res) => {
    try {
        const { id } = req.params;

        const pagamento = await prisma.pagamento.findUnique({
            where: { id: Number(id) },
            include: { agendamento: true },
        });

        if (!pagamento) return res.status(404).json({ error: "Pagamento não encontrado." });
        if (pagamento.status === "PAGO") return res.status(400).json({ error: "Pagamento já confirmado." });

        await prisma.pagamento.update({
            where: { id: Number(id) },
            data: { status: "PAGO", pagoEm: new Date() },
        });

        if (pagamento.agendamentoId) {
            await prisma.agendamento.update({
                where: { id: pagamento.agendamentoId },
                data: { status: "CONFIRMADO" },
            });
        }

        return res.json({ ok: true });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Erro ao confirmar pagamento." });
    }
};

/* =========================
   PAGAMENTOS DO SOCIETY
========================= */
const listBySociety = async (req, res) => {
    try {
        const { societyId } = req.params;

        const pagamentos = await prisma.pagamento.findMany({
            where: { societyId: Number(societyId) },
            include: { usuario: true, time: true, campo: true, agendamento: true },
            orderBy: { createdAt: "desc" },
        });

        return res.json(pagamentos);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Erro ao listar pagamentos." });
    }
};

/* =========================
   PAGAMENTOS DO TIME
========================= */
const listByTime = async (req, res) => {
    try {
        const { timeId } = req.params;

        const pagamentos = await prisma.pagamento.findMany({
            where: { timeId: Number(timeId) },
            include: { campo: true, agendamento: true },
            orderBy: { createdAt: "desc" },
        });

        return res.json(pagamentos);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Erro ao listar pagamentos." });
    }
};

/* =========================
   MEUS PAGAMENTOS (USUÁRIO)
========================= */
const listarPorUsuario = async (req, res) => {
    try {
        const { usuarioId } = req.params;

        const pagamentos = await prisma.pagamento.findMany({
            where: { usuarioId: Number(usuarioId) },
            include: { society: true, time: true, campo: true, agendamento: true },
            orderBy: { createdAt: "desc" },
        });

        const total = pagamentos.reduce((s, p) => s + Number(p.valor || 0), 0);
        return res.json({ pagamentos, total });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Erro ao buscar pagamentos do usuário." });
    }
};

/* =========================
   MENSALIDADE (opcional)
========================= */
const createMensalidade = async (req, res) => {
    try {
        const { usuarioId, societyId, timeId, campoId, valor } = req.body;

        if (!usuarioId || !societyId || !timeId || !campoId || !valor) {
            return res.status(400).json({ error: "Dados incompletos." });
        }

        const pagamento = await prisma.pagamento.create({
            data: {
                usuarioId: Number(usuarioId),
                societyId: Number(societyId),
                timeId: Number(timeId),
                campoId: Number(campoId),
                tipo: "MENSALISTA",
                valor: Number(valor),
                forma: "PIX",
                status: "PAGO",
                pagoEm: new Date(),
                descricao: "Mensalidade do campo",
            },
        });

        return res.json(pagamento);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Erro ao gerar mensalidade." });
    }
};



module.exports = {
    readOne,
    createPagamentoAgendamento,
    createMensalidade,
    confirmarPagamento,
    listBySociety,
    listByTime,
    listarPorUsuario,
};
