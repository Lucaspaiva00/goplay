const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function configuredSocioEmails() {
  return [...new Set(
    String(process.env.GOPLAY_SOCIO_EMAILS || "")
      .split(",")
      .map(x => x.trim().toLowerCase())
      .filter(Boolean)
  )];
}

async function syncPlatformAdmins() {
  const emails = configuredSocioEmails();
  if (!emails.length) return { configured: 0, updated: 0 };

  const result = await prisma.usuario.updateMany({
    where: { email: { in: emails } },
    data: { isSocioGoPlay: true },
  });

  const found = await prisma.usuario.findMany({
    where: { email: { in: emails } },
    select: { id: true, nome: true, email: true, tipo: true, isSocioGoPlay: true },
  });

  console.log("[GOPLAY SOCIOS] perfis administrativos sincronizados:", found.map(x => x.email).join(", ") || "nenhuma conta encontrada");
  return { configured: emails.length, updated: result.count, found: found.length };
}

module.exports = { configuredSocioEmails, syncPlatformAdmins };
