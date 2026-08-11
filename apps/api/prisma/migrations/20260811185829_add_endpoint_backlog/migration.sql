-- CreateEnum
CREATE TYPE "endpoint_decisao" AS ENUM ('Pendente', 'Automatizar', 'Adiar', 'NaoAutomatizar', 'Investigar');

-- AlterTable
ALTER TABLE "documentos_conhecimento" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "fontes_conhecimento" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "endpoint_backlogs" (
    "id" TEXT NOT NULL,
    "projeto_id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "sistema" TEXT NOT NULL,
    "fontes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "endpoint_backlogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "endpoint_backlog_items" (
    "id" TEXT NOT NULL,
    "backlog_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "metodo" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "autenticacao" TEXT NOT NULL,
    "prioridade" TEXT NOT NULL,
    "criterio_prioridade" TEXT NOT NULL,
    "observado_em" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notas" TEXT,
    "decisao" "endpoint_decisao" NOT NULL DEFAULT 'Pendente',
    "decisao_justificativa" TEXT,
    "decidido_por_user_id" TEXT,
    "decidido_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "endpoint_backlog_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "endpoint_backlogs_execution_id_key" ON "endpoint_backlogs"("execution_id");

-- CreateIndex
CREATE INDEX "endpoint_backlogs_projeto_id_created_at_idx" ON "endpoint_backlogs"("projeto_id", "created_at");

-- CreateIndex
CREATE INDEX "endpoint_backlog_items_backlog_id_idx" ON "endpoint_backlog_items"("backlog_id");

-- CreateIndex
CREATE UNIQUE INDEX "endpoint_backlog_items_backlog_id_codigo_key" ON "endpoint_backlog_items"("backlog_id", "codigo");

-- AddForeignKey
ALTER TABLE "endpoint_backlogs" ADD CONSTRAINT "endpoint_backlogs_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endpoint_backlogs" ADD CONSTRAINT "endpoint_backlogs_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "agent_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endpoint_backlog_items" ADD CONSTRAINT "endpoint_backlog_items_backlog_id_fkey" FOREIGN KEY ("backlog_id") REFERENCES "endpoint_backlogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
