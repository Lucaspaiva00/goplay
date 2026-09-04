const canais = new Map();

function subscribeHorario(req, res) {
  const agendamentoId = Number(req.params.id);
  if (!Number.isFinite(agendamentoId)) return res.status(400).json({ error: 'Horário inválido.' });
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  const key = String(agendamentoId);
  if (!canais.has(key)) canais.set(key, new Set());
  canais.get(key).add(res);
  res.write(`event: connected\ndata: ${JSON.stringify({ agendamentoId, ok: true })}\n\n`);
  const heartbeat = setInterval(() => { try { res.write(`: ping ${Date.now()}\n\n`); } catch (_) {} }, 20000);
  req.on('close', () => {
    clearInterval(heartbeat);
    const set = canais.get(key); set?.delete(res); if (set?.size === 0) canais.delete(key);
  });
}

function emitHorario(agendamentoId, payload = {}) {
  const set = canais.get(String(agendamentoId));
  if (!set?.size) return;
  const msg = `event: horario-atualizado\ndata: ${JSON.stringify({ agendamentoId: Number(agendamentoId), at: new Date().toISOString(), ...payload })}\n\n`;
  for (const res of [...set]) { try { res.write(msg); } catch (_) { set.delete(res); } }
}

module.exports = { subscribeHorario, emitHorario };
