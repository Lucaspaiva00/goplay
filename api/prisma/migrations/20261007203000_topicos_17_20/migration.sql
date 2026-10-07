ALTER TYPE "TipoUsuario" ADD VALUE IF NOT EXISTS 'ORGANIZADOR_COMPETICAO';
ALTER TYPE "TipoUsuario" ADD VALUE IF NOT EXISTS 'ORGAO_PUBLICO';
ALTER TYPE "TipoUsuario" ADD VALUE IF NOT EXISTS 'SOCIO_GOPLAY';

ALTER TABLE "Time"
ADD COLUMN IF NOT EXISTS "maxJogadores" INTEGER NOT NULL DEFAULT 20;

ALTER TABLE "Campeonato"
ALTER COLUMN "societyId" DROP NOT NULL;

ALTER TABLE "Campeonato"
ADD COLUMN IF NOT EXISTS "organizadorId" INTEGER;

CREATE INDEX IF NOT EXISTS "Campeonato_organizadorId_idx"
ON "Campeonato"("organizadorId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Campeonato_organizadorId_fkey'
  ) THEN
    ALTER TABLE "Campeonato"
    ADD CONSTRAINT "Campeonato_organizadorId_fkey"
    FOREIGN KEY ("organizadorId") REFERENCES "Usuario"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatusAmistoso') THEN
    CREATE TYPE "StatusAmistoso" AS ENUM (
      'PENDENTE_ADVERSARIO',
      'PENDENTE_SOCIETY',
      'CONFIRMADO',
      'RECUSADO',
      'CANCELADO',
      'REALIZADO'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatusPresencaAmistoso') THEN
    CREATE TYPE "StatusPresencaAmistoso" AS ENUM (
      'PENDENTE',
      'VOU',
      'NAO_VOU'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Amistoso" (
  "id" SERIAL NOT NULL,
  "criadoPorId" INTEGER NOT NULL,
  "societyId" INTEGER,
  "campoId" INTEGER,
  "timeAId" INTEGER NOT NULL,
  "timeBId" INTEGER NOT NULL,
  "dataHora" TIMESTAMP(3) NOT NULL,
  "duracaoMinutos" INTEGER NOT NULL DEFAULT 60,
  "status" "StatusAmistoso" NOT NULL,
  "aprovadoAdversarioEm" TIMESTAMP(3),
  "aprovadoSocietyEm" TIMESTAMP(3),
  "recusadoEm" TIMESTAMP(3),
  "motivoRecusa" TEXT,
  "observacao" TEXT,
  "agendamentoId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Amistoso_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PresencaAmistoso" (
  "id" SERIAL NOT NULL,
  "amistosoId" INTEGER NOT NULL,
  "usuarioId" INTEGER NOT NULL,
  "timeId" INTEGER NOT NULL,
  "status" "StatusPresencaAmistoso" NOT NULL DEFAULT 'PENDENTE',
  "respondidoEm" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PresencaAmistoso_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Amistoso_criadoPorId_idx" ON "Amistoso"("criadoPorId");
CREATE INDEX IF NOT EXISTS "Amistoso_societyId_idx" ON "Amistoso"("societyId");
CREATE INDEX IF NOT EXISTS "Amistoso_campoId_idx" ON "Amistoso"("campoId");
CREATE INDEX IF NOT EXISTS "Amistoso_timeAId_idx" ON "Amistoso"("timeAId");
CREATE INDEX IF NOT EXISTS "Amistoso_timeBId_idx" ON "Amistoso"("timeBId");
CREATE INDEX IF NOT EXISTS "Amistoso_dataHora_idx" ON "Amistoso"("dataHora");
CREATE INDEX IF NOT EXISTS "Amistoso_status_idx" ON "Amistoso"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "Amistoso_agendamentoId_key" ON "Amistoso"("agendamentoId");

CREATE UNIQUE INDEX IF NOT EXISTS "PresencaAmistoso_amistosoId_usuarioId_key"
ON "PresencaAmistoso"("amistosoId","usuarioId");
CREATE INDEX IF NOT EXISTS "PresencaAmistoso_amistosoId_idx" ON "PresencaAmistoso"("amistosoId");
CREATE INDEX IF NOT EXISTS "PresencaAmistoso_usuarioId_idx" ON "PresencaAmistoso"("usuarioId");
CREATE INDEX IF NOT EXISTS "PresencaAmistoso_timeId_idx" ON "PresencaAmistoso"("timeId");
CREATE INDEX IF NOT EXISTS "PresencaAmistoso_status_idx" ON "PresencaAmistoso"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Amistoso_criadoPorId_fkey') THEN
    ALTER TABLE "Amistoso" ADD CONSTRAINT "Amistoso_criadoPorId_fkey"
      FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Amistoso_societyId_fkey') THEN
    ALTER TABLE "Amistoso" ADD CONSTRAINT "Amistoso_societyId_fkey"
      FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Amistoso_campoId_fkey') THEN
    ALTER TABLE "Amistoso" ADD CONSTRAINT "Amistoso_campoId_fkey"
      FOREIGN KEY ("campoId") REFERENCES "Campo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Amistoso_timeAId_fkey') THEN
    ALTER TABLE "Amistoso" ADD CONSTRAINT "Amistoso_timeAId_fkey"
      FOREIGN KEY ("timeAId") REFERENCES "Time"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Amistoso_timeBId_fkey') THEN
    ALTER TABLE "Amistoso" ADD CONSTRAINT "Amistoso_timeBId_fkey"
      FOREIGN KEY ("timeBId") REFERENCES "Time"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Amistoso_agendamentoId_fkey') THEN
    ALTER TABLE "Amistoso" ADD CONSTRAINT "Amistoso_agendamentoId_fkey"
      FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PresencaAmistoso_amistosoId_fkey') THEN
    ALTER TABLE "PresencaAmistoso" ADD CONSTRAINT "PresencaAmistoso_amistosoId_fkey"
      FOREIGN KEY ("amistosoId") REFERENCES "Amistoso"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PresencaAmistoso_usuarioId_fkey') THEN
    ALTER TABLE "PresencaAmistoso" ADD CONSTRAINT "PresencaAmistoso_usuarioId_fkey"
      FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PresencaAmistoso_timeId_fkey') THEN
    ALTER TABLE "PresencaAmistoso" ADD CONSTRAINT "PresencaAmistoso_timeId_fkey"
      FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
