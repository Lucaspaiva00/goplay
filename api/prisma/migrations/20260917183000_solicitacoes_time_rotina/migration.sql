-- Vincula a rotina recorrente diretamente a um time
ALTER TABLE "GrupoHorario" ADD COLUMN "timeId" INTEGER;

CREATE UNIQUE INDEX "GrupoHorario_timeId_key" ON "GrupoHorario"("timeId");
CREATE INDEX "GrupoHorario_timeId_idx" ON "GrupoHorario"("timeId");

ALTER TABLE "GrupoHorario"
ADD CONSTRAINT "GrupoHorario_timeId_fkey"
FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Solicitação formal de entrada de jogador em time
CREATE TYPE "StatusSolicitacaoTime" AS ENUM ('PENDENTE', 'APROVADA', 'RECUSADA', 'CANCELADA');

CREATE TABLE "SolicitacaoEntradaTime" (
    "id" SERIAL NOT NULL,
    "timeId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "status" "StatusSolicitacaoTime" NOT NULL DEFAULT 'PENDENTE',
    "solicitadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondidoEm" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitacaoEntradaTime_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SolicitacaoEntradaTime_timeId_usuarioId_key" ON "SolicitacaoEntradaTime"("timeId", "usuarioId");
CREATE INDEX "SolicitacaoEntradaTime_timeId_idx" ON "SolicitacaoEntradaTime"("timeId");
CREATE INDEX "SolicitacaoEntradaTime_usuarioId_idx" ON "SolicitacaoEntradaTime"("usuarioId");
CREATE INDEX "SolicitacaoEntradaTime_status_idx" ON "SolicitacaoEntradaTime"("status");

ALTER TABLE "SolicitacaoEntradaTime"
ADD CONSTRAINT "SolicitacaoEntradaTime_timeId_fkey"
FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SolicitacaoEntradaTime"
ADD CONSTRAINT "SolicitacaoEntradaTime_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
