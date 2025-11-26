const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");

/* ============================================
   CRIAR USUÁRIO
============================================ */
const create = async (req, res) => {
    try {
        const { nome, email, senha, telefone, tipo } = req.body;

        if (!nome || !email || !senha || !tipo) {
            return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
        }

        const existe = await prisma.usuario.findUnique({ where: { email } });
        if (existe) {
            return res.status(400).json({ error: "E-mail já cadastrado." });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const usuario = await prisma.usuario.create({
            data: { nome, email, senha: senhaHash, telefone, tipo }
        });

        res.status(200).json(usuario);

    } catch (error) {
        console.log("ERRO AO CRIAR USUÁRIO:", error);
        res.status(500).json({ error: "Erro ao criar usuário." });
    }
};

/* ============================================
   LOGIN
============================================ */
const login = async (req, res) => {
    try {
        const { email, senha } = req.body;

        const usuario = await prisma.usuario.findUnique({ where: { email } });

        if (!usuario) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(400).json({ error: "Senha incorreta." });
        }

        // 🔥 Retornar apenas dados necessários
        res.status(200).json({
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            tipo: usuario.tipo
        });

    } catch (err) {
        console.log("ERRO NO LOGIN:", err);
        res.status(500).json({ error: "Erro ao fazer login." });
    }
};

/* ============================================
   BUSCAR 1 USUÁRIO (para preencher perfil)
============================================ */
const readOne = async (req, res) => {
    try {
        const id = Number(req.params.id);

        const usuario = await prisma.usuario.findUnique({
            where: { id }
        });

        if (!usuario) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        res.status(200).json(usuario);

    } catch (error) {
        console.log("ERRO AO BUSCAR USUÁRIO:", error);
        res.status(500).json({ error: "Erro ao buscar usuário." });
    }
};

/* ============================================
   ATUALIZAR USUÁRIO (perfil)
============================================ */
const update = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const data = req.body;

        // Não permitir alterar e-mail para um email que já existe
        if (data.email) {
            const existe = await prisma.usuario.findFirst({
                where: {
                    email: data.email,
                    NOT: { id }
                }
            });

            if (existe) {
                return res.status(400).json({ error: "Este e-mail já está sendo usado." });
            }
        }

        const usuarioAtualizado = await prisma.usuario.update({
            where: { id },
            data
        });

        res.status(200).json(usuarioAtualizado);

    } catch (error) {
        console.log("ERRO AO ATUALIZAR USUÁRIO:", error);
        res.status(500).json({ error: "Erro ao atualizar usuário." });
    }
};

module.exports = {
    create,
    login,
    readOne,
    update
};
