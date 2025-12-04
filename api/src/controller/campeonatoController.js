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
        res.status(500).json({ error: "Erro ao criar campeonato." });
    }
};

// Buscar dados completos
const readOne = async (req, res) => {
    try {
        const campeonato = await prisma.campeonato.findUnique({
            where: { id: Number(req.params.id) },
            include: {
                times: { include: { time: true } },
                grupos: {
                    include: {
                        timesGrupo: { include: { time: true } },
                        jogos: { include: { timeA: true, timeB: true } }
                    }
                },
                jogos: { include: { timeA: true, timeB: true } }
            }
        });

        if (!campeonato)
            return res.status(404).json({ error: "Campeonato não encontrado" });

        res.json(campeonato);
    } catch {
        res.status(500).json({ error: "Erro ao buscar campeonato" });
    }
};

// Listar por society
const listBySociety = async (req, res) => {
    try {
        const lista = await prisma.campeonato.findMany({
            where: { societyId: Number(req.params.societyId) },
            include: { times: { include: { time: true } } }
        });
        res.json(lista);
    } catch {
        res.status(500).json({ error: "Erro ao listar campeonatos." });
    }
};

// Adicionar time
const addTime = async (req, res) => {
    try {
        const { id } = req.params;
        const { timeId } = req.body;

        const exists = await prisma.timeCampeonato.findFirst({
            where: { campeonatoId: Number(id), timeId: Number(timeId) }
        });
        if (exists) return res.status(400).json({ error: "Time já inscrito." });

        const novo = await prisma.timeCampeonato.create({
            data: {
                campeonatoId: Number(id),
                timeId: Number(timeId)
            }
        });

        res.json(novo);
    } catch {
        res.status(500).json({ error: "Erro ao adicionar time." });
    }
};

// Gerar grupos
const generateGroups = async (req, res) => {
    try {
        const campeonato = await prisma.campeonato.findUnique({
            where: { id: Number(req.params.id) },
            include: { times: true }
        });

        if (campeonato.times.length < 4)
            return res.status(400).json({ error: "Mínimo 4 times." });

        const totalTimes = campeonato.times.length;
        const numGrupos = totalTimes <= 8 ? 2 : totalTimes <= 12 ? 3 : 4;

        const grupos = [];
        for (let i = 0; i < numGrupos; i++) {
            grupos.push(await prisma.grupo.create({
                data: {
                    nome: `Grupo ${String.fromCharCode(65 + i)}`,
                    campeonatoId: campeonato.id
                }
            }));
        }

        let idx = 0;
        const shuffle = campeonato.times
            .map(t => t.timeId)
            .sort(() => Math.random() - 0.5);

        for (let tid of shuffle) {
            await prisma.timeGrupo.create({
                data: {
                    grupoId: grupos[idx].id,
                    timeId: tid
                }
            });
            idx = (idx + 1) % grupos.length;
        }

        res.json({ ok: true });
    } catch {
        res.status(500).json({ error: "Erro ao criar grupos" });
    }
};

// Gerar jogos de grupo
const generateGroupMatches = async (req, res) => {
    try {
        const grupos = await prisma.grupo.findMany({
            where: { campeonatoId: Number(req.params.id) },
            include: { timesGrupo: true }
        });

        for (const g of grupos) {
            const times = g.timesGrupo.map(x => x.timeId);

            for (let i = 0; i < times.length; i++) {
                for (let j = i + 1; j < times.length; j++) {
                    await prisma.jogo.create({
                        data: {
                            campeonatoId: Number(req.params.id),
                            grupoId: g.id,
                            round: 1,
                            timeAId: times[i],
                            timeBId: times[j]
                        }
                    });
                }
            }
        }

        res.json({ ok: true });
    } catch {
        res.status(500).json({ error: "Erro ao gerar jogos" });
    }
};

// Atualiza classificação
async function atualizarClassificacao(jogo) {
    const grupoId = jogo.grupoId;
    if (!grupoId) return;

    const { golsA, golsB } = jogo;

    const timeA = await prisma.timeGrupo.findFirst({ where: { grupoId, timeId: jogo.timeAId } });
    const timeB = await prisma.timeGrupo.findFirst({ where: { grupoId, timeId: jogo.timeBId } });

    const updateStats = async (tg, gp, gc, pts) => {
        await prisma.timeGrupo.update({
            where: { id: tg.id },
            data: {
                golsPro: tg.golsPro + gp,
                golsContra: tg.golsContra + gc,
                saldoGols: (tg.saldoGols + (gp - gc)),
                pontos: tg.pontos + pts,
                vitorias: tg.vitorias + (pts === 3 ? 1 : 0),
                empates: tg.empates + (pts === 1 ? 1 : 0),
                derrotas: tg.derrotas + (pts === 0 && gp !== gc ? 1 : 0)
            }
        });
    };

    if (golsA > golsB) {
        await updateStats(timeA, golsA, golsB, 3);
        await updateStats(timeB, golsB, golsA, 0);
    } else if (golsB > golsA) {
        await updateStats(timeB, golsB, golsA, 3);
        await updateStats(timeA, golsA, golsB, 0);
    } else {
        await updateStats(timeA, golsA, golsB, 1);
        await updateStats(timeB, golsB, golsA, 1);
    }
}

// Finalizar jogo
const finalizarJogo = async (req, res) => {
    try {
        const jogo = await prisma.jogo.update({
            where: { id: Number(req.params.id) },
            data: {
                golsA: Number(req.body.golsA),
                golsB: Number(req.body.golsB),
                finalizado: true
            }
        });

        await atualizarClassificacao(jogo);

        res.json({ ok: true });
    } catch {
        res.status(500).json({ error: "Erro ao finalizar jogo" });
    }
};
const getBracket = async (req, res) => {
    try {
        const id = Number(req.params.id);

        const jogos = await prisma.jogo.findMany({
            where: {
                campeonatoId: id,
                fase: "MATA_MATA"
            },
            include: {
                timeA: true,
                timeB: true
            },
            orderBy: {
                round: "asc"
            }
        });

        res.json(jogos);
    } catch (error) {
        console.error("Erro ao carregar chaveamento:", error);
        res.status(500).json({ error: "Erro ao carregar chaveamento" });
    }
};



module.exports = {
    create,
    readOne,
    listBySociety,
    addTime,
    generateGroups,
    generateGroupMatches,
    finalizarJogo,
    getBracket
};