-- AlterTable
ALTER TABLE `campeonato` ADD COLUMN `viceId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Campeonato` ADD CONSTRAINT `Campeonato_viceId_fkey` FOREIGN KEY (`viceId`) REFERENCES `Time`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
