const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { notifyUsuario } = require("../notifications");

/* =========================
   HELPERS
========================= */
const toId = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

const toOptionalNumber = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

/* =========================
   CRIAR TIME
========================= */
const create = async (req, res) => {
    try {
        const nome = String(req.body.nome || "").trim();
        const societyId = toId(req.body.societyId);
        const donoId = toId(req.body.donoId);

        const brasao = req.body.brasao ? String(req.body.brasao).trim() : null;
        const descricao = req.body.descricao ? String(req.body.descricao).trim() : null;
        const estado = req.body.estado ? String(req.body.estado).trim() : null;
        const cidade = req.body.cidade ? String(req.body.cidade).trim() : null;
        const modalidade = req.body.modalidade ? String(req.body.modalidade).trim() : null;

        const tipoVinculo = req.body.tipoVinculo || "AVULSO";
        const statusVinculo = req.body.statusVinculo || "PENDENTE";
        const valorMensalidade = toOptionalNumber(req.body.valorMensalidade);
        const diaVencimento = toOptionalNumber(req.body.diaVencimento);
        const observacaoVinculo = req.body.observacaoVinculo
            ? String(req.body.observacaoVinculo).trim()
            : null;

        if (!nome || !societyId || !donoId) {
            return res.status(400).json({ error: "Informe nome, societyId e donoId." });
        }

        const society = await prisma.society.findUnique({
            where: { id: societyId }
        });

        if (!society) {
            return res.status(404).json({ error: "Society não encontrado." });
        }

        const dono = await prisma.usuario.findUnique({
            where: { id: donoId }
        });

        if (!dono) {
            return res.status(404).json({ error: "Dono do time não encontrado." });
        }

        const existe = await prisma.time.findFirst({
            where: {
                societyId,
                nome
            }
        });

        if (existe) {
            return res.status(400).json({ error: "Já existe um time com esse nome nesse society." });
        }

        const novo = await prisma.time.create({
            data: {
                nome,
                societyId,
                donoId,
                brasao,
                descricao,
                estado,
                cidade,
                modalidade,
                tipoVinculo,
                statusVinculo,
                valorMensalidade,
                diaVencimento,
                observacaoVinculo,
                aprovadoEm: statusVinculo === "APROVADO" ? new Date() : null
            },
            include: {
                dono: { select: { id: true, nome: true } },
                society: { select: { id: true, nome: true, pixChave: true, pixTitular: true } },
                jogadores: { select: { id: true, nome: true } }
            }
        });

        return res.status(201).json(novo);
    } catch (err) {
        console.error("Erro ao criar time:", err);
        return res.status(500).json({ error: "Erro ao criar time." });
    }
};

/* =========================
   LISTAR TODOS
========================= */
const list = async (req, res) => {
    try {
        const times = await prisma.time.findMany({
            include: {
                dono: { select: { id: true, nome: true } },
                jogadores: {
                    select: {
                        id: true,
                        nome: true,
                        posicaoCampo: true,
                        goleiro: true
                    }
                },
                society: { select: { id: true, nome: true, pixChave: true, pixTitular: true } }
            },
            orderBy: { id: "desc" }
        });

        return res.status(200).json(times);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao listar times." });
    }
};

/* =========================
   LISTAR POR DONO
========================= */
const listByOwner = async (req, res) => {
    try {
        const donoId = toId(req.params.donoId);

        if (!donoId) {
            return res.status(400).json({ error: "donoId inválido." });
        }

        const times = await prisma.time.findMany({
            where: { donoId },
            include: {
                jogadores: {
                    select: {
                        id: true,
                        nome: true,
                        posicaoCampo: true,
                        goleiro: true
                    }
                },
                society: { select: { id: true, nome: true, pixChave: true, pixTitular: true } }
            },
            orderBy: { id: "desc" }
        });

        return res.status(200).json(times);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao listar times do dono." });
    }
};

/* =========================
   LISTAR POR SOCIETY
========================= */
const listBySociety = async (req, res) => {
    try {
        const societyId = toId(req.params.societyId);

        if (!societyId) {
            return res.status(400).json({ error: "societyId inválido." });
        }

        const times = await prisma.time.findMany({
            where: { societyId },
            include: {
                jogadores: {
                    select: {
                        id: true,
                        nome: true,
                        posicaoCampo: true,
                        goleiro: true
                    }
                },
                dono: { select: { id: true, nome: true } }
            },
            orderBy: [
                { statusVinculo: "asc" },
                { tipoVinculo: "asc" },
                { nome: "asc" }
            ]
        });

        return res.status(200).json(times);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao listar times do society." });
    }
};

/* =========================
   DETALHES DO TIME
========================= */
const details = async (req, res) => {
    try {
        const timeId = toId(req.params.timeId);

        if (!timeId) {
            return res.status(400).json({ error: "timeId inválido." });
        }

        const time = await prisma.time.findUnique({
            where: { id: timeId },
            include: {
                dono: { select: { id: true, nome: true, email: true } },
                society: { select: { id: true, nome: true, usuarioId: true, pixChave: true, pixTitular: true } },
                jogadores: {
                    select: {
                        id: true,
                        nome: true,
                        email: true,
                        telefone: true,
                        posicaoCampo: true,
                        goleiro: true,
                        fotoUrl: true
                    }
                },
                rotinaHorario: { select: { id: true, nome: true, ativo: true } }
            }
        });

        if (!time) {
            return res.status(404).json({ error: "Time não encontrado." });
        }

        return res.status(200).json(time);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao carregar detalhes do time." });
    }
};

/* =========================
   ATUALIZAR TIME
========================= */
const update = async (req, res) => {
    try {
        const timeId = toId(req.params.timeId);

        if (!timeId) {
            return res.status(400).json({ error: "timeId inválido." });
        }

        const timeAtual = await prisma.time.findUnique({
            where: { id: timeId }
        });

        if (!timeAtual) {
            return res.status(404).json({ error: "Time não encontrado." });
        }

        const nome = req.body.nome !== undefined ? String(req.body.nome).trim() : undefined;
        const brasao = req.body.brasao !== undefined ? (req.body.brasao ? String(req.body.brasao).trim() : null) : undefined;
        const descricao = req.body.descricao !== undefined ? (req.body.descricao ? String(req.body.descricao).trim() : null) : undefined;
        const estado = req.body.estado !== undefined ? (req.body.estado ? String(req.body.estado).trim() : null) : undefined;
        const cidade = req.body.cidade !== undefined ? (req.body.cidade ? String(req.body.cidade).trim() : null) : undefined;
        const modalidade = req.body.modalidade !== undefined ? (req.body.modalidade ? String(req.body.modalidade).trim() : null) : undefined;

        const tipoVinculo = req.body.tipoVinculo !== undefined ? req.body.tipoVinculo : undefined;
        const statusVinculo = req.body.statusVinculo !== undefined ? req.body.statusVinculo : undefined;
        const valorMensalidade = req.body.valorMensalidade !== undefined ? toOptionalNumber(req.body.valorMensalidade) : undefined;
        const diaVencimento = req.body.diaVencimento !== undefined ? toOptionalNumber(req.body.diaVencimento) : undefined;
        const observacaoVinculo = req.body.observacaoVinculo !== undefined
            ? (req.body.observacaoVinculo ? String(req.body.observacaoVinculo).trim() : null)
            : undefined;

        if (nome !== undefined && !nome) {
            return res.status(400).json({ error: "Nome inválido." });
        }

        if (nome && nome !== timeAtual.nome) {
            const existe = await prisma.time.findFirst({
                where: {
                    societyId: timeAtual.societyId,
                    nome,
                    NOT: { id: timeId }
                }
            });

            if (existe) {
                return res.status(400).json({ error: "Já existe um time com esse nome nesse society." });
            }
        }

        const atualizado = await prisma.time.update({
            where: { id: timeId },
            data: {
                nome,
                brasao,
                descricao,
                estado,
                cidade,
                modalidade,
                tipoVinculo,
                statusVinculo,
                valorMensalidade,
                diaVencimento,
                observacaoVinculo,
                aprovadoEm: statusVinculo === "APROVADO"
                    ? (timeAtual.statusVinculo === "APROVADO" ? timeAtual.aprovadoEm : new Date())
                    : statusVinculo === "RECUSADO" || statusVinculo === "INATIVO"
                        ? null
                        : undefined
            },
            include: {
                dono: { select: { id: true, nome: true } },
                society: { select: { id: true, nome: true, pixChave: true, pixTitular: true } },
                jogadores: { select: { id: true, nome: true } }
            }
        });

        return res.status(200).json(atualizado);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao atualizar time." });
    }
};

/* =========================
   REMOVER TIME
========================= */
const remove = async (req, res) => {
    try {
        const timeId = toId(req.params.timeId);

        if (!timeId) {
            return res.status(400).json({ error: "timeId inválido." });
        }

        const time = await prisma.time.findUnique({
            where: { id: timeId },
            include: { jogadores: true }
        });

        if (!time) {
            return res.status(404).json({ error: "Time não encontrado." });
        }

        if (time.jogadores.length > 0) {
            await prisma.usuario.updateMany({
                where: { timeRelacionadoId: timeId },
                data: { timeRelacionadoId: null }
            });
        }

        await prisma.time.delete({
            where: { id: timeId }
        });

        return res.status(200).json({ message: "Time removido com sucesso." });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao remover time." });
    }
};

/* =========================
   SOLICITAÇÃO DE ENTRADA NO TIME
========================= */
async function syncPlayerToRoutine(tx, timeId, usuarioId) {
    const group = await tx.grupoHorario.findUnique({ where: { timeId } });
    if (!group || !group.ativo) return;

    await tx.grupoHorarioMembro.upsert({
        where: { grupoId_usuarioId: { grupoId: group.id, usuarioId } },
        create: { grupoId: group.id, usuarioId, ativo: true },
        update: { ativo: true }
    });

    const future = await tx.agendamento.findMany({
        where: { grupoHorarioId: group.id, data: { gte: new Date() }, status: { not: "CANCELADO" } },
        select: { id: true }
    });

    for (const ag of future) {
        await tx.presencaHorario.upsert({
            where: { agendamentoId_usuarioId: { agendamentoId: ag.id, usuarioId } },
            create: { agendamentoId: ag.id, usuarioId },
            update: {}
        });
    }
}

async function unlinkPlayerFromRoutine(tx, timeId, usuarioId) {
    const group = await tx.grupoHorario.findUnique({ where: { timeId } });
    if (!group) return;

    await tx.grupoHorarioMembro.updateMany({
        where: { grupoId: group.id, usuarioId },
        data: { ativo: false }
    });

    const future = await tx.agendamento.findMany({
        where: { grupoHorarioId: group.id, data: { gte: new Date() } },
        select: { id: true }
    });
    if (future.length) {
        await tx.presencaHorario.deleteMany({
            where: { usuarioId, agendamentoId: { in: future.map(x => x.id) } }
        });
    }
}

const solicitarEntrada = async (req, res) => {
    try {
        if (req.actor?.kind !== "USER" || req.actor.tipo !== "PLAYER") {
            return res.status(403).json({ error: "Apenas jogadores podem solicitar entrada em um time." });
        }

        const timeId = toId(req.params.timeId || req.body.timeId);
        if (!timeId) return res.status(400).json({ error: "Time inválido." });

        const usuario = await prisma.usuario.findUnique({ where: { id: req.actor.id } });
        if (!usuario) return res.status(404).json({ error: "Jogador não encontrado." });
        if (usuario.timeRelacionadoId) {
            if (Number(usuario.timeRelacionadoId) === Number(timeId)) {
                return res.status(400).json({ error: "Você já faz parte deste time." });
            }
            return res.status(400).json({ error: "Você já faz parte de outro time. Saia dele antes de solicitar entrada em outro." });
        }

        const time = await prisma.time.findUnique({
            where: { id: timeId },
            include: { dono: { select: { id: true, nome: true } }, society: { select: { id: true, nome: true } } }
        });
        if (!time) return res.status(404).json({ error: "Time não encontrado." });
        if (time.statusVinculo !== "APROVADO") {
            return res.status(400).json({ error: "Este time ainda não está disponível para novos jogadores." });
        }

        const solicitacao = await prisma.solicitacaoEntradaTime.upsert({
            where: { timeId_usuarioId: { timeId, usuarioId: req.actor.id } },
            create: { timeId, usuarioId: req.actor.id, status: "PENDENTE" },
            update: { status: "PENDENTE", solicitadoEm: new Date(), respondidoEm: null }
        });

        await notifyUsuario(
            prisma,
            time.donoId,
            `Solicitação para entrar no ${time.nome}`,
            `${req.actor.nome} quer entrar no seu time. Aprove ou recuse pelo GoPlay.`,
            `time-detalhe.html?timeId=${time.id}`
        );

        return res.status(201).json({ message: "Solicitação enviada ao dono do time.", solicitacao });
    } catch (error) {
        console.error("Erro ao solicitar entrada no time:", error);
        return res.status(500).json({ error: "Erro ao solicitar entrada no time." });
    }
};

const minhasSolicitacoes = async (req, res) => {
    try {
        if (req.actor?.kind !== "USER") return res.json([]);
        const rows = await prisma.solicitacaoEntradaTime.findMany({
            where: { usuarioId: req.actor.id },
            include: {
                time: {
                    include: {
                        society: { select: { id: true, nome: true } },
                        dono: { select: { id: true, nome: true } }
                    }
                }
            },
            orderBy: { updatedAt: "desc" }
        });
        return res.json(rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao carregar solicitações." });
    }
};

const solicitacoesDoTime = async (req, res) => {
    try {
        if (req.actor?.kind !== "USER") return res.status(403).json({ error: "Sem permissão." });
        const timeId = toId(req.params.timeId);
        const time = await prisma.time.findUnique({ where: { id: timeId }, select: { id: true, donoId: true } });
        if (!time) return res.status(404).json({ error: "Time não encontrado." });
        if (Number(time.donoId) !== Number(req.actor.id)) return res.status(403).json({ error: "Apenas o dono do time pode gerenciar solicitações." });

        const rows = await prisma.solicitacaoEntradaTime.findMany({
            where: { timeId, status: "PENDENTE" },
            include: { usuario: { select: { id: true, nome: true, email: true, fotoUrl: true, posicaoCampo: true } } },
            orderBy: { solicitadoEm: "asc" }
        });
        return res.json(rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao carregar solicitações do time." });
    }
};

const responderSolicitacao = async (req, res) => {
    try {
        if (req.actor?.kind !== "USER") return res.status(403).json({ error: "Sem permissão." });
        const solicitacaoId = toId(req.params.id);
        const status = String(req.body.status || "").toUpperCase();
        if (!["APROVADA", "RECUSADA"].includes(status)) return res.status(400).json({ error: "Resposta inválida." });

        const solicitacao = await prisma.solicitacaoEntradaTime.findUnique({
            where: { id: solicitacaoId },
            include: { time: true, usuario: true }
        });
        if (!solicitacao) return res.status(404).json({ error: "Solicitação não encontrada." });
        if (Number(solicitacao.time.donoId) !== Number(req.actor.id)) return res.status(403).json({ error: "Apenas o dono do time pode responder." });
        if (solicitacao.status !== "PENDENTE") return res.status(400).json({ error: "Esta solicitação já foi respondida." });

        if (status === "APROVADA") {
            const usuarioAtual = await prisma.usuario.findUnique({ where: { id: solicitacao.usuarioId }, select: { timeRelacionadoId: true } });
            if (usuarioAtual?.timeRelacionadoId && Number(usuarioAtual.timeRelacionadoId) !== Number(solicitacao.timeId)) {
                return res.status(409).json({ error: "O jogador já entrou em outro time." });
            }

            await prisma.$transaction(async tx => {
                await tx.usuario.update({ where: { id: solicitacao.usuarioId }, data: { timeRelacionadoId: solicitacao.timeId } });
                await tx.solicitacaoEntradaTime.update({ where: { id: solicitacao.id }, data: { status: "APROVADA", respondidoEm: new Date() } });
                await tx.solicitacaoEntradaTime.updateMany({
                    where: { usuarioId: solicitacao.usuarioId, id: { not: solicitacao.id }, status: "PENDENTE" },
                    data: { status: "CANCELADA", respondidoEm: new Date() }
                });
                await syncPlayerToRoutine(tx, solicitacao.timeId, solicitacao.usuarioId);
            });

            await notifyUsuario(prisma, solicitacao.usuarioId, "Entrada no time aprovada", `Sua solicitação para entrar no ${solicitacao.time.nome} foi aprovada.`, `meu-time.html`);
            return res.json({ ok: true, status: "APROVADA" });
        }

        await prisma.solicitacaoEntradaTime.update({ where: { id: solicitacao.id }, data: { status: "RECUSADA", respondidoEm: new Date() } });
        await notifyUsuario(prisma, solicitacao.usuarioId, "Solicitação de time respondida", `Sua solicitação para entrar no ${solicitacao.time.nome} não foi aprovada desta vez.`, `times.html?societyId=${solicitacao.time.societyId}`);
        return res.json({ ok: true, status: "RECUSADA" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao responder solicitação." });
    }
};

const cancelarSolicitacao = async (req, res) => {
    try {
        if (req.actor?.kind !== "USER") return res.status(403).json({ error: "Sem permissão." });
        const solicitacaoId = toId(req.params.id);
        const solicitacao = await prisma.solicitacaoEntradaTime.findUnique({ where: { id: solicitacaoId } });
        if (!solicitacao || Number(solicitacao.usuarioId) !== Number(req.actor.id)) return res.status(404).json({ error: "Solicitação não encontrada." });
        if (solicitacao.status !== "PENDENTE") return res.status(400).json({ error: "Esta solicitação já foi respondida." });
        const row = await prisma.solicitacaoEntradaTime.update({ where: { id: solicitacaoId }, data: { status: "CANCELADA", respondidoEm: new Date() } });
        return res.json(row);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao cancelar solicitação." });
    }
};

/* Compatibilidade: a rota antiga agora apenas solicita entrada; não adiciona mais diretamente. */
const join = solicitarEntrada;

/* =========================
   SAIR DO TIME
========================= */
const leave = async (req, res) => {
    try {
        if (req.actor?.kind !== "USER") return res.status(403).json({ error: "Sem permissão." });
        const usuarioId = Number(req.actor.id);
        const user = await prisma.usuario.findUnique({ where: { id: usuarioId } });
        if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
        if (!user.timeRelacionadoId) return res.status(400).json({ error: "Você não faz parte de nenhum time." });
        const oldTimeId = Number(user.timeRelacionadoId);

        await prisma.$transaction(async tx => {
            await tx.usuario.update({ where: { id: usuarioId }, data: { timeRelacionadoId: null } });
            await unlinkPlayerFromRoutine(tx, oldTimeId, usuarioId);
        });

        return res.status(200).json({ message: "Você saiu do time." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao sair do time." });
    }
};

const removerJogador = async (req, res) => {
    try {
        if (req.actor?.kind !== "USER") return res.status(403).json({ error: "Sem permissão." });
        const timeId = toId(req.params.timeId);
        const usuarioId = toId(req.params.usuarioId);
        const time = await prisma.time.findUnique({ where: { id: timeId }, select: { id: true, nome: true, donoId: true } });
        if (!time) return res.status(404).json({ error: "Time não encontrado." });
        if (Number(time.donoId) !== Number(req.actor.id)) return res.status(403).json({ error: "Apenas o dono do time pode remover jogadores." });
        const jogador = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { id: true, nome: true, timeRelacionadoId: true } });
        if (!jogador || Number(jogador.timeRelacionadoId) !== Number(timeId)) return res.status(404).json({ error: "Jogador não pertence a este time." });

        await prisma.$transaction(async tx => {
            await tx.usuario.update({ where: { id: usuarioId }, data: { timeRelacionadoId: null } });
            await unlinkPlayerFromRoutine(tx, timeId, usuarioId);
        });
        await notifyUsuario(prisma, usuarioId, "Vínculo com time encerrado", `Você foi removido do ${time.nome}.`, `times.html`);
        return res.json({ ok: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao remover jogador." });
    }
};

/* =========================
   BUSCAR TIME DO JOGADOR
========================= */
const getTimeByPlayer = async (req, res) => {
    try {
        const usuarioId = toId(req.params.usuarioId);

        if (!usuarioId) {
            return res.status(400).json({ error: "usuarioId inválido." });
        }

        const jogador = await prisma.usuario.findUnique({
            where: { id: usuarioId },
            include: { timeRelacionado: true }
        });

        if (!jogador || !jogador.timeRelacionadoId) {
            return res.json({ time: null });
        }

        const time = await prisma.time.findUnique({
            where: { id: jogador.timeRelacionadoId },
            include: {
                society: { select: { id: true, nome: true, pixChave: true, pixTitular: true } },
                jogadores: {
                    select: {
                        id: true,
                        nome: true,
                        posicaoCampo: true,
                        goleiro: true,
                        fotoUrl: true
                    }
                },
                rotinaHorario: { select: { id: true, nome: true, ativo: true } }
            }
        });

        return res.json({ time });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao buscar time do jogador." });
    }
};

/* =========================
   ATUALIZAR VÍNCULO DO TIME
========================= */
const updateVinculo = async (req, res) => {
    try {
        const timeId = toId(req.params.timeId);

        if (!timeId) {
            return res.status(400).json({ error: "timeId inválido." });
        }

        const time = await prisma.time.findUnique({
            where: { id: timeId }
        });

        if (!time) {
            return res.status(404).json({ error: "Time não encontrado." });
        }

        const tipoVinculo = req.body.tipoVinculo;
        const statusVinculo = req.body.statusVinculo;
        const valorMensalidade = req.body.valorMensalidade !== undefined
            ? toOptionalNumber(req.body.valorMensalidade)
            : undefined;
        const diaVencimento = req.body.diaVencimento !== undefined
            ? toOptionalNumber(req.body.diaVencimento)
            : undefined;
        const observacaoVinculo = req.body.observacaoVinculo !== undefined
            ? (req.body.observacaoVinculo ? String(req.body.observacaoVinculo).trim() : null)
            : undefined;

        const atualizado = await prisma.time.update({
            where: { id: timeId },
            data: {
                tipoVinculo,
                statusVinculo,
                valorMensalidade,
                diaVencimento,
                observacaoVinculo,
                aprovadoEm: statusVinculo === "APROVADO"
                    ? (time.statusVinculo === "APROVADO" ? time.aprovadoEm : new Date())
                    : statusVinculo === "RECUSADO" || statusVinculo === "INATIVO"
                        ? null
                        : undefined
            }
        });

        return res.status(200).json(atualizado);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao atualizar vínculo do time." });
    }
};

/* =========================
   APROVAR TIME
========================= */
const aprovar = async (req, res) => {
    try {
        const timeId = toId(req.params.timeId);

        if (!timeId) {
            return res.status(400).json({ error: "timeId inválido." });
        }

        const time = await prisma.time.findUnique({
            where: { id: timeId }
        });

        if (!time) {
            return res.status(404).json({ error: "Time não encontrado." });
        }

        const atualizado = await prisma.time.update({
            where: { id: timeId },
            data: {
                statusVinculo: "APROVADO",
                aprovadoEm: new Date()
            }
        });

        return res.status(200).json(atualizado);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao aprovar time." });
    }
};

/* =========================
   RECUSAR TIME
========================= */
const recusar = async (req, res) => {
    try {
        const timeId = toId(req.params.timeId);

        if (!timeId) {
            return res.status(400).json({ error: "timeId inválido." });
        }

        const time = await prisma.time.findUnique({
            where: { id: timeId }
        });

        if (!time) {
            return res.status(404).json({ error: "Time não encontrado." });
        }

        const atualizado = await prisma.time.update({
            where: { id: timeId },
            data: {
                statusVinculo: "RECUSADO",
                aprovadoEm: null
            }
        });

        return res.status(200).json(atualizado);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao recusar time." });
    }
};

/* =========================
   INATIVAR TIME
========================= */
const inativar = async (req, res) => {
    try {
        const timeId = toId(req.params.timeId);

        if (!timeId) {
            return res.status(400).json({ error: "timeId inválido." });
        }

        const time = await prisma.time.findUnique({
            where: { id: timeId }
        });

        if (!time) {
            return res.status(404).json({ error: "Time não encontrado." });
        }

        const atualizado = await prisma.time.update({
            where: { id: timeId },
            data: {
                statusVinculo: "INATIVO",
                aprovadoEm: null
            }
        });

        return res.status(200).json(atualizado);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao inativar time." });
    }
};

module.exports = {
    create,
    list,
    listByOwner,
    listBySociety,
    details,
    update,
    remove,
    join,
    solicitarEntrada,
    minhasSolicitacoes,
    solicitacoesDoTime,
    responderSolicitacao,
    cancelarSolicitacao,
    removerJogador,
    leave,
    getTimeByPlayer,
    updateVinculo,
    aprovar,
    recusar,
    inativar
};