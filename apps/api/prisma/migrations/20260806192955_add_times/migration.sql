-- CreateEnum
CREATE TYPE "time_status" AS ENUM ('Ativo', 'Inativo');

-- CreateTable
CREATE TABLE "times" (
    "id" TEXT NOT NULL,
    "projeto_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "missao" TEXT,
    "descricao" TEXT,
    "responsavel_principal" TEXT,
    "paises_atuacao" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "canais_comunicacao" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "produtos_atendidos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "observacoes" TEXT,
    "status" "time_status" NOT NULL DEFAULT 'Ativo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "times_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "times_projeto_id_idx" ON "times"("projeto_id");

-- CreateIndex
CREATE INDEX "times_status_idx" ON "times"("status");

-- AddForeignKey
ALTER TABLE "times" ADD CONSTRAINT "times_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
