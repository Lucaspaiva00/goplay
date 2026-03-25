-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('PLAYER', 'DONO_TIME', 'DONO_SOCIETY');

-- CreateEnum
CREATE TYPE "TipoPagamento" AS ENUM ('AVULSO', 'MENSALISTA', 'CONSUMO_BAR');

-- CreateEnum
CREATE TYPE "DesempateTipo" AS ENUM ('PENALTIS', 'WO', 'MELHOR_CAMPANHA', 'OUTRO');

-- CreateEnum
CREATE TYPE "EventoTipo" AS ENUM ('GOL', 'CARTAO_AMARELO', 'CARTAO_VERMELHO', 'CHUTE', 'CHUTE_NO_GOL', 'ESCANTEIO', 'LATERAL', 'FALTA', 'SUBSTITUICAO', 'OBSERVACAO');

-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('PENDENTE', 'CONFIRMADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'PAGO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('PIX', 'DINHEIRO', 'CARTAO', 'TRANSFERENCIA', 'OUTRO');

-- CreateEnum
CREATE TYPE "ModalidadeCampeonato" AS ENUM ('FUTEBOL', 'FUTSAL', 'SOCIETY', 'ESPORTS', 'OUTRO');

-- CreateEnum
CREATE TYPE "CategoriaCampeonato" AS ENUM ('ADULTO', 'SUB_15', 'SUB_17', 'SUB_20', 'FEMININO', 'AMADOR', 'PROFISSIONAL', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusCampeonato" AS ENUM ('EM_CRIACAO', 'INSCRICOES_ABERTAS', 'EM_ANDAMENTO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "TipoCampeonato" AS ENUM ('PONTOS_CORRIDOS', 'MATA_MATA', 'GRUPOS', 'GRUPOS_MATA_MATA', 'LIGA_IDA_VOLTA', 'COPA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "telefone" TEXT,
    "pernaMelhor" TEXT,
    "posicaoCampo" TEXT,
    "altura" DOUBLE PRECISION,
    "peso" DOUBLE PRECISION,
    "modalidade" TEXT,
    "nascimento" TIMESTAMP(3),
    "goleiro" BOOLEAN,
    "sexo" TEXT,
    "tipo" "TipoUsuario" NOT NULL DEFAULT 'PLAYER',
    "timeRelacionadoId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Society" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "imagem" TEXT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "youtube" TEXT,
    "cep" TEXT,
    "endereco" TEXT,
    "estado" TEXT,
    "cidade" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Society_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cardapio" (
    "id" SERIAL NOT NULL,
    "societyId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cardapio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campo" (
    "id" SERIAL NOT NULL,
    "societyId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "valorAvulso" DOUBLE PRECISION,
    "valorMensal" DOUBLE PRECISION,
    "fotoUrl" TEXT,
    "dimensoes" TEXT,
    "gramado" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Time" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "brasao" TEXT,
    "descricao" TEXT,
    "estado" TEXT,
    "cidade" TEXT,
    "modalidade" TEXT,
    "societyId" INTEGER NOT NULL,
    "donoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Time_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "societyId" INTEGER NOT NULL,
    "timeId" INTEGER,
    "campoId" INTEGER,
    "agendamentoId" INTEGER,
    "tipo" "TipoPagamento" NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "descricao" TEXT,
    "status" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "forma" "FormaPagamento" NOT NULL DEFAULT 'PIX',
    "pagoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agendamento" (
    "id" SERIAL NOT NULL,
    "societyId" INTEGER NOT NULL,
    "campoId" INTEGER NOT NULL,
    "timeId" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "status" "StatusAgendamento" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agendamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocietyPlayer" (
    "id" SERIAL NOT NULL,
    "societyId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocietyPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campeonato" (
    "id" SERIAL NOT NULL,
    "societyId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoCampeonato" NOT NULL,
    "maxTimes" INTEGER NOT NULL,
    "modalidade" "ModalidadeCampeonato" NOT NULL DEFAULT 'SOCIETY',
    "categoria" "CategoriaCampeonato" NOT NULL DEFAULT 'ADULTO',
    "temporada" TEXT,
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "status" "StatusCampeonato" NOT NULL DEFAULT 'EM_CRIACAO',
    "regulamentoTexto" TEXT,
    "regulamentoUrl" TEXT,
    "faseAtual" TEXT NOT NULL DEFAULT 'GRUPOS',
    "roundAtual" INTEGER NOT NULL DEFAULT 1,
    "campeaoId" INTEGER,
    "viceCampeaoId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campeonato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeCampeonato" (
    "id" SERIAL NOT NULL,
    "campeonatoId" INTEGER NOT NULL,
    "timeId" INTEGER NOT NULL,

    CONSTRAINT "TimeCampeonato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grupo" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "campeonatoId" INTEGER NOT NULL,

    CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeGrupo" (
    "id" SERIAL NOT NULL,
    "grupoId" INTEGER NOT NULL,
    "timeId" INTEGER NOT NULL,
    "pontos" INTEGER NOT NULL DEFAULT 0,
    "vitorias" INTEGER NOT NULL DEFAULT 0,
    "empates" INTEGER NOT NULL DEFAULT 0,
    "derrotas" INTEGER NOT NULL DEFAULT 0,
    "golsPro" INTEGER NOT NULL DEFAULT 0,
    "golsContra" INTEGER NOT NULL DEFAULT 0,
    "saldoGols" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TimeGrupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jogo" (
    "id" SERIAL NOT NULL,
    "campeonatoId" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "grupoId" INTEGER,
    "timeAId" INTEGER NOT NULL,
    "timeBId" INTEGER NOT NULL,
    "golsA" INTEGER,
    "golsB" INTEGER,
    "vencedorId" INTEGER,
    "desempateTipo" "DesempateTipo",
    "penaltisA" INTEGER,
    "penaltisB" INTEGER,
    "observacao" TEXT,
    "dataHora" TIMESTAMP(3),
    "finalizado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Jogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstatisticaJogo" (
    "id" SERIAL NOT NULL,
    "jogoId" INTEGER NOT NULL,
    "jogadorId" INTEGER NOT NULL,
    "gols" INTEGER NOT NULL DEFAULT 0,
    "amarelos" INTEGER NOT NULL DEFAULT 0,
    "vermelhos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EstatisticaJogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TabelaCampeonato" (
    "id" SERIAL NOT NULL,
    "campeonatoId" INTEGER NOT NULL,
    "timeId" INTEGER NOT NULL,
    "pontos" INTEGER NOT NULL DEFAULT 0,
    "vitorias" INTEGER NOT NULL DEFAULT 0,
    "empates" INTEGER NOT NULL DEFAULT 0,
    "derrotas" INTEGER NOT NULL DEFAULT 0,
    "golsPro" INTEGER NOT NULL DEFAULT 0,
    "golsContra" INTEGER NOT NULL DEFAULT 0,
    "saldoGols" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TabelaCampeonato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JogoEstatisticaTime" (
    "id" SERIAL NOT NULL,
    "jogoId" INTEGER NOT NULL,
    "timeId" INTEGER NOT NULL,
    "chutes" INTEGER NOT NULL DEFAULT 0,
    "chutesNoGol" INTEGER NOT NULL DEFAULT 0,
    "escanteios" INTEGER NOT NULL DEFAULT 0,
    "laterais" INTEGER NOT NULL DEFAULT 0,
    "faltas" INTEGER NOT NULL DEFAULT 0,
    "posse" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JogoEstatisticaTime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JogoJogador" (
    "id" SERIAL NOT NULL,
    "jogoId" INTEGER NOT NULL,
    "timeId" INTEGER NOT NULL,
    "jogadorId" INTEGER NOT NULL,
    "titular" BOOLEAN NOT NULL DEFAULT false,
    "entrouMinuto" INTEGER,
    "saiuMinuto" INTEGER,

    CONSTRAINT "JogoJogador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JogoEvento" (
    "id" SERIAL NOT NULL,
    "jogoId" INTEGER NOT NULL,
    "tipo" "EventoTipo" NOT NULL,
    "minuto" INTEGER,
    "timeId" INTEGER,
    "jogadorId" INTEGER,
    "jogadorSaindoId" INTEGER,
    "jogadorEntrandoId" INTEGER,
    "detalhe" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JogoEvento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_cpf_key" ON "Usuario"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_timeRelacionadoId_idx" ON "Usuario"("timeRelacionadoId");

-- CreateIndex
CREATE INDEX "Society_usuarioId_idx" ON "Society"("usuarioId");

-- CreateIndex
CREATE INDEX "Cardapio_societyId_idx" ON "Cardapio"("societyId");

-- CreateIndex
CREATE INDEX "Campo_societyId_idx" ON "Campo"("societyId");

-- CreateIndex
CREATE UNIQUE INDEX "Campo_societyId_nome_key" ON "Campo"("societyId", "nome");

-- CreateIndex
CREATE INDEX "Time_societyId_idx" ON "Time"("societyId");

-- CreateIndex
CREATE INDEX "Time_donoId_idx" ON "Time"("donoId");

-- CreateIndex
CREATE UNIQUE INDEX "Time_societyId_nome_key" ON "Time"("societyId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_agendamentoId_key" ON "Pagamento"("agendamentoId");

-- CreateIndex
CREATE INDEX "Pagamento_societyId_idx" ON "Pagamento"("societyId");

-- CreateIndex
CREATE INDEX "Pagamento_usuarioId_idx" ON "Pagamento"("usuarioId");

-- CreateIndex
CREATE INDEX "Pagamento_timeId_idx" ON "Pagamento"("timeId");

-- CreateIndex
CREATE INDEX "Pagamento_campoId_idx" ON "Pagamento"("campoId");

-- CreateIndex
CREATE INDEX "Agendamento_societyId_campoId_data_idx" ON "Agendamento"("societyId", "campoId", "data");

-- CreateIndex
CREATE INDEX "Agendamento_timeId_data_idx" ON "Agendamento"("timeId", "data");

-- CreateIndex
CREATE INDEX "SocietyPlayer_societyId_idx" ON "SocietyPlayer"("societyId");

-- CreateIndex
CREATE INDEX "SocietyPlayer_usuarioId_idx" ON "SocietyPlayer"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "SocietyPlayer_societyId_usuarioId_key" ON "SocietyPlayer"("societyId", "usuarioId");

-- CreateIndex
CREATE INDEX "Notificacao_usuarioId_idx" ON "Notificacao"("usuarioId");

-- CreateIndex
CREATE INDEX "Campeonato_societyId_idx" ON "Campeonato"("societyId");

-- CreateIndex
CREATE INDEX "Campeonato_campeaoId_idx" ON "Campeonato"("campeaoId");

-- CreateIndex
CREATE INDEX "Campeonato_viceCampeaoId_idx" ON "Campeonato"("viceCampeaoId");

-- CreateIndex
CREATE INDEX "Campeonato_status_idx" ON "Campeonato"("status");

-- CreateIndex
CREATE INDEX "TimeCampeonato_campeonatoId_idx" ON "TimeCampeonato"("campeonatoId");

-- CreateIndex
CREATE INDEX "TimeCampeonato_timeId_idx" ON "TimeCampeonato"("timeId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeCampeonato_campeonatoId_timeId_key" ON "TimeCampeonato"("campeonatoId", "timeId");

-- CreateIndex
CREATE INDEX "Grupo_campeonatoId_idx" ON "Grupo"("campeonatoId");

-- CreateIndex
CREATE INDEX "TimeGrupo_grupoId_idx" ON "TimeGrupo"("grupoId");

-- CreateIndex
CREATE INDEX "TimeGrupo_timeId_idx" ON "TimeGrupo"("timeId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeGrupo_grupoId_timeId_key" ON "TimeGrupo"("grupoId", "timeId");

-- CreateIndex
CREATE INDEX "Jogo_campeonatoId_idx" ON "Jogo"("campeonatoId");

-- CreateIndex
CREATE INDEX "Jogo_grupoId_idx" ON "Jogo"("grupoId");

-- CreateIndex
CREATE INDEX "Jogo_timeAId_idx" ON "Jogo"("timeAId");

-- CreateIndex
CREATE INDEX "Jogo_timeBId_idx" ON "Jogo"("timeBId");

-- CreateIndex
CREATE INDEX "Jogo_vencedorId_idx" ON "Jogo"("vencedorId");

-- CreateIndex
CREATE INDEX "EstatisticaJogo_jogoId_idx" ON "EstatisticaJogo"("jogoId");

-- CreateIndex
CREATE INDEX "EstatisticaJogo_jogadorId_idx" ON "EstatisticaJogo"("jogadorId");

-- CreateIndex
CREATE INDEX "TabelaCampeonato_campeonatoId_idx" ON "TabelaCampeonato"("campeonatoId");

-- CreateIndex
CREATE INDEX "TabelaCampeonato_timeId_idx" ON "TabelaCampeonato"("timeId");

-- CreateIndex
CREATE UNIQUE INDEX "TabelaCampeonato_campeonatoId_timeId_key" ON "TabelaCampeonato"("campeonatoId", "timeId");

-- CreateIndex
CREATE INDEX "JogoEstatisticaTime_jogoId_idx" ON "JogoEstatisticaTime"("jogoId");

-- CreateIndex
CREATE INDEX "JogoEstatisticaTime_timeId_idx" ON "JogoEstatisticaTime"("timeId");

-- CreateIndex
CREATE UNIQUE INDEX "JogoEstatisticaTime_jogoId_timeId_key" ON "JogoEstatisticaTime"("jogoId", "timeId");

-- CreateIndex
CREATE INDEX "JogoJogador_jogoId_idx" ON "JogoJogador"("jogoId");

-- CreateIndex
CREATE INDEX "JogoJogador_timeId_idx" ON "JogoJogador"("timeId");

-- CreateIndex
CREATE INDEX "JogoJogador_jogadorId_idx" ON "JogoJogador"("jogadorId");

-- CreateIndex
CREATE UNIQUE INDEX "JogoJogador_jogoId_jogadorId_key" ON "JogoJogador"("jogoId", "jogadorId");

-- CreateIndex
CREATE INDEX "JogoEvento_jogoId_idx" ON "JogoEvento"("jogoId");

-- CreateIndex
CREATE INDEX "JogoEvento_timeId_idx" ON "JogoEvento"("timeId");

-- CreateIndex
CREATE INDEX "JogoEvento_jogadorId_idx" ON "JogoEvento"("jogadorId");

-- CreateIndex
CREATE INDEX "JogoEvento_jogadorSaindoId_idx" ON "JogoEvento"("jogadorSaindoId");

-- CreateIndex
CREATE INDEX "JogoEvento_jogadorEntrandoId_idx" ON "JogoEvento"("jogadorEntrandoId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_timeRelacionadoId_fkey" FOREIGN KEY ("timeRelacionadoId") REFERENCES "Time"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Society" ADD CONSTRAINT "Society_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cardapio" ADD CONSTRAINT "Cardapio_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campo" ADD CONSTRAINT "Campo_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Time" ADD CONSTRAINT "Time_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Time" ADD CONSTRAINT "Time_donoId_fkey" FOREIGN KEY ("donoId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_timeId_fkey" FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_campoId_fkey" FOREIGN KEY ("campoId") REFERENCES "Campo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_campoId_fkey" FOREIGN KEY ("campoId") REFERENCES "Campo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_timeId_fkey" FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocietyPlayer" ADD CONSTRAINT "SocietyPlayer_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocietyPlayer" ADD CONSTRAINT "SocietyPlayer_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campeonato" ADD CONSTRAINT "Campeonato_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campeonato" ADD CONSTRAINT "Campeonato_campeaoId_fkey" FOREIGN KEY ("campeaoId") REFERENCES "Time"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campeonato" ADD CONSTRAINT "Campeonato_viceCampeaoId_fkey" FOREIGN KEY ("viceCampeaoId") REFERENCES "Time"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeCampeonato" ADD CONSTRAINT "TimeCampeonato_campeonatoId_fkey" FOREIGN KEY ("campeonatoId") REFERENCES "Campeonato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeCampeonato" ADD CONSTRAINT "TimeCampeonato_timeId_fkey" FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_campeonatoId_fkey" FOREIGN KEY ("campeonatoId") REFERENCES "Campeonato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeGrupo" ADD CONSTRAINT "TimeGrupo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeGrupo" ADD CONSTRAINT "TimeGrupo_timeId_fkey" FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jogo" ADD CONSTRAINT "Jogo_campeonatoId_fkey" FOREIGN KEY ("campeonatoId") REFERENCES "Campeonato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jogo" ADD CONSTRAINT "Jogo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jogo" ADD CONSTRAINT "Jogo_timeAId_fkey" FOREIGN KEY ("timeAId") REFERENCES "Time"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jogo" ADD CONSTRAINT "Jogo_timeBId_fkey" FOREIGN KEY ("timeBId") REFERENCES "Time"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jogo" ADD CONSTRAINT "Jogo_vencedorId_fkey" FOREIGN KEY ("vencedorId") REFERENCES "Time"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstatisticaJogo" ADD CONSTRAINT "EstatisticaJogo_jogoId_fkey" FOREIGN KEY ("jogoId") REFERENCES "Jogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstatisticaJogo" ADD CONSTRAINT "EstatisticaJogo_jogadorId_fkey" FOREIGN KEY ("jogadorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TabelaCampeonato" ADD CONSTRAINT "TabelaCampeonato_campeonatoId_fkey" FOREIGN KEY ("campeonatoId") REFERENCES "Campeonato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TabelaCampeonato" ADD CONSTRAINT "TabelaCampeonato_timeId_fkey" FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JogoEstatisticaTime" ADD CONSTRAINT "JogoEstatisticaTime_jogoId_fkey" FOREIGN KEY ("jogoId") REFERENCES "Jogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JogoEstatisticaTime" ADD CONSTRAINT "JogoEstatisticaTime_timeId_fkey" FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JogoJogador" ADD CONSTRAINT "JogoJogador_jogoId_fkey" FOREIGN KEY ("jogoId") REFERENCES "Jogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JogoJogador" ADD CONSTRAINT "JogoJogador_timeId_fkey" FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JogoJogador" ADD CONSTRAINT "JogoJogador_jogadorId_fkey" FOREIGN KEY ("jogadorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JogoEvento" ADD CONSTRAINT "JogoEvento_jogoId_fkey" FOREIGN KEY ("jogoId") REFERENCES "Jogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JogoEvento" ADD CONSTRAINT "JogoEvento_timeId_fkey" FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JogoEvento" ADD CONSTRAINT "JogoEvento_jogadorId_fkey" FOREIGN KEY ("jogadorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JogoEvento" ADD CONSTRAINT "JogoEvento_jogadorSaindoId_fkey" FOREIGN KEY ("jogadorSaindoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JogoEvento" ADD CONSTRAINT "JogoEvento_jogadorEntrandoId_fkey" FOREIGN KEY ("jogadorEntrandoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
