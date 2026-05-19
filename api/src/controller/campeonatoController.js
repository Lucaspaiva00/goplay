const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/* =====================================================
   HELPERS
===================================================== */

const toId = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

const parseDateOrNull = (value) => {
    if (!value) return null;

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
        return null;
    }

    return d;
};

function buildRoundRobinRounds(teamIds) {
    const ids = [...teamIds].map(Number);

    if (ids.length !== 4) {
        throw new Error("A Liga Ida e Volta precisa ter exatamente 4 times.");
    }

    return [
        [
            [ids[0], ids[1]],
            [ids[2], ids[3]],
        ],
        [
            [ids[0], ids[2]],
            [ids[1], ids[3]],
        ],
        [
            [ids[0], ids[3]],
            [ids[1], ids[2]],
        ],
    ];
}

async function ensureTabelaRow(tx, campeonatoId, timeId) {
    const existe = await tx.tabelaCampeonato.findUnique({
        where: {
            campeonatoId_timeId: {
                campeonatoId,
                timeId,
            },
        },
    });

    if (existe) return existe;

    return tx.tabelaCampeonato.create({
        data: {
            campeonatoId,
            timeId,
        },
    });
}

async function createGameWithStats(tx, data) {
    const jogo = await tx.jogo.create({
        data: {
            campeonatoId: Number(data.campeonatoId),
            grupoId: null,
            rodada: Number(data.rodada),
            tipoJogo: data.tipoJogo,
            timeAId: Number(data.timeAId),
            timeBId: Number(data.timeBId),
        },
    });

    await tx.jogoEstatisticaTime.createMany({
        data: [
            {
                jogoId: jogo.id,
                timeId: jogo.timeAId,
            },
            {
                jogoId: jogo.id,
                timeId: jogo.timeBId,
            },
        ],
        skipDuplicates: true,
    });

    return jogo;
}

/* =====================================================
   CRIAR CAMPEONATO
===================================================== */

const create = async (req, res) => {
    try {
        const societyId = toId(req.body.societyId);
        const nome = String(req.body.nome || "").trim();
        const maxTimes = Number(req.body.maxTimes || 4);

        if (!societyId) {
            return res.status(400).json({
                error: "societyId inválido.",
            });
        }

        if (!nome) {
            return res.status(400).json({
                error: "Informe o nome do campeonato.",
            });
        }

        if (maxTimes !== 4) {
            return res.status(400).json({
                error: "A Liga Ida e Volta precisa ter exatamente 4 times.",
            });
        }

        const society = await prisma.society.findUnique({
            where: {
                id: societyId,
            },
        });

        if (!society) {
            return res.status(404).json({
                error: "Society não encontrado.",
            });
        }

        const campeonato = await prisma.campeonato.create({
            data: {
                societyId,
                nome,
                tipo: "LIGA_IDA_VOLTA",
                maxTimes: 4,

                modalidade: req.body.modalidade || "SOCIETY",
                categoria: req.body.categoria || "ADULTO",
                temporada: req.body.temporada || null,

                dataInicio: parseDateOrNull(req.body.dataInicio),
                dataFim: parseDateOrNull(req.body.dataFim),

                status: "EM_CRIACAO",
                faseAtual: "LIGA",
                roundAtual: 1,

                regulamentoTexto: req.body.regulamentoTexto || null,
                regulamentoUrl: req.body.regulamentoUrl || null,
            },
        });

        return res.status(201).json(campeonato);

    } catch (err) {
        console.error("ERRO create campeonato:", err);

        return res.status(500).json({
            error: err.message || "Erro ao criar campeonato.",
        });
    }
};

/* =====================================================
   LISTAR TODOS
===================================================== */

const listAll = async (req, res) => {
    try {
        const campeonatos = await prisma.campeonato.findMany({
            include: {
                times: {
                    include: {
                        time: true,
                    },
                },
            },
            orderBy: {
                id: "desc",
            },
        });

        return res.json(campeonatos);

    } catch (err) {
        console.error("ERRO listAll campeonato:", err);

        return res.status(500).json({
            error: err.message || "Erro ao listar campeonatos.",
        });
    }
};

/* =====================================================
   LISTAR POR SOCIETY
===================================================== */

const listBySociety = async (req, res) => {
    try {
        const societyId = toId(req.params.societyId);

        if (!societyId) {
            return res.status(400).json({
                error: "societyId inválido.",
            });
        }

        const campeonatos = await prisma.campeonato.findMany({
            where: {
                societyId,
            },
            include: {
                times: {
                    include: {
                        time: true,
                    },
                },
            },
            orderBy: {
                id: "desc",
            },
        });

        return res.json(campeonatos);

    } catch (err) {
        console.error("ERRO listBySociety campeonato:", err);

        return res.status(500).json({
            error: err.message || "Erro ao listar campeonatos.",
        });
    }
};

/* =====================================================
   BUSCAR UM CAMPEONATO
===================================================== */

const readOne = async (req, res) => {
    try {
        const campeonatoId = toId(req.params.id);

        if (!campeonatoId) {
            return res.status(400).json({
                error: "ID inválido.",
            });
        }

        const campeonato = await prisma.campeonato.findUnique({
            where: {
                id: campeonatoId,
            },
            include: {
                society: true,

                times: {
                    include: {
                        time: true,
                    },
                },

                jogos: {
                    include: {
                        timeA: true,
                        timeB: true,
                    },
                    orderBy: [
                        {
                            rodada: "asc",
                        },
                        {
                            id: "asc",
                        },
                    ],
                },

                tabela: {
                    include: {
                        time: true,
                    },
                    orderBy: [
                        {
                            pontos: "desc",
                        },
                        {
                            saldoGols: "desc",
                        },
                        {
                            golsPro: "desc",
                        },
                        {
                            vitorias: "desc",
                        },
                    ],
                },
            },
        });

        if (!campeonato) {
            return res.status(404).json({
                error: "Campeonato não encontrado.",
            });
        }

        return res.json(campeonato);

    } catch (err) {
        console.error("ERRO readOne campeonato:", err);

        return res.status(500).json({
            error: err.message || "Erro ao buscar campeonato.",
        });
    }
};

/* =====================================================
   ADICIONAR TIME
===================================================== */

const addTime = async (req, res) => {
    try {
        const campeonatoId = toId(req.params.id);
        const timeId = toId(req.body.timeId);

        if (!campeonatoId || !timeId) {
            return res.status(400).json({
                error: "Informe campeonatoId e timeId.",
            });
        }

        const campeonato = await prisma.campeonato.findUnique({
            where: {
                id: campeonatoId,
            },
            include: {
                times: true,
                jogos: true,
            },
        });

        if (!campeonato) {
            return res.status(404).json({
                error: "Campeonato não encontrado.",
            });
        }

        if (campeonato.jogos.length > 0) {
            return res.status(400).json({
                error: "Não é possível adicionar times após gerar os jogos.",
            });
        }

        if (campeonato.times.length >= 4) {
            return res.status(400).json({
                error: "A Liga já possui 4 times.",
            });
        }

        const time = await prisma.time.findUnique({
            where: {
                id: timeId,
            },
        });

        if (!time) {
            return res.status(404).json({
                error: "Time não encontrado.",
            });
        }

        if (time.societyId !== campeonato.societyId) {
            return res.status(400).json({
                error: "Este time não pertence ao society do campeonato.",
            });
        }

        const existe = await prisma.timeCampeonato.findUnique({
            where: {
                campeonatoId_timeId: {
                    campeonatoId,
                    timeId,
                },
            },
        });

        if (existe) {
            return res.status(400).json({
                error: "Time já inscrito no campeonato.",
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            const inscricao = await tx.timeCampeonato.create({
                data: {
                    campeonatoId,
                    timeId,
                },
            });

            await ensureTabelaRow(tx, campeonatoId, timeId);

            return inscricao;
        });

        return res.json(result);

    } catch (err) {
        console.error("ERRO addTime campeonato:", err);

        return res.status(500).json({
            error: err.message || "Erro ao adicionar time.",
        });
    }
};

/* =====================================================
   GERAR LIGA IDA E VOLTA
===================================================== */

const generateLeague = async (req, res) => {
    try {
        const campeonatoId = toId(req.params.id);

        if (!campeonatoId) {
            return res.status(400).json({
                error: "ID inválido.",
            });
        }

        const campeonato = await prisma.campeonato.findUnique({
            where: {
                id: campeonatoId,
            },
            include: {
                times: true,
                jogos: true,
            },
        });

        if (!campeonato) {
            return res.status(404).json({
                error: "Campeonato não encontrado.",
            });
        }

        if (campeonato.jogos.length > 0) {
            return res.status(400).json({
                error: "Os jogos já foram gerados.",
            });
        }

        const teamIds = campeonato.times.map((t) => Number(t.timeId));

        if (teamIds.length !== 4) {
            return res.status(400).json({
                error: "A Liga Ida e Volta precisa ter exatamente 4 times.",
            });
        }

        const rounds = buildRoundRobinRounds(teamIds);

        await prisma.$transaction(async (tx) => {
            for (const timeId of teamIds) {
                await ensureTabelaRow(tx, campeonatoId, timeId);
            }

            for (let r = 0; r < rounds.length; r++) {
                for (const [a, b] of rounds[r]) {
                    await createGameWithStats(tx, {
                        campeonatoId,
                        rodada: r + 1,
                        tipoJogo: "IDA",
                        timeAId: a,
                        timeBId: b,
                    });
                }
            }

            for (let r = 0; r < rounds.length; r++) {
                for (const [a, b] of rounds[r]) {
                    await createGameWithStats(tx, {
                        campeonatoId,
                        rodada: rounds.length + r + 1,
                        tipoJogo: "VOLTA",
                        timeAId: b,
                        timeBId: a,
                    });
                }
            }

            await tx.campeonato.update({
                where: {
                    id: campeonatoId,
                },
                data: {
                    status: "EM_ANDAMENTO",
                    faseAtual: "LIGA",
                    roundAtual: 1,
                },
            });
        });

        return res.json({
            ok: true,
            message: "Liga Ida e Volta gerada com sucesso.",
        });

    } catch (err) {
        console.error("ERRO generateLeague campeonato:", err);

        return res.status(500).json({
            error: err.message || "Erro ao gerar liga.",
        });
    }
};

/* =====================================================
   FINALIZAR JOGO
===================================================== */

const finalizarJogo = async (req, res) => {
    try {
        const jogoId = toId(req.params.id);
        const golsA = Number(req.body.golsA);
        const golsB = Number(req.body.golsB);

        if (!jogoId || !Number.isFinite(golsA) || !Number.isFinite(golsB)) {
            return res.status(400).json({
                error: "Informe golsA e golsB corretamente.",
            });
        }

        if (golsA < 0 || golsB < 0) {
            return res.status(400).json({
                error: "Os gols não podem ser negativos.",
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            const jogo = await tx.jogo.findUnique({
                where: {
                    id: jogoId,
                },
            });

            if (!jogo) {
                return {
                    status: 404,
                    body: {
                        error: "Jogo não encontrado.",
                    },
                };
            }

            if (jogo.finalizado) {
                return {
                    status: 400,
                    body: {
                        error: "Este jogo já foi finalizado.",
                    },
                };
            }

            let vencedorId = null;

            if (golsA > golsB) {
                vencedorId = jogo.timeAId;
            } else if (golsB > golsA) {
                vencedorId = jogo.timeBId;
            }

            const jogoAtualizado = await tx.jogo.update({
                where: {
                    id: jogoId,
                },
                data: {
                    golsA,
                    golsB,
                    vencedorId,
                    finalizado: true,
                },
            });

            const tabelaA = await ensureTabelaRow(tx, jogo.campeonatoId, jogo.timeAId);
            const tabelaB = await ensureTabelaRow(tx, jogo.campeonatoId, jogo.timeBId);

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

            await tx.tabelaCampeonato.update({
                where: {
                    id: tabelaA.id,
                },
                data: {
                    pontos: {
                        increment: pontosA,
                    },
                    vitorias: {
                        increment: vitoriasA,
                    },
                    empates: {
                        increment: empatesA,
                    },
                    derrotas: {
                        increment: derrotasA,
                    },
                    golsPro: {
                        increment: golsA,
                    },
                    golsContra: {
                        increment: golsB,
                    },
                    saldoGols: {
                        increment: golsA - golsB,
                    },
                },
            });

            await tx.tabelaCampeonato.update({
                where: {
                    id: tabelaB.id,
                },
                data: {
                    pontos: {
                        increment: pontosB,
                    },
                    vitorias: {
                        increment: vitoriasB,
                    },
                    empates: {
                        increment: empatesB,
                    },
                    derrotas: {
                        increment: derrotasB,
                    },
                    golsPro: {
                        increment: golsB,
                    },
                    golsContra: {
                        increment: golsA,
                    },
                    saldoGols: {
                        increment: golsB - golsA,
                    },
                },
            });

            const jogosRestantes = await tx.jogo.count({
                where: {
                    campeonatoId: jogo.campeonatoId,
                    finalizado: false,
                },
            });

            if (jogosRestantes === 0) {
                const tabelaFinal = await tx.tabelaCampeonato.findMany({
                    where: {
                        campeonatoId: jogo.campeonatoId,
                    },
                    orderBy: [
                        {
                            pontos: "desc",
                        },
                        {
                            saldoGols: "desc",
                        },
                        {
                            golsPro: "desc",
                        },
                        {
                            vitorias: "desc",
                        },
                    ],
                });

                const campeao = tabelaFinal[0];
                const vice = tabelaFinal[1];

                await tx.campeonato.update({
                    where: {
                        id: jogo.campeonatoId,
                    },
                    data: {
                        status: "FINALIZADO",
                        faseAtual: "FINALIZADO",
                        campeaoId: campeao?.timeId || null,
                        viceCampeaoId: vice?.timeId || null,
                    },
                });
            }

            return {
                status: 200,
                body: {
                    ok: true,
                    jogo: jogoAtualizado,
                },
            };
        });

        return res.status(result.status).json(result.body);

    } catch (err) {
        console.error("ERRO finalizarJogo campeonato:", err);

        return res.status(500).json({
            error: err.message || "Erro ao finalizar jogo.",
        });
    }
};

/* =====================================================
   RANKING
===================================================== */

const ranking = async (req, res) => {
    try {
        const campeonatoId = toId(req.params.id);

        if (!campeonatoId) {
            return res.status(400).json({
                error: "ID inválido.",
            });
        }

        const tabela = await prisma.tabelaCampeonato.findMany({
            where: {
                campeonatoId,
            },
            include: {
                time: true,
            },
            orderBy: [
                {
                    pontos: "desc",
                },
                {
                    saldoGols: "desc",
                },
                {
                    golsPro: "desc",
                },
                {
                    vitorias: "desc",
                },
            ],
        });

        return res.json(tabela);

    } catch (err) {
        console.error("ERRO ranking campeonato:", err);

        return res.status(500).json({
            error: err.message || "Erro ao carregar ranking.",
        });
    }
};

/* =====================================================
   COMPATIBILIDADE COM ROTAS ANTIGAS
===================================================== */

const generateGroups = async (req, res) => {
    return generateLeague(req, res);
};

const generateGroupMatches = async (req, res) => {
    return generateLeague(req, res);
};

const generateMataMata = async (req, res) => {
    return res.status(400).json({
        error: "Este sistema agora usa apenas Liga Ida e Volta.",
    });
};

const getBracket = async (req, res) => {
    return res.status(400).json({
        error: "Este sistema agora usa apenas Liga Ida e Volta. Não existe bracket.",
    });
};

const rankingPorGrupos = async (req, res) => {
    return res.status(400).json({
        error: "Este sistema agora usa apenas Liga Ida e Volta. Não existe ranking por grupos.",
    });
};

const updateInfo = async (req, res) => {
    return res.status(400).json({
        error: "Edição de campeonato ainda não habilitada nesta versão.",
    });
};

module.exports = {
    create,
    listAll,
    listBySociety,
    readOne,
    addTime,
    generateLeague,
    finalizarJogo,
    ranking,

    generateGroups,
    generateGroupMatches,
    generateMataMata,
    getBracket,
    rankingPorGrupos,
    updateInfo,
};