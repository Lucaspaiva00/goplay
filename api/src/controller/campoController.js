const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function parseOptionalMoney(value, fieldName) {
    if (value === undefined || value === null || value === "") return null;

    if (typeof value === "number") {
        if (!Number.isFinite(value) || value < 0) {
            throw new Error(`${fieldName} inválido.`);
        }
        return value;
    }

    let raw = String(value).trim();
    if (!raw) return null;

    raw = raw.replace(/\s/g, "").replace(/R\$/gi, "");
    const lastComma = raw.lastIndexOf(",");
    const lastDot = raw.lastIndexOf(".");

    if (lastComma > -1 && lastDot > -1) {
        if (lastComma > lastDot) {
            raw = raw.replace(/\./g, "").replace(",", ".");
        } else {
            raw = raw.replace(/,/g, "");
        }
    } else if (lastComma > -1) {
        raw = raw.replace(/\./g, "").replace(",", ".");
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`${fieldName} inválido.`);
    }

    return parsed;
}


const create = async (req, res) => {
    try {
        const { societyId, nome, valorAvulso, valorMensal, dimensoes, gramado, fotoUrl } = req.body;

        if (!societyId || !nome) {
            return res.status(400).json({ error: "societyId e nome são obrigatórios." });
        }

        const valorAvulsoNormalizado = parseOptionalMoney(valorAvulso, "Valor avulso");
        const valorMensalNormalizado = parseOptionalMoney(valorMensal, "Valor mensal");

        const campo = await prisma.campo.create({
            data: {
                societyId: Number(societyId),
                nome: nome.trim(),
                valorAvulso: valorAvulsoNormalizado,
                valorMensal: valorMensalNormalizado,
                dimensoes: dimensoes || null,
                gramado: gramado || null,
                fotoUrl: fotoUrl || null,
            },
        });

        return res.json(campo);
    } catch (e) {
        console.error(e);

        if (e.message === "Valor avulso inválido." || e.message === "Valor mensal inválido.") {
            return res.status(400).json({ error: e.message });
        }

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

        const valorAvulsoNormalizado = parseOptionalMoney(valorAvulso, "Valor avulso");
        const valorMensalNormalizado = parseOptionalMoney(valorMensal, "Valor mensal");

        const campoAtualizado = await prisma.campo.update({
            where: { id },
            data: {
                nome: nome.trim(),
                valorAvulso: valorAvulsoNormalizado,
                valorMensal: valorMensalNormalizado,
                dimensoes: dimensoes || null,
                gramado: gramado || null,
                fotoUrl: fotoUrl || null,
            },
        });

        return res.json(campoAtualizado);
    } catch (e) {
        console.error(e);

        if (e.message === "Valor avulso inválido." || e.message === "Valor mensal inválido.") {
            return res.status(400).json({ error: e.message });
        }

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