const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/* ======================================================
   HELPERS
====================================================== */

const toId = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

function buildRoundRobinRounds(teamIds) {

    const ids = [...teamIds];

    if (ids.length % 2 !== 0) {
        ids.push(null);
    }

    const total = ids.length;
    const rounds = total - 1;

    const arr = [...ids];

    const result = [];

    for (let r = 0; r < rounds; r++) {

        const pairs = [];

        for (let i = 0; i < total / 2; i++) {

            const a = arr[i];
            const b = arr[total - 1 - i];

            if (a !== null && b !== null) {
                pairs.push([a, b]);
            }
        }

        result.push(pairs);

        const fixed = arr.shift();

        arr.unshift(fixed);

        arr.splice(1, 0, arr.pop());
    }

    return result;
}

async function ensureTabela(campeonatoId, timeId) {

    const exists =
        await prisma.tabelaCampeonato.findUnique({

            where: {
                campeonatoId_timeId: {
                    campeonatoId,
                    timeId
                }
            }
        });

    if (exists) return;

    await prisma.tabelaCampeonato.create({
        data: {
            campeonatoId,
            timeId,
        }
    });
}

/* ======================================================
   CREATE
====================================================== */

const create = async (req, res) => {

    try {

        const data = req.body;

        if (!data.nome) {
            return res.status(400).json({
                error: "Nome obrigatório."
            });
        }

        const campeonato =
            await prisma.campeonato.create({

                data: {
                    societyId: Number(data.societyId),

                    nome: data.nome,

                    tipo: "LIGA_IDA_VOLTA",

                    maxTimes: Number(data.maxTimes),

                    modalidade:
                        data.modalidade || "SOCIETY",

                    categoria:
                        data.categoria || "ADULTO",

                    temporada:
                        data.temporada || null,

                    dataInicio:
                        data.dataInicio
                            ? new Date(data.dataInicio)
                            : null,

                    dataFim:
                        data.dataFim
                            ? new Date(data.dataFim)
                            : null,

                    status: "EM_CRIACAO",

                    faseAtual: "LIGA",

                    roundAtual: 1,

                    regulamentoTexto:
                        data.regulamentoTexto || null,

                    regulamentoUrl:
                        data.regulamentoUrl || null,
                }
            });

        return res.status(201).json(campeonato);

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            error: "Erro ao criar campeonato."
        });
    }
};

/* ======================================================
   LIST ALL
====================================================== */

const listAll = async (req, res) => {

    try {

        const campeonatos =
            await prisma.campeonato.findMany({

                include: {
                    society: true
                },

                orderBy: {
                    id: "desc"
                }
            });

        return res.json(campeonatos);

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            error: "Erro ao listar."
        });
    }
};

/* ======================================================
   LIST BY SOCIETY
====================================================== */

const listBySociety = async (req, res) => {

    try {

        const societyId =
            Number(req.params.societyId);

        const campeonatos =
            await prisma.campeonato.findMany({

                where: {
                    societyId
                },

                include: {
                    society: true
                },

                orderBy: {
                    id: "desc"
                }
            });

        return res.json(campeonatos);

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            error: "Erro ao listar."
        });
    }
};

/* ======================================================
   READ ONE
====================================================== */

const readOne = async (req, res) => {

    try {

        const campeonatoId =
            Number(req.params.id);

        const campeonato =
            await prisma.campeonato.findUnique({

                where: {
                    id: campeonatoId
                },

                include: {

                    society: true,

                    times: {
                        include: {
                            time: true
                        }
                    },

                    tabela: {

                        include: {
                            time: true
                        },

                        orderBy: [
                            { pontos: "desc" },
                            { saldoGols: "desc" },
                            { golsPro: "desc" },
                            { vitorias: "desc" },
                        ]
                    },

                    jogos: {

                        include: {
                            timeA: true,
                            timeB: true,
                        },

                        orderBy: [
                            { rodada: "asc" },
                            { id: "asc" }
                        ]
                    }
                }
            });

        if (!campeonato) {

            return res.status(404).json({
                error: "Campeonato não encontrado."
            });
        }

        return res.json(campeonato);

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            error: "Erro ao buscar campeonato."
        });
    }
};

/* ======================================================
   ADD TIME
====================================================== */

const addTime = async (req, res) => {

    try {

        const campeonatoId =
            Number(req.params.id);

        const timeId =
            Number(req.body.timeId);

        const campeonato =
            await prisma.campeonato.findUnique({

                where: {
                    id: campeonatoId
                },

                include: {
                    times: true
                }
            });

        if (!campeonato) {

            return res.status(404).json({
                error: "Campeonato não encontrado."
            });
        }

        if (
            campeonato.times.length >=
            campeonato.maxTimes
        ) {

            return res.status(400).json({
                error: "Limite de times atingido."
            });
        }

        const exists =
            await prisma.timeCampeonato.findFirst({

                where: {
                    campeonatoId,
                    timeId
                }
            });

        if (exists) {

            return res.status(400).json({
                error: "Time já adicionado."
            });
        }

        await prisma.timeCampeonato.create({

            data: {
                campeonatoId,
                timeId
            }
        });

        await ensureTabela(
            campeonatoId,
            timeId
        );

        return res.json({
            ok: true
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            error: "Erro ao adicionar time."
        });
    }
};

/* ======================================================
   GERAR LIGA
====================================================== */

const generateLeague = async (req, res) => {

    try {

        const campeonatoId =
            Number(req.params.id);

        const campeonato =
            await prisma.campeonato.findUnique({

                where: {
                    id: campeonatoId
                },

                include: {
                    times: true,
                    jogos: true,
                }
            });

        if (!campeonato) {

            return res.status(404).json({
                error: "Campeonato não encontrado."
            });
        }

        if (campeonato.jogos.length > 0) {

            return res.status(400).json({
                error: "Jogos já gerados."
            });
        }

        const teamIds =
            campeonato.times.map(
                (t) => t.timeId
            );

        if (teamIds.length !== 4) {

            return res.status(400).json({
                error: "A liga precisa ter exatamente 4 times."
            });
        }

        const rounds =
            buildRoundRobinRounds(teamIds);

        const totalRounds =
            rounds.length;

        /* ==========================
           IDA
        ========================== */

        for (let r = 0; r < rounds.length; r++) {

            for (const [a, b] of rounds[r]) {

                await prisma.jogo.create({

                    data: {

                        campeonatoId,

                        rodada: r + 1,

                        tipoJogo: "IDA",

                        timeAId: a,
                        timeBId: b,
                    }
                });
            }
        }

        /* ==========================
           VOLTA
        ========================== */

        for (let r = 0; r < rounds.length; r++) {

            for (const [a, b] of rounds[r]) {

                await prisma.jogo.create({

                    data: {

                        campeonatoId,

                        rodada:
                            totalRounds + (r + 1),

                        tipoJogo: "VOLTA",

                        timeAId: b,
                        timeBId: a,
                    }
                });
            }
        }

        await prisma.campeonato.update({

            where: {
                id: campeonatoId
            },

            data: {
                status: "EM_ANDAMENTO"
            }
        });

        return res.json({
            ok: true
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            error: "Erro ao gerar liga."
        });
    }
};

/* ======================================================
   FINALIZAR JOGO
====================================================== */

const finalizarJogo = async (req, res) => {

    try {

        const jogoId =
            Number(req.params.id);

        const golsA =
            Number(req.body.golsA);

        const golsB =
            Number(req.body.golsB);

        const jogo =
            await prisma.jogo.findUnique({

                where: {
                    id: jogoId
                }
            });

        if (!jogo) {

            return res.status(404).json({
                error: "Jogo não encontrado."
            });
        }

        if (jogo.finalizado) {

            return res.status(400).json({
                error: "Jogo já finalizado."
            });
        }

        let vencedorId = null;

        if (golsA > golsB) {
            vencedorId = jogo.timeAId;
        }

        if (golsB > golsA) {
            vencedorId = jogo.timeBId;
        }

        await prisma.jogo.update({

            where: {
                id: jogoId
            },

            data: {
                golsA,
                golsB,
                vencedorId,
                finalizado: true,
            }
        });

        const tabelaA =
            await prisma.tabelaCampeonato.findUnique({

                where: {
                    campeonatoId_timeId: {
                        campeonatoId: jogo.campeonatoId,
                        timeId: jogo.timeAId,
                    }
                }
            });

        const tabelaB =
            await prisma.tabelaCampeonato.findUnique({

                where: {
                    campeonatoId_timeId: {
                        campeonatoId: jogo.campeonatoId,
                        timeId: jogo.timeBId,
                    }
                }
            });

        let pontosA = 0;
        let pontosB = 0;

        let vitoriasA = 0;
        let vitoriasB = 0;

        let empatesA = 0;
        let empatesB = 0;

        let derrotasA = 0;
        let derrotasB = 0;

        if (golsA > golsB) {

            pontosA = 3;
            vitoriasA = 1;
            derrotasB = 1;

        } else if (golsB > golsA) {

            pontosB = 3;
            vitoriasB = 1;
            derrotasA = 1;

        } else {

            pontosA = 1;
            pontosB = 1;

            empatesA = 1;
            empatesB = 1;
        }

        await prisma.tabelaCampeonato.update({

            where: {
                id: tabelaA.id
            },

            data: {

                pontos: {
                    increment: pontosA
                },

                vitorias: {
                    increment: vitoriasA
                },

                empates: {
                    increment: empatesA
                },

                derrotas: {
                    increment: derrotasA
                },

                golsPro: {
                    increment: golsA
                },

                golsContra: {
                    increment: golsB
                },

                saldoGols: {
                    increment: golsA - golsB
                },
            }
        });

        await prisma.tabelaCampeonato.update({

            where: {
                id: tabelaB.id
            },

            data: {

                pontos: {
                    increment: pontosB
                },

                vitorias: {
                    increment: vitoriasB
                },

                empates: {
                    increment: empatesB
                },

                derrotas: {
                    increment: derrotasB
                },

                golsPro: {
                    increment: golsB
                },

                golsContra: {
                    increment: golsA
                },

                saldoGols: {
                    increment: golsB - golsA
                },
            }
        });

        return res.json({
            ok: true
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            error: "Erro ao finalizar jogo."
        });
    }
};

/* ======================================================
   RANKING
====================================================== */

const ranking = async (req, res) => {

    try {

        const campeonatoId =
            Number(req.params.id);

        const tabela =
            await prisma.tabelaCampeonato.findMany({

                where: {
                    campeonatoId
                },

                include: {
                    time: true
                },

                orderBy: [
                    { pontos: "desc" },
                    { saldoGols: "desc" },
                    { golsPro: "desc" },
                    { vitorias: "desc" },
                ]
            });

        return res.json(tabela);

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            error: "Erro ao carregar ranking."
        });
    }
};

module.exports = {
    create,
    readOne,
    listAll,
    listBySociety,
    addTime,
    generateLeague,
    finalizarJogo,
    ranking,
};