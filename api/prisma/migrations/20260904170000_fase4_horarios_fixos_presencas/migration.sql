-- Fase 4 - Horários fixos, grupos, presença e notificações acionáveis
CREATE TYPE "StatusPresencaHorario" AS ENUM ('PENDENTE', 'VOU', 'NAO_VOU');
CREATE TYPE "TipoCobrancaHorario" AS ENUM ('POR_JOGO', 'MENSAL');
CREATE TYPE "StatusHorarioFixo" AS ENUM ('PENDENTE', 'APROVADO', 'RECUSADO', 'PAUSADO');

ALTER TABLE "Usuario"
ADD COLUMN "disponivelParaConvites" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Notificacao"
ADD COLUMN "url" TEXT;

ALTER TABLE "NotificacaoFuncionario"
ADD COLUMN "url" TEXT;

-- Agendamento deixa de exigir um time: grupos de pelada/horário fixo são independentes de equipe de campeonato.
ALTER TABLE "Agendamento"
ALTER COLUMN "timeId" DROP NOT NULL,
ADD COLUMN "grupoHorarioId" INTEGER,
ADD COLUMN "horarioFixoId" INTEGER,
ADD COLUMN "organizadorId" INTEGER;

CREATE TABLE "GrupoHorario" (
    "id" SERIAL NOT NULL,
    "societyId" INTEGER NOT NULL,
    "organizadorId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "maxJogadores" INTEGER NOT NULL DEFAULT 20,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GrupoHorario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrupoHorarioMembro" (
    "id" SERIAL NOT NULL,
    "grupoId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "convidadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GrupoHorarioMembro_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HorarioFixo" (
    "id" SERIAL NOT NULL,
    "grupoId" INTEGER NOT NULL,
    "societyId" INTEGER NOT NULL,
    "campoId" INTEGER NOT NULL,
    "organizadorId" INTEGER NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "tipoCobranca" "TipoCobrancaHorario" NOT NULL DEFAULT 'POR_JOGO',
    "status" "StatusHorarioFixo" NOT NULL DEFAULT 'PENDENTE',
    "quantidadeSemanas" INTEGER NOT NULL DEFAULT 12,
    "valorPorJogo" DOUBLE PRECISION,
    "valorMensal" DOUBLE PRECISION,
    "dividirValor" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HorarioFixo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PresencaHorario" (
    "id" SERIAL NOT NULL,
    "agendamentoId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "status" "StatusPresencaHorario" NOT NULL DEFAULT 'PENDENTE',
    "respondidoEm" TIMESTAMP(3),
    "valorRateio" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PresencaHorario_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GrupoHorarioMembro_grupoId_usuarioId_key" ON "GrupoHorarioMembro"("grupoId", "usuarioId");
CREATE UNIQUE INDEX "PresencaHorario_agendamentoId_usuarioId_key" ON "PresencaHorario"("agendamentoId", "usuarioId");

CREATE INDEX "GrupoHorario_societyId_idx" ON "GrupoHorario"("societyId");
CREATE INDEX "GrupoHorario_organizadorId_idx" ON "GrupoHorario"("organizadorId");
CREATE INDEX "GrupoHorario_ativo_idx" ON "GrupoHorario"("ativo");
CREATE INDEX "GrupoHorarioMembro_grupoId_idx" ON "GrupoHorarioMembro"("grupoId");
CREATE INDEX "GrupoHorarioMembro_usuarioId_idx" ON "GrupoHorarioMembro"("usuarioId");
CREATE INDEX "HorarioFixo_grupoId_idx" ON "HorarioFixo"("grupoId");
CREATE INDEX "HorarioFixo_societyId_idx" ON "HorarioFixo"("societyId");
CREATE INDEX "HorarioFixo_campoId_idx" ON "HorarioFixo"("campoId");
CREATE INDEX "HorarioFixo_organizadorId_idx" ON "HorarioFixo"("organizadorId");
CREATE INDEX "HorarioFixo_ativo_idx" ON "HorarioFixo"("ativo");
CREATE INDEX "HorarioFixo_status_idx" ON "HorarioFixo"("status");
CREATE INDEX "PresencaHorario_agendamentoId_idx" ON "PresencaHorario"("agendamentoId");
CREATE INDEX "PresencaHorario_usuarioId_idx" ON "PresencaHorario"("usuarioId");
CREATE INDEX "PresencaHorario_status_idx" ON "PresencaHorario"("status");
CREATE INDEX "Agendamento_grupoHorarioId_data_idx" ON "Agendamento"("grupoHorarioId", "data");
CREATE INDEX "Agendamento_horarioFixoId_data_idx" ON "Agendamento"("horarioFixoId", "data");
CREATE INDEX "Agendamento_organizadorId_data_idx" ON "Agendamento"("organizadorId", "data");

ALTER TABLE "GrupoHorario" ADD CONSTRAINT "GrupoHorario_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrupoHorario" ADD CONSTRAINT "GrupoHorario_organizadorId_fkey" FOREIGN KEY ("organizadorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrupoHorarioMembro" ADD CONSTRAINT "GrupoHorarioMembro_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "GrupoHorario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrupoHorarioMembro" ADD CONSTRAINT "GrupoHorarioMembro_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HorarioFixo" ADD CONSTRAINT "HorarioFixo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "GrupoHorario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HorarioFixo" ADD CONSTRAINT "HorarioFixo_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HorarioFixo" ADD CONSTRAINT "HorarioFixo_campoId_fkey" FOREIGN KEY ("campoId") REFERENCES "Campo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HorarioFixo" ADD CONSTRAINT "HorarioFixo_organizadorId_fkey" FOREIGN KEY ("organizadorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_grupoHorarioId_fkey" FOREIGN KEY ("grupoHorarioId") REFERENCES "GrupoHorario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_horarioFixoId_fkey" FOREIGN KEY ("horarioFixoId") REFERENCES "HorarioFixo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_organizadorId_fkey" FOREIGN KEY ("organizadorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PresencaHorario" ADD CONSTRAINT "PresencaHorario_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PresencaHorario" ADD CONSTRAINT "PresencaHorario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
