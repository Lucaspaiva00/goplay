const canais = new Map();

function subscribeJogo(req, res) {
  const jogoId = Number(req.params.id);
  if (!Number.isFinite(jogoId)) {
    return res.status(400).json({ error: "Jogo inválido." });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const chave = String(jogoId);
  if (!canais.has(chave)) canais.set(chave, new Set());
  canais.get(chave).add(res);

  res.write(`event: connected\ndata: ${JSON.stringify({ jogoId, ok: true })}\n\n`);

  const heartbeat = setInterval(() => {
    try { res.write(`: ping ${Date.now()}\n\n`); } catch (_) {}
  }, 20000);

  req.on("close", () => {
    clearInterval(heartbeat);
    const set = canais.get(chave);
    set?.delete(res);
    if (set?.size === 0) canais.delete(chave);
  });
}

function emitJogo(jogoId, payload = {}) {
  const set = canais.get(String(jogoId));
  if (!set?.size) return;

  const data = `event: jogo-atualizado\ndata: ${JSON.stringify({ jogoId: Number(jogoId), at: new Date().toISOString(), ...payload })}\n\n`;
  for (const res of [...set]) {
    try { res.write(data); } catch (_) { set.delete(res); }
  }
}

module.exports = { subscribeJogo, emitJogo };
