const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Criar item do cardápio
const create = async (req, res) => {
    try {
        const { societyId, nome, preco } = req.body;

        if (!societyId || !nome || !preco) {
            return res.status(400).json({ error: "Campos obrigatórios faltando." });
        }

        const item = await prisma.cardapio.create({
            data: { societyId: Number(societyId), nome, preco }
        });

        res.status(200).json(item);

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao criar item de cardápio." });
    }
};

// Listar cardápio do society
const list = async (req, res) => {
    try {
        const { societyId } = req.params;

        const cardapio = await prisma.cardapio.findMany({
            where: { societyId: Number(societyId) }
        });

        res.status(200).json(cardapio);

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao carregar cardápio." });
    }
};

module.exports = { create, list };
