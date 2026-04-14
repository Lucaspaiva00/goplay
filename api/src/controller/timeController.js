const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/* =========================
   HELPERS
========================= */
const toId = (value) => {
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
                donoId
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
                jogadores: { select: { id: true, nome: true } },
                society: { select: { id: true, nome: true } }
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
                jogadores: { select: { id: true, nome: true } },
                society: { select: { id: true, nome: true } }
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
                jogadores: { select: { id: true, nome: true } },
                dono: { select: { id: true, nome: true } }
            },
            orderBy: { nome: "asc" }
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
                dono: { select: { id: true, nome: true } },
                society: { select: { id: true, nome: true } },
                jogadores: {
                    select: {
                        id: true,
                        nome: true,
                        posicaoCampo: true,
                        goleiro: true
                    }
                }
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
   EDITAR TIME
========================= */
const update = async (req, res) => {
    try {
        const timeId = toId(req.params.timeId);
        const nome = String(req.body.nome || "").trim();

        if (!timeId) {
            return res.status(400).json({ error: "timeId inválido." });
        }

        if (!nome) {
            return res.status(400).json({ error: "Nome do time é obrigatório." });
        }

        const timeExistente = await prisma.time.findUnique({
            where: { id: timeId }
        });

        if (!timeExistente) {
            return res.status(404).json({ error: "Time não encontrado." });
        }

        const duplicado = await prisma.time.findFirst({
            where: {
                societyId: timeExistente.societyId,
                nome,
                NOT: { id: timeId }
            }
        });

        if (duplicado) {
            return res.status(400).json({ error: "Já existe um time com esse nome nesse society." });
        }

        const atualizado = await prisma.time.update({
            where: { id: timeId },
            data: { nome }
        });

        return res.status(200).json(atualizado);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao atualizar time." });
    }
};

/* =========================
   EXCLUIR TIME
========================= */
const remove = async (req, res) => {
    try {
        const timeId = toId(req.params.timeId);

        if (!timeId) {
            return res.status(400).json({ error: "timeId inválido." });
        }

        const timeExistente = await prisma.time.findUnique({
            where: { id: timeId }
        });

        if (!timeExistente) {
            return res.status(404).json({ error: "Time não encontrado." });
        }

        const jogadoresNoTime = await prisma.usuario.findMany({
            where: { timeRelacionadoId: timeId },
            select: { id: true }
        });

        if (jogadoresNoTime.length > 0) {
            return res.status(400).json({
                error: "Não é possível excluir o time porque há jogadores vinculados a ele."
            });
        }

        await prisma.time.delete({
            where: { id: timeId }
        });

        return res.status(200).json({ message: "Time excluído com sucesso." });
    } catch (error) {
        console.log(error);

        if (error.code === "P2003") {
            return res.status(400).json({
                error: "Não é possível excluir este time porque ele possui registros vinculados."
            });
        }

        return res.status(500).json({ error: "Erro ao excluir time." });
    }
};

/* =========================
   ENTRAR NO TIME
========================= */
const join = async (req, res) => {
    try {
        const usuarioId = toId(req.body.usuarioId);
        const timeId = toId(req.body.timeId);

        if (!usuarioId || !timeId) {
            return res.status(400).json({ error: "usuarioId e timeId são obrigatórios." });
        }

        const user = await prisma.usuario.findUnique({
            where: { id: usuarioId }
        });

        if (!user) {
            return res.status(404).json({ error: "Jogador não encontrado." });
        }

        const time = await prisma.time.findUnique({
            where: { id: timeId }
        });

        if (!time) {
            return res.status(404).json({ error: "Time não encontrado." });
        }

        if (user.timeRelacionadoId) {
            return res.status(400).json({ error: "Jogador já pertence a um time." });
        }

        const updated = await prisma.usuario.update({
            where: { id: usuarioId },
            data: { timeRelacionadoId: timeId }
        });

        return res.status(200).json({
            message: "Entrou no time!",
            usuario: {
                id: updated.id,
                nome: updated.nome,
                timeRelacionadoId: updated.timeRelacionadoId
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao entrar no time." });
    }
};

/* =========================
   SAIR DO TIME
========================= */
const leave = async (req, res) => {
    try {
        const usuarioId = toId(req.body.usuarioId);

        if (!usuarioId) {
            return res.status(400).json({ error: "usuarioId é obrigatório." });
        }

        const user = await prisma.usuario.findUnique({
            where: { id: usuarioId }
        });

        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        if (!user.timeRelacionadoId) {
            return res.status(400).json({ error: "Usuário não pertence a nenhum time." });
        }

        const updated = await prisma.usuario.update({
            where: { id: usuarioId },
            data: { timeRelacionadoId: null }
        });

        return res.status(200).json({
            message: "Saiu do time!",
            usuario: {
                id: updated.id,
                nome: updated.nome,
                timeRelacionadoId: updated.timeRelacionadoId
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao sair do time." });
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
                society: { select: { id: true, nome: true } },
                jogadores: {
                    select: {
                        id: true,
                        nome: true,
                        posicaoCampo: true
                    }
                }
            }
        });

        return res.json({ time });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao buscar time do jogador." });
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
    leave,
    getTimeByPlayer
};