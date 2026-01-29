// ✅ api/src/controller/jogoController.js (ARQUIVO TODO)
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/* =========================
   GET /jogo/:id  (detalhe completo)
========================= */
const readOne = async (req, res) => {
    try {
        const jogoId = Number(req.params.id);
        if (!Number.isFinite(jogoId)) return res.status(400).json({ error: "ID inválido." });

        const jogo = await prisma.jogo.findUnique({
            where: { id: jogoId },
            include: {
                campeonato: true,
                timeA: { include: { jogadores: true } },
                timeB: { include: { jogadores: true } },

                // ✅ stats por time
                estatisticasTimes: true,

                // ✅ escalação / atuação
                jogadoresAtuacao: true,

                // ✅ eventos
                eventos: { orderBy: { id: "asc" } },
            },
        });

        if (!jogo) return res.status(404).json({ error: "Jogo não encontrado." });

        // elencos pro front (o JS usa cache.elencoA/cache.elencoB)
        const elencoA = jogo.timeA?.jogadores || [];
        const elencoB = jogo.timeB?.jogadores || [];

        res.json({ jogo, elencoA, elencoB });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao buscar jogo." });
    }
};

/* =========================
   PUT /jogo/:id/stats
   body: { timeId, chutes, chutesNoGol, escanteios, laterais, faltas, posse }
========================= */
const updateStats = async (req, res) => {
    try {
        const jogoId = Number(req.params.id);
        const timeId = Number(req.body.timeId);

        if (!Number.isFinite(jogoId) || !Number.isFinite(timeId)) {
            return res.status(400).json({ error: "jogoId/timeId inválido." });
        }

        // garante que o jogo existe e que esse time faz parte do jogo
        const jogo = await prisma.jogo.findUnique({ where: { id: jogoId } });
        if (!jogo) return res.status(404).json({ error: "Jogo não encontrado." });
        if (![jogo.timeAId, jogo.timeBId].includes(timeId)) {
            return res.status(400).json({ error: "timeId não pertence a este jogo." });
        }

        const payload = {
            chutes: Number(req.body.chutes) || 0,
            chutesNoGol: Number(req.body.chutesNoGol) || 0,
            escanteios: Number(req.body.escanteios) || 0,
            laterais: Number(req.body.laterais) || 0,
            faltas: Number(req.body.faltas) || 0,
            posse: Number(req.body.posse) || 0,
        };

        // upsert na tabela jogoEstatisticaTime (se já existe, atualiza)
        const row = await prisma.jogoEstatisticaTime.upsert({
            where: { jogoId_timeId: { jogoId, timeId } },
            create: { jogoId, timeId, ...payload },
            update: { ...payload },
        });

        res.json({ ok: true, row });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao atualizar stats." });
    }
};

/* =========================
   POST /jogo/:id/escalacao
   body: { timeId, jogadorId, titular }
========================= */
const addLineup = async (req, res) => {
    try {
        const jogoId = Number(req.params.id);
        const timeId = Number(req.body.timeId);
        const jogadorId = Number(req.body.jogadorId);
        const titular = req.body.titular !== undefined ? !!req.body.titular : true;

        if (!Number.isFinite(jogoId) || !Number.isFinite(timeId) || !Number.isFinite(jogadorId)) {
            return res.status(400).json({ error: "Dados inválidos." });
        }

        const jogo = await prisma.jogo.findUnique({ where: { id: jogoId } });
        if (!jogo) return res.status(404).json({ error: "Jogo não encontrado." });
        if (![jogo.timeAId, jogo.timeBId].includes(timeId)) {
            return res.status(400).json({ error: "timeId não pertence a este jogo." });
        }

        // garante que o jogador pertence ao time
        const jogador = await prisma.jogador.findUnique({ where: { id: jogadorId } });
        if (!jogador) return res.status(404).json({ error: "Jogador não encontrado." });
        if (Number(jogador.timeId) !== Number(timeId)) {
            return res.status(400).json({ error: "Jogador não pertence a este time." });
        }

        // upsert (se já escalou, só confirma)
        const row = await prisma.jogadorAtuacao.upsert({
            where: { jogoId_jogadorId: { jogoId, jogadorId } },
            create: { jogoId, timeId, jogadorId, titular },
            update: { timeId, titular },
        });

        res.json({ ok: true, row });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao escalar jogador." });
    }
};

/* =========================
   POST /jogo/:id/evento
   body: { tipo, minuto, timeId, jogadorId, detalhe }
========================= */
const addEvento = async (req, res) => {
    try {
        const jogoId = Number(req.params.id);
        if (!Number.isFinite(jogoId)) return res.status(400).json({ error: "ID inválido." });

        const jogo = await prisma.jogo.findUnique({ where: { id: jogoId } });
        if (!jogo) return res.status(404).json({ error: "Jogo não encontrado." });

        const tipo = String(req.body.tipo || "").trim();
        if (!tipo) return res.status(400).json({ error: "Informe tipo." });

        const minuto = req.body.minuto === null || req.body.minuto === "" || req.body.minuto === undefined
            ? null
            : Number(req.body.minuto);

        const timeId = req.body.timeId ? Number(req.body.timeId) : null;
        const jogadorId = req.body.jogadorId ? Number(req.body.jogadorId) : null;
        const detalhe = req.body.detalhe ? String(req.body.detalhe) : null;

        if (timeId && ![jogo.timeAId, jogo.timeBId].includes(timeId)) {
            return res.status(400).json({ error: "timeId não pertence a este jogo." });
        }

        // se informou jogador, valida que ele existe (e opcionalmente valida o time)
        if (jogadorId) {
            const jogador = await prisma.jogador.findUnique({ where: { id: jogadorId } });
            if (!jogador) return res.status(400).json({ error: "jogadorId inválido." });
            if (timeId && Number(jogador.timeId) !== Number(timeId)) {
                return res.status(400).json({ error: "Jogador não pertence ao time informado." });
            }
        }

        const evento = await prisma.jogoEvento.create({
            data: {
                jogoId,
                tipo,
                minuto: Number.isFinite(minuto) ? minuto : null,
                timeId: timeId || null,
                jogadorId: jogadorId || null,
                detalhe,
            },
        });

        res.json({ ok: true, evento });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao adicionar evento." });
    }
};

module.exports = {
    readOne,
    updateStats,
    addLineup,
    addEvento,
};
