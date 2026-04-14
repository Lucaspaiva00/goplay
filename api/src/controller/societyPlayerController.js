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
   ADICIONAR JOGADOR AO SOCIETY
========================= */
const add = async (req, res) => {
    try {
        const societyId = toId(req.body.societyId);
        const usuarioId = toId(req.body.usuarioId);

        if (!societyId || !usuarioId) {
            return res.status(400).json({
                error: "societyId e usuarioId são obrigatórios."
            });
        }

        const society = await prisma.society.findUnique({
            where: { id: societyId }
        });

        if (!society) {
            return res.status(404).json({ error: "Society não encontrado." });
        }

        const usuario = await prisma.usuario.findUnique({
            where: { id: usuarioId }
        });

        if (!usuario) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        const existe = await prisma.societyPlayer.findFirst({
            where: {
                societyId,
                usuarioId
            }
        });

        if (existe) {
            return res.status(400).json({
                error: "Este jogador já está neste society."
            });
        }

        const novo = await prisma.societyPlayer.create({
            data: {
                societyId,
                usuarioId
            },
            include: {
                usuario: {
                    select: {
                        id: true,
                        nome: true,
                        email: true,
                        telefone: true,
                        tipo: true,
                        timeRelacionadoId: true
                    }
                },
                society: {
                    select: {
                        id: true,
                        nome: true
                    }
                }
            }
        });

        return res.status(201).json(novo);

    } catch (error) {
        console.log("ERRO AO ADICIONAR JOGADOR AO SOCIETY:", error);
        return res.status(500).json({
            error: "Erro ao adicionar jogador ao society."
        });
    }
};

/* =========================
   LISTAR JOGADORES DO SOCIETY
========================= */
const listBySociety = async (req, res) => {
    try {
        const societyId = toId(req.params.societyId);

        if (!societyId) {
            return res.status(400).json({ error: "societyId inválido." });
        }

        const society = await prisma.society.findUnique({
            where: { id: societyId }
        });

        if (!society) {
            return res.status(404).json({ error: "Society não encontrado." });
        }

        const jogadores = await prisma.societyPlayer.findMany({
            where: { societyId },
            include: {
                usuario: {
                    select: {
                        id: true,
                        nome: true,
                        email: true,
                        telefone: true,
                        tipo: true,
                        timeRelacionadoId: true,
                        posicaoCampo: true,
                        goleiro: true
                    }
                }
            },
            orderBy: { id: "desc" }
        });

        return res.status(200).json(jogadores);

    } catch (error) {
        console.log("ERRO AO LISTAR JOGADORES DO SOCIETY:", error);
        return res.status(500).json({
            error: "Erro ao listar jogadores do society."
        });
    }
};

/* =========================
   BUSCAR UM VÍNCULO ESPECÍFICO
   GET /society/:societyId/player/:usuarioId
========================= */
const readOne = async (req, res) => {
    try {
        const societyId = toId(req.params.societyId);
        const usuarioId = toId(req.params.usuarioId);

        if (!societyId || !usuarioId) {
            return res.status(400).json({
                error: "societyId e usuarioId são obrigatórios."
            });
        }

        const vinculo = await prisma.societyPlayer.findFirst({
            where: {
                societyId,
                usuarioId
            },
            include: {
                usuario: {
                    select: {
                        id: true,
                        nome: true,
                        email: true,
                        telefone: true,
                        tipo: true,
                        timeRelacionadoId: true,
                        posicaoCampo: true,
                        goleiro: true
                    }
                },
                society: {
                    select: {
                        id: true,
                        nome: true
                    }
                }
            }
        });

        if (!vinculo) {
            return res.status(404).json({
                error: "Vínculo entre jogador e society não encontrado."
            });
        }

        return res.status(200).json(vinculo);

    } catch (error) {
        console.log("ERRO AO BUSCAR VÍNCULO DO SOCIETY PLAYER:", error);
        return res.status(500).json({
            error: "Erro ao buscar vínculo do jogador com o society."
        });
    }
};

/* =========================
   REMOVER JOGADOR DO SOCIETY
========================= */
const remove = async (req, res) => {
    try {
        const societyId = toId(req.params.societyId);
        const usuarioId = toId(req.params.usuarioId);

        if (!societyId || !usuarioId) {
            return res.status(400).json({
                error: "societyId e usuarioId são obrigatórios."
            });
        }

        const vinculo = await prisma.societyPlayer.findFirst({
            where: {
                societyId,
                usuarioId
            }
        });

        if (!vinculo) {
            return res.status(404).json({
                error: "Vínculo entre jogador e society não encontrado."
            });
        }

        await prisma.societyPlayer.delete({
            where: { id: vinculo.id }
        });

        return res.status(200).json({
            message: "Jogador removido do society com sucesso."
        });

    } catch (error) {
        console.log("ERRO AO REMOVER JOGADOR DO SOCIETY:", error);
        return res.status(500).json({
            error: "Erro ao remover jogador do society."
        });
    }
};

module.exports = {
    add,
    listBySociety,
    readOne,
    remove
};