-- CreateEnum
CREATE TYPE "publico_alvo_status" AS ENUM ('Ativo', 'Inativo');

-- CreateTable
CREATE TABLE "publico_alvo" (
    "id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "status" "publico_alvo_status" NOT NULL DEFAULT 'Ativo',
    "perfil" TEXT,
    "tipo_usuario" TEXT,
    "descricao" TEXT,
    "necessidades" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dores" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "objetivos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "frequencia_uso" TEXT,
    "canais_utilizados" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "paises_onde_se_aplica" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publico_alvo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "publico_alvo_produto_id_idx" ON "publico_alvo"("produto_id");

-- CreateIndex
CREATE INDEX "publico_alvo_status_idx" ON "publico_alvo"("status");

-- AddForeignKey
ALTER TABLE "publico_alvo" ADD CONSTRAINT "publico_alvo_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
