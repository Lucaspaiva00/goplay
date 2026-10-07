const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function quoteIdent(name) {
  return `"${String(name).replaceAll('"', '""')}"`;
}

async function main() {
  if (process.env.CONFIRM_RESET_GOPLAY !== 'ZERAR_TUDO') {
    throw new Error('Reset bloqueado. Execute com CONFIRM_RESET_GOPLAY=ZERAR_TUDO.');
  }

  const dbRows = await prisma.$queryRawUnsafe('SELECT current_database() AS database_name');
  const databaseName = dbRows?.[0]?.database_name;
  if (databaseName !== 'goplay') {
    throw new Error(`Reset recusado: banco atual é ${databaseName || 'desconhecido'}, esperado goplay.`);
  }

  const tables = await prisma.$queryRawUnsafe(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `);

  if (!tables.length) {
    console.log('Nenhuma tabela de aplicação encontrada.');
    return;
  }

  const list = tables.map(row => quoteIdent(row.tablename)).join(', ');
  console.log(`Limpando ${tables.length} tabela(s) do banco ${databaseName}...`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  console.log('Banco GoPlay zerado. Estrutura e histórico de migrations foram preservados.');
}

main()
  .catch(error => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
