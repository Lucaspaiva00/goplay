const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/* =========================
   HELPERS
========================= */
const toId = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const parseDateOnly = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/* =========================
   HORÁRIOS DISPONÍVEIS
========================= */
const horariosDisponiveis = async (req, res) => {
  try {
    const campoId = toId(req.query.campoId);
    const dataStr = req.query.data;

    if (!campoId || !dataStr) {
      return res.status(400).json({ error: "campoId e data são obrigatórios." });
    }

    const campo = await prisma.campo.findUnique({
      where: { id: campoId },
    });

    if (!campo) {
      return res.status(404).json({ error: "Campo não encontrado." });
    }

    const data = parseDateOnly(dataStr);

    const HORA_INICIO = 18;
    const HORA_FIM = 23;

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        campoId,
        data,
        status: { not: "CANCELADO" },
      },
      select: {
        horaInicio: true,
      },
    });

    const ocupados = agendamentos.map(a => a.horaInicio);

    const horarios = [];

    for (let h = HORA_INICIO; h < HORA_FIM; h++) {
      const inicio = `${String(h).padStart(2, "0")}:00`;
      const fim = `${String(h + 1).padStart(2, "0")}:00`;

      horarios.push({
        horaInicio: inicio,
        horaFim: fim,
        disponivel: !ocupados.includes(inicio),
      });
    }

    res.json(horarios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar horários." });
  }
};

/* =========================
   CRIAR AGENDAMENTO
========================= */
const create = async (req, res) => {
  try {
    const societyId = toId(req.body.societyId);
    const campoId = toId(req.body.campoId);
    const timeId = toId(req.body.timeId);
    const dataStr = req.body.data;
    const horaInicio = String(req.body.horaInicio || "");

    if (!societyId || !campoId || !timeId || !dataStr || !horaInicio) {
      return res.status(400).json({ error: "Dados incompletos." });
    }

    const data = parseDateOnly(dataStr);

    const campo = await prisma.campo.findUnique({
      where: { id: campoId },
    });

    if (!campo) {
      return res.status(404).json({ error: "Campo não encontrado." });
    }

    const time = await prisma.time.findUnique({
      where: { id: timeId },
    });

    if (!time) {
      return res.status(404).json({ error: "Time não encontrado." });
    }

    if (time.societyId !== societyId) {
      return res.status(400).json({ error: "Time não pertence a este society." });
    }

    const horaFim = `${String(Number(horaInicio.split(":")[0]) + 1).padStart(2, "0")}:00`;

    // 🔥 conflito REAL (intervalo)
    const conflito = await prisma.agendamento.findFirst({
      where: {
        campoId,
        data,
        status: { not: "CANCELADO" },
        OR: [
          {
            horaInicio: { lte: horaInicio },
            horaFim: { gt: horaInicio },
          },
          {
            horaInicio: { lt: horaFim },
            horaFim: { gte: horaFim },
          }
        ]
      },
    });

    if (conflito) {
      return res.status(400).json({ error: "Horário já ocupado." });
    }

    if (!campo.valorAvulso) {
      return res.status(400).json({ error: "Campo sem valor configurado." });
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        societyId,
        campoId,
        timeId,
        data,
        horaInicio,
        horaFim,
        valor: campo.valorAvulso,
        status: "PENDENTE",
      },
    });

    return res.status(201).json(agendamento);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar agendamento." });
  }
};

/* =========================
   LISTAR POR TIME
========================= */
const listByTime = async (req, res) => {
  try {
    const timeId = toId(req.params.timeId);

    if (!timeId) {
      return res.status(400).json({ error: "timeId inválido." });
    }

    const lista = await prisma.agendamento.findMany({
      where: { timeId },
      include: {
        campo: true,
        pagamento: true,
      },
      orderBy: { data: "desc" },
    });

    res.json(lista);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar agendamentos." });
  }
};

/* =========================
   CANCELAR
========================= */
const cancelar = async (req, res) => {
  try {
    const id = toId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "ID inválido." });
    }

    const agendamento = await prisma.agendamento.findUnique({
      where: { id },
      include: { pagamento: true },
    });

    if (!agendamento) {
      return res.status(404).json({ error: "Agendamento não encontrado." });
    }

    if (agendamento.status === "CANCELADO") {
      return res.status(400).json({ error: "Agendamento já está cancelado." });
    }

    if (agendamento.pagamento?.status === "PAGO") {
      return res.status(400).json({
        error: "Agendamento já pago. Regra de cancelamento deve ser tratada.",
      });
    }

    await prisma.agendamento.update({
      where: { id },
      data: { status: "CANCELADO" },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao cancelar agendamento." });
  }
};

/* =========================
   LISTAR POR SOCIETY
========================= */
const listBySociety = async (req, res) => {
  try {
    const societyId = toId(req.params.societyId);
    const dataStr = req.query.data;

    if (!societyId) {
      return res.status(400).json({ error: "societyId inválido." });
    }

    const where = { societyId };

    if (dataStr) {
      where.data = parseDateOnly(dataStr);
    }

    const lista = await prisma.agendamento.findMany({
      where,
      include: {
        campo: true,
        time: true,
        pagamento: true,
      },
      orderBy: [{ data: "desc" }, { horaInicio: "asc" }],
    });

    res.json(lista);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar agendamentos do society." });
  }
};

module.exports = {
  horariosDisponiveis,
  create,
  listByTime,
  cancelar,
  listBySociety,
};