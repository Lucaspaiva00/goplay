const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const create = async (req, res) => {
    try {
        const { societyId, nome, valorAvulso, valorMensal, dimensoes, gramado, fotoUrl } = req.body;

        if (!societyId || !nome) {
            return res.status(400).json({ error: "societyId e nome são obrigatórios." });
        }

        const campo = await prisma.campo.create({
            data: {
                societyId: Number(societyId),
                nome: nome.trim(),
                valorAvulso: valorAvulso !== undefined && valorAvulso !== "" ? Number(valorAvulso) : null,
                valorMensal: valorMensal !== undefined && valorMensal !== "" ? Number(valorMensal) : null,
                dimensoes: dimensoes || null,
                gramado: gramado || null,
                fotoUrl: fotoUrl || null,
            },
        });

        return res.json(campo);
    } catch (e) {
        console.error(e);

        // erro de unique (societyId+nome)
        if (e.code === "P2002") {
            return res.status(400).json({ error: "Já existe um campo com esse nome nesse society." });
        }

        return res.status(500).json({ error: "Erro ao criar campo." });
    }
};

const listBySociety = async (req, res) => {
    try {
        const societyId = Number(req.params.societyId);

        const campos = await prisma.campo.findMany({
            where: { societyId },
            orderBy: { id: "desc" },
        });

        return res.json(campos);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Erro ao listar campos." });
    }
};

module.exports = { create, listBySociety };
