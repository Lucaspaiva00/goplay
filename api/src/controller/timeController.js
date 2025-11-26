const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const create = async (req, res) => {
    try {
        const { donoId, nome, brasao, descricao, estado, cidade, modalidade } = req.body;

        if (!donoId || !nome) {
            return res.status(400).json({ error: "donoId e nome são obrigatórios." });
        }

        const dono = await prisma.usuario.findUnique({
            where: { id: Number(donoId) }
        });

        if (!dono) return res.status(404).json({ error: "Dono não encontrado." });

        const time = await prisma.time.create({
            data: {
                nome,
                brasao,
                descricao,
                estado,
                cidade,
                modalidade,
                donoId: Number(donoId)
            }
        });

        return res.status(200).json(time);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao cadastrar time." });
    }
};

const list = async (req, res) => {
    try {
        const times = await prisma.time.findMany({
            include: {
                dono: { select: { id: true, nome: true } },
                jogadores: { select: { id: true, nome: true } }
            }
        });

        return res.status(200).json(times);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao listar times." });
    }
};

const listByOwner = async (req, res) => {
    try {
        const { donoId } = req.params;

        const times = await prisma.time.findMany({
            where: { donoId: Number(donoId) },
            include: {
                jogadores: { select: { id: true, nome: true } }
            }
        });

        return res.status(200).json(times);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao listar times do dono." });
    }
};

const details = async (req, res) => {
    try {
        const { timeId } = req.params;

        const time = await prisma.time.findUnique({
            where: { id: Number(timeId) },
            include: {
                dono: { select: { id: true, nome: true } },
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

        if (!time) return res.status(404).json({ error: "Time não encontrado." });

        return res.status(200).json(time);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao carregar detalhes do time." });
    }
};

const join = async (req, res) => {
    try {
        const { usuarioId, timeId } = req.body;

        if (!usuarioId || !timeId) {
            return res.status(400).json({ error: "usuarioId e timeId são obrigatórios." });
        }

        const user = await prisma.usuario.findUnique({
            where: { id: Number(usuarioId) }
        });

        if (!user) return res.status(404).json({ error: "Jogador não encontrado." });

        if (user.timeRelacionadoId) {
            return res.status(400).json({ error: "Jogador já pertence a um time." });
        }

        const updated = await prisma.usuario.update({
            where: { id: Number(usuarioId) },
            data: { timeRelacionadoId: Number(timeId) }
        });

        return res.status(200).json({ message: "Entrou no time!", updated });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao entrar no time." });
    }
};

const leave = async (req, res) => {
    try {
        const { usuarioId } = req.body;

        if (!usuarioId) {
            return res.status(400).json({ error: "usuarioId é obrigatório." });
        }

        const user = await prisma.usuario.findUnique({
            where: { id: Number(usuarioId) }
        });

        if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

        const updated = await prisma.usuario.update({
            where: { id: Number(usuarioId) },
            data: { timeRelacionadoId: null }
        });

        return res.status(200).json({ message: "Saiu do time!", updated });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao sair do time." });
    }
};

module.exports = { create, list, listByOwner, details, join, leave };
