CREATE TYPE "FuncaoFuncionario" AS ENUM ('ADMIN', 'MESARIO', 'CAIXA', 'BAR', 'RECEPCAO');

CREATE TABLE "Funcionario" (
    "id" SERIAL NOT NULL,
    "societyId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "acesso" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "funcao" "FuncaoFuncionario" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "ultimoAcessoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Funcionario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificacaoFuncionario" (
    "id" SERIAL NOT NULL,
    "funcionarioId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificacaoFuncionario_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Funcionario_acesso_key" ON "Funcionario"("acesso");
CREATE INDEX "Funcionario_societyId_idx" ON "Funcionario"("societyId");
CREATE INDEX "Funcionario_funcao_idx" ON "Funcionario"("funcao");
CREATE INDEX "Funcionario_ativo_idx" ON "Funcionario"("ativo");
CREATE INDEX "NotificacaoFuncionario_funcionarioId_idx" ON "NotificacaoFuncionario"("funcionarioId");
CREATE INDEX "NotificacaoFuncionario_lido_idx" ON "NotificacaoFuncionario"("lido");

ALTER TABLE "Funcionario" ADD CONSTRAINT "Funcionario_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificacaoFuncionario" ADD CONSTRAINT "NotificacaoFuncionario_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Pagamento" ADD COLUMN "avisoPagamentoEm" TIMESTAMP(3);
