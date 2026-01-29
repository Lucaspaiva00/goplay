-- CreateTable
CREATE TABLE `Usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `cpf` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha` VARCHAR(191) NOT NULL,
    `telefone` VARCHAR(191) NULL,
    `pernaMelhor` VARCHAR(191) NULL,
    `posicaoCampo` VARCHAR(191) NULL,
    `altura` DOUBLE NULL,
    `peso` DOUBLE NULL,
    `modalidade` VARCHAR(191) NULL,
    `nascimento` DATETIME(3) NULL,
    `goleiro` BOOLEAN NULL,
    `sexo` VARCHAR(191) NULL,
    `tipo` ENUM('PLAYER', 'DONO_TIME', 'DONO_SOCIETY') NOT NULL DEFAULT 'PLAYER',
    `timeRelacionadoId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Usuario_cpf_key`(`cpf`),
    UNIQUE INDEX `Usuario_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Society` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `imagem` VARCHAR(191) NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `whatsapp` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `instagram` VARCHAR(191) NULL,
    `facebook` VARCHAR(191) NULL,
    `youtube` VARCHAR(191) NULL,
    `cep` VARCHAR(191) NULL,
    `endereco` VARCHAR(191) NULL,
    `estado` VARCHAR(191) NULL,
    `cidade` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cardapio` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societyId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `preco` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Cardapio_societyId_idx`(`societyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Campo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societyId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `valorAvulso` DOUBLE NULL,
    `valorMensal` DOUBLE NULL,
    `fotoUrl` VARCHAR(191) NULL,
    `dimensoes` VARCHAR(191) NULL,
    `gramado` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Campo_societyId_idx`(`societyId`),
    UNIQUE INDEX `Campo_societyId_nome_key`(`societyId`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Time` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `brasao` VARCHAR(191) NULL,
    `descricao` VARCHAR(191) NULL,
    `estado` VARCHAR(191) NULL,
    `cidade` VARCHAR(191) NULL,
    `modalidade` VARCHAR(191) NULL,
    `societyId` INTEGER NOT NULL,
    `donoId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Time_societyId_idx`(`societyId`),
    INDEX `Time_donoId_idx`(`donoId`),
    UNIQUE INDEX `Time_societyId_nome_key`(`societyId`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pagamento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `societyId` INTEGER NOT NULL,
    `timeId` INTEGER NULL,
    `campoId` INTEGER NULL,
    `agendamentoId` INTEGER NULL,
    `tipo` ENUM('AVULSO', 'MENSALISTA', 'CONSUMO_BAR') NOT NULL,
    `valor` DOUBLE NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `status` ENUM('PENDENTE', 'PAGO', 'CANCELADO') NOT NULL DEFAULT 'PENDENTE',
    `forma` ENUM('PIX', 'DINHEIRO', 'CARTAO', 'TRANSFERENCIA', 'OUTRO') NOT NULL DEFAULT 'PIX',
    `pagoEm` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Pagamento_agendamentoId_key`(`agendamentoId`),
    INDEX `Pagamento_societyId_idx`(`societyId`),
    INDEX `Pagamento_usuarioId_idx`(`usuarioId`),
    INDEX `Pagamento_timeId_idx`(`timeId`),
    INDEX `Pagamento_campoId_idx`(`campoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Agendamento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societyId` INTEGER NOT NULL,
    `campoId` INTEGER NOT NULL,
    `timeId` INTEGER NOT NULL,
    `data` DATETIME(3) NOT NULL,
    `horaInicio` VARCHAR(191) NOT NULL,
    `horaFim` VARCHAR(191) NOT NULL,
    `valor` DOUBLE NOT NULL,
    `status` ENUM('PENDENTE', 'CONFIRMADO', 'CANCELADO') NOT NULL DEFAULT 'PENDENTE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Agendamento_societyId_campoId_data_idx`(`societyId`, `campoId`, `data`),
    INDEX `Agendamento_timeId_data_idx`(`timeId`, `data`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SocietyPlayer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societyId` INTEGER NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SocietyPlayer_societyId_idx`(`societyId`),
    INDEX `SocietyPlayer_usuarioId_idx`(`usuarioId`),
    UNIQUE INDEX `SocietyPlayer_societyId_usuarioId_key`(`societyId`, `usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notificacao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `mensagem` VARCHAR(191) NOT NULL,
    `lido` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notificacao_usuarioId_idx`(`usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Campeonato` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societyId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `tipo` ENUM('MATA_MATA', 'GRUPOS') NOT NULL,
    `maxTimes` INTEGER NOT NULL,
    `faseAtual` VARCHAR(191) NOT NULL DEFAULT 'GRUPOS',
    `roundAtual` INTEGER NOT NULL DEFAULT 1,
    `campeaoId` INTEGER NULL,
    `viceCampeaoId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Campeonato_societyId_idx`(`societyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TimeCampeonato` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campeonatoId` INTEGER NOT NULL,
    `timeId` INTEGER NOT NULL,

    INDEX `TimeCampeonato_campeonatoId_idx`(`campeonatoId`),
    INDEX `TimeCampeonato_timeId_idx`(`timeId`),
    UNIQUE INDEX `TimeCampeonato_campeonatoId_timeId_key`(`campeonatoId`, `timeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Grupo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `campeonatoId` INTEGER NOT NULL,

    INDEX `Grupo_campeonatoId_idx`(`campeonatoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TimeGrupo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `grupoId` INTEGER NOT NULL,
    `timeId` INTEGER NOT NULL,
    `pontos` INTEGER NOT NULL DEFAULT 0,
    `vitorias` INTEGER NOT NULL DEFAULT 0,
    `empates` INTEGER NOT NULL DEFAULT 0,
    `derrotas` INTEGER NOT NULL DEFAULT 0,
    `golsPro` INTEGER NOT NULL DEFAULT 0,
    `golsContra` INTEGER NOT NULL DEFAULT 0,
    `saldoGols` INTEGER NOT NULL DEFAULT 0,

    INDEX `TimeGrupo_grupoId_idx`(`grupoId`),
    INDEX `TimeGrupo_timeId_idx`(`timeId`),
    UNIQUE INDEX `TimeGrupo_grupoId_timeId_key`(`grupoId`, `timeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Jogo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campeonatoId` INTEGER NOT NULL,
    `round` INTEGER NOT NULL,
    `grupoId` INTEGER NULL,
    `timeAId` INTEGER NOT NULL,
    `timeBId` INTEGER NOT NULL,
    `golsA` INTEGER NULL,
    `golsB` INTEGER NULL,
    `vencedorId` INTEGER NULL,
    `desempateTipo` ENUM('PENALTIS', 'WO', 'MELHOR_CAMPANHA', 'OUTRO') NULL,
    `penaltisA` INTEGER NULL,
    `penaltisB` INTEGER NULL,
    `observacao` VARCHAR(191) NULL,
    `dataHora` DATETIME(3) NULL,
    `finalizado` BOOLEAN NOT NULL DEFAULT false,

    INDEX `Jogo_campeonatoId_idx`(`campeonatoId`),
    INDEX `Jogo_grupoId_idx`(`grupoId`),
    INDEX `Jogo_timeAId_idx`(`timeAId`),
    INDEX `Jogo_timeBId_idx`(`timeBId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EstatisticaJogo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jogoId` INTEGER NOT NULL,
    `jogadorId` INTEGER NOT NULL,
    `gols` INTEGER NOT NULL DEFAULT 0,
    `amarelos` INTEGER NOT NULL DEFAULT 0,
    `vermelhos` INTEGER NOT NULL DEFAULT 0,

    INDEX `EstatisticaJogo_jogoId_idx`(`jogoId`),
    INDEX `EstatisticaJogo_jogadorId_idx`(`jogadorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TabelaCampeonato` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campeonatoId` INTEGER NOT NULL,
    `timeId` INTEGER NOT NULL,
    `pontos` INTEGER NOT NULL DEFAULT 0,
    `vitorias` INTEGER NOT NULL DEFAULT 0,
    `empates` INTEGER NOT NULL DEFAULT 0,
    `derrotas` INTEGER NOT NULL DEFAULT 0,
    `golsPro` INTEGER NOT NULL DEFAULT 0,
    `golsContra` INTEGER NOT NULL DEFAULT 0,
    `saldoGols` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TabelaCampeonato_campeonatoId_idx`(`campeonatoId`),
    INDEX `TabelaCampeonato_timeId_idx`(`timeId`),
    UNIQUE INDEX `TabelaCampeonato_campeonatoId_timeId_key`(`campeonatoId`, `timeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JogoEstatisticaTime` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jogoId` INTEGER NOT NULL,
    `timeId` INTEGER NOT NULL,
    `chutes` INTEGER NOT NULL DEFAULT 0,
    `chutesNoGol` INTEGER NOT NULL DEFAULT 0,
    `escanteios` INTEGER NOT NULL DEFAULT 0,
    `laterais` INTEGER NOT NULL DEFAULT 0,
    `faltas` INTEGER NOT NULL DEFAULT 0,
    `posse` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `JogoEstatisticaTime_jogoId_idx`(`jogoId`),
    INDEX `JogoEstatisticaTime_timeId_idx`(`timeId`),
    UNIQUE INDEX `JogoEstatisticaTime_jogoId_timeId_key`(`jogoId`, `timeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JogoJogador` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jogoId` INTEGER NOT NULL,
    `timeId` INTEGER NOT NULL,
    `jogadorId` INTEGER NOT NULL,
    `titular` BOOLEAN NOT NULL DEFAULT false,
    `entrouMinuto` INTEGER NULL,
    `saiuMinuto` INTEGER NULL,

    INDEX `JogoJogador_jogoId_idx`(`jogoId`),
    INDEX `JogoJogador_timeId_idx`(`timeId`),
    INDEX `JogoJogador_jogadorId_idx`(`jogadorId`),
    UNIQUE INDEX `JogoJogador_jogoId_jogadorId_key`(`jogoId`, `jogadorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JogoEvento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jogoId` INTEGER NOT NULL,
    `tipo` ENUM('GOL', 'CARTAO_AMARELO', 'CARTAO_VERMELHO', 'CHUTE', 'CHUTE_NO_GOL', 'ESCANTEIO', 'LATERAL', 'FALTA', 'SUBSTITUICAO', 'OBSERVACAO') NOT NULL,
    `minuto` INTEGER NULL,
    `timeId` INTEGER NULL,
    `jogadorId` INTEGER NULL,
    `jogadorSaindoId` INTEGER NULL,
    `jogadorEntrandoId` INTEGER NULL,
    `detalhe` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `JogoEvento_jogoId_idx`(`jogoId`),
    INDEX `JogoEvento_timeId_idx`(`timeId`),
    INDEX `JogoEvento_jogadorId_idx`(`jogadorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Usuario` ADD CONSTRAINT `Usuario_timeRelacionadoId_fkey` FOREIGN KEY (`timeRelacionadoId`) REFERENCES `Time`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Society` ADD CONSTRAINT `Society_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cardapio` ADD CONSTRAINT `Cardapio_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campo` ADD CONSTRAINT `Campo_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Time` ADD CONSTRAINT `Time_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Time` ADD CONSTRAINT `Time_donoId_fkey` FOREIGN KEY (`donoId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pagamento` ADD CONSTRAINT `Pagamento_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pagamento` ADD CONSTRAINT `Pagamento_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pagamento` ADD CONSTRAINT `Pagamento_timeId_fkey` FOREIGN KEY (`timeId`) REFERENCES `Time`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pagamento` ADD CONSTRAINT `Pagamento_campoId_fkey` FOREIGN KEY (`campoId`) REFERENCES `Campo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pagamento` ADD CONSTRAINT `Pagamento_agendamentoId_fkey` FOREIGN KEY (`agendamentoId`) REFERENCES `Agendamento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Agendamento` ADD CONSTRAINT `Agendamento_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Agendamento` ADD CONSTRAINT `Agendamento_campoId_fkey` FOREIGN KEY (`campoId`) REFERENCES `Campo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Agendamento` ADD CONSTRAINT `Agendamento_timeId_fkey` FOREIGN KEY (`timeId`) REFERENCES `Time`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SocietyPlayer` ADD CONSTRAINT `SocietyPlayer_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SocietyPlayer` ADD CONSTRAINT `SocietyPlayer_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notificacao` ADD CONSTRAINT `Notificacao_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campeonato` ADD CONSTRAINT `Campeonato_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campeonato` ADD CONSTRAINT `Campeonato_campeaoId_fkey` FOREIGN KEY (`campeaoId`) REFERENCES `Time`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campeonato` ADD CONSTRAINT `Campeonato_viceCampeaoId_fkey` FOREIGN KEY (`viceCampeaoId`) REFERENCES `Time`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimeCampeonato` ADD CONSTRAINT `TimeCampeonato_campeonatoId_fkey` FOREIGN KEY (`campeonatoId`) REFERENCES `Campeonato`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimeCampeonato` ADD CONSTRAINT `TimeCampeonato_timeId_fkey` FOREIGN KEY (`timeId`) REFERENCES `Time`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Grupo` ADD CONSTRAINT `Grupo_campeonatoId_fkey` FOREIGN KEY (`campeonatoId`) REFERENCES `Campeonato`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimeGrupo` ADD CONSTRAINT `TimeGrupo_grupoId_fkey` FOREIGN KEY (`grupoId`) REFERENCES `Grupo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimeGrupo` ADD CONSTRAINT `TimeGrupo_timeId_fkey` FOREIGN KEY (`timeId`) REFERENCES `Time`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Jogo` ADD CONSTRAINT `Jogo_campeonatoId_fkey` FOREIGN KEY (`campeonatoId`) REFERENCES `Campeonato`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Jogo` ADD CONSTRAINT `Jogo_grupoId_fkey` FOREIGN KEY (`grupoId`) REFERENCES `Grupo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Jogo` ADD CONSTRAINT `Jogo_timeAId_fkey` FOREIGN KEY (`timeAId`) REFERENCES `Time`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Jogo` ADD CONSTRAINT `Jogo_timeBId_fkey` FOREIGN KEY (`timeBId`) REFERENCES `Time`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EstatisticaJogo` ADD CONSTRAINT `EstatisticaJogo_jogoId_fkey` FOREIGN KEY (`jogoId`) REFERENCES `Jogo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EstatisticaJogo` ADD CONSTRAINT `EstatisticaJogo_jogadorId_fkey` FOREIGN KEY (`jogadorId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TabelaCampeonato` ADD CONSTRAINT `TabelaCampeonato_campeonatoId_fkey` FOREIGN KEY (`campeonatoId`) REFERENCES `Campeonato`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TabelaCampeonato` ADD CONSTRAINT `TabelaCampeonato_timeId_fkey` FOREIGN KEY (`timeId`) REFERENCES `Time`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JogoEstatisticaTime` ADD CONSTRAINT `JogoEstatisticaTime_jogoId_fkey` FOREIGN KEY (`jogoId`) REFERENCES `Jogo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JogoEstatisticaTime` ADD CONSTRAINT `JogoEstatisticaTime_timeId_fkey` FOREIGN KEY (`timeId`) REFERENCES `Time`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JogoJogador` ADD CONSTRAINT `JogoJogador_jogoId_fkey` FOREIGN KEY (`jogoId`) REFERENCES `Jogo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JogoJogador` ADD CONSTRAINT `JogoJogador_timeId_fkey` FOREIGN KEY (`timeId`) REFERENCES `Time`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JogoJogador` ADD CONSTRAINT `JogoJogador_jogadorId_fkey` FOREIGN KEY (`jogadorId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JogoEvento` ADD CONSTRAINT `JogoEvento_jogoId_fkey` FOREIGN KEY (`jogoId`) REFERENCES `Jogo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JogoEvento` ADD CONSTRAINT `JogoEvento_timeId_fkey` FOREIGN KEY (`timeId`) REFERENCES `Time`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JogoEvento` ADD CONSTRAINT `JogoEvento_jogadorId_fkey` FOREIGN KEY (`jogadorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
