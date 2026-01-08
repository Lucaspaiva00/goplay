-- AlterTable
ALTER TABLE `jogo` ADD COLUMN `dataHora` DATETIME(3) NULL,
    ADD COLUMN `desempateTipo` ENUM('PENALTIS', 'WO', 'MELHOR_CAMPANHA', 'OUTRO') NULL,
    ADD COLUMN `observacao` VARCHAR(191) NULL,
    ADD COLUMN `penaltisA` INTEGER NULL,
    ADD COLUMN `penaltisB` INTEGER NULL;

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

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TabelaCampeonato` ADD CONSTRAINT `TabelaCampeonato_campeonatoId_fkey` FOREIGN KEY (`campeonatoId`) REFERENCES `Campeonato`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TabelaCampeonato` ADD CONSTRAINT `TabelaCampeonato_timeId_fkey` FOREIGN KEY (`timeId`) REFERENCES `Time`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JogoEstatisticaTime` ADD CONSTRAINT `JogoEstatisticaTime_jogoId_fkey` FOREIGN KEY (`jogoId`) REFERENCES `Jogo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JogoEstatisticaTime` ADD CONSTRAINT `JogoEstatisticaTime_timeId_fkey` FOREIGN KEY (`timeId`) REFERENCES `Time`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JogoJogador` ADD CONSTRAINT `JogoJogador_jogoId_fkey` FOREIGN KEY (`jogoId`) REFERENCES `Jogo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JogoJogador` ADD CONSTRAINT `JogoJogador_timeId_fkey` FOREIGN KEY (`timeId`) REFERENCES `Time`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JogoJogador` ADD CONSTRAINT `JogoJogador_jogadorId_fkey` FOREIGN KEY (`jogadorId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JogoEvento` ADD CONSTRAINT `JogoEvento_jogoId_fkey` FOREIGN KEY (`jogoId`) REFERENCES `Jogo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JogoEvento` ADD CONSTRAINT `JogoEvento_timeId_fkey` FOREIGN KEY (`timeId`) REFERENCES `Time`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JogoEvento` ADD CONSTRAINT `JogoEvento_jogadorId_fkey` FOREIGN KEY (`jogadorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
