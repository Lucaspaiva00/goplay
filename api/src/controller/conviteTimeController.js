const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const membership = require("../teamMembership");
const { notifyUsuario } = require("../notifications");
const { syncJoinedPlayer } = require("../amistosoConvites");
const { syncPlayerToRoutine } = require("./timeController");
const id = (v) =>
  Number.isInteger(Number(v)) && Number(v) > 0 && Number(v) <= 2147483647
    ? Number(v)
    : null;
const fail = (message, status = 409) =>
  Object.assign(new Error(message), { status });
const player = { id: true, nome: true, fotoUrl: true, goleiro: true };
const include = {
  time: { select: { id: true, nome: true, donoId: true } },
  usuario: { select: player },
};
function handle(res, e) {
  if (e.status) return res.status(e.status).json({ error: e.message });
  if (/GOPLAY_TEAM_FULL/.test(e.message))
    return res
      .status(409)
      .json({ error: "O time atingiu o limite de jogadores." });
  console.error("convite time", e);
  return res
    .status(500)
    .json({ error: "Não foi possível processar o convite." });
}
async function owned(client, actor, timeId) {
  if (actor?.kind !== "USER" || actor.tipo !== "DONO_TIME")
    throw fail("Somente donos de time podem convidar jogadores.", 403);
  const team = await client.time.findUnique({ where: { id: timeId } });
  if (!team || team.donoId !== actor.id)
    throw fail("Este time não pertence a você.", 403);
  if (team.statusVinculo !== "APROVADO")
    throw fail("O time precisa estar aprovado.");
  return team;
}
async function create(req, res) {
  const timeId = id(req.params.timeId),
    usuarioId = id(req.body.usuarioId);
  if (!timeId || !usuarioId)
    return res.status(400).json({ error: "Selecione um time e um jogador." });
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Usuario" WHERE id=${usuarioId} FOR NO KEY UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Time" WHERE id=${timeId} FOR UPDATE`;
      const team = await owned(tx, req.actor, timeId);
      const u = await tx.usuario.findUnique({
        where: { id: usuarioId },
        select: { ...player, tipo: true },
      });
      if (
        !u ||
        !["PLAYER", "DONO_TIME"].includes(u.tipo) ||
        u.id === req.actor.id
      )
        throw fail("Selecione outro jogador válido.", 400);
      if (await membership.belongs(tx, usuarioId, timeId))
        throw fail("Este jogador já pertence ao time.");
      if ((await membership.count(tx, timeId)) >= team.maxJogadores)
        throw fail("O time atingiu o limite de jogadores.");
      const where = { timeId_usuarioId: { timeId, usuarioId } },
        previous = await tx.conviteTime.findUnique({ where });
      if (previous?.status === "PENDENTE")
        return { row: previous, team, newInvite: false };
      const row = await tx.conviteTime.upsert({
        where,
        create: { timeId, usuarioId },
        update: {
          status: "PENDENTE",
          createdAt: new Date(),
          respondidoEm: null,
        },
      });
      return { row, team, newInvite: true };
    });
    if (result.newInvite)
      await notifyUsuario(
        prisma,
        usuarioId,
        "Convite para jogar no time",
        `${result.team.nome} convidou você para o elenco. Aceitar não remove você dos seus outros times.`,
        "convites-jogador.html",
      );
    return res.status(result.newInvite ? 201 : 200).json(result.row);
  } catch (e) {
    return handle(res, e);
  }
}
async function list(req, res) {
  if (req.actor?.kind !== "USER")
    return res.status(403).json({ error: "Sem permissão." });
  try {
    const [recebidos, enviados] = await Promise.all([
      prisma.conviteTime.findMany({
        where: { usuarioId: req.actor.id },
        include,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      req.actor.tipo === "DONO_TIME"
        ? prisma.conviteTime.findMany({
            where: { time: { donoId: req.actor.id } },
            include,
            orderBy: { createdAt: "desc" },
            take: 100,
          })
        : [],
    ]);
    return res.set("Cache-Control", "no-store").json({ recebidos, enviados });
  } catch (e) {
    return handle(res, e);
  }
}
async function respond(req, res) {
  const inviteId = id(req.params.id),
    aceitar = req.body.aceitar;
  if (!inviteId || typeof aceitar !== "boolean")
    return res.status(400).json({ error: "Informe aceitar: true ou false." });
  try {
    const row = await prisma.$transaction(async (tx) => {
      const initial = await tx.conviteTime.findUnique({
        where: { id: inviteId },
      });
      if (
        !initial ||
        req.actor?.kind !== "USER" ||
        initial.usuarioId !== req.actor.id
      )
        throw fail("Convite não encontrado.", 404);
      await tx.$queryRaw`SELECT id FROM "Usuario" WHERE id=${initial.usuarioId} FOR NO KEY UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Time" WHERE id=${initial.timeId} FOR UPDATE`;
      const current = await tx.conviteTime.findUnique({
        where: { id: inviteId },
        include,
      });
      if (current.status !== "PENDENTE")
        throw fail("Este convite já foi respondido.");
      if (aceitar) {
        await membership.add(tx, current.usuarioId, current.timeId);
        await syncPlayerToRoutine(tx, current.timeId, current.usuarioId);
        await tx.solicitacaoEntradaTime.updateMany({
          where: {
            timeId: current.timeId,
            usuarioId: current.usuarioId,
            status: "PENDENTE",
          },
          data: { status: "APROVADA", respondidoEm: new Date() },
        });
      }
      return tx.conviteTime.update({
        where: { id: inviteId },
        data: {
          status: aceitar ? "ACEITO" : "RECUSADO",
          respondidoEm: new Date(),
        },
        include,
      });
    });
    await notifyUsuario(
      prisma,
      row.time.donoId,
      aceitar ? "Jogador entrou no seu time" : "Convite de time recusado",
      `${row.usuario.nome} ${aceitar ? "aceitou" : "recusou"} o convite do ${row.time.nome}.`,
      "convites-jogador.html",
    );
    if (aceitar)
      await syncJoinedPlayer(prisma, row.usuarioId, row.timeId).catch((e) =>
        console.error("sincronizar amistosos", e.message),
      );
    return res.json(row);
  } catch (e) {
    return handle(res, e);
  }
}
async function cancel(req, res) {
  const inviteId = id(req.params.id);
  if (!inviteId) return res.status(400).json({ error: "Convite inválido." });
  try {
    const row = await prisma.$transaction(async (tx) => {
      const initial = await tx.conviteTime.findUnique({
        where: { id: inviteId },
      });
      if (!initial) throw fail("Convite não encontrado.", 404);
      await tx.$queryRaw`SELECT id FROM "Usuario" WHERE id=${initial.usuarioId} FOR NO KEY UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Time" WHERE id=${initial.timeId} FOR UPDATE`;
      const current = await tx.conviteTime.findUnique({
        where: { id: inviteId },
        include,
      });
      if (!current) throw fail("Convite não encontrado.", 404);
      await owned(tx, req.actor, current.timeId);
      if (current.status !== "PENDENTE")
        throw fail("Este convite já foi respondido.");
      return tx.conviteTime.update({
        where: { id: inviteId },
        data: { status: "CANCELADO", respondidoEm: new Date() },
      });
    });
    return res.json(row);
  } catch (e) {
    return handle(res, e);
  }
}
module.exports = { create, list, respond, cancel, owned, id, fail, player };
