-- CreateEnum
CREATE TYPE "bug_severidade" AS ENUM ('Critical', 'High', 'Medium', 'Low');

-- CreateEnum
CREATE TYPE "bug_status" AS ENUM ('Aberto', 'Corrigido', 'Invalidado');

-- CreateTable
CREATE TABLE "bugs" (
    "id" TEXT NOT NULL,
    "projeto_id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tc_id_relacionado" TEXT,
    "severidade" "bug_severidade" NOT NULL,
    "prioridade_sugerida" TEXT,
    "ambiente" TEXT,
    "descricao" TEXT NOT NULL,
    "passos_reproducao" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resultado_obtido" TEXT NOT NULL,
    "resultado_esperado" TEXT NOT NULL,
    "evidencia_tecnica" JSONB,
    "criterio_aceite_violado" TEXT,
    "notas_adicionais" TEXT,
    "status" "bug_status" NOT NULL DEFAULT 'Aberto',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bugs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bugs_projeto_id_created_at_idx" ON "bugs"("projeto_id", "created_at");

-- CreateIndex
CREATE INDEX "bugs_status_idx" ON "bugs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "bugs_projeto_id_codigo_key" ON "bugs"("projeto_id", "codigo");

-- AddForeignKey
ALTER TABLE "bugs" ADD CONSTRAINT "bugs_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bugs" ADD CONSTRAINT "bugs_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "agent_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
