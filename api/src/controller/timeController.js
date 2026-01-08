const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ✅ Criar time
const create = async (req, res) => {
    try {
        const { nome, societyId, donoId } = req.body;

        if (!nome || !societyId || !donoId) {
            return res.status(400).json({ error: "Informe nome, societyId e donoId." });
        }

        const nomeLimpo = nome.trim();
        if (!nomeLimpo) {
            return res.status(400).json({ error: "Nome inválido." });
        }

        // ✅ evita duplicar nome do time no mesmo society
        const existe = await prisma.time.findFirst({
            where: {
                societyId: Number(societyId),
                nome: nomeLimpo
            }
        });

        if (existe) {
            return res.status(400).json({ error: "Já existe um time com esse nome nesse society." });
        }

        const novo = await prisma.time.create({
            data: {
                nome: nomeLimpo,
                societyId: Number(societyId),
                donoId: Number(donoId)
            }
        });

        return res.json(novo);
    } catch (err) {
        console.error("Erro ao criar time:", err);
        return res.status(500).json({ error: "Erro ao criar time." });
    }
};

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

const listByOwner = async (req, res) => {
    try {
        const { donoId } = req.params;

        const times = await prisma.time.findMany({
            where: { donoId: Number(donoId) },
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

const listBySociety = async (req, res) => {
    try {
        const { societyId } = req.params;

        const times = await prisma.time.findMany({
            where: { societyId: Number(societyId) },
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

const details = async (req, res) => {
    try {
        const { timeId } = req.params;

        const time = await prisma.time.findUnique({
            where: { id: Number(timeId) },
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

const getTimeByPlayer = async (req, res) => {
    try {
        const usuarioId = Number(req.params.usuarioId);

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
    join,
    leave,
    getTimeByPlayer
};
