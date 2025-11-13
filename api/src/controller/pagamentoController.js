const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Criar pagamento
const create = async (req, res) => {
    try {
        const data = req.body;

        if (!data.usuarioId || !data.societyId || !data.tipo || !data.valor) {
            return res.status(400).json({ error: "Campos obrigatórios faltando." });
        }

        const pagamento = await prisma.pagamento.create({ data });

        res.status(200).json(pagamento);

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao registrar pagamento." });
    }
};

// Listar pagamentos por society
const listBySociety = async (req, res) => {
    try {
        const { societyId } = req.params;

        const pagamentos = await prisma.pagamento.findMany({
            where: { societyId: Number(societyId) },
            include: { usuario: true }
        });

        res.status(200).json(pagamentos);

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao buscar pagamentos." });
    }
};

module.exports = { create, listBySociety };
