-- CreateEnum
CREATE TYPE "integracao_status" AS ENUM ('Ativo', 'Inativo');

-- CreateTable
CREATE TABLE "integracoes" (
    "id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "status" "integracao_status" NOT NULL DEFAULT 'Ativo',
    "direcao" TEXT,
    "produto_relacionado_id" TEXT,
    "tipo" TEXT,
    "endpoint" TEXT,
    "modo" TEXT,
    "criticidade" TEXT,
    "time_proprietario_id" TEXT,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integracoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "integracoes_produto_id_idx" ON "integracoes"("produto_id");

-- CreateIndex
CREATE INDEX "integracoes_produto_relacionado_id_idx" ON "integracoes"("produto_relacionado_id");

-- CreateIndex
CREATE INDEX "integracoes_time_proprietario_id_idx" ON "integracoes"("time_proprietario_id");

-- CreateIndex
CREATE INDEX "integracoes_status_idx" ON "integracoes"("status");

-- AddForeignKey
ALTER TABLE "integracoes" ADD CONSTRAINT "integracoes_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integracoes" ADD CONSTRAINT "integracoes_produto_relacionado_id_fkey" FOREIGN KEY ("produto_relacionado_id") REFERENCES "produtos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integracoes" ADD CONSTRAINT "integracoes_time_proprietario_id_fkey" FOREIGN KEY ("time_proprietario_id") REFERENCES "times"("id") ON DELETE SET NULL ON UPDATE CASCADE;
