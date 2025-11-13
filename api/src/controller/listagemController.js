const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const geral = async (req, res) => {
    try {
        const usuarios = await prisma.usuario.findMany();
        const times = await prisma.time.findMany();
        const societies = await prisma.society.findMany();

        res.status(200).json({ usuarios, times, societies });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao buscar listagem geral." });
    }
};

module.exports = { geral };
