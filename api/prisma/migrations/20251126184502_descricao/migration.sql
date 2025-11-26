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

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Campo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societyId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `valorAvulso` DOUBLE NULL,
    `valorMensal` DOUBLE NULL,
    `foto` VARCHAR(191) NULL,
    `dimensoes` VARCHAR(191) NULL,
    `estiloGramado` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

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
    `donoId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pagamento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `societyId` INTEGER NOT NULL,
    `tipo` ENUM('AVULSO', 'MENSALISTA', 'CONSUMO_BAR') NOT NULL,
    `valor` DOUBLE NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SocietyPlayer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societyId` INTEGER NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

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

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Campeonato` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societyId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `tipo` ENUM('MATA_MATA', 'GRUPOS') NOT NULL,
    `maxTimes` INTEGER NOT NULL,
    `roundAtual` INTEGER NOT NULL DEFAULT 1,
    `campeaoId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TimeCampeonato` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campeonatoId` INTEGER NOT NULL,
    `timeId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Jogo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campeonatoId` INTEGER NOT NULL,
    `round` INTEGER NOT NULL,
    `timeAId` INTEGER NOT NULL,
    `timeBId` INTEGER NOT NULL,
    `golsA` INTEGER NULL,
    `golsB` INTEGER NULL,
    `vencedorId` INTEGER NULL,
    `finalizado` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Usuario` ADD CONSTRAINT `Usuario_timeRelacionadoId_fkey` FOREIGN KEY (`timeRelacionadoId`) REFERENCES `Time`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Society` ADD CONSTRAINT `Society_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cardapio` ADD CONSTRAINT `Cardapio_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campo` ADD CONSTRAINT `Campo_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Time` ADD CONSTRAINT `Time_donoId_fkey` FOREIGN KEY (`donoId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pagamento` ADD CONSTRAINT `Pagamento_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pagamento` ADD CONSTRAINT `Pagamento_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SocietyPlayer` ADD CONSTRAINT `SocietyPlayer_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SocietyPlayer` ADD CONSTRAINT `SocietyPlayer_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notificacao` ADD CONSTRAINT `Notificacao_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campeonato` ADD CONSTRAINT `Campeonato_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campeonato` ADD CONSTRAINT `Campeonato_campeaoId_fkey` FOREIGN KEY (`campeaoId`) REFERENCES `Time`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimeCampeonato` ADD CONSTRAINT `TimeCampeonato_campeonatoId_fkey` FOREIGN KEY (`campeonatoId`) REFERENCES `Campeonato`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimeCampeonato` ADD CONSTRAINT `TimeCampeonato_timeId_fkey` FOREIGN KEY (`timeId`) REFERENCES `Time`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Jogo` ADD CONSTRAINT `Jogo_campeonatoId_fkey` FOREIGN KEY (`campeonatoId`) REFERENCES `Campeonato`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Jogo` ADD CONSTRAINT `Jogo_timeAId_fkey` FOREIGN KEY (`timeAId`) REFERENCES `Time`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Jogo` ADD CONSTRAINT `Jogo_timeBId_fkey` FOREIGN KEY (`timeBId`) REFERENCES `Time`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
