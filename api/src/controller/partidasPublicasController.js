const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const LIVE = ['AO_VIVO', 'PAUSADA', 'INTERVALO'];
const select = {
  id: true, dataHora: true, duracaoMinutos: true, status: true,
  timeA: { select: { id: true, nome: true, brasao: true } },
  timeB: { select: { id: true, nome: true, brasao: true } },
  society: { select: { id: true, nome: true, cidade: true } },
  campo: { select: { id: true, nome: true } },
  jogo: { select: {
    id: true, golsA: true, golsB: true, finalizado: true, statusOperacao: true,
    periodo: true, cronometroSegundos: true, cronometroInicioEm: true,
    eventos: { take: 1, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { tipo: true, minuto: true, createdAt: true, time: { select: { nome: true } }, jogador: { select: { nome: true } } } },
  } },
};
async function list(req, res) {
  try {
    const aba = String(req.query.aba || 'todos');
    const take = Number(req.query.take || 30);
    const timeId = req.query.timeId === undefined ? null : Number(req.query.timeId);
    if (timeId !== null && (!Number.isInteger(timeId) || timeId < 1 || timeId>2147483647)) return res.status(400).json({error:'Time inválido.'});
    const societyId = req.query.societyId === undefined ? null : Number(req.query.societyId);
    if (societyId !== null && (!Number.isInteger(societyId) || societyId < 1)) return res.status(400).json({error:'Society inválida.'});
    const q = String(req.query.q || '').trim().slice(0, 100);
    if (!['todos','ao-vivo','proximos','resultados'].includes(aba) || !Number.isInteger(take) || take < 1 || take > 60) return res.status(400).json({ error: 'Filtro de partidas inválido.' });
    // Deliberately narrow selection: no presence votes, contacts, bills or Mesa credentials.
    const base = { ...(societyId ? {societyId} : {}), status: { in: ['CONFIRMADO','REALIZADO'] }, jogo: { isNot: null },
      ...(q ? { OR: [
        { timeA: { nome: { contains: q, mode: 'insensitive' } } },
        { timeB: { nome: { contains: q, mode: 'insensitive' } } },
        { society: { nome: { contains: q, mode: 'insensitive' } } },
        { society: { cidade: { contains: q, mode: 'insensitive' } } },
      ] } : {}),
    };
    const filters = {
      'ao-vivo': { status: 'CONFIRMADO', jogo: { is: { finalizado: false, statusOperacao: { in: LIVE } } } },
      proximos: { status: 'CONFIRMADO', dataHora: { gte: new Date(Date.now() - 6 * 3600000) }, jogo: { is: { finalizado: false, statusOperacao: 'AGENDADO' } } },
      resultados: { jogo: { is: { finalizado: true } } },
    };
    const keys = aba === 'todos' ? ['ao-vivo','proximos','resultados'] : [aba];
    const groups = await Promise.all(keys.map(key => prisma.amistoso.findMany({
      where: { AND: [base, filters[key], ...(timeId ? [{OR:[{timeAId:timeId},{timeBId:timeId}]}] : [])] }, select, take,
      orderBy: [{ dataHora: key === 'resultados' ? 'desc' : 'asc' }, { id: 'desc' }],
    })));
    const rows = groups.flat().slice(0, take).map(a => {
      const j = a.jogo;
      const running = j.statusOperacao === 'AO_VIVO' && !j.finalizado;
      const segundos = j.cronometroSegundos + (running && j.cronometroInicioEm ? Math.max(0, Math.floor((Date.now() - new Date(j.cronometroInicioEm).getTime()) / 1000)) : 0);
      const { cronometroInicioEm, ...publicGame } = j;
      return { ...a, jogo: { ...publicGame, cronometroAtualSegundos: segundos } };
    });
    res.set('Cache-Control', 'no-store');
    return res.json(rows);
  } catch (e) { console.error('partidas publicas', e); return res.status(500).json({ error: 'Não foi possível carregar as partidas.' }); }
}
module.exports = { list };
