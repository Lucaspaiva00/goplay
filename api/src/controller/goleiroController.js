const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { owned, id, fail, player } = require("./conviteTimeController");
const membership = require("../teamMembership");
const { notifyUsuario } = require("../notifications");
const include = {
  time: { select: { id: true, nome: true, donoId: true } },
  goleiro: { select: player },
  solicitante: { select: player },
  amistoso: { select: { id: true, status: true, dataHora: true } },
};
function handle(res, e) {
  if (e.status) return res.status(e.status).json({ error: e.message });
  if (e.code === "P2002")
    return res.status(409).json({
      error: "Já existe um pedido para este goleiro, time e horário.",
    });
  console.error("pedido goleiro", e);
  return res
    .status(500)
    .json({ error: "Não foi possível processar o pedido de goleiro." });
}
async function create(req, res) {
  const timeId = id(req.body.timeId),
    goleiroId = id(req.body.goleiroId),
    amistosoId = req.body.amistosoId == null ? null : id(req.body.amistosoId);
  const dataHora = new Date(req.body.dataHora),
    duracaoMinutos = Number(req.body.duracaoMinutos ?? 60),
    local = String(req.body.local || "").trim(),
    mensagem = String(req.body.mensagem || "").trim(),
    valor =
      req.body.valorProposto == null || req.body.valorProposto === ""
        ? null
        : Number(req.body.valorProposto);
  if (
    !timeId ||
    !goleiroId ||
    (req.body.amistosoId != null && !amistosoId) ||
    !Number.isFinite(dataHora.getTime()) ||
    dataHora <= new Date() ||
    dataHora > new Date(Date.now() + 366 * 86400000) ||
    !Number.isInteger(duracaoMinutos) ||
    duracaoMinutos < 30 ||
    duracaoMinutos > 240 ||
    !local ||
    local.length > 280 ||
    mensagem.length > 500 ||
    (valor !== null &&
      (!Number.isFinite(valor) ||
        valor < 0 ||
        valor > 999999.99 ||
        Math.abs(Math.round(valor * 100) - valor * 100) > 0.00001))
  )
    return res.status(400).json({
      error:
        "Informe data futura, duração de 30 a 240 minutos, local e valor válido.",
    });
  try {
    const row = await prisma.$transaction(async (tx) => {
      await owned(tx, req.actor, timeId);
      const goalie = await tx.usuario.findUnique({ where: { id: goleiroId } });
      if (
        !goalie?.goleiro ||
        !["PLAYER", "DONO_TIME"].includes(goalie.tipo) ||
        goleiroId === req.actor.id
      )
        throw fail(
          "Este jogador não está cadastrado como goleiro disponível para pedidos.",
          400,
        );
      if (amistosoId) {
        await tx.$queryRaw`SELECT id FROM "Amistoso" WHERE id=${amistosoId} FOR SHARE`;
        const a = await tx.amistoso.findUnique({
          where: { id: amistosoId },
          include: { jogo: { select: { finalizado: true } } },
        });
        if (
          !a ||
          ![a.timeAId, a.timeBId].includes(timeId) ||
          a.status !== "CONFIRMADO" ||
          a.jogo?.finalizado ||
          a.dataHora.getTime() !== dataHora.getTime()
        )
          throw fail(
            "Escolha um amistoso confirmado do seu time, no mesmo horário.",
            400,
          );
      }
      return tx.pedidoGoleiro.create({
        data: {
          timeId,
          goleiroId,
          solicitanteId: req.actor.id,
          amistosoId,
          dataHora,
          duracaoMinutos,
          local,
          mensagem: mensagem || null,
          valorProposto: valor,
        },
        include,
      });
    });
    await notifyUsuario(
      prisma,
      goleiroId,
      "Pedido para atuar como goleiro",
      `${row.time.nome} quer você no gol em ${dataHora.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}. Confira o local e a proposta antes de aceitar.`,
      "convites-jogador.html?aba=goleiros",
    );
    return res.status(201).json(row);
  } catch (e) {
    return handle(res, e);
  }
}
async function list(req, res) {
  if (req.actor?.kind !== "USER")
    return res.status(403).json({ error: "Sem permissão." });
  try {
    const rows = await prisma.pedidoGoleiro.findMany({
      where: {
        OR: [{ goleiroId: req.actor.id }, { solicitanteId: req.actor.id }],
      },
      include,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return res.set("Cache-Control", "no-store").json({ pedidos: rows });
  } catch (e) {
    return handle(res, e);
  }
}
async function respond(req, res) {
  const pedidoId = id(req.params.id),
    aceitar = req.body.aceitar;
  if (!pedidoId || typeof aceitar !== "boolean")
    return res.status(400).json({ error: "Informe aceitar: true ou false." });
  try {
    const row = await prisma.$transaction(async (tx) => {
      const initial = await tx.pedidoGoleiro.findUnique({
        where: { id: pedidoId },
      });
      if (
        !initial ||
        req.actor?.kind !== "USER" ||
        initial.goleiroId !== req.actor.id
      )
        throw fail("Pedido não encontrado.", 404);
      await tx.$queryRaw`SELECT id FROM "Usuario" WHERE id=${initial.goleiroId} FOR NO KEY UPDATE`;
      if (initial.amistosoId)
        await tx.$queryRaw`SELECT id FROM "Amistoso" WHERE id=${initial.amistosoId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "PedidoGoleiro" WHERE id=${pedidoId} FOR UPDATE`;
      const current = await tx.pedidoGoleiro.findUnique({
        where: { id: pedidoId },
        include,
      });
      if (current.status !== "PENDENTE")
        throw fail("Este pedido já foi respondido.");
      if (current.dataHora <= new Date())
        throw fail("O horário deste pedido já passou.");
      if (aceitar) {
        const end = new Date(
          current.dataHora.getTime() + current.duracaoMinutos * 60000,
        );
        const accepted = await tx.pedidoGoleiro.findMany({
          where: {
            goleiroId: current.goleiroId,
            status: "ACEITO",
            dataHora: { lt: end },
          },
        });
        if (
          accepted.some(
            (p) =>
              p.dataHora.getTime() + p.duracaoMinutos * 60000 >
              current.dataHora.getTime(),
          )
        )
          throw fail("Você já aceitou outro jogo neste horário.");
        if (current.amistosoId) {
          await tx.$queryRaw`SELECT id FROM "Amistoso" WHERE id=${current.amistosoId} FOR UPDATE`;
          const a = await tx.amistoso.findUnique({
            where: { id: current.amistosoId },
            include: { jogo: { select: { finalizado: true } } },
          });
          if (!a || a.status !== "CONFIRMADO" || a.jogo?.finalizado)
            throw fail("O amistoso não está mais disponível.");
          const key = {
            amistosoId_usuarioId: {
              amistosoId: a.id,
              usuarioId: current.goleiroId,
            },
          };
          const presence = await tx.presencaAmistoso.findUnique({ where: key });
          if (presence && presence.timeId !== current.timeId)
            throw fail(
              "Você já está convidado pelo outro time deste amistoso.",
            );
          await tx.presencaAmistoso.upsert({
            where: key,
            create: {
              amistosoId: a.id,
              usuarioId: current.goleiroId,
              timeId: current.timeId,
              status: "VOU",
              convidadoAvulso: !(await membership.belongs(
                tx,
                current.goleiroId,
                current.timeId,
              )),
            },
            update: { status: "VOU", respondidoEm: new Date() },
          });
        }
      }
      return tx.pedidoGoleiro.update({
        where: { id: pedidoId },
        data: {
          status: aceitar ? "ACEITO" : "RECUSADO",
          respondidoEm: new Date(),
        },
        include,
      });
    });
    await notifyUsuario(
      prisma,
      row.solicitanteId,
      aceitar ? "Goleiro confirmou o jogo" : "Pedido de goleiro recusado",
      `${row.goleiro.nome} ${aceitar ? "aceitou" : "recusou"} o pedido para atuar pelo ${row.time.nome}.`,
      "convites-jogador.html?aba=goleiros",
    );
    return res.json(row);
  } catch (e) {
    return handle(res, e);
  }
}
async function cancel(req, res) {
  const pedidoId = id(req.params.id);
  if (!pedidoId) return res.status(400).json({ error: "Pedido inválido." });
  try {
    const row = await prisma.$transaction(async (tx) => {
      const initial = await tx.pedidoGoleiro.findUnique({
        where: { id: pedidoId },
      });
      if (
        !initial ||
        req.actor?.kind !== "USER" ||
        ![initial.solicitanteId, initial.goleiroId].includes(req.actor.id)
      )
        throw fail("Pedido não encontrado.", 404);
      await tx.$queryRaw`SELECT id FROM "Usuario" WHERE id=${initial.goleiroId} FOR NO KEY UPDATE`;
      if (initial.amistosoId)
        await tx.$queryRaw`SELECT id FROM "Amistoso" WHERE id=${initial.amistosoId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "PedidoGoleiro" WHERE id=${pedidoId} FOR UPDATE`;
      const current = await tx.pedidoGoleiro.findUnique({
        where: { id: pedidoId },
        include,
      });
      if (
        !["PENDENTE", "ACEITO"].includes(current.status) ||
        current.dataHora <= new Date()
      )
        throw fail("Este pedido não pode ser cancelado.");
      if (current.amistosoId && current.status === "ACEITO")
        await tx.presencaAmistoso.updateMany({
          where: {
            amistosoId: current.amistosoId,
            usuarioId: current.goleiroId,
            timeId: current.timeId,
          },
          data: { status: "NAO_VOU", respondidoEm: new Date() },
        });
      return tx.pedidoGoleiro.update({
        where: { id: pedidoId },
        data: { status: "CANCELADO", respondidoEm: new Date() },
        include,
      });
    });
    await notifyUsuario(
      prisma,
      row.goleiroId === req.actor.id ? row.solicitanteId : row.goleiroId,
      "Pedido de goleiro cancelado",
      `O pedido para atuar pelo ${row.time.nome} foi cancelado.`,
      "convites-jogador.html?aba=goleiros",
    );
    return res.json(row);
  } catch (e) {
    return handle(res, e);
  }
}
module.exports = { create, list, respond, cancel };
