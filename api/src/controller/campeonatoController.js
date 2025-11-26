const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Criar campeonato
const create = async (req, res) => {
    try {
        const { societyId, nome, tipo, maxTimes } = req.body;

        if (!societyId || !nome || !tipo || !maxTimes) {
            return res.status(400).json({ error: "Dados incompletos." });
        }

        const campeon = await prisma.campeonato.create({
            data: {
                societyId: Number(societyId),
                nome,
                tipo,
                maxTimes: Number(maxTimes)
            }
        });

        return res.status(201).json(campeon);

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Erro ao criar campeonato." });
    }
};

// Listar por society
const listBySociety = async (req, res) => {
    try {
        const { societyId } = req.params;

        const campeonatos = await prisma.campeonato.findMany({
            where: { societyId: Number(societyId) },
            include: {
                times: {
                    include: { time: true }
                }
            }
        });

        res.json(campeonatos);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Erro ao listar campeonatos." });
    }
};

// Adicionar time no campeonato
const addTime = async (req, res) => {
    try {
        const { id } = req.params;
        const { timeId } = req.body;

        const exists = await prisma.timeCampeonato.findFirst({
            where: { campeonatoId: Number(id), timeId: Number(timeId) }
        });

        if (exists) {
            return res.status(400).json({ error: "Time já está no campeonato." });
        }

        const added = await prisma.timeCampeonato.create({
            data: {
                campeonatoId: Number(id),
                timeId: Number(timeId)
            }
        });

        res.json(added);

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Erro ao adicionar time." });
    }
};

// Gerar jogos (mata-mata)
const generateBracket = async (req, res) => {
    try {
        const { id } = req.params;

        const times = await prisma.timeCampeonato.findMany({
            where: { campeonatoId: Number(id) }
        });

        if (times.length < 2) {
            return res.status(400).json({ error: "É necessário pelo menos 2 times." });
        }

        const embaralhado = times
            .map(t => t.timeId)
            .sort(() => Math.random() - 0.5);

        const jogosCriados = [];

        for (let i = 0; i < embaralhado.length; i += 2) {
            if (!embaralhado[i + 1]) break;

            const jogo = await prisma.jogo.create({
                data: {
                    campeonatoId: Number(id),
                    round: 1,
                    timeAId: embaralhado[i],
                    timeBId: embaralhado[i + 1]
                }
            });

            jogosCriados.push(jogo);
        }

        res.json({ jogos: jogosCriados });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Erro ao gerar chaves." });
    }
};

// Listar jogos
const listGames = async (req, res) => {
    try {
        const { id } = req.params;

        const jogos = await prisma.jogo.findMany({
            where: { campeonatoId: Number(id) },
            include: {
                timeA: true,
                timeB: true,
                vencedor: true
            }
        });

        res.json(jogos);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Erro ao buscar jogos." });
    }
};

// Finalizar jogo
const finalizarJogo = async (req, res) => {
    try {
        const { jogoId } = req.params;
        const { golsA, golsB } = req.body;

        const jogoAtual = await prisma.jogo.findUnique({
            where: { id: Number(jogoId) }
        });

        if (!jogoAtual) {
            return res.status(404).json({ error: "Jogo não encontrado." });
        }

        let vencedorId = null;

        if (Number(golsA) > Number(golsB)) vencedorId = jogoAtual.timeAId;
        if (Number(golsB) > Number(golsA)) vencedorId = jogoAtual.timeBId;

        const jogoFinalizado = await prisma.jogo.update({
            where: { id: Number(jogoId) },
            data: {
                golsA: Number(golsA),
                golsB: Number(golsB),
                vencedorId,
                finalizado: true
            },
            include: {
                timeA: true,
                timeB: true,
                vencedor: true
            }
        });

        res.json(jogoFinalizado);

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Erro ao finalizar jogo." });
    }
};

module.exports = {
    create,
    listBySociety,
    addTime,
    generateBracket,
    listGames,
    finalizarJogo
};
