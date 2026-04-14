const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/* =========================
   HELPERS
========================= */
const toNumberOrZero = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const TIPOS_EVENTO_VALIDOS = [
    "GOL",
    "CARTAO_AMARELO",
    "CARTAO_VERMELHO",
    "FALTA",
    "PENALTI",
    "SUBSTITUICAO"
];

/* =========================
   GET /jogo/:id
========================= */
const readOne = async (req, res) => {
    try {
        const jogoId = Number(req.params.id);
        if (!Number.isFinite(jogoId)) {
            return res.status(400).json({ error: "ID inválido." });
        }

        const jogo = await prisma.jogo.findUnique({
            where: { id: jogoId },
            include: {
                campeonato: true,
                timeA: { include: { jogadores: true } },
                timeB: { include: { jogadores: true } },

                estatisticasTimes: true,
                jogadoresAtuacao: true,

                eventos: {
                    orderBy: [
                        { minuto: "asc" },
                        { id: "asc" }
                    ],
                    include: {
                        time: true,
                        jogador: true,
                        jogadorSaindo: true,
                        jogadorEntrando: true,
                    },
                },
            },
        });

        if (!jogo) {
            return res.status(404).json({ error: "Jogo não encontrado." });
        }

        const elencoA = jogo.timeA?.jogadores || [];
        const elencoB = jogo.timeB?.jogadores || [];

        return res.json({ jogo, elencoA, elencoB });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro ao buscar jogo." });
    }
};

/* =========================
   PUT /jogo/:id/stats
========================= */
const updateStats = async (req, res) => {
    try {
        const jogoId = Number(req.params.id);
        const timeId = Number(req.body.timeId);

        if (!Number.isFinite(jogoId) || !Number.isFinite(timeId)) {
            return res.status(400).json({ error: "jogoId/timeId inválido." });
        }

        const jogo = await prisma.jogo.findUnique({ where: { id: jogoId } });
        if (!jogo) {
            return res.status(404).json({ error: "Jogo não encontrado." });
        }

        if (![jogo.timeAId, jogo.timeBId].includes(timeId)) {
            return res.status(400).json({ error: "timeId não pertence a este jogo." });
        }

        const payload = {
            chutes: toNumberOrZero(req.body.chutes),
            chutesNoGol: toNumberOrZero(req.body.chutesNoGol),
            escanteios: toNumberOrZero(req.body.escanteios),
            laterais: toNumberOrZero(req.body.laterais),
            faltas: toNumberOrZero(req.body.faltas),
            posse: toNumberOrZero(req.body.posse),
        };

        // valida posse
        if (payload.posse < 0 || payload.posse > 100) {
            return res.status(400).json({ error: "Posse deve estar entre 0 e 100." });
        }

        const row = await prisma.jogoEstatisticaTime.upsert({
            where: { jogoId_timeId: { jogoId, timeId } },
            create: { jogoId, timeId, ...payload },
            update: { ...payload },
        });

        return res.json({ ok: true, row });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro ao atualizar stats." });
    }
};

/* =========================
   POST /jogo/:id/escalacao
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
        if (!jogo) {
            return res.status(404).json({ error: "Jogo não encontrado." });
        }

        if (![jogo.timeAId, jogo.timeBId].includes(timeId)) {
            return res.status(400).json({ error: "timeId não pertence a este jogo." });
        }

        const jogador = await prisma.usuario.findUnique({ where: { id: jogadorId } });
        if (!jogador) {
            return res.status(404).json({ error: "Jogador não encontrado." });
        }

        if (Number(jogador.timeRelacionadoId) !== Number(timeId)) {
            return res.status(400).json({ error: "Usuário não pertence a este time." });
        }

        const row = await prisma.jogoJogador.upsert({
            where: { jogoId_jogadorId: { jogoId, jogadorId } },
            create: { jogoId, timeId, jogadorId, titular },
            update: { timeId, titular },
        });

        return res.json({ ok: true, row });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro ao escalar jogador." });
    }
};

/* =========================
   POST /jogo/:id/evento
========================= */
const addEvento = async (req, res) => {
    try {
        const jogoId = Number(req.params.id);
        if (!Number.isFinite(jogoId)) {
            return res.status(400).json({ error: "ID inválido." });
        }

        const jogo = await prisma.jogo.findUnique({ where: { id: jogoId } });
        if (!jogo) {
            return res.status(404).json({ error: "Jogo não encontrado." });
        }

        const tipo = String(req.body.tipo || "").trim().toUpperCase();

        if (!TIPOS_EVENTO_VALIDOS.includes(tipo)) {
            return res.status(400).json({ error: "Tipo de evento inválido." });
        }

        const minuto =
            req.body.minuto === null || req.body.minuto === "" || req.body.minuto === undefined
                ? null
                : Number(req.body.minuto);

        if (minuto !== null && (!Number.isFinite(minuto) || minuto < 0)) {
            return res.status(400).json({ error: "Minuto inválido." });
        }

        const timeId = req.body.timeId ? Number(req.body.timeId) : null;

        if (timeId && ![jogo.timeAId, jogo.timeBId].includes(timeId)) {
            return res.status(400).json({ error: "timeId não pertence a este jogo." });
        }

        const jogadorId = req.body.jogadorId ? Number(req.body.jogadorId) : null;
        const jogadorSaindoId = req.body.jogadorSaindoId ? Number(req.body.jogadorSaindoId) : null;
        const jogadorEntrandoId = req.body.jogadorEntrandoId ? Number(req.body.jogadorEntrandoId) : null;

        const detalhe = req.body.detalhe ? String(req.body.detalhe) : null;

        const validaUsuario = async (id, label) => {
            if (!id) return;
            const u = await prisma.usuario.findUnique({ where: { id } });
            if (!u) throw new Error(`${label} inválido.`);
            if (timeId && Number(u.timeRelacionadoId) !== Number(timeId)) {
                throw new Error(`${label} não pertence ao time informado.`);
            }
        };

        await validaUsuario(jogadorId, "jogadorId");
        await validaUsuario(jogadorSaindoId, "jogadorSaindoId");
        await validaUsuario(jogadorEntrandoId, "jogadorEntrandoId");

        // valida substituição
        if (tipo === "SUBSTITUICAO") {
            if (!jogadorSaindoId || !jogadorEntrandoId) {
                return res.status(400).json({
                    error: "Substituição exige jogadorSaindoId e jogadorEntrandoId."
                });
            }

            if (jogadorSaindoId === jogadorEntrandoId) {
                return res.status(400).json({
                    error: "Jogador que sai não pode ser o mesmo que entra."
                });
            }
        }

        const evento = await prisma.jogoEvento.create({
            data: {
                jogoId,
                tipo,
                minuto,
                timeId,
                jogadorId,
                jogadorSaindoId,
                jogadorEntrandoId,
                detalhe,
            },
        });

        return res.json({ ok: true, evento });

    } catch (err) {
        console.error(err);

        const msg = err?.message || "Erro ao adicionar evento.";

        if (msg.includes("inválido") || msg.includes("não pertence")) {
            return res.status(400).json({ error: msg });
        }

        return res.status(500).json({ error: "Erro ao adicionar evento." });
    }
};

module.exports = {
    readOne,
    updateStats,
    addLineup,
    addEvento,
};