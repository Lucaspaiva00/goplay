const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Criar item do cardápio
const create = async (req, res) => {
    try {
        const { societyId, nome, preco } = req.body;

        if (!societyId || !nome || preco === undefined || preco === null || preco === "") {
            return res.status(400).json({ error: "Campos obrigatórios faltando." });
        }

        const item = await prisma.cardapio.create({
            data: {
                societyId: Number(societyId),
                nome: nome.trim(),
                preco: Number(preco)
            }
        });

        return res.status(200).json(item);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao criar item de cardápio." });
    }
};

// Listar cardápio do society
const list = async (req, res) => {
    try {
        const { societyId } = req.params;

        const cardapio = await prisma.cardapio.findMany({
            where: { societyId: Number(societyId) },
            orderBy: { id: "desc" }
        });

        return res.status(200).json(cardapio);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao carregar cardápio." });
    }
};

// Buscar item específico
const readOne = async (req, res) => {
    try {
        const { id } = req.params;

        const item = await prisma.cardapio.findUnique({
            where: { id: Number(id) }
        });

        if (!item) {
            return res.status(404).json({ error: "Item do cardápio não encontrado." });
        }

        return res.status(200).json(item);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao buscar item do cardápio." });
    }
};

// Editar item
const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, preco } = req.body;

        const itemExistente = await prisma.cardapio.findUnique({
            where: { id: Number(id) }
        });

        if (!itemExistente) {
            return res.status(404).json({ error: "Item do cardápio não encontrado." });
        }

        if (!nome || !nome.trim() || preco === undefined || preco === null || preco === "") {
            return res.status(400).json({ error: "Nome e preço são obrigatórios." });
        }

        const itemAtualizado = await prisma.cardapio.update({
            where: { id: Number(id) },
            data: {
                nome: nome.trim(),
                preco: Number(preco)
            }
        });

        return res.status(200).json(itemAtualizado);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao atualizar item do cardápio." });
    }
};

// Excluir item
const remove = async (req, res) => {
    try {
        const { id } = req.params;

        const itemExistente = await prisma.cardapio.findUnique({
            where: { id: Number(id) }
        });

        if (!itemExistente) {
            return res.status(404).json({ error: "Item do cardápio não encontrado." });
        }

        await prisma.cardapio.delete({
            where: { id: Number(id) }
        });

        return res.status(200).json({ message: "Item excluído com sucesso." });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao excluir item do cardápio." });
    }
};

module.exports = {
    create,
    list,
    readOne,
    update,
    remove
};