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

const readOne = async (req, res) => {
    try {
        const id = Number(req.params.id);

        const campo = await prisma.campo.findUnique({
            where: { id },
        });

        if (!campo) {
            return res.status(404).json({ error: "Campo não encontrado." });
        }

        return res.json(campo);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Erro ao buscar campo." });
    }
};

const update = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { nome, valorAvulso, valorMensal, dimensoes, gramado, fotoUrl } = req.body;

        const campoExistente = await prisma.campo.findUnique({
            where: { id },
        });

        if (!campoExistente) {
            return res.status(404).json({ error: "Campo não encontrado." });
        }

        if (!nome || !nome.trim()) {
            return res.status(400).json({ error: "O nome do campo é obrigatório." });
        }

        const campoAtualizado = await prisma.campo.update({
            where: { id },
            data: {
                nome: nome.trim(),
                valorAvulso: valorAvulso !== undefined && valorAvulso !== "" ? Number(valorAvulso) : null,
                valorMensal: valorMensal !== undefined && valorMensal !== "" ? Number(valorMensal) : null,
                dimensoes: dimensoes || null,
                gramado: gramado || null,
                fotoUrl: fotoUrl || null,
            },
        });

        return res.json(campoAtualizado);
    } catch (e) {
        console.error(e);

        if (e.code === "P2002") {
            return res.status(400).json({ error: "Já existe um campo com esse nome nesse society." });
        }

        return res.status(500).json({ error: "Erro ao atualizar campo." });
    }
};

const remove = async (req, res) => {
    try {
        const id = Number(req.params.id);

        const campoExistente = await prisma.campo.findUnique({
            where: { id },
        });

        if (!campoExistente) {
            return res.status(404).json({ error: "Campo não encontrado." });
        }

        await prisma.campo.delete({
            where: { id },
        });

        return res.json({ message: "Campo excluído com sucesso." });
    } catch (e) {
        console.error(e);

        if (e.code === "P2003") {
            return res.status(400).json({
                error: "Não é possível excluir este campo porque ele possui registros vinculados."
            });
        }

        return res.status(500).json({ error: "Erro ao excluir campo." });
    }
};

module.exports = {
    create,
    listBySociety,
    readOne,
    update,
    remove
};