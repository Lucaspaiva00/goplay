const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { emitJogo } = require("../realtime");

const prisma = new PrismaClient();

/* =====================================================
   HELPERS
===================================================== */

const toId = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};


const tokenIgual = (a, b) => {
    if (!a || !b) return false;
    const ba = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

const parseDateOrNull = (value) => {
    if (!value) return null;

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
        return null;
    }

    return d;
};


function sanitizarJogoCampeonato(jogo) {
    if (!jogo) return jogo;
    const { mesaToken, ...rest } = jogo;
    return { ...rest, mesaConfigurada: !!mesaToken };
}

function sanitizarCampeonato(c) {
    if (!c) return c;
    return {
        ...c,
        jogos: Array.isArray(c.jogos) ? c.jogos.map(sanitizarJogoCampeonato) : c.jogos,
        grupos: Array.isArray(c.grupos) ? c.grupos.map(g => ({
            ...g,
            jogos: Array.isArray(g.jogos) ? g.jogos.map(sanitizarJogoCampeonato) : g.jogos,
        })) : c.grupos,
    };
}

function buildRoundRobinRounds(teamIds) {
    const ids = [...teamIds]
        .map(Number)
        .filter((id) => Number.isFinite(id));

    if (ids.length < 2) {
        throw new Error("A Liga Ida e Volta precisa ter pelo menos 2 times.");
    }

    // Algoritmo circular (round-robin), com folga automática quando
    // a quantidade de times for ímpar.
    const participantes = [...ids];
    if (participantes.length % 2 !== 0) {
        participantes.push(null);
    }

    const total = participantes.length;
    const rounds = [];

    for (let rodada = 0; rodada < total - 1; rodada++) {
        const confrontos = [];

        for (let i = 0; i < total / 2; i++) {
            const a = participantes[i];
            const b = participantes[total - 1 - i];

            if (a !== null && b !== null) {
                confrontos.push([a, b]);
            }
        }

        rounds.push(confrontos);

        const fixo = participantes[0];
        const restante = participantes.slice(1);
        restante.unshift(restante.pop());
        participantes.splice(0, participantes.length, fixo, ...restante);
    }

    return rounds;
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

        if (!Number.isInteger(maxTimes) || maxTimes < 2) {
            return res.status(400).json({
                error: "A quantidade de times deve ser um número inteiro a partir de 2.",
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

        return res.json(campeonatos.map(sanitizarCampeonato));

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

        return res.json(campeonatos.map(sanitizarCampeonato));

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
                campeao: true,
                viceCampeao: true,

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

        return res.json(sanitizarCampeonato(campeonato));

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
            return res.status(400).json({ error: "ID inválido." });
        }

        const campeonato = await prisma.campeonato.findUnique({
            where: { id: campeonatoId },
            include: {
                times: true,
                grupos: true,
                jogos: true,
            },
        });

        if (!campeonato) {
            return res.status(404).json({ error: "Campeonato não encontrado." });
        }

        if (campeonato.jogos.length > 0) {
            return res.status(400).json({
                error: "Não é possível alterar a fase classificatória após gerar os jogos.",
            });
        }

        const inscritos = campeonato.times.map((t) => Number(t.timeId));

        if (inscritos.length !== campeonato.maxTimes) {
            return res.status(400).json({
                error: `O campeonato precisa ter ${campeonato.maxTimes} times inscritos.`,
            });
        }

        if (inscritos.length < 2) {
            return res.status(400).json({
                error: "É necessário ter pelo menos 2 times.",
            });
        }

        await prisma.$transaction(async (tx) => {
            await tx.timeGrupo.deleteMany({
                where: { grupo: { campeonatoId } },
            });

            await tx.grupo.deleteMany({
                where: { campeonatoId },
            });

            const grupo = await tx.grupo.create({
                data: {
                    nome: "Classificação",
                    campeonatoId,
                },
            });

            for (const timeId of inscritos) {
                await ensureTimeGrupoRow(tx, grupo.id, timeId);
                await ensureTabelaRow(tx, campeonatoId, timeId);
            }
        });

        return res.json({
            ok: true,
            message: "Fase classificatória preparada com sucesso.",
        });
    } catch (err) {
        console.error("ERRO generateGroups campeonato:", err);
        return res.status(500).json({
            error: err.message || "Erro ao preparar fase classificatória.",
        });
    }
};

const generateLeague = async (req, res) => {
    try {
        const campeonatoId = toId(req.params.id);

        if (!campeonatoId) {
            return res.status(400).json({ error: "ID inválido." });
        }

        const campeonato = await prisma.campeonato.findUnique({
            where: { id: campeonatoId },
            include: {
                jogos: true,
                times: {
                    include: { time: true },
                    orderBy: { id: "asc" },
                },
            },
        });

        if (!campeonato) {
            return res.status(404).json({ error: "Campeonato não encontrado." });
        }

        if (campeonato.jogos.length > 0) {
            return res.status(400).json({ error: "Os jogos já foram gerados." });
        }

        const totalTimes = campeonato.times.length;

        if (totalTimes !== campeonato.maxTimes) {
            return res.status(400).json({
                error: `O campeonato precisa ter ${campeonato.maxTimes} times para gerar a liga.`,
            });
        }

        if (totalTimes < 2) {
            return res.status(400).json({
                error: "A Liga Ida e Volta precisa ter pelo menos 2 times.",
            });
        }

        const teamIds = campeonato.times.map((item) => Number(item.timeId));
        const rounds = buildRoundRobinRounds(teamIds);

        await prisma.$transaction(async (tx) => {
            await tx.timeGrupo.deleteMany({
                where: { grupo: { campeonatoId } },
            });

            await tx.grupo.deleteMany({
                where: { campeonatoId },
            });

            const grupo = await tx.grupo.create({
                data: {
                    nome: "Classificação",
                    campeonatoId,
                },
            });

            for (const timeId of teamIds) {
                await ensureTimeGrupoRow(tx, grupo.id, timeId);
                await ensureTabelaRow(tx, campeonatoId, timeId);
            }

            // Jogos de ida
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

            // Jogos de volta, invertendo o mando
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

            await tx.campeonato.update({
                where: { id: campeonatoId },
                data: {
                    status: "EM_ANDAMENTO",
                    faseAtual: "LIGA",
                    roundAtual: 1,
                    campeaoId: null,
                    viceCampeaoId: null,
                },
            });
        });

        return res.json({
            ok: true,
            message: "Liga ida e volta gerada com sucesso.",
            totalTimes,
            jogosClassificatorios: totalTimes * (totalTimes - 1),
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
        const penaltisA = req.body.penaltisA === undefined || req.body.penaltisA === null || req.body.penaltisA === "" ? null : Number(req.body.penaltisA);
        const penaltisB = req.body.penaltisB === undefined || req.body.penaltisB === null || req.body.penaltisB === "" ? null : Number(req.body.penaltisB);

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

        const acesso = await prisma.jogo.findUnique({
            where: { id: jogoId },
            include: { campeonato: { include: { society: true } } },
        });

        if (!acesso) {
            return res.status(404).json({ error: "Jogo não encontrado." });
        }

        const tokenMesa = String(req.headers["x-mesa-token"] || req.body.mesaToken || "").trim();
        const autorizadoMesa = tokenIgual(tokenMesa, acesso.mesaToken);
        const actor = req.actor;
        const autorizadoDono = actor?.kind === "USER" && actor.tipo === "DONO_SOCIETY" && Number(acesso.campeonato?.society?.usuarioId) === Number(actor.id);
        const autorizadoStaff = actor?.kind === "STAFF" && Number(actor.societyId) === Number(acesso.campeonato?.society?.id) && ["ADMIN","MESARIO"].includes(actor.funcao);

        if (!autorizadoMesa && !autorizadoDono && !autorizadoStaff) {
            return res.status(403).json({
                error: "Somente Mesa autorizada, Mesário, Administrador ou dono da empresa pode encerrar o jogo.",
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            const jogo = await tx.jogo.findUnique({
                where: { id: jogoId },
            });

            if (!jogo) {
                return {
                    status: 404,
                    body: { error: "Jogo não encontrado." },
                };
            }

            if (jogo.finalizado) {
                return {
                    status: 400,
                    body: { error: "Este jogo já foi finalizado." },
                };
            }

            const ehFinal = jogo.tipoJogo === "MATA_MATA";

            if (ehFinal && golsA === golsB) {
                const penaltisValidos = Number.isFinite(penaltisA) && Number.isFinite(penaltisB) && penaltisA >= 0 && penaltisB >= 0 && penaltisA !== penaltisB;
                if (!penaltisValidos) {
                    return {
                        status: 400,
                        body: { error: "A final terminou empatada. Informe o resultado dos pênaltis para definir o campeão." },
                    };
                }
            }

            let vencedorId = null;
            if (golsA > golsB) vencedorId = jogo.timeAId;
            if (golsB > golsA) vencedorId = jogo.timeBId;
            if (ehFinal && golsA === golsB) vencedorId = penaltisA > penaltisB ? jogo.timeAId : jogo.timeBId;

            const jogoAtualizado = await tx.jogo.update({
                where: { id: jogoId },
                data: {
                    golsA,
                    golsB,
                    vencedorId,
                    finalizado: true,
                    desempateTipo: ehFinal && golsA === golsB ? "PENALTIS" : null,
                    penaltisA: ehFinal && golsA === golsB ? penaltisA : null,
                    penaltisB: ehFinal && golsA === golsB ? penaltisB : null,
                    statusOperacao: "ENCERRADO",
                    cronometroSegundos: acesso.cronometroInicioEm
                        ? Number(acesso.cronometroSegundos || 0) + Math.max(0, Math.floor((Date.now() - new Date(acesso.cronometroInicioEm).getTime()) / 1000))
                        : Number(acesso.cronometroSegundos || 0),
                    cronometroInicioEm: null,
                    encerradoEm: new Date(),
                },
            });

            // A final não altera a classificação da fase de liga.
            if (ehFinal) {
                const viceCampeaoId =
                    vencedorId === jogo.timeAId ? jogo.timeBId : jogo.timeAId;

                await tx.campeonato.update({
                    where: { id: jogo.campeonatoId },
                    data: {
                        status: "FINALIZADO",
                        faseAtual: "FINALIZADO",
                        campeaoId: vencedorId,
                        viceCampeaoId,
                    },
                });

                return {
                    status: 200,
                    body: {
                        ok: true,
                        jogo: jogoAtualizado,
                        campeonatoFinalizado: true,
                    },
                };
            }

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
                where: { id: tabelaA.id },
                data: {
                    pontos: { increment: pontosA },
                    vitorias: { increment: vitoriasA },
                    empates: { increment: empatesA },
                    derrotas: { increment: derrotasA },
                    golsPro: { increment: golsA },
                    golsContra: { increment: golsB },
                    saldoGols: { increment: golsA - golsB },
                },
            });

            await tx.tabelaCampeonato.update({
                where: { id: tabelaB.id },
                data: {
                    pontos: { increment: pontosB },
                    vitorias: { increment: vitoriasB },
                    empates: { increment: empatesB },
                    derrotas: { increment: derrotasB },
                    golsPro: { increment: golsB },
                    golsContra: { increment: golsA },
                    saldoGols: { increment: golsB - golsA },
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
                        where: { id: timeGrupoA.id },
                        data: {
                            pontos: { increment: pontosA },
                            vitorias: { increment: vitoriasA },
                            empates: { increment: empatesA },
                            derrotas: { increment: derrotasA },
                            golsPro: { increment: golsA },
                            golsContra: { increment: golsB },
                            saldoGols: { increment: golsA - golsB },
                        },
                    });
                }

                if (timeGrupoB) {
                    await tx.timeGrupo.update({
                        where: { id: timeGrupoB.id },
                        data: {
                            pontos: { increment: pontosB },
                            vitorias: { increment: vitoriasB },
                            empates: { increment: empatesB },
                            derrotas: { increment: derrotasB },
                            golsPro: { increment: golsB },
                            golsContra: { increment: golsA },
                            saldoGols: { increment: golsB - golsA },
                        },
                    });
                }
            }

            const jogosLigaRestantes = await tx.jogo.count({
                where: {
                    campeonatoId: jogo.campeonatoId,
                    finalizado: false,
                    tipoJogo: { in: ["IDA", "VOLTA"] },
                },
            });

            // Terminou ida e volta: os dois melhores fazem a final.
            if (jogosLigaRestantes === 0) {
                const finalExistente = await tx.jogo.findFirst({
                    where: {
                        campeonatoId: jogo.campeonatoId,
                        tipoJogo: "MATA_MATA",
                    },
                });

                if (!finalExistente) {
                    const tabelaFinal = await tx.tabelaCampeonato.findMany({
                        where: { campeonatoId: jogo.campeonatoId },
                        orderBy: [
                            { pontos: "desc" },
                            { saldoGols: "desc" },
                            { golsPro: "desc" },
                            { vitorias: "desc" },
                            { timeId: "asc" },
                        ],
                    });

                    const primeiro = tabelaFinal[0];
                    const segundo = tabelaFinal[1];

                    if (primeiro && segundo) {
                        const ultimaRodada = await tx.jogo.aggregate({
                            where: { campeonatoId: jogo.campeonatoId },
                            _max: { rodada: true },
                        });

                        await createGameWithStats(tx, {
                            campeonatoId: jogo.campeonatoId,
                            grupoId: null,
                            rodada: Number(ultimaRodada?._max?.rodada || 0) + 1,
                            tipoJogo: "MATA_MATA",
                            timeAId: primeiro.timeId,
                            timeBId: segundo.timeId,
                        });

                        await tx.campeonato.update({
                            where: { id: jogo.campeonatoId },
                            data: {
                                status: "EM_ANDAMENTO",
                                faseAtual: "FINAL",
                                roundAtual: Number(ultimaRodada?._max?.rodada || 0) + 1,
                            },
                        });
                    }
                }
            }

            return {
                status: 200,
                body: {
                    ok: true,
                    jogo: jogoAtualizado,
                },
            };
        });

        emitJogo(jogoId, { tipo: "jogo-encerrado" });
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

            if (!grupo.times || grupo.times.length < 2) {

                return res.status(400).json({
                    error: `O grupo ${grupo.nome} precisa ter pelo menos 2 times.`,
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