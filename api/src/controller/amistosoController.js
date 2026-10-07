const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { notifyUsuario, notifyStaff } = require("../notifications");
const { ownsSociety, isPlatformAdmin } = require("../auth");
const { parseDateOnly } = require("../dateOnly");
const { configForDate, validateInterval, timeToMinutes, endToMinutes } = require("../businessHours");

const toId = value => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

function saoPauloParts(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = type => parts.find(p => p.type === type)?.value;
  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

function dateTimeLabel(value) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return String(value || "");
  }
}

function endParts(dataHora, duracaoMinutos) {
  return saoPauloParts(new Date(new Date(dataHora).getTime() + Number(duracaoMinutos) * 60000));
}

async function validateVenue({ societyId, campoId, dataHora, duracaoMinutos, ignoreAgendamentoId = null }) {
  if (campoId && !societyId) {
    return { ok: false, error: "Selecione a empresa responsável pela quadra." };
  }
  if (!societyId) return { ok: true, society: null, campo: null, timing: null };

  const society = await prisma.society.findUnique({
    where: { id: Number(societyId) },
    include: { horariosFuncionamento: true },
  });
  if (!society) return { ok: false, error: "Empresa não encontrada." };

  let campo = null;
  if (campoId) {
    campo = await prisma.campo.findUnique({ where: { id: Number(campoId) } });
    if (!campo || Number(campo.societyId) !== Number(societyId)) {
      return { ok: false, error: "A quadra selecionada não pertence a esta empresa." };
    }

    const ini = saoPauloParts(dataHora);
    const fim = endParts(dataHora, duracaoMinutos);
    if (!ini || !fim) return { ok: false, error: "Data ou horário inválido." };
    if (ini.dateKey !== fim.dateKey) {
      return { ok: false, error: "O amistoso não pode atravessar a meia-noite nesta versão." };
    }

    const date = parseDateOnly(ini.dateKey);
    const config = configForDate(society.horariosFuncionamento, date);
    const interval = validateInterval(config, ini.time, fim.time);
    if (!interval.ok) return interval;

    const existentes = await prisma.agendamento.findMany({
      where: {
        campoId: Number(campoId),
        data: date,
        status: { not: "CANCELADO" },
        ...(ignoreAgendamentoId ? { id: { not: Number(ignoreAgendamentoId) } } : {}),
      },
      select: { id: true, horaInicio: true, horaFim: true },
    });

    const start = timeToMinutes(ini.time);
    const end = endToMinutes(fim.time);
    const conflito = existentes.find(a => {
      const aStart = timeToMinutes(a.horaInicio);
      const aEnd = endToMinutes(a.horaFim);
      return aStart !== null && aEnd !== null && start < aEnd && end > aStart;
    });
    if (conflito) {
      return { ok: false, error: `A quadra já possui uma reserva entre ${conflito.horaInicio} e ${conflito.horaFim}.` };
    }

    return { ok: true, society, campo, timing: { date, horaInicio: ini.time, horaFim: fim.time } };
  }

  return { ok: true, society, campo: null, timing: null };
}

async function loadAmistoso(id) {
  return prisma.amistoso.findUnique({
    where: { id: Number(id) },
    include: {
      criadoPor: { select: { id: true, nome: true, email: true, tipo: true } },
      society: { select: { id: true, nome: true, usuarioId: true, cidade: true, imagem: true } },
      campo: { select: { id: true, nome: true, valorAvulso: true } },
      timeA: {
        include: {
          dono: { select: { id: true, nome: true, email: true } },
          jogadores: { select: { id: true, nome: true, email: true, fotoUrl: true, posicaoCampo: true } },
        },
      },
      timeB: {
        include: {
          dono: { select: { id: true, nome: true, email: true } },
          jogadores: { select: { id: true, nome: true, email: true, fotoUrl: true, posicaoCampo: true } },
        },
      },
      presencas: {
        include: { usuario: { select: { id: true, nome: true, fotoUrl: true, posicaoCampo: true } } },
        orderBy: [{ timeId: "asc" }, { usuario: { nome: "asc" } }],
      },
      jogo: { select: { id: true, finalizado: true, statusOperacao: true, golsA: true, golsB: true } },
    },
  });
}

async function notifyConfirmed(amistoso) {
  const url = `amistosos.html?amistosoId=${amistoso.id}`;
  const msg = `${amistoso.timeA.nome} × ${amistoso.timeB.nome} • ${dateTimeLabel(amistoso.dataHora)}${amistoso.society ? ` • ${amistoso.society.nome}` : ""}.`;

  const owners = new Set([amistoso.timeA.donoId, amistoso.timeB.donoId].filter(Boolean).map(Number));
  for (const userId of owners) {
    await notifyUsuario(prisma, userId, "Amistoso confirmado", msg, url);
  }

  const players = [
    ...amistoso.timeA.jogadores.map(j => ({ ...j, timeId: amistoso.timeAId })),
    ...amistoso.timeB.jogadores.map(j => ({ ...j, timeId: amistoso.timeBId })),
  ];
  const unique = new Map(players.map(p => [Number(p.id), p]));
  for (const player of unique.values()) {
    await notifyUsuario(
      prisma,
      player.id,
      "Você vai jogar este amistoso?",
      `${msg} Confirme 👍 ou 👎 no GoPlay.`,
      url
    );
  }

  if (amistoso.societyId) {
    await notifyStaff(
      prisma,
      amistoso.societyId,
      "Amistoso confirmado",
      msg,
      ["ADMIN","RECEPCAO","MESARIO"],
      url
    );
  }
}

async function confirmAmistoso(id) {
  const amistoso = await loadAmistoso(id);
  if (!amistoso) throw new Error("Amistoso não encontrado.");
  if (amistoso.status === "CONFIRMADO") return amistoso;
  if (["RECUSADO","CANCELADO","REALIZADO"].includes(amistoso.status)) {
    throw new Error("Este amistoso não pode mais ser confirmado.");
  }

  const venue = await validateVenue({
    societyId: amistoso.societyId,
    campoId: amistoso.campoId,
    dataHora: amistoso.dataHora,
    duracaoMinutos: amistoso.duracaoMinutos,
    ignoreAgendamentoId: amistoso.agendamentoId,
  });
  if (!venue.ok) throw new Error(venue.error);

  const playerRows = [
    ...amistoso.timeA.jogadores.map(j => ({ usuarioId: j.id, timeId: amistoso.timeAId })),
    ...amistoso.timeB.jogadores.map(j => ({ usuarioId: j.id, timeId: amistoso.timeBId })),
  ];
  const uniquePlayers = [...new Map(playerRows.map(p => [Number(p.usuarioId), p])).values()];

  await prisma.$transaction(async tx => {
    let agendamentoId = amistoso.agendamentoId || null;

    if (amistoso.societyId && amistoso.campoId && venue.timing && !agendamentoId) {
      const campo = await tx.campo.findUnique({ where: { id: amistoso.campoId } });
      const ag = await tx.agendamento.create({
        data: {
          societyId: amistoso.societyId,
          campoId: amistoso.campoId,
          timeId: amistoso.timeAId,
          data: venue.timing.date,
          horaInicio: venue.timing.horaInicio,
          horaFim: venue.timing.horaFim,
          valor: Number(campo?.valorAvulso || 0),
          status: "CONFIRMADO",
          organizadorId: amistoso.criadoPorId,
        },
      });
      agendamentoId = ag.id;
    }

    let jogo = await tx.jogo.findUnique({ where: { amistosoId: amistoso.id } });
    if (!jogo) {
      jogo = await tx.jogo.create({
        data: {
          amistosoId: amistoso.id,
          campeonatoId: null,
          rodada: 1,
          tipoJogo: "IDA",
          timeAId: amistoso.timeAId,
          timeBId: amistoso.timeBId,
          dataHora: amistoso.dataHora,
        },
      });
      await tx.jogoEstatisticaTime.createMany({
        data: [
          { jogoId: jogo.id, timeId: amistoso.timeAId },
          { jogoId: jogo.id, timeId: amistoso.timeBId },
        ],
        skipDuplicates: true,
      });
    }

    if (uniquePlayers.length) {
      await tx.presencaAmistoso.createMany({
        data: uniquePlayers.map(p => ({
          amistosoId: amistoso.id,
          usuarioId: p.usuarioId,
          timeId: p.timeId,
          status: "PENDENTE",
        })),
        skipDuplicates: true,
      });
    }

    await tx.amistoso.update({
      where: { id: amistoso.id },
      data: {
        status: "CONFIRMADO",
        agendamentoId,
      },
    });
  });

  const confirmado = await loadAmistoso(id);
  await notifyConfirmed(confirmado);
  return confirmado;
}

async function create(req, res) {
  try {
    if (req.actor?.kind !== "USER") return res.status(403).json({ error: "Apenas usuários podem criar amistosos." });

    const tipo = req.actor.tipo;
    const timeAId = toId(req.body.timeAId);
    const timeBId = toId(req.body.timeBId);
    const societyId = toId(req.body.societyId);
    const campoId = toId(req.body.campoId);
    const dataHora = new Date(req.body.dataHora);
    const duracaoMinutos = Math.max(20, Math.min(180, Number(req.body.duracaoMinutos || 60)));
    const observacao = req.body.observacao ? String(req.body.observacao).trim() : null;

    if (!timeAId || !timeBId || timeAId === timeBId) {
      return res.status(400).json({ error: "Selecione dois times diferentes." });
    }
    if (Number.isNaN(dataHora.getTime()) || dataHora <= new Date()) {
      return res.status(400).json({ error: "Informe uma data futura válida para o amistoso." });
    }

    const [timeA, timeB] = await Promise.all([
      prisma.time.findUnique({ where: { id: timeAId }, include: { dono: true } }),
      prisma.time.findUnique({ where: { id: timeBId }, include: { dono: true } }),
    ]);
    if (!timeA || !timeB) return res.status(404).json({ error: "Um dos times não foi encontrado." });
    if (timeA.statusVinculo !== "APROVADO" || timeB.statusVinculo !== "APROVADO") {
      return res.status(400).json({ error: "Os dois times precisam estar aprovados para disputar amistosos." });
    }

    let status;
    let aprovadoAdversarioEm = null;
    let aprovadoSocietyEm = null;

    if (tipo === "DONO_TIME") {
      if (Number(timeA.donoId) !== Number(req.actor.id)) {
        return res.status(403).json({ error: "Você só pode solicitar amistoso usando um time que pertence a você." });
      }
      status = "PENDENTE_ADVERSARIO";
    } else if (tipo === "DONO_SOCIETY" || isPlatformAdmin(req.actor)) {
      if (!societyId) return res.status(400).json({ error: "Selecione a empresa onde o amistoso será realizado." });
      if (!isPlatformAdmin(req.actor) && !(await ownsSociety(req.actor, societyId))) {
        return res.status(403).json({ error: "Você só pode criar amistosos na sua própria empresa." });
      }
      status = "PENDENTE_SOCIETY";
      aprovadoAdversarioEm = new Date();
      aprovadoSocietyEm = new Date();
    } else {
      return res.status(403).json({ error: "Seu perfil não pode criar amistosos." });
    }

    const venue = await validateVenue({ societyId, campoId, dataHora, duracaoMinutos });
    if (!venue.ok) return res.status(409).json({ error: venue.error });

    const row = await prisma.amistoso.create({
      data: {
        criadoPorId: Number(req.actor.id),
        societyId: societyId || null,
        campoId: campoId || null,
        timeAId,
        timeBId,
        dataHora,
        duracaoMinutos,
        status,
        aprovadoAdversarioEm,
        aprovadoSocietyEm,
        observacao,
      },
    });

    if (tipo === "DONO_TIME") {
      await notifyUsuario(
        prisma,
        timeB.donoId,
        "Convite para amistoso",
        `${timeA.nome} quer jogar contra ${timeB.nome} em ${dateTimeLabel(dataHora)}. Aceite ou recuse no GoPlay.`,
        `amistosos.html?amistosoId=${row.id}`
      );
      return res.status(201).json(await loadAmistoso(row.id));
    }

    const confirmado = await confirmAmistoso(row.id);
    return res.status(201).json(confirmado);
  } catch (e) {
    console.error("create amistoso", e);
    return res.status(500).json({ error: e.message || "Erro ao criar amistoso." });
  }
}

async function responderAdversario(req, res) {
  try {
    if (req.actor?.kind !== "USER") return res.status(403).json({ error: "Acesso negado." });
    const id = toId(req.params.id);
    const acao = String(req.body.acao || "").toUpperCase();
    if (!id || !["ACEITAR","RECUSAR"].includes(acao)) return res.status(400).json({ error: "Resposta inválida." });

    const a = await loadAmistoso(id);
    if (!a) return res.status(404).json({ error: "Amistoso não encontrado." });
    if (a.status !== "PENDENTE_ADVERSARIO") return res.status(409).json({ error: "Este convite já foi respondido." });
    if (Number(a.timeB.donoId) !== Number(req.actor.id)) return res.status(403).json({ error: "Somente o dono do time adversário pode responder." });

    if (acao === "RECUSAR") {
      const out = await prisma.amistoso.update({
        where: { id },
        data: { status: "RECUSADO", recusadoEm: new Date(), motivoRecusa: String(req.body.motivo || "").trim() || null },
      });
      await notifyUsuario(prisma, a.criadoPorId, "Amistoso recusado", `${a.timeB.nome} recusou o amistoso contra ${a.timeA.nome}.`, `amistosos.html?amistosoId=${id}`);
      return res.json(out);
    }

    if (a.societyId) {
      const out = await prisma.amistoso.update({
        where: { id },
        data: { status: "PENDENTE_SOCIETY", aprovadoAdversarioEm: new Date() },
      });
      if (a.society?.usuarioId) {
        await notifyUsuario(
          prisma,
          a.society.usuarioId,
          "Amistoso aguardando sua aprovação",
          `${a.timeA.nome} × ${a.timeB.nome} • ${dateTimeLabel(a.dataHora)}. Confirme o uso da estrutura.`,
          `amistosos.html?amistosoId=${id}`
        );
      }
      await notifyStaff(
        prisma,
        a.societyId,
        "Amistoso aguardando aprovação",
        `${a.timeA.nome} × ${a.timeB.nome} • ${dateTimeLabel(a.dataHora)}.`,
        ["ADMIN","RECEPCAO"],
        `amistosos.html?amistosoId=${id}`
      );
      return res.json(out);
    }

    await prisma.amistoso.update({ where: { id }, data: { aprovadoAdversarioEm: new Date() } });
    return res.json(await confirmAmistoso(id));
  } catch (e) {
    console.error("responder adversario", e);
    return res.status(500).json({ error: e.message || "Erro ao responder amistoso." });
  }
}

async function responderSociety(req, res) {
  try {
    const id = toId(req.params.id);
    const acao = String(req.body.acao || "").toUpperCase();
    if (!id || !["APROVAR","RECUSAR"].includes(acao)) return res.status(400).json({ error: "Resposta inválida." });

    const a = await loadAmistoso(id);
    if (!a) return res.status(404).json({ error: "Amistoso não encontrado." });
    if (!a.societyId) return res.status(400).json({ error: "Este amistoso não depende de uma empresa." });
    if (a.status !== "PENDENTE_SOCIETY") return res.status(409).json({ error: "Este amistoso não está aguardando aprovação da empresa." });

    let permitido = false;
    if (req.actor?.kind === "USER") permitido = await ownsSociety(req.actor, a.societyId);
    if (req.actor?.kind === "STAFF") permitido = Number(req.actor.societyId) === Number(a.societyId) && req.actor.funcao === "ADMIN";
    if (!permitido) return res.status(403).json({ error: "Somente o dono ou administrador desta empresa pode responder." });

    if (acao === "RECUSAR") {
      const out = await prisma.amistoso.update({
        where: { id },
        data: { status: "RECUSADO", recusadoEm: new Date(), motivoRecusa: String(req.body.motivo || "").trim() || null },
      });
      for (const ownerId of new Set([a.timeA.donoId, a.timeB.donoId].map(Number))) {
        await notifyUsuario(prisma, ownerId, "Amistoso não aprovado pela empresa", `${a.society.nome} não aprovou ${a.timeA.nome} × ${a.timeB.nome}.`, `amistosos.html?amistosoId=${id}`);
      }
      return res.json(out);
    }

    await prisma.amistoso.update({ where: { id }, data: { aprovadoSocietyEm: new Date() } });
    return res.json(await confirmAmistoso(id));
  } catch (e) {
    console.error("responder society amistoso", e);
    return res.status(500).json({ error: e.message || "Erro ao aprovar amistoso." });
  }
}

async function responderPresenca(req, res) {
  try {
    if (req.actor?.kind !== "USER") return res.status(403).json({ error: "Acesso negado." });
    const id = toId(req.params.id);
    const status = String(req.body.status || "").toUpperCase();
    if (!["VOU","NAO_VOU"].includes(status)) return res.status(400).json({ error: "Resposta inválida." });

    const presenca = await prisma.presencaAmistoso.findUnique({
      where: { amistosoId_usuarioId: { amistosoId: id, usuarioId: Number(req.actor.id) } },
      include: { amistoso: { include: { timeA: true, timeB: true } } },
    });
    if (!presenca) return res.status(404).json({ error: "Você não foi convidado para este amistoso." });
    if (presenca.amistoso.status !== "CONFIRMADO") return res.status(409).json({ error: "O amistoso ainda não está confirmado." });

    const out = await prisma.presencaAmistoso.update({
      where: { id: presenca.id },
      data: { status, respondidoEm: new Date() },
    });

    const team = Number(presenca.timeId) === Number(presenca.amistoso.timeAId)
      ? presenca.amistoso.timeA
      : presenca.amistoso.timeB;
    await notifyUsuario(
      prisma,
      team.donoId,
      "Resposta de presença no amistoso",
      `${req.actor.nome} respondeu ${status === "VOU" ? "👍 VOU" : "👎 NÃO VOU"} para o amistoso.`,
      `amistosos.html?amistosoId=${id}`
    );

    return res.json(out);
  } catch (e) {
    console.error("presenca amistoso", e);
    return res.status(500).json({ error: "Erro ao responder presença." });
  }
}

function sanitizeForActor(row, actor) {
  if (!row) return row;
  if (actor?.kind === "USER" && actor.tipo === "PLAYER") {
    return {
      ...row,
      presencas: (row.presencas || []).filter(p => Number(p.usuarioId) === Number(actor.id)),
    };
  }
  return row;
}

async function meus(req, res) {
  try {
    if (!req.actor) return res.status(401).json({ error: "Sessão inválida." });
    let where = {};

    if (req.actor.kind === "USER" && req.actor.tipo === "PLAYER") {
      where = { presencas: { some: { usuarioId: Number(req.actor.id) } } };
    } else if (req.actor.kind === "USER" && req.actor.tipo === "DONO_TIME") {
      where = { OR: [{ timeA: { donoId: Number(req.actor.id) } }, { timeB: { donoId: Number(req.actor.id) } }] };
    } else if (req.actor.kind === "USER" && req.actor.tipo === "DONO_SOCIETY") {
      where = { society: { usuarioId: Number(req.actor.id) } };
    } else if (req.actor.kind === "USER" && isPlatformAdmin(req.actor)) {
      where = {};
    } else if (req.actor.kind === "STAFF") {
      where = { societyId: Number(req.actor.societyId) };
    } else {
      return res.json([]);
    }

    const rows = await prisma.amistoso.findMany({
      where,
      include: {
        criadoPor: { select: { id: true, nome: true, tipo: true } },
        society: { select: { id: true, nome: true, usuarioId: true } },
        campo: { select: { id: true, nome: true } },
        timeA: { include: { dono: { select: { id: true, nome: true } } } },
        timeB: { include: { dono: { select: { id: true, nome: true } } } },
        presencas: {
          include: { usuario: { select: { id: true, nome: true, fotoUrl: true, posicaoCampo: true } } },
          orderBy: [{ timeId: "asc" }, { usuario: { nome: "asc" } }],
        },
        jogo: { select: { id: true, finalizado: true, statusOperacao: true, golsA: true, golsB: true } },
      },
      orderBy: [{ dataHora: "asc" }, { id: "desc" }],
    });

    return res.json(rows.map(r => sanitizeForActor(r, req.actor)));
  } catch (e) {
    console.error("meus amistosos", e);
    return res.status(500).json({ error: "Erro ao carregar amistosos." });
  }
}

async function readOne(req, res) {
  try {
    const row = await loadAmistoso(toId(req.params.id));
    if (!row) return res.status(404).json({ error: "Amistoso não encontrado." });
    return res.json(sanitizeForActor(row, req.actor));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao carregar amistoso." });
  }
}

async function cancelar(req, res) {
  try {
    if (req.actor?.kind !== "USER") return res.status(403).json({ error: "Acesso negado." });
    const id = toId(req.params.id);
    const a = await loadAmistoso(id);
    if (!a) return res.status(404).json({ error: "Amistoso não encontrado." });

    const isCreator = Number(a.criadoPorId) === Number(req.actor.id);
    const isSocio = isPlatformAdmin(req.actor);
    const isSocietyOwner = a.societyId && await ownsSociety(req.actor, a.societyId);
    if (!isCreator && !isSocio && !isSocietyOwner) return res.status(403).json({ error: "Você não pode cancelar este amistoso." });
    if (a.status === "REALIZADO") return res.status(409).json({ error: "Amistoso já realizado." });
    if (a.jogo?.statusOperacao === "AO_VIVO") return res.status(409).json({ error: "Não é possível cancelar um amistoso com a partida em andamento." });

    await prisma.$transaction(async tx => {
      if (a.agendamentoId) {
        await tx.agendamento.update({ where: { id: a.agendamentoId }, data: { status: "CANCELADO" } }).catch(()=>null);
      }
      if (a.jogo?.id && !a.jogo.finalizado) {
        await tx.jogo.delete({ where: { id: a.jogo.id } }).catch(()=>null);
      }
      await tx.amistoso.update({ where: { id }, data: { status: "CANCELADO" } });
    });

    for (const ownerId of new Set([a.timeA.donoId, a.timeB.donoId].map(Number))) {
      await notifyUsuario(prisma, ownerId, "Amistoso cancelado", `${a.timeA.nome} × ${a.timeB.nome} foi cancelado.`, `amistosos.html?amistosoId=${id}`);
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao cancelar amistoso." });
  }
}

module.exports = {
  create,
  meus,
  readOne,
  responderAdversario,
  responderSociety,
  responderPresenca,
  cancelar,
  confirmAmistoso,
};
