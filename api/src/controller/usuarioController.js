const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

/* ============================================
   HELPERS
============================================ */
const sanitizeUser = (usuario) => {
    if (!usuario) return null;
    const { senha, resetToken, resetTokenExpiresAt, ...usuarioSeguro } = usuario;
    return usuarioSeguro;
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

/* ============================================
   CRIAR USUÁRIO
============================================ */
const create = async (req, res) => {
    try {
        const nome = String(req.body.nome || "").trim();
        const email = normalizeEmail(req.body.email);
        const senha = String(req.body.senha || "").trim();
        const telefone = req.body.telefone ? String(req.body.telefone).trim() : null;
        const tipo = String(req.body.tipo || "").trim();

        if (!nome || !email || !senha || !tipo) {
            return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
        }

        if (senha.length < 6) {
            return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
        }

        const existe = await prisma.usuario.findUnique({ where: { email } });
        if (existe) {
            return res.status(400).json({ error: "E-mail já cadastrado." });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const usuario = await prisma.usuario.create({
            data: {
                nome,
                email,
                senha: senhaHash,
                telefone,
                tipo
            }
        });

        return res.status(201).json({
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            tipo: usuario.tipo
        });

    } catch (error) {
        console.log("ERRO AO CRIAR USUÁRIO:", error);
        return res.status(500).json({ error: "Erro ao criar usuário." });
    }
};

/* ============================================
   LOGIN
============================================ */
const login = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const senha = String(req.body.senha || "");

        if (!email || !senha) {
            return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
        }

        const usuario = await prisma.usuario.findUnique({ where: { email } });

        if (!usuario) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(400).json({ error: "Senha incorreta." });
        }

        return res.status(200).json({
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            tipo: usuario.tipo
        });

    } catch (err) {
        console.log("ERRO NO LOGIN:", err);
        return res.status(500).json({ error: "Erro ao fazer login." });
    }
};

/* ============================================
   BUSCAR 1 USUÁRIO
============================================ */
const readOne = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isFinite(id)) {
            return res.status(400).json({ error: "ID inválido." });
        }

        const usuario = await prisma.usuario.findUnique({
            where: { id }
        });

        if (!usuario) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        return res.status(200).json(sanitizeUser(usuario));

    } catch (error) {
        console.log("ERRO AO BUSCAR USUÁRIO:", error);
        return res.status(500).json({ error: "Erro ao buscar usuário." });
    }
};

/* ============================================
   ATUALIZAR USUÁRIO
============================================ */
const update = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isFinite(id)) {
            return res.status(400).json({ error: "ID inválido." });
        }

        const usuarioExistente = await prisma.usuario.findUnique({
            where: { id }
        });

        if (!usuarioExistente) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        const data = {};

        if (req.body.nome !== undefined) {
            data.nome = String(req.body.nome || "").trim();
            if (!data.nome) {
                return res.status(400).json({ error: "Nome inválido." });
            }
        }

        if (req.body.email !== undefined) {
            data.email = normalizeEmail(req.body.email);
            if (!data.email) {
                return res.status(400).json({ error: "E-mail inválido." });
            }

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

        if (req.body.telefone !== undefined) {
            data.telefone = req.body.telefone ? String(req.body.telefone).trim() : null;
        }

        if (req.body.senha !== undefined) {
            const senha = String(req.body.senha || "").trim();

            if (!senha) {
                return res.status(400).json({ error: "Senha inválida." });
            }

            if (senha.length < 6) {
                return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
            }

            data.senha = await bcrypt.hash(senha, 10);
        }

        const usuarioAtualizado = await prisma.usuario.update({
            where: { id },
            data
        });

        return res.status(200).json(sanitizeUser(usuarioAtualizado));

    } catch (error) {
        console.log("ERRO AO ATUALIZAR USUÁRIO:", error);
        return res.status(500).json({ error: "Erro ao atualizar usuário." });
    }
};

/* ============================================
   SOLICITAR RESET DE SENHA
============================================ */
const forgotPassword = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);

        if (!email) {
            return res.status(400).json({ error: "E-mail é obrigatório." });
        }

        const usuario = await prisma.usuario.findUnique({
            where: { email }
        });

        // não revela se o e-mail existe
        if (!usuario) {
            return res.status(200).json({
                message: "Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha."
            });
        }

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

        await prisma.usuario.update({
            where: { id: usuario.id },
            data: {
                resetToken: token,
                resetTokenExpiresAt: expiresAt
            }
        });

        const resetLink = `${process.env.FRONTEND_URL}/reset-password.html?token=${token}`;

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: `"GoPlay" <${process.env.EMAIL_USER}>`,
            to: usuario.email,
            subject: "Redefinição de senha - GoPlay",
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Redefinição de senha</h2>
                    <p>Olá, ${usuario.nome || "usuário"}.</p>
                    <p>Recebemos uma solicitação para redefinir sua senha.</p>
                    <p>Clique no botão abaixo para criar uma nova senha:</p>
                    <p>
                        <a href="${resetLink}" 
                           style="display:inline-block;padding:12px 20px;background:#0d6efd;color:#fff;text-decoration:none;border-radius:6px;">
                           Redefinir senha
                        </a>
                    </p>
                    <p>Ou copie e cole este link no navegador:</p>
                    <p>${resetLink}</p>
                    <p>Este link expira em 30 minutos.</p>
                    <p>Se você não solicitou isso, pode ignorar este e-mail.</p>
                </div>
            `
        });

        return res.status(200).json({
            message: "Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha."
        });

    } catch (error) {
        console.log("ERRO AO SOLICITAR RESET:", error);
        return res.status(500).json({
            error: "Erro ao solicitar redefinição de senha."
        });
    }
};

/* ============================================
   RESETAR SENHA
============================================ */
const resetPassword = async (req, res) => {
    try {
        const token = String(req.body.token || "").trim();
        const novaSenha = String(req.body.novaSenha || "").trim();

        if (!token || !novaSenha) {
            return res.status(400).json({ error: "Token e nova senha são obrigatórios." });
        }

        if (novaSenha.length < 6) {
            return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
        }

        const usuario = await prisma.usuario.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiresAt: {
                    gt: new Date()
                }
            }
        });

        if (!usuario) {
            return res.status(400).json({ error: "Token inválido ou expirado." });
        }

        const senhaHash = await bcrypt.hash(novaSenha, 10);

        await prisma.usuario.update({
            where: { id: usuario.id },
            data: {
                senha: senhaHash,
                resetToken: null,
                resetTokenExpiresAt: null
            }
        });

        return res.status(200).json({
            message: "Senha redefinida com sucesso."
        });

    } catch (error) {
        console.log("ERRO AO RESETAR SENHA:", error);
        return res.status(500).json({
            error: "Erro ao redefinir senha."
        });
    }
};

module.exports = {
    create,
    login,
    readOne,
    update,
    forgotPassword,
    resetPassword
};