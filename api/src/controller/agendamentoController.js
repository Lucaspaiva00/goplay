const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Helpers
 */
function horaToMin(hora) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/**
 * ============================
 * LISTAR HORÁRIOS DISPONÍVEIS
 * ============================
 * GET /agendamentos/disponiveis?campoId=1&data=2026-01-20
 */
const horariosDisponiveis = async (req, res) => {
  try {
    const { campoId, data } = req.query;

    if (!campoId || !data) {
      return res.status(400).json({ error: "campoId e data são obrigatórios." });
    }

    const campo = await prisma.campo.findUnique({
      where: { id: Number(campoId) },
    });

    if (!campo) {
      return res.status(404).json({ error: "Campo não encontrado." });
    }

    // 🔒 horários fixos (pode virar config depois)
    const HORA_INICIO = 18;
    const HORA_FIM = 23;

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        campoId: Number(campoId),
        data: new Date(data),
        status: { not: "CANCELADO" },
      },
      select: {
        horaInicio: true,
        horaFim: true,
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

/**
 * ============================
 * CRIAR AGENDAMENTO
 * ============================
 * POST /agendamentos
 */
const create = async (req, res) => {
  try {
    const { societyId, campoId, timeId, data, horaInicio } = req.body;

    if (!societyId || !campoId || !timeId || !data || !horaInicio) {
      return res.status(400).json({ error: "Dados incompletos." });
    }

    const horaFim = `${String(Number(horaInicio.split(":")[0]) + 1).padStart(2, "0")}:00`;

    // 🔒 verifica conflito
    const conflito = await prisma.agendamento.findFirst({
      where: {
        campoId: Number(campoId),
        data: new Date(data),
        horaInicio,
        status: { not: "CANCELADO" },
      },
    });

    if (conflito) {
      return res.status(400).json({ error: "Horário já ocupado." });
    }

    const campo = await prisma.campo.findUnique({
      where: { id: Number(campoId) },
    });

    if (!campo?.valorAvulso) {
      return res.status(400).json({ error: "Campo sem valor configurado." });
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        societyId: Number(societyId),
        campoId: Number(campoId),
        timeId: Number(timeId),
        data: new Date(data),
        horaInicio,
        horaFim,
        valor: campo.valorAvulso,
        status: "PENDENTE",
      },
    });

    res.json(agendamento);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar agendamento." });
  }
};

/**
 * ============================
 * LISTAR AGENDAMENTOS DO TIME
 * ============================
 * GET /agendamentos/time/:timeId
 */
const listByTime = async (req, res) => {
  try {
    const { timeId } = req.params;

    const lista = await prisma.agendamento.findMany({
      where: { timeId: Number(timeId) },
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

/**
 * ============================
 * CANCELAR AGENDAMENTO
 * ============================
 * POST /agendamentos/:id/cancelar
 */
const cancelar = async (req, res) => {
  try {
    const { id } = req.params;

    const agendamento = await prisma.agendamento.findUnique({
      where: { id: Number(id) },
      include: { pagamento: true },
    });

    if (!agendamento) {
      return res.status(404).json({ error: "Agendamento não encontrado." });
    }

    if (agendamento.pagamento?.status === "PAGO") {
      return res.status(400).json({
        error: "Agendamento já pago. Regra de cancelamento deve ser tratada.",
      });
    }

    await prisma.agendamento.update({
      where: { id: agendamento.id },
      data: { status: "CANCELADO" },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao cancelar agendamento." });
  }
};

// GET /agendamentos/society/:societyId?data=2026-01-20
const listBySociety = async (req, res) => {
  try {
    const societyId = Number(req.params.societyId);
    const data = req.query.data;

    const where = { societyId };

    if (data) {
      where.data = new Date(data);
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
