const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const geral = async (req, res) => {
    try {
        const [
            totalUsuarios,
            totalTimes,
            totalSocieties,
            totalCampos,
            totalCampeonatos,
            totalAgendamentos,
            totalPagamentos,
            pagamentosPagos,
            pagamentosPendentes
        ] = await Promise.all([
            prisma.usuario.count(),
            prisma.time.count(),
            prisma.society.count(),
            prisma.campo.count(),
            prisma.campeonato.count(),
            prisma.agendamento.count(),
            prisma.pagamento.count(),
            prisma.pagamento.aggregate({
                _sum: { valor: true },
                where: { status: "PAGO" }
            }),
            prisma.pagamento.aggregate({
                _sum: { valor: true },
                where: { status: "PENDENTE" }
            })
        ]);

        return res.status(200).json({
            usuarios: {
                total: totalUsuarios
            },
            times: {
                total: totalTimes
            },
            societies: {
                total: totalSocieties
            },
            campos: {
                total: totalCampos
            },
            campeonatos: {
                total: totalCampeonatos
            },
            agendamentos: {
                total: totalAgendamentos
            },
            pagamentos: {
                total: totalPagamentos,
                valorPago: Number(pagamentosPagos._sum.valor || 0),
                valorPendente: Number(pagamentosPendentes._sum.valor || 0)
            }
        });

    } catch (error) {
        console.log("ERRO AO BUSCAR RESUMO GERAL:", error);
        return res.status(500).json({ error: "Erro ao buscar resumo geral." });
    }
};

module.exports = { geral };