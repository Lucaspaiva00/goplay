const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Criar society
const create = async (req, res) => {
    try {
        const {
            usuarioId,
            nome,
            descricao,
            telefone,
            whatsapp,
            email,
            website,
            instagram,
            facebook,
            youtube,
            pixChave,
            pixTitular,
            cep,
            endereco,
            estado,
            cidade,
            imagem
        } = req.body;

        if (!usuarioId || !nome) {
            return res.status(400).json({ error: "Informe o usuário e o nome." });
        }

        const society = await prisma.society.create({
            data: {
                usuarioId: Number(usuarioId),
                nome: nome.trim(),
                descricao,
                telefone,
                whatsapp,
                email,
                website,
                instagram,
                facebook,
                youtube,
                pixChave: pixChave ? String(pixChave).trim() : null,
                pixTitular: pixTitular ? String(pixTitular).trim() : null,
                cep,
                endereco,
                estado,
                cidade,
                imagem: imagem || null
            }
        });

        return res.status(201).json(society);

    } catch (error) {
        console.log("ERRO AO CADASTRAR SOCIETY:", error);
        return res.status(500).json({ error: "Erro ao cadastrar society." });
    }
};

// Listar societies por dono
const readByOwner = async (req, res) => {
    try {
        const { usuarioId } = req.params;

        const societies = await prisma.society.findMany({
            where: { usuarioId: Number(usuarioId) },
            include: {
                cardapio: true,
                campos: true,
                times: { select: { id: true, nome: true, statusVinculo: true, tipoVinculo: true } },
                societyPlayers: {
                    include: { usuario: true }
                }
            }
        });

        return res.status(200).json(societies);

    } catch (error) {
        console.log("ERRO AO BUSCAR SOCIETIES:", error);
        return res.status(500).json({ error: "Erro ao buscar societies." });
    }
};

// Buscar por ID
const readById = async (req, res) => {
    try {
        const { id } = req.params;

        const society = await prisma.society.findUnique({
            where: { id: Number(id) },
            include: {
                cardapio: true,
                campos: true,
                times: { select: { id: true, nome: true, statusVinculo: true, tipoVinculo: true } },
                societyPlayers: {
                    include: { usuario: true }
                }
            }
        });

        if (!society) {
            return res.status(404).json({ error: "Society não encontrado." });
        }

        return res.status(200).json(society);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao buscar society." });
    }
};

// 🔥 EDITAR SOCIETY
const update = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            nome,
            descricao,
            telefone,
            whatsapp,
            email,
            website,
            instagram,
            facebook,
            youtube,
            pixChave,
            pixTitular,
            cep,
            endereco,
            estado,
            cidade,
            imagem
        } = req.body;

        const societyExistente = await prisma.society.findUnique({
            where: { id: Number(id) }
        });

        if (!societyExistente) {
            return res.status(404).json({ error: "Society não encontrado." });
        }

        if (!nome || !nome.trim()) {
            return res.status(400).json({ error: "Nome é obrigatório." });
        }

        const societyAtualizado = await prisma.society.update({
            where: { id: Number(id) },
            data: {
                nome: nome.trim(),
                descricao: descricao || null,
                telefone: telefone || null,
                whatsapp: whatsapp || null,
                email: email || null,
                website: website || null,
                instagram: instagram || null,
                facebook: facebook || null,
                youtube: youtube || null,
                pixChave: pixChave !== undefined ? (String(pixChave || "").trim() || null) : undefined,
                pixTitular: pixTitular !== undefined ? (String(pixTitular || "").trim() || null) : undefined,
                cep: cep || null,
                endereco: endereco || null,
                estado: estado || null,
                cidade: cidade || null,
                imagem: imagem !== undefined ? (imagem || null) : undefined
            }
        });

        return res.status(200).json(societyAtualizado);

    } catch (error) {
        console.log("ERRO AO ATUALIZAR SOCIETY:", error);
        return res.status(500).json({ error: "Erro ao atualizar society." });
    }
};

// Listar todas
const listAll = async (req, res) => {
    try {
        const societies = await prisma.society.findMany({
            select: {
                id: true,
                nome: true,
                cidade: true,
                estado: true,
                imagem: true,
            },
            orderBy: { id: "desc" },
        });

        return res.status(200).json(societies);

    } catch (error) {
        console.log("ERRO AO LISTAR SOCIETIES:", error);
        return res.status(500).json({ error: "Erro ao listar societies." });
    }
};

module.exports = {
    create,
    readByOwner,
    readById,
    update, // 👈 NOVO
    listAll
};