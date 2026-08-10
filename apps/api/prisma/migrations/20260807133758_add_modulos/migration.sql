-- CreateEnum
CREATE TYPE "modulo_status" AS ENUM ('Ativo', 'Inativo');

-- CreateTable
CREATE TABLE "modulos" (
    "id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "status" "modulo_status" NOT NULL DEFAULT 'Ativo',
    "descricao" TEXT,
    "objetivo" TEXT,
    "responsavel_principal" TEXT,
    "ordem_exibicao" INTEGER,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modulos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "modulos_produto_id_idx" ON "modulos"("produto_id");

-- CreateIndex
CREATE INDEX "modulos_status_idx" ON "modulos"("status");

-- CreateIndex
CREATE UNIQUE INDEX "modulos_produto_id_codigo_key" ON "modulos"("produto_id", "codigo");

-- AddForeignKey
ALTER TABLE "modulos" ADD CONSTRAINT "modulos_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
