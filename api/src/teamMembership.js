const fail = (msg, status = 409) => Object.assign(new Error(msg), { status });
async function belongs(client, usuarioId, timeId) {
  return !!(await client.usuario.findFirst({
    where: {
      id: Number(usuarioId),
      timesJogador: { some: { id: Number(timeId) } },
    },
    select: { id: true },
  }));
}
async function count(client, timeId) {
  return client.usuario.count({
    where: { timesJogador: { some: { id: Number(timeId) } } },
  });
}
async function add(client, usuarioId, timeId) {
  await client.$queryRaw`SELECT id FROM "Usuario" WHERE id=${Number(usuarioId)} FOR NO KEY UPDATE`;
  await client.$queryRaw`SELECT id FROM "Time" WHERE id=${Number(timeId)} FOR UPDATE`;
  const [user, team] = await Promise.all([
    client.usuario.findUnique({ where: { id: Number(usuarioId) } }),
    client.time.findUnique({ where: { id: Number(timeId) } }),
  ]);
  if (!user || !["PLAYER", "DONO_TIME"].includes(user.tipo))
    throw fail("Jogador inválido.", 400);
  if (!team || team.statusVinculo !== "APROVADO")
    throw fail("O time não está aprovado.", 409);
  if (await belongs(client, usuarioId, timeId)) return false;
  if ((await count(client, timeId)) >= team.maxJogadores)
    throw fail("O time atingiu o limite de jogadores.");
  await client.usuario.update({
    where: { id: user.id },
    data: {
      timesJogador: { connect: { id: team.id } },
      ...(!user.timeRelacionadoId ? { timeRelacionadoId: team.id } : {}),
    },
  });
  return true;
}
async function remove(client, usuarioId, timeId) {
  await client.$queryRaw`SELECT id FROM "Usuario" WHERE id=${Number(usuarioId)} FOR NO KEY UPDATE`;
  if (!(await belongs(client, usuarioId, timeId)))
    throw fail("Jogador não pertence a este time.", 404);
  const user = await client.usuario.findUnique({
    where: { id: Number(usuarioId) },
    select: {
      timeRelacionadoId: true,
      timesJogador: {
        where: { id: { not: Number(timeId) } },
        select: { id: true },
        orderBy: { id: "asc" },
      },
    },
  });
  await client.usuario.update({
    where: { id: Number(usuarioId) },
    data: {
      timesJogador: { disconnect: { id: Number(timeId) } },
      ...(user.timeRelacionadoId === Number(timeId)
        ? { timeRelacionadoId: user.timesJogador[0]?.id || null }
        : {}),
    },
  });
}
module.exports = { belongs, count, add, remove };
