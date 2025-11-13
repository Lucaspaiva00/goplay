const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Criar time
const create = async (req, res) => {
    try {
        const data = req.body;

        if (!data.nome || !data.donoId) {
            return res.status(400).json({ error: "Informe nome e donoId." });
        }

        const time = await prisma.time.create({ data });

        res.status(200).json(time);

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao cadastrar time." });
    }
};

// Listar jogadores do time
const getTime = async (req, res) => {
    try {
        const { id } = req.params;

        const time = await prisma.time.findUnique({
            where: { id: Number(id) },
            include: {
                jogadores: true,
                dono: true
            }
        });

        if (!time) return res.status(404).json({ error: "Time não encontrado." });

        res.status(200).json(time);

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao buscar time." });
    }
};

module.exports = { create, getTime };
