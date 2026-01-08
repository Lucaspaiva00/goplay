/*
  Warnings:

  - You are about to drop the column `viceId` on the `campeonato` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `campeonato` DROP FOREIGN KEY `Campeonato_viceId_fkey`;

-- DropIndex
DROP INDEX `Campeonato_viceId_fkey` ON `campeonato`;

-- AlterTable
ALTER TABLE `campeonato` DROP COLUMN `viceId`,
    ADD COLUMN `viceCampeaoId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Campeonato` ADD CONSTRAINT `Campeonato_viceCampeaoId_fkey` FOREIGN KEY (`viceCampeaoId`) REFERENCES `Time`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
