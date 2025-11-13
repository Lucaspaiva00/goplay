const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Enviar convite para um jogador
const convidar = async (req, res) => {
    try {
        const { usuarioId, timeId, mensagem } = req.body;

        if (!usuarioId || !timeId) {
            return res.status(400).json({ error: "Informe usuarioId e timeId." });
        }

        const time = await prisma.time.findUnique({
            where: { id: Number(timeId) }
        });

        if (!time) {
            return res.status(404).json({ error: "Time não encontrado." });
        }

        const texto = mensagem ??
            `Você foi convidado para jogar no time: ${time.nome}.`;

        const notif = await prisma.notificacao.create({
            data: {
                usuarioId: Number(usuarioId),
                titulo: "Convite para time",
                mensagem: texto
            }
        });

        res.status(200).json({ ok: true, convite: notif });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao enviar convite." });
    }
};

module.exports = { convidar };
