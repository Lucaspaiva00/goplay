const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ============================
// Helpers (Tabela Geral)
// ============================
async function ensureTabelaRow(campeonatoId, timeId) {
    const row = await prisma.tabelaCampeonato.findUnique({
        where: { campeonatoId_timeId: { campeonatoId, timeId } },
    });

    if (row) return row;

    return prisma.tabelaCampeonato.create({
        data: { campeonatoId, timeId },
    });
}

async function atualizarTabelaGeral(jogo) {
    // Atualiza campanha para QUALQUER jogo (grupo e mata-mata)
    const { campeonatoId, timeAId, timeBId } = jogo;

    const golsA = Number.isFinite(jogo.golsA) ? jogo.golsA : null;
    const golsB = Number.isFinite(jogo.golsB) ? jogo.golsB : null;
    if (golsA === null || golsB === null) return;

    // garante linhas
    const rowA = await ensureTabelaRow(campeonatoId, timeAId);
    const rowB = await ensureTabelaRow(campeonatoId, timeBId);

    // pontos
    let ptsA = 0,
        ptsB = 0;
    let vitA = 0,
        vitB = 0;
    let empA = 0,
        empB = 0;
    let derA = 0,
        derB = 0;

    if (golsA > golsB) {
        ptsA = 3;
        ptsB = 0;
        vitA = 1;
        derB = 1;
    } else if (golsB > golsA) {
        ptsB = 3;
        ptsA = 0;
        vitB = 1;
        derA = 1;
    } else {
        // empate: 1 ponto cada
        ptsA = 1;
        ptsB = 1;
        empA = 1;
        empB = 1;
    }

    await prisma.tabelaCampeonato.update({
        where: { id: rowA.id },
        data: {
            golsPro: rowA.golsPro + golsA,
            golsContra: rowA.golsContra + golsB,
            saldoGols: rowA.saldoGols + (golsA - golsB),
            pontos: rowA.pontos + ptsA,
            vitorias: rowA.vitorias + vitA,
            empates: rowA.empates + empA,
            derrotas: rowA.derrotas + derA,
        },
    });

    await prisma.tabelaCampeonato.update({
        where: { id: rowB.id },
        data: {
            golsPro: rowB.golsPro + golsB,
            golsContra: rowB.golsContra + golsA,
            saldoGols: rowB.saldoGols + (golsB - golsA),
            pontos: rowB.pontos + ptsB,
            vitorias: rowB.vitorias + vitB,
            empates: rowB.empates + empB,
            derrotas: rowB.derrotas + derB,
        },
    });
}

// ============================
// Criar campeonato
// ============================
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
                maxTimes: Number(maxTimes),
                faseAtual: "GRUPOS",
                roundAtual: 1,
            },
        });

        res.json(novo);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao criar campeonato." });
    }
};

// ============================
// Buscar dados completos
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

                // ✅ tabela geral já vem ordenada
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
// Listar por society
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
            orderBy: { id: "desc" },
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

        // ✅ já cria linha na tabela geral
        await ensureTabelaRow(Number(id), Number(timeId));

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
            data: { faseAtual: "GRUPOS", roundAtual: 1 },
        });

        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao criar grupos" });
    }
};

// ============================
// Gerar jogos de grupo
// ============================
const generateGroupMatches = async (req, res) => {
    try {
        const campeonatoId = Number(req.params.id);

        const jaTemJogos = await prisma.jogo.findFirst({
            where: { campeonatoId, grupoId: { not: null } },
        });

        if (jaTemJogos) {
            return res.status(400).json({ error: "Jogos de grupos já foram gerados." });
        }

        const grupos = await prisma.grupo.findMany({
            where: { campeonatoId },
            include: { timesGrupo: true },
        });

        if (!grupos.length) {
            return res.status(400).json({ error: "Gere os grupos primeiro." });
        }

        for (const g of grupos) {
            const times = g.timesGrupo.map((x) => x.timeId);

            for (let i = 0; i < times.length; i++) {
                for (let j = i + 1; j < times.length; j++) {
                    const jogo = await prisma.jogo.create({
                        data: {
                            campeonatoId,
                            grupoId: g.id,
                            round: 1,
                            timeAId: times[i],
                            timeBId: times[j],
                        },
                    });

                    // stats por time pro jogo (detalhes)
                    await prisma.jogoEstatisticaTime.createMany({
                        data: [
                            { jogoId: jogo.id, timeId: jogo.timeAId },
                            { jogoId: jogo.id, timeId: jogo.timeBId },
                        ],
                        skipDuplicates: true,
                    });
                }
            }
        }

        await prisma.campeonato.update({
            where: { id: campeonatoId },
            data: { faseAtual: "GRUPOS", roundAtual: 1 },
        });

        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao gerar jogos" });
    }
};

// ============================
// Atualiza classificação (somente jogos de grupos)
// ============================
async function atualizarClassificacaoGrupos(jogo) {
    const grupoId = jogo.grupoId;
    if (!grupoId) return;

    const { golsA, golsB } = jogo;
    if (!Number.isFinite(golsA) || !Number.isFinite(golsB)) return;

    const timeA = await prisma.timeGrupo.findFirst({
        where: { grupoId, timeId: jogo.timeAId },
    });
    const timeB = await prisma.timeGrupo.findFirst({
        where: { grupoId, timeId: jogo.timeBId },
    });

    if (!timeA || !timeB) return;

    const updateStats = async (tg, gp, gc, pts) => {
        await prisma.timeGrupo.update({
            where: { id: tg.id },
            data: {
                golsPro: tg.golsPro + gp,
                golsContra: tg.golsContra + gc,
                saldoGols: tg.saldoGols + (gp - gc),
                pontos: tg.pontos + pts,
                vitorias: tg.vitorias + (pts === 3 ? 1 : 0),
                empates: tg.empates + (pts === 1 ? 1 : 0),
                derrotas: tg.derrotas + (pts === 0 && gp !== gc ? 1 : 0),
            },
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
            const jogo = await prisma.jogo.create({
                data: { campeonatoId, grupoId: null, round: 1, timeAId, timeBId },
            });

            await prisma.jogoEstatisticaTime.createMany({
                data: [
                    { jogoId: jogo.id, timeId: jogo.timeAId },
                    { jogoId: jogo.id, timeId: jogo.timeBId },
                ],
                skipDuplicates: true,
            });
        }

        await prisma.campeonato.update({
            where: { id: campeonatoId },
            data: { faseAtual: "MATA_MATA", roundAtual: 1 },
        });

        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao gerar mata-mata." });
    }
};

// ============================
// ✅ Finalizar jogo
// ============================
const finalizarJogo = async (req, res) => {
    try {
        const jogoId = Number(req.params.id);
        const golsA = Number(req.body.golsA);
        const golsB = Number(req.body.golsB);

        const vencedorIdBody = req.body.vencedorId ? Number(req.body.vencedorId) : null;
        const desempateTipo = req.body.desempateTipo || null; // "PENALTIS" | "WO" | "MELHOR_CAMPANHA" | "OUTRO"
        const penaltisA = Number.isFinite(Number(req.body.penaltisA)) ? Number(req.body.penaltisA) : null;
        const penaltisB = Number.isFinite(Number(req.body.penaltisB)) ? Number(req.body.penaltisB) : null;
        const observacao = req.body.observacao ? String(req.body.observacao) : null;

        if (!Number.isFinite(golsA) || !Number.isFinite(golsB)) {
            return res.status(400).json({ error: "Informe golsA e golsB corretamente." });
        }

        const jogoAtual = await prisma.jogo.findUnique({
            where: { id: jogoId },
            include: { campeonato: true },
        });

        if (!jogoAtual) return res.status(404).json({ error: "Jogo não encontrado." });

        const isMataMata = jogoAtual.grupoId === null;

        let vencedorId = null;
        let perdedorId = null;

        if (!isMataMata) {
            // grupos
            if (golsA > golsB) vencedorId = jogoAtual.timeAId;
            else if (golsB > golsA) vencedorId = jogoAtual.timeBId;
            else vencedorId = null;
        } else {
            // mata-mata
            if (golsA > golsB) vencedorId = jogoAtual.timeAId;
            else if (golsB > golsA) vencedorId = jogoAtual.timeBId;
            else {
                if (!vencedorIdBody) {
                    return res.status(400).json({
                        error:
                            "Empate no mata-mata: informe vencedorId e desempateTipo (PENALTIS/WO/MELHOR_CAMPANHA).",
                    });
                }
                if (![jogoAtual.timeAId, jogoAtual.timeBId].includes(vencedorIdBody)) {
                    return res.status(400).json({ error: "vencedorId inválido para este jogo." });
                }
                vencedorId = vencedorIdBody;
            }

            perdedorId = vencedorId === jogoAtual.timeAId ? jogoAtual.timeBId : jogoAtual.timeAId;
        }

        const jogo = await prisma.jogo.update({
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

        // grupos: tabela por grupo
        await atualizarClassificacaoGrupos(jogo);

        // geral: tabela do campeonato
        await atualizarTabelaGeral(jogo);

        // se não é mata-mata -> acabou
        if (!isMataMata) return res.json({ ok: true });

        // mata-mata: checar se round terminou
        const campeonatoId = jogo.campeonatoId;
        const roundAtual = jogo.round;

        const jogosDoRound = await prisma.jogo.findMany({
            where: { campeonatoId, grupoId: null, round: roundAtual },
            orderBy: { id: "asc" },
        });

        const todosFinalizados = jogosDoRound.every((j) => j.finalizado);
        if (!todosFinalizados) {
            return res.json({ ok: true, mensagem: "Jogo finalizado. Aguardando os demais jogos do round." });
        }

        const vencedores = jogosDoRound.map((j) => j.vencedorId).filter(Boolean);

        // FINAL = round com 1 jogo
        if (jogosDoRound.length === 1) {
            const finalGame = jogosDoRound[0];
            const campeaoId = finalGame.vencedorId;
            const viceId = campeaoId === finalGame.timeAId ? finalGame.timeBId : finalGame.timeAId;

            await prisma.campeonato.update({
                where: { id: campeonatoId },
                data: { faseAtual: "FINALIZADO", campeaoId, viceCampeaoId: viceId },
            });

            return res.json({ ok: true, mensagem: "Campeonato finalizado!", campeaoId, viceCampeaoId: viceId });
        }

        // cria próximo round
        const proximoRound = roundAtual + 1;
        if (vencedores.length % 2 !== 0) {
            return res.status(400).json({ error: "Quantidade de vencedores ímpar. Verifique jogos do round." });
        }

        for (let i = 0; i < vencedores.length; i += 2) {
            const novoJogo = await prisma.jogo.create({
                data: {
                    campeonatoId,
                    grupoId: null,
                    round: proximoRound,
                    timeAId: vencedores[i],
                    timeBId: vencedores[i + 1],
                },
            });

            await prisma.jogoEstatisticaTime.createMany({
                data: [
                    { jogoId: novoJogo.id, timeId: novoJogo.timeAId },
                    { jogoId: novoJogo.id, timeId: novoJogo.timeBId },
                ],
                skipDuplicates: true,
            });
        }

        await prisma.campeonato.update({
            where: { id: campeonatoId },
            data: { faseAtual: "MATA_MATA", roundAtual: proximoRound },
        });

        return res.json({ ok: true, mensagem: `Round ${roundAtual} concluído. Próximo round criado.` });
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
// ✅ RANKING (mesma estrutura, usando tabelaCampeonato)
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
            jogos: (r.vitorias + r.empates + r.derrotas),
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
};
