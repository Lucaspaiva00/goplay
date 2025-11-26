const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Criar campeonato
const create = async (req, res) => {
    try {
        const { societyId, nome, tipo, maxTimes } = req.body;

        if (!societyId || !nome || !tipo || !maxTimes) {
            return res.status(400).json({ error: "Dados incompletos." });
        }

        const novo = await prisma.campeonato.create({
            data: {
                societyId: Number(societyId),
                nome,
                tipo,
                maxTimes: Number(maxTimes)
            }
        });

        res.json(novo);

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Erro ao criar campeonato." });
    }
};


// Listar campeonatos de um society
const listBySociety = async (req, res) => {
    try {
        const { societyId } = req.params;

        const lista = await prisma.campeonato.findMany({
            where: { societyId: Number(societyId) },
            include: {
                times: { include: { time: true } }
            }
        });

        res.json(lista);

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
            return res.status(400).json({ error: "Este time já está no campeonato." });
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


// Gerar chaveamento (round 1)
const generateBracket = async (req, res) => {
    try {
        const { id } = req.params;

        const times = await prisma.timeCampeonato.findMany({
            where: { campeonatoId: Number(id) }
        });

        if (times.length < 2) {
            return res.status(400).json({ error: "Pelo menos 2 times são necessários." });
        }

        const lista = times.map(t => t.timeId).sort(() => Math.random() - 0.5);
        const jogosCriados = [];

        for (let i = 0; i < lista.length; i += 2) {
            if (!lista[i + 1]) break;

            const jogo = await prisma.jogo.create({
                data: {
                    campeonatoId: Number(id),
                    round: 1,
                    timeAId: lista[i],
                    timeBId: lista[i + 1]
                }
            });

            jogosCriados.push(jogo);
        }

        res.json({ jogos: jogosCriados });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Erro ao gerar chaveamento." });
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
                timeB: true
            }
        });

        res.json(jogos);

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Erro ao listar jogos." });
    }
};


const finalizarJogo = async (req, res) => {
    try {
        const { id } = req.params;
        const { golsA, golsB } = req.body;

        const jogo = await prisma.jogo.findUnique({
            where: { id: Number(id) }
        });

        if (!jogo) {
            return res.status(404).json({ error: "Jogo não encontrado." });
        }

        const vencedor =
            Number(golsA) > Number(golsB)
                ? jogo.timeAId
                : Number(golsB) > Number(golsA)
                    ? jogo.timeBId
                    : null;

        if (!vencedor)
            return res.status(400).json({ error: "Não pode haver empate em mata-mata." });

        // Finalizar jogo atual
        await prisma.jogo.update({
            where: { id: Number(id) },
            data: {
                golsA: Number(golsA),
                golsB: Number(golsB),
                vencedorId: vencedor,
                finalizado: true
            }
        });

        const campeonatoId = jogo.campeonatoId;

        // Verificar se todos os jogos dessa rodada acabaram
        const jogosRodada = await prisma.jogo.findMany({
            where: {
                campeonatoId,
                round: jogo.round
            }
        });

        const todosFinalizados = jogosRodada.every(j => j.finalizado);

        if (!todosFinalizados) {
            return res.json({ ok: true, message: "Jogo finalizado." });
        }

        // Gerar próxima rodada
        const vencedores = jogosRodada.map(j => j.vencedorId);

        if (vencedores.length === 1) {
            // CAMPEÃO
            await prisma.campeonato.update({
                where: { id: campeonatoId },
                data: { campeaoId: vencedores[0] }
            });

            return res.json({
                fim: true,
                campeaoId: vencedores[0],
                message: "Campeonato encerrado!"
            });
        }

        // Criar nova rodada
        const novaRodada = jogo.round + 1;

        const novaLista = vencedores.sort(() => Math.random() - 0.5);

        for (let i = 0; i < novaLista.length; i += 2) {
            await prisma.jogo.create({
                data: {
                    campeonatoId,
                    round: novaRodada,
                    timeAId: novaLista[i],
                    timeBId: novaLista[i + 1]
                }
            });
        }

        res.json({
            novaFase: true,
            message: "Nova fase gerada!",
            round: novaRodada
        });

    } catch (error) {
        console.log(error);
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
