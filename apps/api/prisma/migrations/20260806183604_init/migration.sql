-- CreateEnum
CREATE TYPE "projeto_status" AS ENUM ('Ativo', 'Planejamento', 'Inativo');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projetos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "status" "projeto_status" NOT NULL DEFAULT 'Ativo',
    "descricao" TEXT,
    "objetivo" TEXT,
    "area_negocio" TEXT,
    "idiomas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "data_inicio" DATE,
    "responsavel_principal" TEXT,
    "jira_ref" TEXT,
    "confluence_ref" TEXT,
    "observacoes" TEXT,
    "paises_disponiveis" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fontes_gerais" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projetos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "history_entries" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "history_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "projetos_codigo_key" ON "projetos"("codigo");

-- CreateIndex
CREATE INDEX "projetos_status_idx" ON "projetos"("status");

-- CreateIndex
CREATE INDEX "projetos_area_negocio_idx" ON "projetos"("area_negocio");

-- CreateIndex
CREATE INDEX "history_entries_entity_type_entity_id_created_at_idx" ON "history_entries"("entity_type", "entity_id", "created_at");

-- AddForeignKey
ALTER TABLE "history_entries" ADD CONSTRAINT "history_entries_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
