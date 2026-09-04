-- Fase 2 - Mesa de Jogo e operação em tempo real
CREATE TYPE "StatusOperacaoJogo" AS ENUM ('AGENDADO', 'AO_VIVO', 'INTERVALO', 'ENCERRADO');

ALTER TABLE "Jogo"
ADD COLUMN "mesarioNome" TEXT,
ADD COLUMN "mesaToken" TEXT,
ADD COLUMN "statusOperacao" "StatusOperacaoJogo" NOT NULL DEFAULT 'AGENDADO',
ADD COLUMN "cronometroSegundos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "cronometroInicioEm" TIMESTAMP(3),
ADD COLUMN "periodo" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "iniciadoEm" TIMESTAMP(3),
ADD COLUMN "encerradoEm" TIMESTAMP(3);

CREATE UNIQUE INDEX "Jogo_mesaToken_key" ON "Jogo"("mesaToken");
CREATE INDEX "Jogo_statusOperacao_idx" ON "Jogo"("statusOperacao");
