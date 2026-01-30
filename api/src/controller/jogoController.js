// ✅ api/src/controller/jogoController.js (ARQUIVO TODO) — alinhado ao seu schema
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
                timeA: { include: { jogadores: true } }, // jogadores = Usuarios com timeRelacionadoId = time.id
                timeB: { include: { jogadores: true } },

                estatisticasTimes: true,
                jogadoresAtuacao: true,

                eventos: {
                    orderBy: { id: "asc" },
                    include: {
                        time: true,
                        jogador: true,
                        jogadorSaindo: true,
                        jogadorEntrando: true,
                    },
                },
            },
        });

        if (!jogo) return res.status(404).json({ error: "Jogo não encontrado." });

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
   jogadorId = Usuario.id
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

        // ✅ jogador é Usuario
        const jogador = await prisma.usuario.findUnique({ where: { id: jogadorId } });
        if (!jogador) return res.status(404).json({ error: "Jogador (usuário) não encontrado." });

        // ✅ valida se pertence ao time (via timeRelacionadoId)
        if (Number(jogador.timeRelacionadoId) !== Number(timeId)) {
            return res.status(400).json({ error: "Usuário não pertence a este time." });
        }

        // ✅ tabela é JogoJogador (não JogadorAtuacao)
        const row = await prisma.jogoJogador.upsert({
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
   body:
     - evento normal: { tipo, minuto, timeId, jogadorId, detalhe }
     - substituição:  { tipo:"SUBSTITUICAO", minuto, timeId, jogadorSaindoId, jogadorEntrandoId, detalhe }
   tipo = enum EventoTipo (ex: "GOL", "CARTAO_AMARELO"...)
========================= */
const addEvento = async (req, res) => {
    try {
        const jogoId = Number(req.params.id);
        if (!Number.isFinite(jogoId)) return res.status(400).json({ error: "ID inválido." });

        const jogo = await prisma.jogo.findUnique({ where: { id: jogoId } });
        if (!jogo) return res.status(404).json({ error: "Jogo não encontrado." });

        const tipo = String(req.body.tipo || "").trim().toUpperCase();
        if (!tipo) return res.status(400).json({ error: "Informe tipo." });

        const minuto =
            req.body.minuto === null || req.body.minuto === "" || req.body.minuto === undefined
                ? null
                : Number(req.body.minuto);

        const timeId = req.body.timeId ? Number(req.body.timeId) : null;

        const jogadorId = req.body.jogadorId ? Number(req.body.jogadorId) : null;
        const jogadorSaindoId = req.body.jogadorSaindoId ? Number(req.body.jogadorSaindoId) : null;
        const jogadorEntrandoId = req.body.jogadorEntrandoId ? Number(req.body.jogadorEntrandoId) : null;

        const detalhe = req.body.detalhe ? String(req.body.detalhe) : null;

        if (timeId && ![jogo.timeAId, jogo.timeBId].includes(timeId)) {
            return res.status(400).json({ error: "timeId não pertence a este jogo." });
        }

        // valida jogadores informados
        const validaUsuario = async (id, label) => {
            if (!id) return null;
            const u = await prisma.usuario.findUnique({ where: { id } });
            if (!u) throw new Error(`${label} inválido.`);
            if (timeId && Number(u.timeRelacionadoId) !== Number(timeId)) {
                throw new Error(`${label} não pertence ao time informado.`);
            }
            return u;
        };

        if (jogadorId) await validaUsuario(jogadorId, "jogadorId");
        if (jogadorSaindoId) await validaUsuario(jogadorSaindoId, "jogadorSaindoId");
        if (jogadorEntrandoId) await validaUsuario(jogadorEntrandoId, "jogadorEntrandoId");

        const evento = await prisma.jogoEvento.create({
            data: {
                jogoId,
                tipo, // ✅ enum
                minuto: Number.isFinite(minuto) ? minuto : null,
                timeId: timeId || null,
                jogadorId: jogadorId || null,
                jogadorSaindoId: jogadorSaindoId || null,
                jogadorEntrandoId: jogadorEntrandoId || null,
                detalhe,
            },
        });

        res.json({ ok: true, evento });
    } catch (err) {
        console.error(err);

        // erro "bonito" pro front
        const msg = err?.message || "Erro ao adicionar evento.";
        if (msg.includes("inválido") || msg.includes("não pertence")) {
            return res.status(400).json({ error: msg });
        }

        res.status(500).json({ error: "Erro ao adicionar evento." });
    }
};

module.exports = {
    readOne,
    updateStats,
    addLineup,
    addEvento,
};
