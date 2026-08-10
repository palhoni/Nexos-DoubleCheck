-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "estabilidade_observacao" TEXT,
ADD COLUMN     "estabilidade_status" TEXT NOT NULL DEFAULT 'Em Desenvolvimento';
