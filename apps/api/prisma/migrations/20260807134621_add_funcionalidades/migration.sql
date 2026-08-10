-- CreateEnum
CREATE TYPE "funcionalidade_status" AS ENUM ('Ativo', 'Inativo');

-- CreateTable
CREATE TABLE "funcionalidades" (
    "id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "modulo_id" TEXT,
    "status" "funcionalidade_status" NOT NULL DEFAULT 'Ativo',
    "descricao" TEXT,
    "objetivo" TEXT,
    "comportamento_esperado" TEXT,
    "usuarios" TEXT,
    "responsavel_principal" TEXT,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funcionalidades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "funcionalidades_produto_id_idx" ON "funcionalidades"("produto_id");

-- CreateIndex
CREATE INDEX "funcionalidades_status_idx" ON "funcionalidades"("status");

-- CreateIndex
CREATE INDEX "funcionalidades_modulo_id_idx" ON "funcionalidades"("modulo_id");

-- CreateIndex
CREATE UNIQUE INDEX "funcionalidades_produto_id_codigo_key" ON "funcionalidades"("produto_id", "codigo");

-- AddForeignKey
ALTER TABLE "funcionalidades" ADD CONSTRAINT "funcionalidades_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funcionalidades" ADD CONSTRAINT "funcionalidades_modulo_id_fkey" FOREIGN KEY ("modulo_id") REFERENCES "modulos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
