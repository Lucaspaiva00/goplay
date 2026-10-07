const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function startOfMonthUTC(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function addMonthsUTC(d, months) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
}
function monthLabel(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function dashboard(req, res) {
  try {
    const now = new Date();
    const monthStart = startOfMonthUTC(now);
    const last30 = new Date(now.getTime() - 30 * 86400000);

    const [
      usuarios,
      jogadores,
      donosTime,
      donosSociety,
      organizadores,
      orgaosPublicos,
      socios,
      societies,
      times,
      campeonatos,
      amistosos,
      reservas,
      jogos,
      jogosRealizados,
      jogosAoVivo,
      novosUsuarios30,
      novasSocieties30,
      reservasMes,
      amistososMes,
      pagos,
      pendentes,
      pagosMes,
    ] = await Promise.all([
      prisma.usuario.count(),
      prisma.usuario.count({ where: { tipo: "PLAYER" } }),
      prisma.usuario.count({ where: { tipo: "DONO_TIME" } }),
      prisma.usuario.count({ where: { tipo: "DONO_SOCIETY" } }),
      prisma.usuario.count({ where: { tipo: "ORGANIZADOR_COMPETICAO" } }),
      prisma.usuario.count({ where: { tipo: "ORGAO_PUBLICO" } }),
      prisma.usuario.count({ where: { tipo: "SOCIO_GOPLAY" } }),
      prisma.society.count(),
      prisma.time.count(),
      prisma.campeonato.count(),
      prisma.amistoso.count(),
      prisma.agendamento.count({ where: { status: { not: "CANCELADO" } } }),
      prisma.jogo.count(),
      prisma.jogo.count({ where: { finalizado: true } }),
      prisma.jogo.count({ where: { statusOperacao: "AO_VIVO", finalizado: false } }),
      prisma.usuario.count({ where: { createdAt: { gte: last30 } } }),
      prisma.society.count({ where: { createdAt: { gte: last30 } } }),
      prisma.agendamento.count({ where: { createdAt: { gte: monthStart }, status: { not: "CANCELADO" } } }),
      prisma.amistoso.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.pagamento.aggregate({ where: { status: "PAGO" }, _sum: { valor: true }, _count: true }),
      prisma.pagamento.aggregate({ where: { status: "PENDENTE" }, _sum: { valor: true }, _count: true }),
      prisma.pagamento.aggregate({ where: { status: "PAGO", pagoEm: { gte: monthStart } }, _sum: { valor: true }, _count: true }),
    ]);

    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const inicio = addMonthsUTC(monthStart, -i);
      const fim = addMonthsUTC(inicio, 1);
      const [u, s, r, a] = await Promise.all([
        prisma.usuario.count({ where: { createdAt: { gte: inicio, lt: fim } } }),
        prisma.society.count({ where: { createdAt: { gte: inicio, lt: fim } } }),
        prisma.agendamento.count({ where: { createdAt: { gte: inicio, lt: fim }, status: { not: "CANCELADO" } } }),
        prisma.amistoso.count({ where: { createdAt: { gte: inicio, lt: fim } } }),
      ]);
      meses.push({ mes: monthLabel(inicio), usuarios: u, societies: s, reservas: r, amistosos: a });
    }

    const cidadesRaw = await prisma.society.groupBy({
      by: ["cidade", "estado"],
      _count: { _all: true },
    });
    const cidades = cidadesRaw.sort((a,b) => b._count._all - a._count._all).slice(0,15);

    return res.json({
      usuarios: {
        total: usuarios,
        jogadores,
        donosTime,
        donosSociety,
        organizadores,
        orgaosPublicos,
        socios,
        novos30Dias: novosUsuarios30,
      },
      operacao: {
        societies,
        times,
        campeonatos,
        amistosos,
        reservas,
        jogos,
        jogosRealizados,
        jogosAoVivo,
        novasSocieties30Dias: novasSocieties30,
        reservasMes,
        amistososMes,
      },
      financeiro: {
        movimentadoPago: Number(pagos._sum.valor || 0),
        pagamentosPagos: pagos._count,
        pendente: Number(pendentes._sum.valor || 0),
        pagamentosPendentes: pendentes._count,
        movimentadoMes: Number(pagosMes._sum.valor || 0),
        pagamentosMes: pagosMes._count,
        assinaturas: {
          implementado: false,
          observacao: "Estrutura reservada para planos e assinaturas da plataforma.",
        },
      },
      crescimento: meses,
      cidades: cidades.map(x => ({
        cidade: x.cidade || "Não informada",
        estado: x.estado || "",
        societies: x._count._all,
      })),
    });
  } catch (e) {
    console.error("dashboard plataforma", e);
    return res.status(500).json({ error: "Erro ao carregar painel da plataforma." });
  }
}

async function usuarios(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    const tipo = String(req.query.tipo || "").trim().toUpperCase();
    const take = Math.max(1, Math.min(100, Number(req.query.take || 30)));

    const where = {
      ...(q ? {
        OR: [
          { nome: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { telefone: { contains: q, mode: "insensitive" } },
        ],
      } : {}),
      ...(tipo ? { tipo } : {}),
    };

    const rows = await prisma.usuario.findMany({
      where,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        tipo: true,
        createdAt: true,
        updatedAt: true,
        timeRelacionado: { select: { id: true, nome: true } },
        _count: {
          select: {
            times: true,
            societies: true,
            notificacoes: true,
            pagamentos: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
    });

    return res.json(rows);
  } catch (e) {
    console.error("usuarios plataforma", e);
    return res.status(500).json({ error: "Erro ao pesquisar usuários." });
  }
}

async function societies(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    const take = Math.max(1, Math.min(100, Number(req.query.take || 30)));

    const rows = await prisma.society.findMany({
      where: q ? {
        OR: [
          { nome: { contains: q, mode: "insensitive" } },
          { cidade: { contains: q, mode: "insensitive" } },
          { estado: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      } : {},
      select: {
        id: true,
        nome: true,
        cidade: true,
        estado: true,
        email: true,
        telefone: true,
        createdAt: true,
        dono: { select: { id: true, nome: true, email: true } },
        _count: {
          select: {
            campos: true,
            times: true,
            campeonatos: true,
            amistosos: true,
            agendamentos: true,
            funcionarios: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
    });

    return res.json(rows);
  } catch (e) {
    console.error("societies plataforma", e);
    return res.status(500).json({ error: "Erro ao pesquisar empresas." });
  }
}

async function saude(req, res) {
  try {
    const now = new Date();
    const fourHours = new Date(now.getTime() - 4 * 3600000);
    const twoDays = new Date(now.getTime() - 2 * 86400000);
    const threeDays = new Date(now.getTime() - 3 * 86400000);
    const oneDay = new Date(now.getTime() - 86400000);

    const [jogosTravados, pagamentosAntigos, solicitacoesAntigas, amistososPendentes] = await Promise.all([
      prisma.jogo.findMany({
        where: { statusOperacao: "AO_VIVO", finalizado: false, iniciadoEm: { lt: fourHours } },
        select: {
          id: true,
          iniciadoEm: true,
          timeA: { select: { nome: true } },
          timeB: { select: { nome: true } },
          campeonato: { select: { nome: true } },
          amistoso: { select: { id: true } },
        },
        orderBy: { iniciadoEm: "asc" },
        take: 30,
      }),
      prisma.pagamento.count({ where: { status: "PENDENTE", createdAt: { lt: twoDays } } }),
      prisma.solicitacaoEntradaTime.count({ where: { status: "PENDENTE", solicitadoEm: { lt: threeDays } } }),
      prisma.amistoso.count({
        where: {
          status: { in: ["PENDENTE_ADVERSARIO","PENDENTE_SOCIETY"] },
          createdAt: { lt: oneDay },
        },
      }),
    ]);

    const alertas = [];
    if (jogosTravados.length) alertas.push({ nivel: "ALTO", tipo: "JOGO_AO_VIVO_LONGO", quantidade: jogosTravados.length, mensagem: "Há partidas marcadas como AO VIVO há mais de 4 horas." });
    if (pagamentosAntigos) alertas.push({ nivel: "MEDIO", tipo: "PAGAMENTOS_PENDENTES", quantidade: pagamentosAntigos, mensagem: "Pagamentos estão pendentes há mais de 2 dias." });
    if (solicitacoesAntigas) alertas.push({ nivel: "BAIXO", tipo: "SOLICITACOES_TIME", quantidade: solicitacoesAntigas, mensagem: "Solicitações de entrada em times aguardam resposta há mais de 3 dias." });
    if (amistososPendentes) alertas.push({ nivel: "MEDIO", tipo: "AMISTOSOS_PENDENTES", quantidade: amistososPendentes, mensagem: "Amistosos aguardam aprovação há mais de 24 horas." });

    return res.json({
      status: alertas.some(a => a.nivel === "ALTO") ? "ATENCAO" : alertas.length ? "OBSERVAR" : "SAUDAVEL",
      alertas,
      jogosTravados,
      notaEmail: "Falhas de envio de e-mail aparecem nos logs da API; ainda não existe histórico persistido de entregas.",
    });
  } catch (e) {
    console.error("saude plataforma", e);
    return res.status(500).json({ error: "Erro ao carregar saúde da plataforma." });
  }
}

module.exports = { dashboard, usuarios, societies, saude };
