-- CreateEnum
CREATE TYPE "StatusComanda" AS ENUM ('ABERTA', 'FECHADA', 'PAGA', 'CANCELADA');

-- CreateTable
CREATE TABLE "Comanda" (
    "id" SERIAL NOT NULL,
    "societyId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "timeId" INTEGER,
    "status" "StatusComanda" NOT NULL DEFAULT 'ABERTA',
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "codigo" TEXT,
    "fechadaEm" TIMESTAMP(3),
    "pagaEm" TIMESTAMP(3),
    "pagamentoId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comanda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComandaItem" (
    "id" SERIAL NOT NULL,
    "comandaId" INTEGER NOT NULL,
    "cardapioId" INTEGER NOT NULL,
    "nomeProduto" TEXT NOT NULL,
    "precoUnitario" DOUBLE PRECISION NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComandaItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Comanda_codigo_key" ON "Comanda"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Comanda_pagamentoId_key" ON "Comanda"("pagamentoId");

-- CreateIndex
CREATE INDEX "Comanda_societyId_idx" ON "Comanda"("societyId");

-- CreateIndex
CREATE INDEX "Comanda_usuarioId_idx" ON "Comanda"("usuarioId");

-- CreateIndex
CREATE INDEX "Comanda_timeId_idx" ON "Comanda"("timeId");

-- CreateIndex
CREATE INDEX "Comanda_status_idx" ON "Comanda"("status");

-- CreateIndex
CREATE INDEX "ComandaItem_comandaId_idx" ON "ComandaItem"("comandaId");

-- CreateIndex
CREATE INDEX "ComandaItem_cardapioId_idx" ON "ComandaItem"("cardapioId");

-- AddForeignKey
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_timeId_fkey" FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_pagamentoId_fkey" FOREIGN KEY ("pagamentoId") REFERENCES "Pagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComandaItem" ADD CONSTRAINT "ComandaItem_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "Comanda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComandaItem" ADD CONSTRAINT "ComandaItem_cardapioId_fkey" FOREIGN KEY ("cardapioId") REFERENCES "Cardapio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
