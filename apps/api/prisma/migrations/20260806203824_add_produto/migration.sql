-- CreateEnum
CREATE TYPE "produto_status" AS ENUM ('Ativo', 'Planejamento', 'Inativo');

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "projeto_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nome_curto" TEXT,
    "codigo" TEXT NOT NULL,
    "status" "produto_status" NOT NULL DEFAULT 'Planejamento',
    "descricao" TEXT,
    "objetivo" TEXT,
    "problema_resolve" TEXT,
    "usuarios_principais" TEXT,
    "area_negocio" TEXT,
    "areas_beneficiadas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "time_responsavel_id" TEXT,
    "responsavel_principal" TEXT,
    "ambientes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "paises" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "produtos_projeto_id_idx" ON "produtos"("projeto_id");

-- CreateIndex
CREATE INDEX "produtos_status_idx" ON "produtos"("status");

-- CreateIndex
CREATE INDEX "produtos_time_responsavel_id_idx" ON "produtos"("time_responsavel_id");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_projeto_id_codigo_key" ON "produtos"("projeto_id", "codigo");

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_time_responsavel_id_fkey" FOREIGN KEY ("time_responsavel_id") REFERENCES "times"("id") ON DELETE SET NULL ON UPDATE CASCADE;
