const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ADICIONAR JOGADOR AO SOCIETY
const add = async (req, res) => {
    try {
        const { societyId, usuarioId } = req.body;

        // 1) Verificar se já está no society
        const existe = await prisma.societyPlayer.findFirst({
            where: {
                societyId: Number(societyId),
                usuarioId: Number(usuarioId)
            }
        });

        if (existe) {
            return res.status(400).json({ error: "Este jogador já está neste society." });
        }

        // 2) (opcional) Verificar se o jogador existe
        const usuario = await prisma.usuario.findUnique({
            where: { id: Number(usuarioId) }
        });

        if (!usuario) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        // 3) Adicionar ao society
        const novo = await prisma.societyPlayer.create({
            data: {
                societyId: Number(societyId),
                usuarioId: Number(usuarioId)
            }
        });

        res.status(200).json(novo);

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao adicionar jogador" });
    }
};

module.exports = { add };
