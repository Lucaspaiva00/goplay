const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/* =========================
   HELPERS
========================= */
const toId = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

const toMoney = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

/* =========================
   GET /pagamentos/:id
========================= */
const readOne = async (req, res) => {
    try {
        const id = toId(req.params.id);

        if (!id) {
            return res.status(400).json({ error: "ID inválido." });
        }

        const pagamento = await prisma.pagamento.findUnique({
            where: { id },
            include: {
                society: true,
                time: true,
                campo: true,
                agendamento: true,
                usuario: true,
            },
        });

        if (!pagamento) {
            return res.status(404).json({ error: "Pagamento não encontrado." });
        }

        return res.json(pagamento);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Erro ao buscar pagamento." });
    }
};

/* =========================
   CRIAR PAGAMENTO (AGENDAMENTO)
========================= */
const createPagamentoAgendamento = async (req, res) => {
    try {
        const usuarioId = toId(req.body.usuarioId);
        const societyId = toId(req.body.societyId);
        const timeId = toId(req.body.timeId);
        const campoId = toId(req.body.campoId);
        const agendamentoId = toId(req.body.agendamentoId);
        const forma = String(req.body.forma || "PIX").trim();
        const recorrente = !!req.body.recorrente;

        if (!usuarioId || !societyId || !timeId || !campoId || !agendamentoId) {
            return res.status(400).json({ error: "Dados incompletos." });
        }

        const usuario = await prisma.usuario.findUnique({
            where: { id: usuarioId }
        });

        if (!usuario) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        const society = await prisma.society.findUnique({
            where: { id: societyId }
        });

        if (!society) {
            return res.status(404).json({ error: "Society não encontrado." });
        }

        const time = await prisma.time.findUnique({
            where: { id: timeId }
        });

        if (!time) {
            return res.status(404).json({ error: "Time não encontrado." });
        }

        const campo = await prisma.campo.findUnique({
            where: { id: campoId }
        });

        if (!campo) {
            return res.status(404).json({ error: "Campo não encontrado." });
        }

        const agendamento = await prisma.agendamento.findUnique({
            where: { id: agendamentoId },
            include: {
                pagamento: true,
                campo: true
            },
        });

        if (!agendamento) {
            return res.status(404).json({ error: "Agendamento não encontrado." });
        }

        if (agendamento.pagamento) {
            return res.status(400).json({ error: "Pagamento já existe para este agendamento." });
        }

        // valida consistência dos vínculos
        if (Number(agendamento.societyId) !== societyId) {
            return res.status(400).json({ error: "Agendamento não pertence ao society informado." });
        }

        if (Number(agendamento.timeId) !== timeId) {
            return res.status(400).json({ error: "Agendamento não pertence ao time informado." });
        }

        if (Number(agendamento.campoId) !== campoId) {
            return res.status(400).json({ error: "Agendamento não pertence ao campo informado." });
        }

        if (Number(time.societyId) !== societyId) {
            return res.status(400).json({ error: "Time não pertence ao society informado." });
        }

        if (Number(campo.societyId) !== societyId) {
            return res.status(400).json({ error: "Campo não pertence ao society informado." });
        }

        const tipo = recorrente ? "MENSALISTA" : "AVULSO";
        const valor = recorrente
            ? Number(agendamento?.campo?.valorMensal || 0)
            : Number(agendamento?.valor || 0);

        if (!Number.isFinite(valor) || valor <= 0) {
            return res.status(400).json({ error: "Valor do pagamento inválido." });
        }

        const pagamento = await prisma.pagamento.create({
            data: {
                usuarioId,
                societyId,
                timeId,
                campoId,
                agendamentoId,
                tipo,
                valor,
                forma,
                status: "PENDENTE",
                descricao: recorrente
                    ? "Mensalidade de horário fixo"
                    : `Pagamento horário ${agendamento.horaInicio} às ${agendamento.horaFim}`,
            },
        });

        return res.status(201).json(pagamento);
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
        const id = toId(req.params.id);

        if (!id) {
            return res.status(400).json({ error: "ID inválido." });
        }

        const result = await prisma.$transaction(async (tx) => {
            const pagamento = await tx.pagamento.findUnique({
                where: { id },
                include: { agendamento: true },
            });

            if (!pagamento) {
                return { status: 404, body: { error: "Pagamento não encontrado." } };
            }

            if (pagamento.status === "PAGO") {
                return { status: 400, body: { error: "Pagamento já confirmado." } };
            }

            if (pagamento.status === "CANCELADO") {
                return { status: 400, body: { error: "Pagamento cancelado não pode ser confirmado." } };
            }

            await tx.pagamento.update({
                where: { id },
                data: { status: "PAGO", pagoEm: new Date() },
            });

            if (pagamento.agendamentoId) {
                await tx.agendamento.update({
                    where: { id: pagamento.agendamentoId },
                    data: { status: "CONFIRMADO" },
                });
            }

            return { status: 200, body: { ok: true } };
        });

        return res.status(result.status).json(result.body);
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
        const societyId = toId(req.params.societyId);

        if (!societyId) {
            return res.status(400).json({ error: "societyId inválido." });
        }

        const pagamentos = await prisma.pagamento.findMany({
            where: { societyId },
            include: {
                usuario: true,
                time: true,
                campo: true,
                agendamento: true
            },
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
        const timeId = toId(req.params.timeId);

        if (!timeId) {
            return res.status(400).json({ error: "timeId inválido." });
        }

        const pagamentos = await prisma.pagamento.findMany({
            where: { timeId },
            include: {
                campo: true,
                agendamento: true
            },
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
        const usuarioId = toId(req.params.usuarioId);

        if (!usuarioId) {
            return res.status(400).json({ error: "usuarioId inválido." });
        }

        const pagamentos = await prisma.pagamento.findMany({
            where: { usuarioId },
            include: {
                society: true,
                time: true,
                campo: true,
                agendamento: true
            },
            orderBy: { createdAt: "desc" },
        });

        const total = pagamentos.reduce((soma, p) => soma + Number(p.valor || 0), 0);

        return res.json({ pagamentos, total });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Erro ao buscar pagamentos do usuário." });
    }
};

/* =========================
   CRIAR MENSALIDADE
========================= */
const createMensalidade = async (req, res) => {
    try {
        const usuarioId = toId(req.body.usuarioId);
        const societyId = toId(req.body.societyId);
        const timeId = toId(req.body.timeId);
        const campoId = toId(req.body.campoId);
        const valor = toMoney(req.body.valor);
        const forma = String(req.body.forma || "PIX").trim();

        if (!usuarioId || !societyId || !timeId || !campoId || !Number.isFinite(valor) || valor <= 0) {
            return res.status(400).json({ error: "Dados incompletos ou inválidos." });
        }

        const usuario = await prisma.usuario.findUnique({
            where: { id: usuarioId }
        });

        if (!usuario) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        const society = await prisma.society.findUnique({
            where: { id: societyId }
        });

        if (!society) {
            return res.status(404).json({ error: "Society não encontrado." });
        }

        const time = await prisma.time.findUnique({
            where: { id: timeId }
        });

        if (!time) {
            return res.status(404).json({ error: "Time não encontrado." });
        }

        const campo = await prisma.campo.findUnique({
            where: { id: campoId }
        });

        if (!campo) {
            return res.status(404).json({ error: "Campo não encontrado." });
        }

        if (Number(time.societyId) !== societyId) {
            return res.status(400).json({ error: "Time não pertence ao society informado." });
        }

        if (Number(campo.societyId) !== societyId) {
            return res.status(400).json({ error: "Campo não pertence ao society informado." });
        }

        const pagamento = await prisma.pagamento.create({
            data: {
                usuarioId,
                societyId,
                timeId,
                campoId,
                tipo: "MENSALISTA",
                valor,
                forma,
                status: "PAGO",
                pagoEm: new Date(),
                descricao: "Mensalidade do campo",
            },
        });

        return res.status(201).json(pagamento);
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