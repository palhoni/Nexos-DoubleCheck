/*
  Warnings:

  - The `prioridade` column on the `regras` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "regras" DROP COLUMN "prioridade",
ADD COLUMN     "prioridade" TEXT;

-- DropEnum
DROP TYPE "prioridade_regra";
