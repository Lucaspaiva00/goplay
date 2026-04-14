-- CreateEnum
CREATE TYPE "TipoVinculoTime" AS ENUM ('AVULSO', 'MENSALISTA');

-- CreateEnum
CREATE TYPE "StatusVinculoTime" AS ENUM ('PENDENTE', 'APROVADO', 'RECUSADO', 'INATIVO');

-- AlterTable
ALTER TABLE "Time" ADD COLUMN     "aprovadoEm" TIMESTAMP(3),
ADD COLUMN     "diaVencimento" INTEGER,
ADD COLUMN     "observacaoVinculo" TEXT,
ADD COLUMN     "statusVinculo" "StatusVinculoTime" NOT NULL DEFAULT 'PENDENTE',
ADD COLUMN     "tipoVinculo" "TipoVinculoTime" NOT NULL DEFAULT 'AVULSO',
ADD COLUMN     "valorMensalidade" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Time_tipoVinculo_idx" ON "Time"("tipoVinculo");

-- CreateIndex
CREATE INDEX "Time_statusVinculo_idx" ON "Time"("statusVinculo");
