const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { id, fail, player } = require("./conviteTimeController");
const colors = ["verde", "azul", "roxo", "laranja"];
function allowed(req) {
  return (
    req.actor?.kind === "USER" &&
    ["PLAYER", "DONO_TIME"].includes(req.actor.tipo)
  );
}
function handle(res, e) {
  if (e.status) return res.status(e.status).json({ error: e.message });
  console.error("story", e);
  return res.status(500).json({ error: "Não foi possível carregar o story." });
}
function imageDimensions(b, type) {
  if (
    type === "png" &&
    b.length >= 24 &&
    b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    b.toString("ascii", 12, 16) === "IHDR"
  )
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (type === "jpeg" && b.length > 4 && b[0] === 255 && b[1] === 216) {
    let offset = 2;
    while (offset + 4 <= b.length) {
      if (b[offset] !== 255) return null;
      while (offset < b.length && b[offset] === 255) offset++;
      const marker = b[offset++];
      if (marker === 218 || marker === 217) return null;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > b.length) return null;
      const length = b.readUInt16BE(offset);
      if (length < 2 || offset + length > b.length) return null;
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker) &&
        length >= 7
      )
        return [b.readUInt16BE(offset + 5), b.readUInt16BE(offset + 3)];
      offset += length;
    }
  }
  if (
    type === "webp" &&
    b.length >= 25 &&
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP" &&
    b.readUInt32LE(4) + 8 <= b.length
  ) {
    const chunk = b.toString("ascii", 12, 16);
    if (chunk === "VP8X" && b.length >= 30)
      return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
    if (chunk === "VP8L" && b[20] === 47) {
      const bits = b.readUInt32LE(21);
      return [(bits & 16383) + 1, ((bits >>> 14) & 16383) + 1];
    }
    if (
      chunk === "VP8 " &&
      b.length >= 30 &&
      b[23] === 157 &&
      b[24] === 1 &&
      b[25] === 42
    )
      return [b.readUInt16LE(26) & 16383, b.readUInt16LE(28) & 16383];
  }
  return null;
}
function imageValid(value) {
  if (typeof value !== "string" || value.length > 700000) return false;
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
    value,
  );
  if (!m || m[2].length % 4 !== 0) return false;
  const b = Buffer.from(m[2], "base64");
  if (b.length > 500000 || b.toString("base64") !== m[2]) return false;
  const dimensions = imageDimensions(b, m[1]);
  return (
    !!dimensions &&
    dimensions.every((n) => n > 0 && n <= 6000) &&
    dimensions[0] * dimensions[1] <= 20000000
  );
}
const select = {
  id: true,
  usuarioId: true,
  texto: true,
  cor: true,
  createdAt: true,
  expiresAt: true,
  usuario: { select: player },
};
async function publish(req, res) {
  if (!allowed(req))
    return res
      .status(403)
      .json({ error: "Stories são para jogadores e donos de time." });
  const texto = typeof req.body.texto === "string" ? req.body.texto.trim() : "",
    imagem = req.body.imagem || null,
    cor = req.body.cor || "verde";
  if (
    texto.length > 280 ||
    (!texto && !imagem) ||
    !colors.includes(cor) ||
    (imagem && !imageValid(imagem))
  )
    return res
      .status(400)
      .json({
        error:
          "Use até 280 caracteres e uma foto JPEG, PNG ou WebP de até 500 KB.",
      });
  try {
    const row = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Usuario" WHERE id=${req.actor.id} FOR NO KEY UPDATE`;
      if (
        (await tx.story.count({
          where: { usuarioId: req.actor.id, expiresAt: { gt: new Date() } },
        })) >= 10
      )
        throw fail(
          "Você já tem 10 stories ativos. Exclua um ou aguarde expirar.",
          429,
        );
      await tx.story.deleteMany({
        where: {
          usuarioId: req.actor.id,
          expiresAt: { lt: new Date(Date.now() - 7 * 86400000) },
        },
      });
      return tx.story.create({
        data: {
          usuarioId: req.actor.id,
          texto: texto || null,
          imagem,
          cor,
          expiresAt: new Date(Date.now() + 86400000),
        },
        select,
      });
    });
    return res.status(201).set("Cache-Control", "no-store").json(row);
  } catch (e) {
    return handle(res, e);
  }
}
async function list(req, res) {
  if (!allowed(req))
    return res
      .status(403)
      .json({ error: "Stories são para jogadores e donos de time." });
  const usuarioId =
    req.query.usuarioId == null ? null : id(req.query.usuarioId);
  if (req.query.usuarioId != null && !usuarioId)
    return res.status(400).json({ error: "Jogador inválido." });
  try {
    const rows = await prisma.story.findMany({
      where: {
        expiresAt: { gt: new Date() },
        ...(usuarioId
          ? { usuarioId }
          : {
              OR: [
                { usuarioId: req.actor.id },
                {
                  usuario: {
                    seguidores: { some: { seguidorId: req.actor.id } },
                  },
                },
              ],
            }),
      },
      select: {
        ...select,
        visualizacoes: {
          where: { usuarioId: req.actor.id },
          select: { usuarioId: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return res
      .set("Cache-Control", "no-store")
      .json({
        stories: rows.map(({ visualizacoes, ...s }) => ({
          ...s,
          visto: visualizacoes.length > 0,
        })),
      });
  } catch (e) {
    return handle(res, e);
  }
}
async function read(req, res) {
  if (!allowed(req)) return res.status(403).json({ error: "Sem permissão." });
  const storyId = id(req.params.id);
  if (!storyId) return res.status(400).json({ error: "Story inválido." });
  try {
    const row = await prisma.story.findFirst({
      where: { id: storyId, expiresAt: { gt: new Date() } },
      select: {
        ...select,
        imagem: true,
        _count: { select: { visualizacoes: true } },
      },
    });
    if (!row)
      return res
        .status(404)
        .json({ error: "Este story expirou ou foi removido." });
    const { _count, ...s } = row;
    return res
      .set("Cache-Control", "no-store")
      .json({
        ...s,
        ...(s.usuarioId === req.actor.id
          ? { visualizacoes: _count.visualizacoes }
          : {}),
      });
  } catch (e) {
    return handle(res, e);
  }
}
async function view(req, res) {
  if (!allowed(req)) return res.status(403).json({ error: "Sem permissão." });
  const storyId = id(req.params.id);
  if (!storyId) return res.status(400).json({ error: "Story inválido." });
  try {
    const row = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Story" WHERE id=${storyId} FOR SHARE`;
      const s = await tx.story.findFirst({
        where: { id: storyId, expiresAt: { gt: new Date() } },
      });
      if (!s) throw fail("Este story expirou ou foi removido.", 404);
      if (s.usuarioId !== req.actor.id)
        await tx.storyVisualizacao.createMany({
          data: [{ storyId, usuarioId: req.actor.id }],
          skipDuplicates: true,
        });
      return { ok: true };
    });
    return res.json(row);
  } catch (e) {
    return handle(res, e);
  }
}
async function viewers(req, res) {
  if (!allowed(req)) return res.status(403).json({ error: "Sem permissão." });
  const storyId = id(req.params.id);
  if (!storyId) return res.status(400).json({ error: "Story inválido." });
  try {
    const row = await prisma.story.findFirst({
      where: {
        id: storyId,
        usuarioId: req.actor.id,
        expiresAt: { gt: new Date() },
      },
    });
    if (!row) return res.status(404).json({ error: "Story não encontrado." });
    const visualizacoes = await prisma.storyVisualizacao.findMany({
      where: { storyId },
      select: { createdAt: true, usuario: { select: player } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return res.set("Cache-Control", "no-store").json({ visualizacoes });
  } catch (e) {
    return handle(res, e);
  }
}
async function remove(req, res) {
  if (!allowed(req)) return res.status(403).json({ error: "Sem permissão." });
  const storyId = id(req.params.id);
  if (!storyId) return res.status(400).json({ error: "Story inválido." });
  try {
    const result = await prisma.story.deleteMany({
      where: { id: storyId, usuarioId: req.actor.id },
    });
    return result.count
      ? res.json({ ok: true })
      : res.status(404).json({ error: "Story não encontrado." });
  } catch (e) {
    return handle(res, e);
  }
}
module.exports = { publish, list, read, view, viewers, remove, imageValid };
