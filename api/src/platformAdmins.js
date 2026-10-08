const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Grant only existing, explicitly verified accounts. Emails are editable and
// cannot serve as an administrative identity or a public signup allowlist.
function configuredSocioIds() {
  return [...new Set(String(process.env.GOPLAY_SOCIO_IDS || "")
    .split(",").map(x => Number(x.trim())).filter(x => Number.isInteger(x) && x > 0))];
}
async function syncPlatformAdmins() {
  const ids = configuredSocioIds();
  if (!ids.length) return { configured: 0, updated: 0 };
  const result = await prisma.usuario.updateMany({
    where: { id: { in: ids } }, data: { isSocioGoPlay: true },
  });
  console.log("[GOPLAY SOCIOS] contas existentes autorizadas:", result.count);
  return { configured: ids.length, updated: result.count };
}
module.exports = { configuredSocioIds, syncPlatformAdmins };
