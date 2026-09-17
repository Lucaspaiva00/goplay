-- Horários de funcionamento por empresa/dia
CREATE TABLE "SocietyHorarioFuncionamento" (
    "id" SERIAL NOT NULL,
    "societyId" INTEGER NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "horaInicio" TEXT,
    "horaFim" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SocietyHorarioFuncionamento_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SocietyHorarioFuncionamento_societyId_diaSemana_key" ON "SocietyHorarioFuncionamento"("societyId", "diaSemana");
CREATE INDEX "SocietyHorarioFuncionamento_societyId_idx" ON "SocietyHorarioFuncionamento"("societyId");
CREATE INDEX "SocietyHorarioFuncionamento_diaSemana_idx" ON "SocietyHorarioFuncionamento"("diaSemana");
ALTER TABLE "SocietyHorarioFuncionamento" ADD CONSTRAINT "SocietyHorarioFuncionamento_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Convites de campeonato
CREATE TYPE "StatusConviteCampeonato" AS ENUM ('PENDENTE', 'ACEITO', 'RECUSADO');
CREATE TYPE "StatusConviteJogadorCampeonato" AS ENUM ('PENDENTE', 'ACEITO', 'RECUSADO');

CREATE TABLE "ConviteCampeonatoTime" (
    "id" SERIAL NOT NULL,
    "campeonatoId" INTEGER NOT NULL,
    "timeId" INTEGER NOT NULL,
    "status" "StatusConviteCampeonato" NOT NULL DEFAULT 'PENDENTE',
    "convidadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondidoEm" TIMESTAMP(3),
    CONSTRAINT "ConviteCampeonatoTime_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ConviteCampeonatoTime_campeonatoId_timeId_key" ON "ConviteCampeonatoTime"("campeonatoId", "timeId");
CREATE INDEX "ConviteCampeonatoTime_campeonatoId_idx" ON "ConviteCampeonatoTime"("campeonatoId");
CREATE INDEX "ConviteCampeonatoTime_timeId_idx" ON "ConviteCampeonatoTime"("timeId");
CREATE INDEX "ConviteCampeonatoTime_status_idx" ON "ConviteCampeonatoTime"("status");
ALTER TABLE "ConviteCampeonatoTime" ADD CONSTRAINT "ConviteCampeonatoTime_campeonatoId_fkey" FOREIGN KEY ("campeonatoId") REFERENCES "Campeonato"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConviteCampeonatoTime" ADD CONSTRAINT "ConviteCampeonatoTime_timeId_fkey" FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ConviteCampeonatoJogador" (
    "id" SERIAL NOT NULL,
    "conviteTimeId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "status" "StatusConviteJogadorCampeonato" NOT NULL DEFAULT 'PENDENTE',
    "convidadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondidoEm" TIMESTAMP(3),
    CONSTRAINT "ConviteCampeonatoJogador_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ConviteCampeonatoJogador_conviteTimeId_usuarioId_key" ON "ConviteCampeonatoJogador"("conviteTimeId", "usuarioId");
CREATE INDEX "ConviteCampeonatoJogador_conviteTimeId_idx" ON "ConviteCampeonatoJogador"("conviteTimeId");
CREATE INDEX "ConviteCampeonatoJogador_usuarioId_idx" ON "ConviteCampeonatoJogador"("usuarioId");
CREATE INDEX "ConviteCampeonatoJogador_status_idx" ON "ConviteCampeonatoJogador"("status");
ALTER TABLE "ConviteCampeonatoJogador" ADD CONSTRAINT "ConviteCampeonatoJogador_conviteTimeId_fkey" FOREIGN KEY ("conviteTimeId") REFERENCES "ConviteCampeonatoTime"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConviteCampeonatoJogador" ADD CONSTRAINT "ConviteCampeonatoJogador_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Solicitação de fechamento de comanda
ALTER TYPE "StatusComanda" ADD VALUE IF NOT EXISTS 'FECHAMENTO_SOLICITADO' AFTER 'ABERTA';
ALTER TABLE "Comanda" ADD COLUMN "fechamentoSolicitadoEm" TIMESTAMP(3);
