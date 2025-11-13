const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");

// Criar usuário
const create = async (req, res) => {
    try {
        const { nome, email, senha, telefone, tipo } = req.body;

        if (!nome || !email || !senha) {
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

// LOGIN
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

        // 🔥 IMPORTANTE → Retornar apenas dados que vão para localStorage
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

module.exports = { create, login };
