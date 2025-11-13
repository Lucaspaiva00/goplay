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
            cep,
            endereco,
            estado,
            cidade
        } = req.body;

        if (!usuarioId || !nome) {
            return res.status(400).json({ error: "Informe o usuário e o nome." });
        }

        const society = await prisma.society.create({
            data: {
                usuarioId: Number(usuarioId),
                nome,
                descricao,
                telefone,
                whatsapp,
                email,
                website,
                instagram,
                facebook,
                youtube,
                cep,
                endereco,
                estado,
                cidade
            }
        });

        return res.status(201).json(society);

    } catch (error) {
        console.log("ERRO AO CADASTRAR SOCIETY:", error);
        return res.status(500).json({ error: "Erro ao cadastrar society." });
    }
};

// Listar societies por dono (AGORA pode ter vários)
const readByOwner = async (req, res) => {
    try {
        const { usuarioId } = req.params;

        const societies = await prisma.society.findMany({
            where: { usuarioId: Number(usuarioId) },
            include: {
                cardapio: true,
                campos: true,
                societyPlayers: {
                    include: { usuario: true }
                }
            }
        });

        // sempre devolve array (vazio ou com itens)
        return res.status(200).json(societies);

    } catch (error) {
        console.log("ERRO AO BUSCAR SOCIETIES:", error);
        return res.status(500).json({ error: "Erro ao buscar societies." });
    }
};

const readById = async (req, res) => {
    try {
        const { id } = req.params;

        const society = await prisma.society.findUnique({
            where: { id: Number(id) },
            include: {
                cardapio: true,
                campos: true,
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

module.exports = { create, readByOwner, readById };

