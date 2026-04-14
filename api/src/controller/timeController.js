const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/* =========================
   HELPERS
========================= */
const toId = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

const toOptionalNumber = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

/* =========================
   CRIAR TIME
========================= */
const create = async (req, res) => {
    try {
        const nome = String(req.body.nome || "").trim();
        const societyId = toId(req.body.societyId);
        const donoId = toId(req.body.donoId);

        const brasao = req.body.brasao ? String(req.body.brasao).trim() : null;
        const descricao = req.body.descricao ? String(req.body.descricao).trim() : null;
        const estado = req.body.estado ? String(req.body.estado).trim() : null;
        const cidade = req.body.cidade ? String(req.body.cidade).trim() : null;
        const modalidade = req.body.modalidade ? String(req.body.modalidade).trim() : null;

        const tipoVinculo = req.body.tipoVinculo || "AVULSO";
        const statusVinculo = req.body.statusVinculo || "PENDENTE";
        const valorMensalidade = toOptionalNumber(req.body.valorMensalidade);
        const diaVencimento = toOptionalNumber(req.body.diaVencimento);
        const observacaoVinculo = req.body.observacaoVinculo
            ? String(req.body.observacaoVinculo).trim()
            : null;

        if (!nome || !societyId || !donoId) {
            return res.status(400).json({ error: "Informe nome, societyId e donoId." });
        }

        const society = await prisma.society.findUnique({
            where: { id: societyId }
        });

        if (!society) {
            return res.status(404).json({ error: "Society não encontrado." });
        }

        const dono = await prisma.usuario.findUnique({
            where: { id: donoId }
        });

        if (!dono) {
            return res.status(404).json({ error: "Dono do time não encontrado." });
        }

        const existe = await prisma.time.findFirst({
            where: {
                societyId,
                nome
            }
        });

        if (existe) {
            return res.status(400).json({ error: "Já existe um time com esse nome nesse society." });
        }

        const novo = await prisma.time.create({
            data: {
                nome,
                societyId,
                donoId,
                brasao,
                descricao,
                estado,
                cidade,
                modalidade,
                tipoVinculo,
                statusVinculo,
                valorMensalidade,
                diaVencimento,
                observacaoVinculo,
                aprovadoEm: statusVinculo === "APROVADO" ? new Date() : null
            },
            include: {
                dono: { select: { id: true, nome: true } },
                society: { select: { id: true, nome: true } },
                jogadores: { select: { id: true, nome: true } }
            }
        });

        return res.status(201).json(novo);
    } catch (err) {
        console.error("Erro ao criar time:", err);
        return res.status(500).json({ error: "Erro ao criar time." });
    }
};

/* =========================
   LISTAR TODOS
========================= */
const list = async (req, res) => {
    try {
        const times = await prisma.time.findMany({
            include: {
                dono: { select: { id: true, nome: true } },
                jogadores: {
                    select: {
                        id: true,
                        nome: true,
                        posicaoCampo: true,
                        goleiro: true
                    }
                },
                society: { select: { id: true, nome: true } }
            },
            orderBy: { id: "desc" }
        });

        return res.status(200).json(times);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao listar times." });
    }
};

/* =========================
   LISTAR POR DONO
========================= */
const listByOwner = async (req, res) => {
    try {
        const donoId = toId(req.params.donoId);

        if (!donoId) {
            return res.status(400).json({ error: "donoId inválido." });
        }

        const times = await prisma.time.findMany({
            where: { donoId },
            include: {
                jogadores: {
                    select: {
                        id: true,
                        nome: true,
                        posicaoCampo: true,
                        goleiro: true
                    }
                },
                society: { select: { id: true, nome: true } }
            },
            orderBy: { id: "desc" }
        });

        return res.status(200).json(times);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao listar times do dono." });
    }
};

/* =========================
   LISTAR POR SOCIETY
========================= */
const listBySociety = async (req, res) => {
    try {
        const societyId = toId(req.params.societyId);

        if (!societyId) {
            return res.status(400).json({ error: "societyId inválido." });
        }

        const times = await prisma.time.findMany({
            where: { societyId },
            include: {
                jogadores: {
                    select: {
                        id: true,
                        nome: true,
                        posicaoCampo: true,
                        goleiro: true
                    }
                },
                dono: { select: { id: true, nome: true } }
            },
            orderBy: [
                { statusVinculo: "asc" },
                { tipoVinculo: "asc" },
                { nome: "asc" }
            ]
        });

        return res.status(200).json(times);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao listar times do society." });
    }
};

/* =========================
   DETALHES DO TIME
========================= */
const details = async (req, res) => {
    try {
        const timeId = toId(req.params.timeId);

        if (!timeId) {
            return res.status(400).json({ error: "timeId inválido." });
        }

        const time = await prisma.time.findUnique({
            where: { id: timeId },
            include: {
                dono: { select: { id: true, nome: true, email: true } },
                society: { select: { id: true, nome: true } },
                jogadores: {
                    select: {
                        id: true,
                        nome: true,
                        email: true,
                        telefone: true,
                        posicaoCampo: true,
                        goleiro: true
                    }
                }
            }
        });

        if (!time) {
            return res.status(404).json({ error: "Time não encontrado." });
        }

        return res.status(200).json(time);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao carregar detalhes do time." });
    }
};

/* =========================
   ATUALIZAR TIME
========================= */
const update = async (req, res) => {
    try {
        const timeId = toId(req.params.timeId);

        if (!timeId) {
            return res.status(400).json({ error: "timeId inválido." });
        }

        const timeAtual = await prisma.time.findUnique({
            where: { id: timeId }
        });

        if (!timeAtual) {
            return res.status(404).json({ error: "Time não encontrado." });
        }

        const nome = req.body.nome !== undefined ? String(req.body.nome).trim() : undefined;
        const brasao = req.body.brasao !== undefined ? (req.body.brasao ? String(req.body.brasao).trim() : null) : undefined;
        const descricao = req.body.descricao !== undefined ? (req.body.descricao ? String(req.body.descricao).trim() : null) : undefined;
        const estado = req.body.estado !== undefined ? (req.body.estado ? String(req.body.estado).trim() : null) : undefined;
        const cidade = req.body.cidade !== undefined ? (req.body.cidade ? String(req.body.cidade).trim() : null) : undefined;
        const modalidade = req.body.modalidade !== undefined ? (req.body.modalidade ? String(req.body.modalidade).trim() : null) : undefined;

        const tipoVinculo = req.body.tipoVinculo !== undefined ? req.body.tipoVinculo : undefined;
        const statusVinculo = req.body.statusVinculo !== undefined ? req.body.statusVinculo : undefined;
        const valorMensalidade = req.body.valorMensalidade !== undefined ? toOptionalNumber(req.body.valorMensalidade) : undefined;
        const diaVencimento = req.body.diaVencimento !== undefined ? toOptionalNumber(req.body.diaVencimento) : undefined;
        const observacaoVinculo = req.body.observacaoVinculo !== undefined
            ? (req.body.observacaoVinculo ? String(req.body.observacaoVinculo).trim() : null)
            : undefined;

        if (nome !== undefined && !nome) {
            return res.status(400).json({ error: "Nome inválido." });
        }

        if (nome && nome !== timeAtual.nome) {
            const existe = await prisma.time.findFirst({
                where: {
                    societyId: timeAtual.societyId,
                    nome,
                    NOT: { id: timeId }
                }
            });

            if (existe) {
                return res.status(400).json({ error: "Já existe um time com esse nome nesse society." });
            }
        }

        const atualizado = await prisma.time.update({
            where: { id: timeId },
            data: {
                nome,
                brasao,
                descricao,
                estado,
                cidade,
                modalidade,
                tipoVinculo,
                statusVinculo,
                valorMensalidade,
                diaVencimento,
                observacaoVinculo,
                aprovadoEm: statusVinculo === "APROVADO"
                    ? (timeAtual.statusVinculo === "APROVADO" ? timeAtual.aprovadoEm : new Date())
                    : statusVinculo === "RECUSADO" || statusVinculo === "INATIVO"
                        ? null
                        : undefined
            },
            include: {
                dono: { select: { id: true, nome: true } },
                society: { select: { id: true, nome: true } },
                jogadores: { select: { id: true, nome: true } }
            }
        });

        return res.status(200).json(atualizado);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao atualizar time." });
    }
};

/* =========================
   REMOVER TIME
========================= */
const remove = async (req, res) => {
    try {
        const timeId = toId(req.params.timeId);

        if (!timeId) {
            return res.status(400).json({ error: "timeId inválido." });
        }

        const time = await prisma.time.findUnique({
            where: { id: timeId },
            include: { jogadores: true }
        });

        if (!time) {
            return res.status(404).json({ error: "Time não encontrado." });
        }

        if (time.jogadores.length > 0) {
            await prisma.usuario.updateMany({
                where: { timeRelacionadoId: timeId },
                data: { timeRelacionadoId: null }
            });
        }

        await prisma.time.delete({
            where: { id: timeId }
        });

        return res.status(200).json({ message: "Time removido com sucesso." });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao remover time." });
    }
};

/* =========================
   ENTRAR NO TIME
========================= */
const join = async (req, res) => {
    try {
        const usuarioId = toId(req.body.usuarioId);
        const timeId = toId(req.body.timeId);

        if (!usuarioId || !timeId) {
            return res.status(400).json({ error: "usuarioId e timeId são obrigatórios." });
        }

        const user = await prisma.usuario.findUnique({
            where: { id: usuarioId }
        });

        if (!user) {
            return res.status(404).json({ error: "Jogador não encontrado." });
        }

        if (user.timeRelacionadoId) {
            return res.status(400).json({ error: "Jogador já pertence a um time." });
        }

        const time = await prisma.time.findUnique({
            where: { id: timeId }
        });

        if (!time) {
            return res.status(404).json({ error: "Time não encontrado." });
        }

        const updated = await prisma.usuario.update({
            where: { id: usuarioId },
            data: { timeRelacionadoId: timeId }
        });

        return res.status(200).json({ message: "Entrou no time!", updated });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao entrar no time." });
    }
};

/* =========================
   SAIR DO TIME
========================= */
const leave = async (req, res) => {
    try {
        const usuarioId = toId(req.body.usuarioId);

        if (!usuarioId) {
            return res.status(400).json({ error: "usuarioId é obrigatório." });
        }

        const user = await prisma.usuario.findUnique({
            where: { id: usuarioId }
        });

        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        const updated = await prisma.usuario.update({
            where: { id: usuarioId },
            data: { timeRelacionadoId: null }
        });

        return res.status(200).json({ message: "Saiu do time!", updated });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao sair do time." });
    }
};

/* =========================
   BUSCAR TIME DO JOGADOR
========================= */
const getTimeByPlayer = async (req, res) => {
    try {
        const usuarioId = toId(req.params.usuarioId);

        if (!usuarioId) {
            return res.status(400).json({ error: "usuarioId inválido." });
        }

        const jogador = await prisma.usuario.findUnique({
            where: { id: usuarioId },
            include: { timeRelacionado: true }
        });

        if (!jogador || !jogador.timeRelacionadoId) {
            return res.json({ time: null });
        }

        const time = await prisma.time.findUnique({
            where: { id: jogador.timeRelacionadoId },
            include: {
                society: { select: { id: true, nome: true } },
                jogadores: {
                    select: {
                        id: true,
                        nome: true,
                        posicaoCampo: true,
                        goleiro: true
                    }
                }
            }
        });

        return res.json({ time });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao buscar time do jogador." });
    }
};

/* =========================
   ATUALIZAR VÍNCULO DO TIME
========================= */
const updateVinculo = async (req, res) => {
    try {
        const timeId = toId(req.params.timeId);

        if (!timeId) {
            return res.status(400).json({ error: "timeId inválido." });
        }

        const time = await prisma.time.findUnique({
            where: { id: timeId }
        });

        if (!time) {
            return res.status(404).json({ error: "Time não encontrado." });
        }

        const tipoVinculo = req.body.tipoVinculo;
        const statusVinculo = req.body.statusVinculo;
        const valorMensalidade = req.body.valorMensalidade !== undefined
            ? toOptionalNumber(req.body.valorMensalidade)
            : undefined;
        const diaVencimento = req.body.diaVencimento !== undefined
            ? toOptionalNumber(req.body.diaVencimento)
            : undefined;
        const observacaoVinculo = req.body.observacaoVinculo !== undefined
            ? (req.body.observacaoVinculo ? String(req.body.observacaoVinculo).trim() : null)
            : undefined;

        const atualizado = await prisma.time.update({
            where: { id: timeId },
            data: {
                tipoVinculo,
                statusVinculo,
                valorMensalidade,
                diaVencimento,
                observacaoVinculo,
                aprovadoEm: statusVinculo === "APROVADO"
                    ? (time.statusVinculo === "APROVADO" ? time.aprovadoEm : new Date())
                    : statusVinculo === "RECUSADO" || statusVinculo === "INATIVO"
                        ? null
                        : undefined
            }
        });

        return res.status(200).json(atualizado);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao atualizar vínculo do time." });
    }
};

/* =========================
   APROVAR TIME
========================= */
const aprovar = async (req, res) => {
    try {
        const timeId = toId(req.params.timeId);

        if (!timeId) {
            return res.status(400).json({ error: "timeId inválido." });
        }

        const time = await prisma.time.findUnique({
            where: { id: timeId }
        });

        if (!time) {
            return res.status(404).json({ error: "Time não encontrado." });
        }

        const atualizado = await prisma.time.update({
            where: { id: timeId },
            data: {
                statusVinculo: "APROVADO",
                aprovadoEm: new Date()
            }
        });

        return res.status(200).json(atualizado);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao aprovar time." });
    }
};

/* =========================
   RECUSAR TIME
========================= */
const recusar = async (req, res) => {
    try {
        const timeId = toId(req.params.timeId);

        if (!timeId) {
            return res.status(400).json({ error: "timeId inválido." });
        }

        const time = await prisma.time.findUnique({
            where: { id: timeId }
        });

        if (!time) {
            return res.status(404).json({ error: "Time não encontrado." });
        }

        const atualizado = await prisma.time.update({
            where: { id: timeId },
            data: {
                statusVinculo: "RECUSADO",
                aprovadoEm: null
            }
        });

        return res.status(200).json(atualizado);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao recusar time." });
    }
};

/* =========================
   INATIVAR TIME
========================= */
const inativar = async (req, res) => {
    try {
        const timeId = toId(req.params.timeId);

        if (!timeId) {
            return res.status(400).json({ error: "timeId inválido." });
        }

        const time = await prisma.time.findUnique({
            where: { id: timeId }
        });

        if (!time) {
            return res.status(404).json({ error: "Time não encontrado." });
        }

        const atualizado = await prisma.time.update({
            where: { id: timeId },
            data: {
                statusVinculo: "INATIVO",
                aprovadoEm: null
            }
        });

        return res.status(200).json(atualizado);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro ao inativar time." });
    }
};

module.exports = {
    create,
    list,
    listByOwner,
    listBySociety,
    details,
    update,
    remove,
    join,
    leave,
    getTimeByPlayer,
    updateVinculo,
    aprovar,
    recusar,
    inativar
};