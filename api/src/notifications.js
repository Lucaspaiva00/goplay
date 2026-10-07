const { EMAIL_RE, sendNotificationEmail } = require("./notificationMailer");

function dispararEmailSemQuebrar(payload, contexto) {
  sendNotificationEmail(payload).catch((e) => {
    console.error(`emailNotificacao ${contexto || ""}`.trim(), {
      code: e?.code || null,
      message: e?.message || String(e),
    });
  });
}

async function notifyUsuario(prisma, usuarioId, titulo, mensagem, url = null) {
  if (!usuarioId) return;

  try {
    const uid = Number(usuarioId);
    const [usuario] = await Promise.all([
      prisma.usuario.findUnique({
        where: { id: uid },
        select: { id: true, nome: true, email: true },
      }),
      prisma.notificacao.create({
        data: {
          usuarioId: uid,
          titulo: String(titulo),
          mensagem: String(mensagem),
          url: url ? String(url) : null,
        },
      }),
    ]);

    if (usuario?.email) {
      dispararEmailSemQuebrar(
        {
          to: usuario.email,
          nome: usuario.nome,
          titulo,
          mensagem,
          url,
        },
        `usuarioId=${uid}`
      );
    }
  } catch (e) {
    console.error("notifyUsuario", e.message);
  }
}

async function notifyStaff(
  prisma,
  societyId,
  titulo,
  mensagem,
  funcoes = ["ADMIN", "CAIXA", "RECEPCAO"],
  url = null
) {
  if (!societyId) return;

  try {
    const staff = await prisma.funcionario.findMany({
      where: {
        societyId: Number(societyId),
        ativo: true,
        funcao: { in: funcoes },
      },
      select: { id: true, nome: true, acesso: true },
    });

    if (!staff.length) return;

    await prisma.notificacaoFuncionario.createMany({
      data: staff.map((f) => ({
        funcionarioId: f.id,
        titulo: String(titulo),
        mensagem: String(mensagem),
        url: url ? String(url) : null,
      })),
    });

    // Funcionário não possui campo "email" separado hoje. Se o usuário de
    // acesso dele já for um e-mail válido, aproveitamos esse endereço.
    for (const f of staff) {
      if (!EMAIL_RE.test(String(f.acesso || "").trim())) continue;
      dispararEmailSemQuebrar(
        {
          to: f.acesso,
          nome: f.nome,
          titulo,
          mensagem,
          url,
        },
        `funcionarioId=${f.id}`
      );
    }
  } catch (e) {
    console.error("notifyStaff", e.message);
  }
}

module.exports = { notifyUsuario, notifyStaff };
