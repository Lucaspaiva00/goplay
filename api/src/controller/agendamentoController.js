const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { notifyUsuario, notifyStaff } = require("../notifications");
const { configForDate, validateInterval, buildSlots, timeToMinutes, endToMinutes } = require("../businessHours");

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
    if (!campoId || !dataStr) return res.status(400).json({ error: "campoId e data são obrigatórios." });
    const campo = await prisma.campo.findUnique({ where:{id:campoId}, include:{ society:{ include:{ horariosFuncionamento:{ orderBy:{diaSemana:"asc"} } } } } });
    if (!campo) return res.status(404).json({ error: "Campo não encontrado." });
    const data = parseDateOnly(dataStr);
    const config = configForDate(campo.society?.horariosFuncionamento, data);
    if (!config.ativo) return res.json([]);
    const agendamentos = await prisma.agendamento.findMany({ where:{campoId,data,status:{not:"CANCELADO"}}, select:{horaInicio:true} });
    const ocupados=new Set(agendamentos.map(a=>String(a.horaInicio).slice(0,5)));
    return res.json(buildSlots(config).map(s=>({...s,disponivel:!ocupados.has(s.horaInicio)})));
  } catch(err){ console.error(err); return res.status(500).json({error:"Erro ao listar horários."}); }
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

    const [hh, mm] = horaInicio.split(":").map(Number);
    const fimMin = hh * 60 + (mm || 0) + 60;
    const horaFim = fimMin === 1440 ? "00:00" : `${String(Math.floor(fimMin / 60)).padStart(2, "0")}:${String(fimMin % 60).padStart(2, "0")}`;

    const society = await prisma.society.findUnique({ where:{id:societyId}, include:{ horariosFuncionamento:true } });
    const validacaoFuncionamento = validateInterval(configForDate(society?.horariosFuncionamento, data), horaInicio, horaFim);
    if (!validacaoFuncionamento.ok) return res.status(400).json({ error: validacaoFuncionamento.error });

    // Conflito real por intervalo, inclusive quando o encerramento é 00:00.
    const existentes = await prisma.agendamento.findMany({
      where: { campoId, data, status: { not: "CANCELADO" } },
      select: { id: true, horaInicio: true, horaFim: true }
    });
    const novoInicio = timeToMinutes(horaInicio);
    const novoFim = endToMinutes(horaFim);
    const conflito = existentes.find(a => {
      const ini = timeToMinutes(a.horaInicio);
      const fim = endToMinutes(a.horaFim);
      return ini !== null && fim !== null && ini < novoFim && fim > novoInicio;
    });
    if (conflito) return res.status(400).json({ error: "Horário já ocupado." });

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
      include: { pagamento: true, time: true, campo: true, grupoHorario: { include: { membros: { where: { ativo: true }, select: { usuarioId: true } } } } },
    });

    if (!agendamento) {
      return res.status(404).json({ error: "Agendamento não encontrado." });
    }

    const actor = req.actor;
    let podeCancelar = false;
    if (actor?.kind === "STAFF") podeCancelar = Number(actor.societyId) === Number(agendamento.societyId) && ["ADMIN","CAIXA","RECEPCAO"].includes(actor.funcao);
    if (actor?.kind === "USER") {
      podeCancelar = Number(agendamento.time?.donoId) === Number(actor.id) || Number(agendamento.grupoHorario?.organizadorId) === Number(actor.id);
      if (!podeCancelar && actor.tipo === "DONO_SOCIETY") podeCancelar = !!(await prisma.society.findFirst({ where: { id: agendamento.societyId, usuarioId: actor.id }, select: { id: true } }));
    }
    if (!podeCancelar) return res.status(403).json({ error: "Você não possui permissão para cancelar esta reserva." });

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
    if (agendamento.grupoHorario) {
      for (const m of agendamento.grupoHorario.membros) await notifyUsuario(prisma, m.usuarioId, "Jogo cancelado", `${agendamento.grupoHorario.nome}: o encontro de ${agendamento.horaInicio} foi cancelado.`, `horario-grupo.html?grupoId=${agendamento.grupoHorarioId}`);
    }
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
        grupoHorario: { select: { id: true, nome: true, organizadorId: true } },
        horarioFixo: { select: { id: true, tipoCobranca: true, valorMensal: true, dividirValor: true } },
        presencas: { select: { id: true, status: true } },
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
    const atual = await prisma.agendamento.findUnique({ where: { id }, include: { time: true, campo: true, grupoHorario: { include: { membros: { where: { ativo: true }, select: { usuarioId: true } } } } } });
    if (!atual) return res.status(404).json({ error: "Agendamento não encontrado." });
    if (atual.status === "CANCELADO") return res.status(400).json({ error: "Agendamento cancelado não pode ser remarcado." });
    const data = parseDateOnly(dataStr);
    const [hh, mm] = horaInicio.split(":").map(Number);
    if (!Number.isInteger(hh) || hh < 0 || hh > 23 || !Number.isInteger(mm) || mm < 0 || mm > 59) return res.status(400).json({ error: "Horário inválido." });
    const fimMin = hh * 60 + mm + 60;
    if (fimMin > 24 * 60) return res.status(400).json({ error: "Horário final ultrapassa o dia." });
    const horaFim = fimMin === 1440 ? "00:00" : `${String(Math.floor(fimMin / 60)).padStart(2, "0")}:${String(fimMin % 60).padStart(2, "0")}`;
    const society = await prisma.society.findUnique({ where:{id:atual.societyId}, include:{ horariosFuncionamento:true } });
    const validacaoFuncionamento = validateInterval(configForDate(society?.horariosFuncionamento, data), horaInicio, horaFim);
    if (!validacaoFuncionamento.ok) return res.status(400).json({ error: validacaoFuncionamento.error });
    const existentes = await prisma.agendamento.findMany({
      where: { id: { not: id }, campoId: atual.campoId, data, status: { not: "CANCELADO" } },
      select: { id: true, horaInicio: true, horaFim: true }
    });
    const novoInicio = timeToMinutes(horaInicio), novoFim = endToMinutes(horaFim);
    const conflito = existentes.find(a => {
      const ini = timeToMinutes(a.horaInicio), fim = endToMinutes(a.horaFim);
      return ini !== null && fim !== null && ini < novoFim && fim > novoInicio;
    });
    if (conflito) return res.status(409).json({ error: "Esse horário já está ocupado nesta quadra." });
    const atualizado = await prisma.agendamento.update({ where: { id }, data: { data, horaInicio, horaFim } });
    await notifyUsuario(prisma, atual.time?.donoId, "Reserva remarcada", `Sua reserva foi movida para ${dataStr} às ${horaInicio}.`);
    if (atual.grupoHorario) {
      for (const m of atual.grupoHorario.membros) await notifyUsuario(prisma, m.usuarioId, "Horário alterado", `${atual.grupoHorario.nome} foi remarcado para ${dataStr} às ${horaInicio}.`, `confirmar-presenca.html?agendamentoId=${id}`);
    }
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