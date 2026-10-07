const { PrismaClient } = require('@prisma/client');

function quoteIdent(name) {
  return `"${String(name).replaceAll('"', '""')}"`;
}

async function clearDatabaseOnce() {
  const token = String(process.env.GOPLAY_RESET_TOKEN || '').trim();
  if (!token) return { skipped: true, reason: 'token ausente' };

  const prisma = new PrismaClient();
  try {
    const dbRows = await prisma.$queryRawUnsafe('SELECT current_database() AS database_name');
    const databaseName = dbRows?.[0]?.database_name;
    if (databaseName !== 'goplay') {
      throw new Error(`Reset recusado: banco atual é ${databaseName || 'desconhecido'}, esperado goplay.`);
    }

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_goplay_reset_guard" (
        "token" TEXT PRIMARY KEY,
        "executed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const already = await prisma.$queryRawUnsafe(
      'SELECT "token", "executed_at" FROM "_goplay_reset_guard" WHERE "token" = $1 LIMIT 1',
      token
    );
    if (already.length) {
      return { skipped: true, reason: 'token ja executado', executedAt: already[0].executed_at };
    }

    const tables = await prisma.$queryRawUnsafe(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT IN ('_prisma_migrations', '_goplay_reset_guard')
      ORDER BY tablename
    `);

    if (!tables.length) {
      await prisma.$executeRawUnsafe(
        'INSERT INTO "_goplay_reset_guard" ("token") VALUES ($1) ON CONFLICT ("token") DO NOTHING',
        token
      );
      return { cleared: true, tables: 0 };
    }

    const list = tables.map(row => quoteIdent(row.tablename)).join(', ');
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
      await tx.$executeRawUnsafe(
        'INSERT INTO "_goplay_reset_guard" ("token") VALUES ($1) ON CONFLICT ("token") DO NOTHING',
        token
      );
    });

    return { cleared: true, tables: tables.length };
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  clearDatabaseOnce()
    .then(result => console.log('Resultado do reset GoPlay:', result))
    .catch(error => {
      console.error(error.message || error);
      process.exitCode = 1;
    });
}

module.exports = { clearDatabaseOnce };
