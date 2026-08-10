BEGIN;

-- Sprint 18 — Documentos de Conhecimento
-- Documento é um artefato curado dentro do Nexus. Ele não substitui FonteConhecimento:
-- fontes comprovam/proveniam; documentos sintetizam e organizam conhecimento versionado.

CREATE TYPE "documento_status" AS ENUM ('Rascunho', 'Revisao', 'Publicado', 'Arquivado');

CREATE TABLE "documentos_conhecimento" (
    "id" TEXT NOT NULL,
    "projeto_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" "documento_status" NOT NULL DEFAULT 'Rascunho',
    "resumo" TEXT,
    "conteudo" TEXT,
    "responsavel" TEXT,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "versao_publicada" INTEGER,
    "publicado_em" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_conhecimento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "documentos_versoes" (
    "id" TEXT NOT NULL,
    "documento_id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "resumo" TEXT,
    "conteudo" TEXT,
    "motivo_alteracao" TEXT,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_versoes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "documentos_vinculos" (
    "id" TEXT NOT NULL,
    "documento_id" TEXT NOT NULL,
    "projeto_contexto_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "contexto" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_vinculos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "documentos_conhecimento_projeto_id_codigo_key"
    ON "documentos_conhecimento"("projeto_id", "codigo");
CREATE INDEX "documentos_conhecimento_projeto_id_idx" ON "documentos_conhecimento"("projeto_id");
CREATE INDEX "documentos_conhecimento_status_idx" ON "documentos_conhecimento"("status");
CREATE INDEX "documentos_conhecimento_tipo_idx" ON "documentos_conhecimento"("tipo");

CREATE UNIQUE INDEX "documentos_versoes_documento_id_numero_key"
    ON "documentos_versoes"("documento_id", "numero");
CREATE INDEX "documentos_versoes_documento_id_created_at_idx"
    ON "documentos_versoes"("documento_id", "created_at");

CREATE UNIQUE INDEX "documentos_vinculos_documento_id_entity_type_entity_id_key"
    ON "documentos_vinculos"("documento_id", "entity_type", "entity_id");
CREATE INDEX "documentos_vinculos_documento_id_idx" ON "documentos_vinculos"("documento_id");
CREATE INDEX "documentos_vinculos_projeto_contexto_id_idx" ON "documentos_vinculos"("projeto_contexto_id");
CREATE INDEX "documentos_vinculos_entity_type_entity_id_idx" ON "documentos_vinculos"("entity_type", "entity_id");

ALTER TABLE "documentos_conhecimento"
    ADD CONSTRAINT "documentos_conhecimento_projeto_id_fkey"
    FOREIGN KEY ("projeto_id") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documentos_conhecimento"
    ADD CONSTRAINT "documentos_conhecimento_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "documentos_versoes"
    ADD CONSTRAINT "documentos_versoes_documento_id_fkey"
    FOREIGN KEY ("documento_id") REFERENCES "documentos_conhecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documentos_versoes"
    ADD CONSTRAINT "documentos_versoes_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "documentos_vinculos"
    ADD CONSTRAINT "documentos_vinculos_documento_id_fkey"
    FOREIGN KEY ("documento_id") REFERENCES "documentos_conhecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documentos_vinculos"
    ADD CONSTRAINT "documentos_vinculos_projeto_contexto_id_fkey"
    FOREIGN KEY ("projeto_contexto_id") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
