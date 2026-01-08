const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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
                    await prisma.jogo.create({
                        data: {
                            campeonatoId,
                            grupoId: g.id,
                            round: 1,
                            timeAId: times[i],
                            timeBId: times[j],
                        },
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
async function atualizarClassificacao(jogo) {
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
// ✅ Gerar mata-mata
// - Se tipo = GRUPOS => usa top2 por grupo
// - Se tipo = MATA_MATA => usa inscritos direto
// - Evita repetição simples quando houver 2 grupos (1A x 2B, 1B x 2A)
// ============================
const generateMataMata = async (req, res) => {
    try {
        const campeonatoId = Number(req.params.id);

        const campeonato = await prisma.campeonato.findUnique({
            where: { id: campeonatoId },
            include: {
                times: true,
                grupos: {
                    include: {
                        timesGrupo: true,
                    },
                },
            },
        });

        if (!campeonato) return res.status(404).json({ error: "Campeonato não encontrado." });

        const jaTemMataMata = await prisma.jogo.findFirst({
            where: { campeonatoId, grupoId: null },
        });
        if (jaTemMataMata) {
            return res.status(400).json({ error: "Mata-mata já foi gerado." });
        }

        // ====== pega participantes ======
        let participantes = [];

        if (campeonato.tipo === "MATA_MATA") {
            // direto dos inscritos
            participantes = campeonato.times.map((t) => t.timeId);
        } else {
            // por grupos: top2 de cada grupo
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

        // remove duplicados
        participantes = Array.from(new Set(participantes));

        if (participantes.length < 2) {
            return res.status(400).json({ error: "Não há times suficientes para mata-mata." });
        }

        // potência de 2 (2,4,8,16)
        const potencias = [16, 8, 4, 2];
        const n = potencias.find((p) => participantes.length >= p) || 2;
        participantes = participantes.slice(0, n);

        // ====== montar pares ======
        let pares = [];

        // Se tem exatamente 2 grupos e conseguimos inferir 1º/2º de cada, fazemos cruzado
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
                // 1A vs 2B e 1B vs 2A
                pares = [
                    [a[0].timeId, b[1].timeId],
                    [b[0].timeId, a[1].timeId],
                ];
            }
        }

        // fallback: embaralha e faz 1vsúltimo
        if (!pares.length) {
            participantes.sort(() => Math.random() - 0.5);
            for (let i = 0; i < participantes.length / 2; i++) {
                pares.push([participantes[i], participantes[participantes.length - 1 - i]]);
            }
        }

        // cria jogos round 1
        for (const [timeAId, timeBId] of pares) {
            await prisma.jogo.create({
                data: {
                    campeonatoId,
                    grupoId: null,
                    round: 1,
                    timeAId,
                    timeBId,
                },
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
// - grupos: atualiza tabela
// - mata-mata: avança rounds automaticamente
// - quando final terminar: define campeao/vice e FINALIZA campeonato
// ============================
const finalizarJogo = async (req, res) => {
    try {
        const jogoId = Number(req.params.id);
        const golsA = Number(req.body.golsA);
        const golsB = Number(req.body.golsB);

        if (!Number.isFinite(golsA) || !Number.isFinite(golsB)) {
            return res.status(400).json({ error: "Informe golsA e golsB corretamente." });
        }

        const jogoAtual = await prisma.jogo.findUnique({
            where: { id: jogoId },
            include: { campeonato: true },
        });

        if (!jogoAtual) return res.status(404).json({ error: "Jogo não encontrado." });

        // empate permitido em grupos, mas NÃO em mata-mata
        const isMataMata = jogoAtual.grupoId === null;

        if (isMataMata && golsA === golsB) {
            return res.status(400).json({ error: "Empate não permitido em mata-mata. Defina vencedor (pênaltis/WO) e informe placar final." });
        }

        let vencedorId = null;
        let perdedorId = null;

        if (golsA > golsB) {
            vencedorId = jogoAtual.timeAId;
            perdedorId = jogoAtual.timeBId;
        } else if (golsB > golsA) {
            vencedorId = jogoAtual.timeBId;
            perdedorId = jogoAtual.timeAId;
        }

        const jogo = await prisma.jogo.update({
            where: { id: jogoId },
            data: {
                golsA,
                golsB,
                vencedorId,
                finalizado: true,
            },
        });

        await atualizarClassificacao(jogo);

        // ====== se não for mata-mata, acabou aqui ======
        if (!isMataMata) {
            return res.json({ ok: true });
        }

        // ====== mata-mata: verifica se round atual terminou ======
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

        // vencedores do round
        const vencedores = jogosDoRound.map((j) => j.vencedorId).filter(Boolean);

        // ====== se só sobrou 1 vencedor => FINAL do campeonato ======
        if (vencedores.length === 1) {
            // esse jogo finalizado é a final (último jogo criado)
            await prisma.campeonato.update({
                where: { id: campeonatoId },
                data: {
                    faseAtual: "FINALIZADO",
                    campeaoId: vencedorId,
                    viceCampeaoId: perdedorId,
                },
            });

            return res.json({
                ok: true,
                mensagem: "Campeonato finalizado!",
                campeaoId: vencedorId,
                viceCampeaoId: perdedorId,
            });
        }

        // ====== cria próximo round ======
        const proximoRound = roundAtual + 1;

        // garante que é par (mata-mata correto)
        if (vencedores.length % 2 !== 0) {
            return res.status(400).json({ error: "Quantidade de vencedores ímpar. Verifique jogos do round." });
        }

        for (let i = 0; i < vencedores.length; i += 2) {
            await prisma.jogo.create({
                data: {
                    campeonatoId,
                    grupoId: null,
                    round: proximoRound,
                    timeAId: vencedores[i],
                    timeBId: vencedores[i + 1],
                },
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
// Bracket: mata-mata = grupoId null
// ============================
const getBracket = async (req, res) => {
    try {
        const campeonatoId = Number(req.params.id);

        const jogos = await prisma.jogo.findMany({
            where: {
                campeonatoId,
                grupoId: null,
            },
            include: {
                timeA: true,
                timeB: true,
            },
            orderBy: [{ round: "asc" }, { id: "asc" }],
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
    generateMataMata,
    finalizarJogo,
    getBracket,
};
