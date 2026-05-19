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

async function ensureTimeGrupoRow(tx, grupoId, timeId) {
    const existe = await tx.timeGrupo.findUnique({
        where: {
            grupoId_timeId: {
                grupoId,
                timeId,
            },
        },
    });

    if (existe) return existe;

    return tx.timeGrupo.create({
        data: {
            grupoId,
            timeId,
        },
    });
}

async function createGameWithStats(tx, data) {
    const jogo = await tx.jogo.create({
        data: {
            campeonatoId: Number(data.campeonatoId),
            grupoId: data.grupoId ? Number(data.grupoId) : null,
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

        if (maxTimes < 4 || maxTimes % 4 !== 0) {
            return res.status(400).json({
                error: "A quantidade de times deve ser múltipla de 4.",
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
                maxTimes,

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
                grupos: {
                    include: {
                        timesGrupo: {
                            include: {
                                time: true,
                            },
                        },
                    },
                },
                jogos: true,
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
                grupos: {
                    include: {
                        timesGrupo: {
                            include: {
                                time: true,
                            },
                        },
                    },
                },
                jogos: true,
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

                grupos: {
                    include: {
                        timesGrupo: {
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
                    },
                    orderBy: {
                        id: "asc",
                    },
                },

                jogos: {
                    include: {
                        timeA: true,
                        timeB: true,
                        grupo: true,
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
                grupos: true,
            },
        });

        if (!campeonato) {
            return res.status(404).json({
                error: "Campeonato não encontrado.",
            });
        }

        if (campeonato.jogos.length > 0 || campeonato.grupos.length > 0) {
            return res.status(400).json({
                error: "Não é possível adicionar times após gerar o grupo ou os jogos.",
            });
        }

        if (campeonato.times.length >= campeonato.maxTimes) {
            return res.status(400).json({
                error: `O campeonato já possui ${campeonato.maxTimes} times.`,
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
   GERAR GRUPO A AUTOMATICAMENTE
===================================================== */
const generateGroups = async (req, res) => {
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
                grupos: true,
                jogos: true,
            },
        });

        if (!campeonato) {
            return res.status(404).json({
                error: "Campeonato não encontrado.",
            });
        }

        if (campeonato.grupos.length > 0) {
            return res.status(400).json({
                error: "Os grupos já foram gerados.",
            });
        }

        if (campeonato.jogos.length > 0) {
            return res.status(400).json({
                error: "Não é possível gerar grupos após gerar jogos.",
            });
        }

        const inscritos =
            campeonato.times.map(t => Number(t.timeId));

        if (inscritos.length !== campeonato.maxTimes) {
            return res.status(400).json({
                error: `O campeonato precisa ter ${campeonato.maxTimes} times.`,
            });
        }

        const quantidadeGrupos =
            campeonato.maxTimes / 4;

        const letras =
            ["A", "B", "C", "D", "E", "F", "G", "H"];

        await prisma.$transaction(async (tx) => {

            let indice = 0;

            for (let g = 0; g < quantidadeGrupos; g++) {

                const grupo = await tx.grupo.create({
                    data: {
                        nome: `Grupo ${letras[g]}`,
                        campeonatoId,
                    },
                });

                for (let i = 0; i < 4; i++) {

                    const timeId =
                        inscritos[indice];

                    await ensureTimeGrupoRow(
                        tx,
                        grupo.id,
                        timeId
                    );

                    await ensureTabelaRow(
                        tx,
                        campeonatoId,
                        timeId
                    );

                    indice++;
                }
            }
        });

        return res.json({
            ok: true,
            message: "Grupos gerados com sucesso.",
        });

    } catch (err) {

        console.error("ERRO generateGroups campeonato:", err);

        return res.status(500).json({
            error: err.message || "Erro ao gerar grupos.",
        });
    }
};

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
                jogos: true,
                times: {
                    include: {
                        time: true,
                    },
                    orderBy: {
                        id: "asc",
                    },
                },
                grupos: {
                    include: {
                        timesGrupo: true,
                    },
                },
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

        const totalTimes = campeonato.times.length;

        if (totalTimes !== campeonato.maxTimes) {
            return res.status(400).json({
                error: `O campeonato precisa ter ${campeonato.maxTimes} times para gerar a liga.`,
            });
        }

        if (totalTimes < 4 || totalTimes % 4 !== 0) {
            return res.status(400).json({
                error: "A Liga Ida e Volta precisa ter grupos com 4 times.",
            });
        }

        await prisma.$transaction(async (tx) => {
            await tx.timeGrupo.deleteMany({
                where: {
                    grupo: {
                        campeonatoId,
                    },
                },
            });

            await tx.grupo.deleteMany({
                where: {
                    campeonatoId,
                },
            });

            const gruposCriados = [];
            const timesOrdenados = [...campeonato.times];

            for (let i = 0; i < timesOrdenados.length; i += 4) {
                const bloco = timesOrdenados.slice(i, i + 4);
                const letra = String.fromCharCode(65 + gruposCriados.length);

                const grupo = await tx.grupo.create({
                    data: {
                        nome: `Grupo ${letra}`,
                        campeonatoId,
                    },
                });

                gruposCriados.push(grupo);

                for (const item of bloco) {
                    await ensureTimeGrupoRow(tx, grupo.id, item.timeId);
                    await ensureTabelaRow(tx, campeonatoId, item.timeId);
                }
            }

            for (const grupo of gruposCriados) {
                const timesGrupo = await tx.timeGrupo.findMany({
                    where: {
                        grupoId: grupo.id,
                    },
                    orderBy: {
                        id: "asc",
                    },
                });

                const teamIds = timesGrupo.map(t => Number(t.timeId));

                if (teamIds.length !== 4) {
                    throw new Error(`O ${grupo.nome} precisa ter exatamente 4 times.`);
                }

                const rounds = buildRoundRobinRounds(teamIds);

                for (let r = 0; r < rounds.length; r++) {
                    for (const [a, b] of rounds[r]) {
                        await createGameWithStats(tx, {
                            campeonatoId,
                            grupoId: grupo.id,
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
                            grupoId: grupo.id,
                            rodada: rounds.length + r + 1,
                            tipoJogo: "VOLTA",
                            timeAId: b,
                            timeBId: a,
                        });
                    }
                }
            }

            await tx.campeonato.update({
                where: {
                    id: campeonatoId,
                },
                data: {
                    status: "EM_ANDAMENTO",
                    faseAtual: "GRUPOS",
                    roundAtual: 1,
                },
            });
        });

        return res.json({
            ok: true,
            message: "Liga gerada com sucesso.",
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

            if (jogo.grupoId) {
                const timeGrupoA = await tx.timeGrupo.findUnique({
                    where: {
                        grupoId_timeId: {
                            grupoId: jogo.grupoId,
                            timeId: jogo.timeAId,
                        },
                    },
                });

                const timeGrupoB = await tx.timeGrupo.findUnique({
                    where: {
                        grupoId_timeId: {
                            grupoId: jogo.grupoId,
                            timeId: jogo.timeBId,
                        },
                    },
                });

                if (timeGrupoA) {
                    await tx.timeGrupo.update({
                        where: {
                            id: timeGrupoA.id,
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
                }

                if (timeGrupoB) {
                    await tx.timeGrupo.update({
                        where: {
                            id: timeGrupoB.id,
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
                }
            }

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
   RANKING GERAL
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
   RANKING POR GRUPOS
===================================================== */

const rankingPorGrupos = async (req, res) => {
    try {
        const campeonatoId = toId(req.params.id);

        if (!campeonatoId) {
            return res.status(400).json({
                error: "ID inválido.",
            });
        }

        const grupos = await prisma.grupo.findMany({
            where: {
                campeonatoId,
            },
            include: {
                timesGrupo: {
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
            orderBy: {
                id: "asc",
            },
        });

        return res.json(grupos);

    } catch (err) {
        console.error("ERRO rankingPorGrupos campeonato:", err);

        return res.status(500).json({
            error: err.message || "Erro ao carregar ranking por grupos.",
        });
    }
};

/* =====================================================
   COMPATIBILIDADE COM ROTAS ANTIGAS
===================================================== */

const generateGroupMatches = async (req, res) => {
    return generateLeague(req, res);
};

const generateMataMata = async (req, res) => {
    return res.status(400).json({
        error: "Este sistema ainda está estabilizando a Liga Ida e Volta antes do mata-mata.",
    });
};

const getBracket = async (req, res) => {
    return res.status(400).json({
        error: "O chaveamento será ativado depois da fase de liga.",
    });
};

const updateInfo = async (req, res) => {
    return res.status(400).json({
        error: "Edição de campeonato ainda não habilitada nesta versão.",
    });
};

/* =====================================================
   GERAR GRUPOS MANUALMENTE
===================================================== */

const salvarGruposManual = async (req, res) => {

    try {

        const campeonatoId = toId(req.params.id);

        if (!campeonatoId) {
            return res.status(400).json({
                error: "ID inválido.",
            });
        }

        const groups = req.body.groups || [];

        if (!Array.isArray(groups) || !groups.length) {
            return res.status(400).json({
                error: "Envie os grupos.",
            });
        }

        const campeonato = await prisma.campeonato.findUnique({

            where: {
                id: campeonatoId,
            },

            include: {
                times: true,
                grupos: true,
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

        const inscritos =
            campeonato.times.map(t => Number(t.timeId));

        const usados = [];

        for (const grupo of groups) {

            if (!grupo.times || grupo.times.length !== 4) {

                return res.status(400).json({
                    error: `O grupo ${grupo.nome} precisa ter exatamente 4 times.`,
                });
            }

            for (const timeId of grupo.times) {

                const id = Number(timeId);

                if (!inscritos.includes(id)) {

                    return res.status(400).json({
                        error: `O time ${id} não pertence ao campeonato.`,
                    });
                }

                if (usados.includes(id)) {

                    return res.status(400).json({
                        error: "Existem times repetidos nos grupos.",
                    });
                }

                usados.push(id);
            }
        }

        if (usados.length !== inscritos.length) {

            return res.status(400).json({
                error: "Nem todos os times foram distribuídos nos grupos.",
            });
        }

        await prisma.$transaction(async (tx) => {

            await tx.timeGrupo.deleteMany({
                where: {
                    grupo: {
                        campeonatoId,
                    },
                },
            });

            await tx.grupo.deleteMany({
                where: {
                    campeonatoId,
                    },
            });

            for (const grupoData of groups) {

                const grupo = await tx.grupo.create({

                    data: {
                        nome: grupoData.nome,
                        campeonatoId,
                    },
                });

                for (const timeId of grupoData.times) {

                    await ensureTimeGrupoRow(
                        tx,
                        grupo.id,
                        Number(timeId)
                    );

                    await ensureTabelaRow(
                        tx,
                        campeonatoId,
                        Number(timeId)
                    );
                }
            }
        });

        return res.json({
            ok: true,
            message: "Grupos manuais salvos com sucesso.",
        });

    } catch (err) {

        console.error("ERRO salvarGruposManual:", err);

        return res.status(500).json({
            error: err.message || "Erro ao salvar grupos.",
        });
    }
};

module.exports = {
    create,
    listAll,
    listBySociety,
    readOne,
    addTime,

    generateGroups,
    generateLeague,
    generateGroupMatches,
    generateMataMata,

    finalizarJogo,

    ranking,
    rankingPorGrupos,
    getBracket,

    updateInfo,
    salvarGruposManual
};