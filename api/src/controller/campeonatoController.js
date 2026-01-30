// api/src/controller/campeonatoController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// =====================================================
// Helpers - Round Robin (método do círculo) + criação jogo
// =====================================================
function buildRoundRobinRounds(teamIds) {
    // retorna: [ [ [A,B], [C,D] ], ... ] por rodada
    const ids = [...teamIds].map(Number);

    if (ids.length < 2) return [];

    // se ímpar, adiciona BYE (null)
    if (ids.length % 2 !== 0) ids.push(null);

    const n = ids.length;
    const rounds = n - 1;

    let arr = [...ids];
    const result = [];

    for (let r = 0; r < rounds; r++) {
        const pairs = [];

        for (let i = 0; i < n / 2; i++) {
            const a = arr[i];
            const b = arr[n - 1 - i];
            if (a !== null && b !== null) pairs.push([a, b]);
        }

        result.push(pairs);

        // rotate mantendo arr[0] fixo
        const fixed = arr[0];
        const rest = arr.slice(1);
        rest.unshift(rest.pop());
        arr = [fixed, ...rest];
    }

    return result;
}

async function createGameWithStats(db, { campeonatoId, grupoId, round, timeAId, timeBId }) {
    const jogo = await db.jogo.create({
        data: {
            campeonatoId: Number(campeonatoId),
            grupoId: grupoId === undefined ? null : grupoId,
            round: Number(round),
            timeAId: Number(timeAId),
            timeBId: Number(timeBId),
        },
    });

    await db.jogoEstatisticaTime.createMany({
        data: [
            { jogoId: jogo.id, timeId: jogo.timeAId },
            { jogoId: jogo.id, timeId: jogo.timeBId },
        ],
        skipDuplicates: true,
    });

    return jogo;
}

// ============================
// Helpers (Tabela Geral) - profissional (atômico / seguro)
// ============================
async function ensureTabelaRow(db, campeonatoId, timeId) {
    const row = await db.tabelaCampeonato.findUnique({
        where: { campeonatoId_timeId: { campeonatoId, timeId } },
    });

    if (row) return row;

    return db.tabelaCampeonato.create({
        data: { campeonatoId, timeId },
    });
}

/**
 * ✅ CORREÇÃO CRÍTICA:
 * Atualiza tabela SOMENTE quando o jogo deve entrar na classificação geral do campeonato.
 * - Jogos de GRUPOS: entram (grupoId != null)
 * - Liga/Pontos corridos: entram (grupoId == null E tipo in [PONTOS_CORRIDOS, LIGA_IDA_VOLTA])
 * - Mata-mata de campeonato tipo GRUPOS/GRUPOS_MATA_MATA: NÃO entra (evita ranking "pontos corridos + mata-mata")
 */
async function atualizarTabelaGeral(db, jogo) {
    const { campeonatoId, timeAId, timeBId, grupoId } = jogo;

    const golsA = Number.isFinite(jogo.golsA) ? jogo.golsA : null;
    const golsB = Number.isFinite(jogo.golsB) ? jogo.golsB : null;
    if (golsA === null || golsB === null) return;

    const camp = await db.campeonato.findUnique({
        where: { id: campeonatoId },
        select: { tipo: true },
    });
    if (!camp) return;

    const tipo = camp.tipo;

    const isGrupoGame = grupoId !== null && grupoId !== undefined;
    const isLigaGame = (grupoId === null || grupoId === undefined) && (tipo === "PONTOS_CORRIDOS" || tipo === "LIGA_IDA_VOLTA");

    // ✅ se não for jogo de grupo nem jogo de liga, não soma na tabela
    if (!isGrupoGame && !isLigaGame) return;

    const rowA = await ensureTabelaRow(db, campeonatoId, timeAId);
    const rowB = await ensureTabelaRow(db, campeonatoId, timeBId);

    let ptsA = 0, ptsB = 0;
    let vitA = 0, vitB = 0;
    let empA = 0, empB = 0;
    let derA = 0, derB = 0;

    if (golsA > golsB) {
        ptsA = 3; vitA = 1;
        derB = 1;
    } else if (golsB > golsA) {
        ptsB = 3; vitB = 1;
        derA = 1;
    } else {
        ptsA = 1; ptsB = 1;
        empA = 1; empB = 1;
    }

    await db.tabelaCampeonato.update({
        where: { id: rowA.id },
        data: {
            golsPro: { increment: golsA },
            golsContra: { increment: golsB },
            saldoGols: { increment: golsA - golsB },
            pontos: { increment: ptsA },
            vitorias: { increment: vitA },
            empates: { increment: empA },
            derrotas: { increment: derA },
        },
    });

    await db.tabelaCampeonato.update({
        where: { id: rowB.id },
        data: {
            golsPro: { increment: golsB },
            golsContra: { increment: golsA },
            saldoGols: { increment: golsB - golsA },
            pontos: { increment: ptsB },
            vitorias: { increment: vitB },
            empates: { increment: empB },
            derrotas: { increment: derB },
        },
    });
}

// ============================
// Criar campeonato (PRO)
// ============================
const create = async (req, res) => {
    try {
        const {
            societyId,
            nome,
            tipo,
            maxTimes,

            // ✅ novos
            modalidade,
            categoria,
            temporada,
            dataInicio,
            dataFim,
            status,
            regulamentoTexto,
            regulamentoUrl,
        } = req.body;

        if (!societyId || !nome || !tipo || !maxTimes) {
            return res.status(400).json({ error: "Dados incompletos (societyId, nome, tipo, maxTimes)." });
        }

        const di = dataInicio ? new Date(dataInicio) : null;
        const df = dataFim ? new Date(dataFim) : null;

        if (di && Number.isNaN(di.getTime())) return res.status(400).json({ error: "dataInicio inválida." });
        if (df && Number.isNaN(df.getTime())) return res.status(400).json({ error: "dataFim inválida." });
        if (di && df && df < di) return res.status(400).json({ error: "dataFim não pode ser menor que dataInicio." });

        const novo = await prisma.campeonato.create({
            data: {
                societyId: Number(societyId),
                nome: String(nome).trim(),
                tipo,
                maxTimes: Number(maxTimes),

                // ✅ defaults bons
                faseAtual: "GRUPOS",
                roundAtual: 1,

                // ✅ novos campos
                modalidade: modalidade || "SOCIETY",
                categoria: categoria || "ADULTO",
                temporada: temporada ? String(temporada).trim() : null,
                dataInicio: di,
                dataFim: df,
                status: status || "EM_CRIACAO",
                regulamentoTexto: regulamentoTexto ? String(regulamentoTexto) : null,
                regulamentoUrl: regulamentoUrl ? String(regulamentoUrl).trim() : null,
            },
        });

        res.json(novo);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao criar campeonato." });
    }
};

// ============================
// Buscar dados completos (PRO)
// ============================
const readOne = async (req, res) => {
    try {
        const campeonatoId = Number(req.params.id);

        const campeonato = await prisma.campeonato.findUnique({
            where: { id: campeonatoId },
            include: {
                campeao: true,
                viceCampeao: true,
                times: { include: { time: true } },

                tabela: {
                    include: { time: true },
                    orderBy: [
                        { pontos: "desc" },
                        { saldoGols: "desc" },
                        { golsPro: "desc" },
                        { vitorias: "desc" },
                    ],
                },

                grupos: {
                    include: {
                        timesGrupo: { include: { time: true } },
                        jogos: { include: { timeA: true, timeB: true } },
                    },
                },

                jogos: { include: { timeA: true, timeB: true } },
            },
        });

        if (!campeonato) return res.status(404).json({ error: "Campeonato não encontrado" });

        res.json(campeonato);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao buscar campeonato" });
    }
};

// ============================
// Listar por society (PRO)
// ============================
const listBySociety = async (req, res) => {
    try {
        const lista = await prisma.campeonato.findMany({
            where: { societyId: Number(req.params.societyId) },
            include: {
                campeao: true,
                viceCampeao: true,
                times: { include: { time: true } },
            },
            orderBy: [{ status: "asc" }, { id: "desc" }],
        });

        res.json(lista);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao listar campeonatos." });
    }
};

// ============================
// Adicionar time
// ============================
const addTime = async (req, res) => {
    try {
        const { id } = req.params;
        const { timeId } = req.body;

        if (!timeId) return res.status(400).json({ error: "Informe timeId." });

        const campeonato = await prisma.campeonato.findUnique({
            where: { id: Number(id) },
            include: { times: true },
        });

        if (!campeonato) return res.status(404).json({ error: "Campeonato não encontrado." });

        if ((campeonato.times?.length || 0) >= campeonato.maxTimes) {
            return res.status(400).json({ error: "Limite de times atingido para este campeonato." });
        }

        const exists = await prisma.timeCampeonato.findFirst({
            where: { campeonatoId: Number(id), timeId: Number(timeId) },
        });

        if (exists) return res.status(400).json({ error: "Time já inscrito." });

        const novo = await prisma.timeCampeonato.create({
            data: {
                campeonatoId: Number(id),
                timeId: Number(timeId),
            },
        });

        await ensureTabelaRow(prisma, Number(id), Number(timeId));

        res.json(novo);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao adicionar time." });
    }
};

// ============================
// Gerar grupos
// ============================
const generateGroups = async (req, res) => {
    try {
        const campeonatoId = Number(req.params.id);

        const campeonato = await prisma.campeonato.findUnique({
            where: { id: campeonatoId },
            include: { times: true, grupos: true },
        });

        if (!campeonato) return res.status(404).json({ error: "Campeonato não encontrado." });

        if ((campeonato.grupos?.length || 0) > 0) {
            return res.status(400).json({ error: "Grupos já foram gerados." });
        }

        if (campeonato.times.length < 4) {
            return res.status(400).json({ error: "Mínimo 4 times." });
        }

        const totalTimes = campeonato.times.length;
        const numGrupos = totalTimes <= 8 ? 2 : totalTimes <= 12 ? 3 : 4;

        const grupos = [];
        for (let i = 0; i < numGrupos; i++) {
            grupos.push(
                await prisma.grupo.create({
                    data: {
                        nome: `Grupo ${String.fromCharCode(65 + i)}`,
                        campeonatoId: campeonato.id,
                    },
                })
            );
        }

        let idx = 0;
        const shuffle = campeonato.times.map((t) => t.timeId).sort(() => Math.random() - 0.5);

        for (const tid of shuffle) {
            await prisma.timeGrupo.create({
                data: {
                    grupoId: grupos[idx].id,
                    timeId: tid,
                },
            });
            idx = (idx + 1) % grupos.length;
        }

        await prisma.campeonato.update({
            where: { id: campeonatoId },
            data: { faseAtual: "GRUPOS", roundAtual: 1, status: "EM_ANDAMENTO" },
        });

        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao criar grupos" });
    }
};

// ============================
// ✅ Gerar jogos (GRUPOS / LIGA / IDA-VOLTA) - CORRIGIDO
// ============================
const generateGroupMatches = async (req, res) => {
    try {
        const campeonatoId = Number(req.params.id);

        const campeonato = await prisma.campeonato.findUnique({
            where: { id: campeonatoId },
            include: {
                times: true,
                grupos: { include: { timesGrupo: true } },
            },
        });

        if (!campeonato) return res.status(404).json({ error: "Campeonato não encontrado." });

        const tipo = campeonato.tipo;
        const idaVolta = tipo === "LIGA_IDA_VOLTA";

        // trava: se já existe QUALQUER jogo desse campeonato, não gera de novo
        const jaTemJogos = await prisma.jogo.findFirst({ where: { campeonatoId } });
        if (jaTemJogos) {
            return res.status(400).json({ error: "Jogos já foram gerados para este campeonato." });
        }

        // ====== Caso A: GRUPOS (e GRUPOS_MATA_MATA / COPA se você estiver usando como grupos)
        if (tipo === "GRUPOS" || tipo === "GRUPOS_MATA_MATA" || tipo === "COPA") {
            const grupos = campeonato.grupos || [];
            if (!grupos.length) return res.status(400).json({ error: "Gere os grupos primeiro." });

            for (const g of grupos) {
                const teamIds = (g.timesGrupo || []).map((x) => x.timeId);
                if (teamIds.length < 2) continue;

                const rounds = buildRoundRobinRounds(teamIds);
                const totalRodadas = rounds.length;

                // IDA
                for (let r = 0; r < rounds.length; r++) {
                    for (const [a, b] of rounds[r]) {
                        await createGameWithStats(prisma, {
                            campeonatoId,
                            grupoId: g.id,
                            round: r + 1,
                            timeAId: a,
                            timeBId: b,
                        });
                    }
                }

                // VOLTA (somente se LIGA_IDA_VOLTA — você pode decidir se quer ida/volta também nos grupos)
                // Se você QUER ida/volta também em grupos, deixa assim.
                if (idaVolta) {
                    for (let r = 0; r < rounds.length; r++) {
                        for (const [a, b] of rounds[r]) {
                            await createGameWithStats(prisma, {
                                campeonatoId,
                                grupoId: g.id,
                                round: totalRodadas + (r + 1),
                                timeAId: b,
                                timeBId: a,
                            });
                        }
                    }
                }
            }

            await prisma.campeonato.update({
                where: { id: campeonatoId },
                data: { faseAtual: "GRUPOS", roundAtual: 1, status: "EM_ANDAMENTO" },
            });

            return res.json({ ok: true, tipo, idaVolta });
        }

        // ====== Caso B: LIGA / PONTOS CORRIDOS (sem grupos)
        if (tipo === "PONTOS_CORRIDOS" || tipo === "LIGA_IDA_VOLTA") {
            const teamIds = (campeonato.times || []).map((t) => t.timeId);
            if (teamIds.length < 2) return res.status(400).json({ error: "É preciso ao menos 2 times." });

            const rounds = buildRoundRobinRounds(teamIds);
            const totalRodadas = rounds.length;

            // IDA
            for (let r = 0; r < rounds.length; r++) {
                for (const [a, b] of rounds[r]) {
                    await createGameWithStats(prisma, {
                        campeonatoId,
                        grupoId: null,
                        round: r + 1,
                        timeAId: a,
                        timeBId: b,
                    });
                }
            }

            // VOLTA
            if (idaVolta) {
                for (let r = 0; r < rounds.length; r++) {
                    for (const [a, b] of rounds[r]) {
                        await createGameWithStats(prisma, {
                            campeonatoId,
                            grupoId: null,
                            round: totalRodadas + (r + 1),
                            timeAId: b,
                            timeBId: a,
                        });
                    }
                }
            }

            await prisma.campeonato.update({
                where: { id: campeonatoId },
                data: { faseAtual: "LIGA", roundAtual: 1, status: "EM_ANDAMENTO" },
            });

            return res.json({ ok: true, tipo, idaVolta });
        }

        // ====== Caso C: Mata-mata não usa este endpoint
        return res.status(400).json({
            error: "Este endpoint é para gerar jogos de grupos/liga. Para mata-mata use /gerar-mata-mata.",
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao gerar jogos" });
    }
};

// ============================
// Atualiza classificação (somente jogos de grupos)
// ============================
async function atualizarClassificacaoGrupos(db, jogo) {
    const grupoId = jogo.grupoId;
    if (!grupoId) return;

    const { golsA, golsB } = jogo;
    if (!Number.isFinite(golsA) || !Number.isFinite(golsB)) return;

    const timeA = await db.timeGrupo.findFirst({
        where: { grupoId, timeId: jogo.timeAId },
    });
    const timeB = await db.timeGrupo.findFirst({
        where: { grupoId, timeId: jogo.timeBId },
    });

    if (!timeA || !timeB) return;

    const inc = async (tgId, gp, gc, pts) => {
        await db.timeGrupo.update({
            where: { id: tgId },
            data: {
                golsPro: { increment: gp },
                golsContra: { increment: gc },
                saldoGols: { increment: gp - gc },
                pontos: { increment: pts },
                vitorias: { increment: pts === 3 ? 1 : 0 },
                empates: { increment: pts === 1 ? 1 : 0 },
                derrotas: { increment: pts === 0 && gp !== gc ? 1 : 0 },
            },
        });
    };

    if (golsA > golsB) {
        await inc(timeA.id, golsA, golsB, 3);
        await inc(timeB.id, golsB, golsA, 0);
    } else if (golsB > golsA) {
        await inc(timeB.id, golsB, golsA, 3);
        await inc(timeA.id, golsA, golsB, 0);
    } else {
        await inc(timeA.id, golsA, golsB, 1);
        await inc(timeB.id, golsB, golsA, 1);
    }
}

// ============================
// Gerar mata-mata (já cria stats)
// ============================
const generateMataMata = async (req, res) => {
    try {
        const campeonatoId = Number(req.params.id);

        const campeonato = await prisma.campeonato.findUnique({
            where: { id: campeonatoId },
            include: {
                times: true,
                grupos: { include: { timesGrupo: true } },
            },
        });

        if (!campeonato) return res.status(404).json({ error: "Campeonato não encontrado." });

        const jaTemMataMata = await prisma.jogo.findFirst({
            where: { campeonatoId, grupoId: null },
        });
        if (jaTemMataMata) return res.status(400).json({ error: "Mata-mata já foi gerado." });

        let participantes = [];

        if (campeonato.tipo === "MATA_MATA") {
            participantes = campeonato.times.map((t) => t.timeId);
        } else {
            const grupos = campeonato.grupos || [];
            if (!grupos.length) return res.status(400).json({ error: "Gere os grupos primeiro." });

            for (const g of grupos) {
                const ordenados = [...g.timesGrupo].sort((a, b) => {
                    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
                    if (b.saldoGols !== a.saldoGols) return b.saldoGols - a.saldoGols;
                    return b.golsPro - a.golsPro;
                });

                for (let i = 0; i < Math.min(2, ordenados.length); i++) {
                    participantes.push(ordenados[i].timeId);
                }
            }
        }

        participantes = Array.from(new Set(participantes));
        if (participantes.length < 2)
            return res.status(400).json({ error: "Não há times suficientes para mata-mata." });

        const potencias = [16, 8, 4, 2];
        const n = potencias.find((p) => participantes.length >= p) || 2;
        participantes = participantes.slice(0, n);

        let pares = [];

        if (campeonato.tipo === "GRUPOS" && (campeonato.grupos?.length || 0) === 2 && participantes.length === 4) {
            const [gA, gB] = campeonato.grupos;

            const rank = (g) =>
                [...g.timesGrupo].sort((a, b) => {
                    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
                    if (b.saldoGols !== a.saldoGols) return b.saldoGols - a.saldoGols;
                    return b.golsPro - a.golsPro;
                });

            const a = rank(gA);
            const b = rank(gB);

            if (a.length >= 2 && b.length >= 2) {
                pares = [
                    [a[0].timeId, b[1].timeId],
                    [b[0].timeId, a[1].timeId],
                ];
            }
        }

        if (!pares.length) {
            participantes.sort(() => Math.random() - 0.5);
            for (let i = 0; i < participantes.length / 2; i++) {
                pares.push([participantes[i], participantes[participantes.length - 1 - i]]);
            }
        }

        for (const [timeAId, timeBId] of pares) {
            await createGameWithStats(prisma, {
                campeonatoId,
                grupoId: null,
                round: 1,
                timeAId,
                timeBId,
            });
        }

        await prisma.campeonato.update({
            where: { id: campeonatoId },
            data: { faseAtual: "MATA_MATA", roundAtual: 1, status: "EM_ANDAMENTO" },
        });

        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao gerar mata-mata." });
    }
};

// ============================
// ✅ Finalizar jogo (seu código intacto, só mantendo as novas regras de tabela)
// ============================
const finalizarJogo = async (req, res) => {
    try {
        const jogoId = Number(req.params.id);
        const golsA = Number(req.body.golsA);
        const golsB = Number(req.body.golsB);

        const vencedorIdBody = req.body.vencedorId ? Number(req.body.vencedorId) : null;
        const desempateTipo = req.body.desempateTipo || null;
        const penaltisA = Number.isFinite(Number(req.body.penaltisA)) ? Number(req.body.penaltisA) : null;
        const penaltisB = Number.isFinite(Number(req.body.penaltisB)) ? Number(req.body.penaltisB) : null;
        const observacao = req.body.observacao ? String(req.body.observacao) : null;

        if (!Number.isFinite(golsA) || !Number.isFinite(golsB)) {
            return res.status(400).json({ error: "Informe golsA e golsB corretamente." });
        }

        const result = await prisma.$transaction(async (tx) => {
            const jogoAtual = await tx.jogo.findUnique({
                where: { id: jogoId },
                include: { campeonato: true },
            });

            if (!jogoAtual) {
                return { status: 404, body: { error: "Jogo não encontrado." } };
            }

            if (jogoAtual.finalizado) {
                return { status: 409, body: { error: "Este jogo já foi finalizado. Não é permitido finalizar novamente." } };
            }

            const isMataMata = jogoAtual.grupoId === null;

            let vencedorId = null;
            let perdedorId = null;

            if (!isMataMata) {
                if (golsA > golsB) vencedorId = jogoAtual.timeAId;
                else if (golsB > golsA) vencedorId = jogoAtual.timeBId;
                else vencedorId = null;
            } else {
                if (golsA > golsB) vencedorId = jogoAtual.timeAId;
                else if (golsB > golsA) vencedorId = jogoAtual.timeBId;
                else {
                    if (!vencedorIdBody) {
                        return {
                            status: 400,
                            body: { error: "Empate no mata-mata: informe vencedorId e desempateTipo (PENALTIS/WO/MELHOR_CAMPANHA)." },
                        };
                    }
                    if (![jogoAtual.timeAId, jogoAtual.timeBId].includes(vencedorIdBody)) {
                        return { status: 400, body: { error: "vencedorId inválido para este jogo." } };
                    }
                    vencedorId = vencedorIdBody;
                }

                perdedorId = vencedorId === jogoAtual.timeAId ? jogoAtual.timeBId : jogoAtual.timeAId;
            }

            const jogo = await tx.jogo.update({
                where: { id: jogoId },
                data: {
                    golsA,
                    golsB,
                    vencedorId,
                    finalizado: true,
                    desempateTipo: isMataMata && golsA === golsB ? desempateTipo : null,
                    penaltisA: isMataMata && golsA === golsB ? penaltisA : null,
                    penaltisB: isMataMata && golsA === golsB ? penaltisB : null,
                    observacao,
                },
            });

            await atualizarClassificacaoGrupos(tx, jogo);
            await atualizarTabelaGeral(tx, jogo);

            if (!isMataMata) return { status: 200, body: { ok: true } };

            const campeonatoId = jogo.campeonatoId;
            const roundAtual = jogo.round;

            const jogosDoRound = await tx.jogo.findMany({
                where: { campeonatoId, grupoId: null, round: roundAtual },
                orderBy: { id: "asc" },
            });

            const todosFinalizados = jogosDoRound.every((j) => j.finalizado);
            if (!todosFinalizados) {
                return { status: 200, body: { ok: true, mensagem: "Jogo finalizado. Aguardando os demais jogos do round." } };
            }

            const vencedores = jogosDoRound.map((j) => j.vencedorId).filter(Boolean);

            if (jogosDoRound.length === 1) {
                const finalGame = jogosDoRound[0];
                const campeaoId = finalGame.vencedorId;
                const viceId = campeaoId === finalGame.timeAId ? finalGame.timeBId : finalGame.timeAId;

                await tx.campeonato.update({
                    where: { id: campeonatoId },
                    data: { faseAtual: "FINALIZADO", campeaoId, viceCampeaoId: viceId, status: "FINALIZADO" },
                });

                return { status: 200, body: { ok: true, mensagem: "Campeonato finalizado!", campeaoId, viceCampeaoId: viceId } };
            }

            const proximoRound = roundAtual + 1;
            if (vencedores.length % 2 !== 0) {
                return { status: 400, body: { error: "Quantidade de vencedores ímpar. Verifique jogos do round." } };
            }

            for (let i = 0; i < vencedores.length; i += 2) {
                await createGameWithStats(tx, {
                    campeonatoId,
                    grupoId: null,
                    round: proximoRound,
                    timeAId: vencedores[i],
                    timeBId: vencedores[i + 1],
                });
            }

            await tx.campeonato.update({
                where: { id: campeonatoId },
                data: { faseAtual: "MATA_MATA", roundAtual: proximoRound, status: "EM_ANDAMENTO" },
            });

            return { status: 200, body: { ok: true, mensagem: `Round ${roundAtual} concluído. Próximo round criado.` } };
        });

        return res.status(result.status).json(result.body);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao finalizar jogo" });
    }
};

// ============================
// Bracket
// ============================
const getBracket = async (req, res) => {
    try {
        const campeonatoId = Number(req.params.id);

        const jogos = await prisma.jogo.findMany({
            where: { campeonatoId, grupoId: null },
            include: { timeA: true, timeB: true },
            orderBy: [{ round: "asc" }, { id: "asc" }],
        });

        res.json(jogos);
    } catch (error) {
        console.error("Erro ao carregar chaveamento:", error);
        res.status(500).json({ error: "Erro ao carregar chaveamento" });
    }
};

// ============================
// ✅ RANKING
// ============================
const ranking = async (req, res) => {
    try {
        const campeonatoId = Number(req.params.id);

        const tabela = await prisma.tabelaCampeonato.findMany({
            where: { campeonatoId },
            include: { time: true },
            orderBy: [
                { pontos: "desc" },
                { saldoGols: "desc" },
                { golsPro: "desc" },
                { vitorias: "desc" },
            ],
        });

        const resp = tabela.map((r) => ({
            timeId: r.timeId,
            nome: r.time?.nome || "Time",
            pontos: r.pontos,
            jogos: r.vitorias + r.empates + r.derrotas,
            vitorias: r.vitorias,
            empates: r.empates,
            derrotas: r.derrotas,
            golsPro: r.golsPro,
            golsContra: r.golsContra,
            saldo: r.saldoGols,
        }));

        res.json(resp);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || "Erro ao gerar ranking" });
    }
};

// ============================
// ✅ Atualizar infos do campeonato (PRO)
// ============================
const updateInfo = async (req, res) => {
    try {
        const campeonatoId = Number(req.params.id);

        const {
            nome,
            tipo,
            maxTimes,
            modalidade,
            categoria,
            temporada,
            dataInicio,
            dataFim,
            status,
            regulamentoTexto,
            regulamentoUrl,
        } = req.body;

        const di = dataInicio ? new Date(dataInicio) : null;
        const df = dataFim ? new Date(dataFim) : null;

        if (di && Number.isNaN(di.getTime())) return res.status(400).json({ error: "dataInicio inválida." });
        if (df && Number.isNaN(df.getTime())) return res.status(400).json({ error: "dataFim inválida." });
        if (di && df && df < di) return res.status(400).json({ error: "dataFim não pode ser menor que dataInicio." });

        const upd = await prisma.campeonato.update({
            where: { id: campeonatoId },
            data: {
                nome: nome !== undefined ? String(nome).trim() : undefined,
                tipo: tipo !== undefined ? tipo : undefined,
                maxTimes: maxTimes !== undefined ? Number(maxTimes) : undefined,
                modalidade: modalidade !== undefined ? modalidade : undefined,
                categoria: categoria !== undefined ? categoria : undefined,
                temporada: temporada !== undefined ? (temporada ? String(temporada).trim() : null) : undefined,
                dataInicio: dataInicio !== undefined ? di : undefined,
                dataFim: dataFim !== undefined ? df : undefined,
                status: status !== undefined ? status : undefined,
                regulamentoTexto: regulamentoTexto !== undefined ? (regulamentoTexto ? String(regulamentoTexto) : null) : undefined,
                regulamentoUrl: regulamentoUrl !== undefined ? (regulamentoUrl ? String(regulamentoUrl).trim() : null) : undefined,
            },
        });

        res.json(upd);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao atualizar campeonato." });
    }
};

module.exports = {
    create,
    readOne,
    listBySociety,
    addTime,
    generateGroups,
    generateGroupMatches,
    generateMataMata,
    finalizarJogo,
    getBracket,
    ranking,
    updateInfo,
};
