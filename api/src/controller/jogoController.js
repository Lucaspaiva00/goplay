const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET /jogo/:id (detalhes completos)
const readOne = async (req, res) => {
    try {
        const jogoId = Number(req.params.id);

        const jogo = await prisma.jogo.findUnique({
            where: { id: jogoId },
            include: {
                campeonato: { select: { id: true, nome: true, faseAtual: true } },
                timeA: true,
                timeB: true,
                estatisticasTimes: { include: { time: true } },
                jogadoresAtuacao: {
                    include: {
                        jogador: { select: { id: true, nome: true, posicaoCampo: true, goleiro: true } },
                        time: { select: { id: true, nome: true } },
                    },
                    orderBy: [{ titular: "desc" }, { id: "asc" }],
                },
                eventos: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
            },
        });

        if (!jogo) return res.status(404).json({ error: "Jogo não encontrado." });

        // também traz elenco “base” dos times (usando seu relacionamento atual)
        const elencoA = await prisma.usuario.findMany({
            where: { timeRelacionadoId: jogo.timeAId },
            select: { id: true, nome: true, posicaoCampo: true, goleiro: true },
            orderBy: { nome: "asc" },
        });

        const elencoB = await prisma.usuario.findMany({
            where: { timeRelacionadoId: jogo.timeBId },
            select: { id: true, nome: true, posicaoCampo: true, goleiro: true },
            orderBy: { nome: "asc" },
        });

        res.json({ jogo, elencoA, elencoB });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao buscar jogo." });
    }
};

// PUT /jogo/:id/stats  { timeId, chutes, chutesNoGol, escanteios, laterais, faltas, posse }
const updateStats = async (req, res) => {
    try {
        const jogoId = Number(req.params.id);
        const timeId = Number(req.body.timeId);

        if (!jogoId || !timeId) return res.status(400).json({ error: "Informe jogoId e timeId." });

        const row = await prisma.jogoEstatisticaTime.findUnique({
            where: { jogoId_timeId: { jogoId, timeId } },
        });

        if (!row) {
            return res.status(404).json({ error: "Stats não encontrados (linha não existe). Gere/crie stats do jogo." });
        }

        const data = {};
        const fields = ["chutes", "chutesNoGol", "escanteios", "laterais", "faltas", "posse"];
        fields.forEach((f) => {
            if (req.body[f] !== undefined && req.body[f] !== null && req.body[f] !== "") {
                data[f] = Number(req.body[f]);
            }
        });

        const updated = await prisma.jogoEstatisticaTime.update({
            where: { id: row.id },
            data,
        });

        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao atualizar estatísticas." });
    }
};

// POST /jogo/:id/escalacao  { timeId, jogadorId, titular }
const addLineup = async (req, res) => {
    try {
        const jogoId = Number(req.params.id);
        const timeId = Number(req.body.timeId);
        const jogadorId = Number(req.body.jogadorId);
        const titular = !!req.body.titular;

        if (!jogoId || !timeId || !jogadorId) return res.status(400).json({ error: "Informe jogoId, timeId, jogadorId." });

        const up = await prisma.jogoJogador.upsert({
            where: { jogoId_jogadorId: { jogoId, jogadorId } },
            update: { timeId, titular },
            create: { jogoId, timeId, jogadorId, titular },
        });

        res.json(up);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao salvar escalação." });
    }
};

// POST /jogo/:id/evento
// { tipo, timeId?, jogadorId?, minuto?, detalhe?, jogadorSaindoId?, jogadorEntrandoId? }
const addEvento = async (req, res) => {
    try {
        const jogoId = Number(req.params.id);
        const tipo = req.body.tipo;

        if (!jogoId || !tipo) return res.status(400).json({ error: "Informe jogoId e tipo." });

        const payload = {
            jogoId,
            tipo,
            minuto: req.body.minuto !== undefined && req.body.minuto !== null && req.body.minuto !== "" ? Number(req.body.minuto) : null,
            timeId: req.body.timeId ? Number(req.body.timeId) : null,
            jogadorId: req.body.jogadorId ? Number(req.body.jogadorId) : null,
            detalhe: req.body.detalhe ? String(req.body.detalhe) : null,
            jogadorSaindoId: req.body.jogadorSaindoId ? Number(req.body.jogadorSaindoId) : null,
            jogadorEntrandoId: req.body.jogadorEntrandoId ? Number(req.body.jogadorEntrandoId) : null,
        };

        const evento = await prisma.jogoEvento.create({ data: payload });

        // ✅ opcional: manter o "EstatisticaJogo" sincronizado para gols/cartões
        if (payload.jogadorId && ["GOL", "CARTAO_AMARELO", "CARTAO_VERMELHO"].includes(tipo)) {
            const row = await prisma.estatisticaJogo.findFirst({
                where: { jogoId, jogadorId: payload.jogadorId },
            });

            const data = {};
            if (tipo === "GOL") data.gols = (row?.gols || 0) + 1;
            if (tipo === "CARTAO_AMARELO") data.amarelos = (row?.amarelos || 0) + 1;
            if (tipo === "CARTAO_VERMELHO") data.vermelhos = (row?.vermelhos || 0) + 1;

            if (row) {
                await prisma.estatisticaJogo.update({ where: { id: row.id }, data });
            } else {
                await prisma.estatisticaJogo.create({
                    data: {
                        jogoId,
                        jogadorId: payload.jogadorId,
                        gols: tipo === "GOL" ? 1 : 0,
                        amarelos: tipo === "CARTAO_AMARELO" ? 1 : 0,
                        vermelhos: tipo === "CARTAO_VERMELHO" ? 1 : 0,
                    },
                });
            }
        }

        res.json(evento);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao registrar evento." });
    }
};

module.exports = {
    readOne,
    updateStats,
    addLineup,
    addEvento,
};
