const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Adicionar jogador ao society
const add = async (req, res) => {
    try {
        const { societyId, usuarioId } = req.body;

        if (!societyId || !usuarioId) {
            return res.status(400).json({ error: "Informe societyId e usuarioId." });
        }

        const addPlayer = await prisma.societyPlayer.create({
            data: {
                societyId: Number(societyId),
                usuarioId: Number(usuarioId)
            }
        });

        res.status(200).json(addPlayer);

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao adicionar jogador ao society." });
    }
};

module.exports = { add };
