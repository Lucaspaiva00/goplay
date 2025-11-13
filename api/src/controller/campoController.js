const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Criar campo
const create = async (req, res) => {
    try {
        const { societyId, nome, valorAvulso, valorMensal, foto, dimensoes, estiloGramado } = req.body;

        if (!societyId || !nome) {
            return res.status(400).json({ error: "SocietyId e nome são obrigatórios." });
        }

        const campo = await prisma.campo.create({
            data: {
                societyId: Number(societyId),
                nome,
                valorAvulso,
                valorMensal,
                foto,
                dimensoes,
                estiloGramado
            }
        });

        res.status(200).json(campo);

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao cadastrar campo." });
    }
};

// Listar campos do society
const list = async (req, res) => {
    try {
        const { societyId } = req.params;

        const campos = await prisma.campo.findMany({
            where: { societyId: Number(societyId) }
        });

        res.status(200).json(campos);

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Erro ao listar campos." });
    }
};

module.exports = { create, list };
