const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { notifyUsuario, notifyStaff } = require("../notifications");

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

    // O time pode reservar em qualquer empresa.
    // O vínculo do time com uma empresa não limita onde ele pode jogar.
    if (Number(campo.societyId) !== Number(societyId)) {
      return res.status(400).json({ error: "A quadra selecionada não pertence a esta empresa." });
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
      data: { societyId, campoId, timeId, data, horaInicio, horaFim, valor: campo.valorAvulso, status: "PENDENTE" },
    });
    await notifyUsuario(prisma, time.donoId, "Reserva criada", `Reserva em ${dataStr} às ${horaInicio} aguardando confirmação/pagamento.`);
    await notifyStaff(prisma, societyId, "Nova reserva", `${time.nome} reservou ${campo.nome} para ${dataStr} às ${horaInicio}.`, ["ADMIN","CAIXA","RECEPCAO"]);
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
        society: { select: { id: true, nome: true, imagem: true, pixChave: true, pixTitular: true } },
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
      include: { pagamento: true, time: true, campo: true },
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

    await prisma.agendamento.update({ where: { id }, data: { status: "CANCELADO" } });
    await notifyUsuario(prisma, agendamento.time?.donoId, "Reserva cancelada", `A reserva de ${agendamento.horaInicio} foi cancelada.`);
    await notifyStaff(prisma, agendamento.societyId, "Reserva cancelada", `${agendamento.time?.nome || "Time"} cancelou a reserva das ${agendamento.horaInicio}.`, ["ADMIN","CAIXA","RECEPCAO"]);
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


/* =========================
   REMARCAR AGENDAMENTO (OPERAÇÃO)
========================= */
const remarcar = async (req, res) => {
  try {
    const id = toId(req.params.id);
    const dataStr = String(req.body.data || "").trim();
    const horaInicio = String(req.body.horaInicio || "").trim();
    if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(dataStr) || !/^\d{2}:\d{2}$/.test(horaInicio)) {
      return res.status(400).json({ error: "Data ou horário inválidos." });
    }
    const atual = await prisma.agendamento.findUnique({ where: { id }, include: { time: true, campo: true } });
    if (!atual) return res.status(404).json({ error: "Agendamento não encontrado." });
    if (atual.status === "CANCELADO") return res.status(400).json({ error: "Agendamento cancelado não pode ser remarcado." });
    const data = parseDateOnly(dataStr);
    const [hh, mm] = horaInicio.split(":").map(Number);
    if (!Number.isInteger(hh) || hh < 0 || hh > 23 || !Number.isInteger(mm) || mm < 0 || mm > 59) return res.status(400).json({ error: "Horário inválido." });
    const fimMin = hh * 60 + mm + 60;
    if (fimMin > 24 * 60) return res.status(400).json({ error: "Horário final ultrapassa o dia." });
    const horaFim = `${String(Math.floor(fimMin / 60)).padStart(2, "0")}:${String(fimMin % 60).padStart(2, "0")}`;
    const conflito = await prisma.agendamento.findFirst({
      where: {
        id: { not: id }, campoId: atual.campoId, data, status: { not: "CANCELADO" },
        OR: [{ horaInicio: { lte: horaInicio }, horaFim: { gt: horaInicio } }, { horaInicio: { lt: horaFim }, horaFim: { gte: horaFim } }]
      }
    });
    if (conflito) return res.status(409).json({ error: "Esse horário já está ocupado nesta quadra." });
    const atualizado = await prisma.agendamento.update({ where: { id }, data: { data, horaInicio, horaFim } });
    await notifyUsuario(prisma, atual.time?.donoId, "Reserva remarcada", `Sua reserva foi movida para ${dataStr} às ${horaInicio}.`);
    await notifyStaff(prisma, atual.societyId, "Reserva remarcada", `${atual.time?.nome || "Time"} agora joga em ${dataStr} às ${horaInicio}.`, ["ADMIN","CAIXA","RECEPCAO"]);
    return res.json(atualizado);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao remarcar agendamento." });
  }
};

module.exports = {
  remarcar,
  horariosDisponiveis,
  create,
  listByTime,
  cancelar,
  listBySociety,
};