BEGIN;

-- Sprint 17 — Fontes, Proveniência e Rastreabilidade do Conhecimento
-- Cria fontes estruturadas sem remover o legado `fontes_gerais` do Projeto.
-- Entradas legadas são migradas como fontes em revisão para não ganhar confiança artificial.

CREATE TYPE "fonte_status" AS ENUM ('Ativa', 'Revisao', 'Inativa');

CREATE TABLE "fontes_conhecimento" (
    "id" TEXT NOT NULL,
    "projeto_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "status" "fonte_status" NOT NULL DEFAULT 'Ativa',
    "oficial" BOOLEAN NOT NULL DEFAULT false,
    "responsavel" TEXT,
    "descricao" TEXT,
    "ultima_verificacao" DATE,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fontes_conhecimento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fontes_vinculos" (
    "id" TEXT NOT NULL,
    "fonte_id" TEXT NOT NULL,
    "projeto_contexto_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "contexto" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fontes_vinculos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fontes_conhecimento_projeto_id_referencia_key"
    ON "fontes_conhecimento"("projeto_id", "referencia");
CREATE INDEX "fontes_conhecimento_projeto_id_idx" ON "fontes_conhecimento"("projeto_id");
CREATE INDEX "fontes_conhecimento_status_idx" ON "fontes_conhecimento"("status");
CREATE INDEX "fontes_conhecimento_tipo_idx" ON "fontes_conhecimento"("tipo");

CREATE UNIQUE INDEX "fontes_vinculos_fonte_id_entity_type_entity_id_key"
    ON "fontes_vinculos"("fonte_id", "entity_type", "entity_id");
CREATE INDEX "fontes_vinculos_fonte_id_idx" ON "fontes_vinculos"("fonte_id");
CREATE INDEX "fontes_vinculos_projeto_contexto_id_idx" ON "fontes_vinculos"("projeto_contexto_id");
CREATE INDEX "fontes_vinculos_entity_type_entity_id_idx" ON "fontes_vinculos"("entity_type", "entity_id");

ALTER TABLE "fontes_conhecimento"
    ADD CONSTRAINT "fontes_conhecimento_projeto_id_fkey"
    FOREIGN KEY ("projeto_id") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fontes_vinculos"
    ADD CONSTRAINT "fontes_vinculos_fonte_id_fkey"
    FOREIGN KEY ("fonte_id") REFERENCES "fontes_conhecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fontes_vinculos"
    ADD CONSTRAINT "fontes_vinculos_projeto_contexto_id_fkey"
    FOREIGN KEY ("projeto_contexto_id") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserva e estrutura as fontes gerais já cadastradas.
-- Elas entram como "Revisao" e não-oficiais porque o legado não carrega tipo,
-- responsável ou evidência de verificação suficientes para elevá-las automaticamente.
INSERT INTO "fontes_conhecimento" (
    "id", "projeto_id", "nome", "tipo", "referencia", "status", "oficial",
    "descricao", "created_at", "updated_at"
)
SELECT
    'legacy-' || md5(p."id" || ':' || fonte.valor),
    p."id",
    LEFT(fonte.valor, 160),
    'Referência legada',
    fonte.valor,
    'Revisao'::"fonte_status",
    false,
    'Migrada automaticamente de fontesGerais. Revise tipo, responsabilidade e data de verificação.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "projetos" p
CROSS JOIN LATERAL unnest(p."fontes_gerais") AS fonte(valor)
WHERE btrim(fonte.valor) <> ''
ON CONFLICT ("projeto_id", "referencia") DO NOTHING;


-- Estrutura também as referências Confluence/Jira já existentes no Projeto.
-- Continuam em revisão: existir no cadastro legado não prova, por si só, governança atual.
INSERT INTO "fontes_conhecimento" (
    "id", "projeto_id", "nome", "tipo", "referencia", "status", "oficial",
    "descricao", "created_at", "updated_at"
)
SELECT
    'legacy-' || md5(p."id" || ':' || p."confluence_ref"),
    p."id",
    LEFT('Confluence — ' || p."nome", 160),
    'Confluence',
    p."confluence_ref",
    'Revisao'::"fonte_status",
    false,
    'Migrada automaticamente de confluenceRef. Revisar responsabilidade e data de verificação.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "projetos" p
WHERE p."confluence_ref" IS NOT NULL AND btrim(p."confluence_ref") <> ''
ON CONFLICT ("projeto_id", "referencia") DO UPDATE
SET "tipo" = CASE
    WHEN "fontes_conhecimento"."tipo" = 'Referência legada' THEN 'Confluence'
    ELSE "fontes_conhecimento"."tipo"
END;

INSERT INTO "fontes_conhecimento" (
    "id", "projeto_id", "nome", "tipo", "referencia", "status", "oficial",
    "descricao", "created_at", "updated_at"
)
SELECT
    'legacy-' || md5(p."id" || ':' || p."jira_ref"),
    p."id",
    LEFT('Jira — ' || p."nome", 160),
    'Jira',
    p."jira_ref",
    'Revisao'::"fonte_status",
    false,
    'Migrada automaticamente de jiraRef. Revisar responsabilidade e data de verificação.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "projetos" p
WHERE p."jira_ref" IS NOT NULL AND btrim(p."jira_ref") <> ''
ON CONFLICT ("projeto_id", "referencia") DO UPDATE
SET "tipo" = CASE
    WHEN "fontes_conhecimento"."tipo" = 'Referência legada' THEN 'Jira'
    ELSE "fontes_conhecimento"."tipo"
END;


-- Mantém a semântica do legado: cada fonte geral nasceu como evidência do próprio Projeto.
-- O vínculo é explícito para que uso/proveniência já nasçam rastreáveis após a migração.
INSERT INTO "fontes_vinculos" (
    "id", "fonte_id", "projeto_contexto_id", "entity_type", "entity_id", "contexto", "created_at"
)
SELECT
    'legacy-link-' || md5(p."id" || ':' || fonte.valor),
    'legacy-' || md5(p."id" || ':' || fonte.valor),
    p."id",
    'Projeto',
    p."id",
    'Vínculo migrado de fontesGerais do Projeto. Revisar proveniência e governança antes de considerar a fonte oficial.',
    CURRENT_TIMESTAMP
FROM "projetos" p
CROSS JOIN LATERAL unnest(p."fontes_gerais") AS fonte(valor)
WHERE btrim(fonte.valor) <> ''
  AND EXISTS (
      SELECT 1
      FROM "fontes_conhecimento" fc
      WHERE fc."id" = 'legacy-' || md5(p."id" || ':' || fonte.valor)
  )
ON CONFLICT ("fonte_id", "entity_type", "entity_id") DO NOTHING;


INSERT INTO "fontes_vinculos" (
    "id", "fonte_id", "projeto_contexto_id", "entity_type", "entity_id", "contexto", "created_at"
)
SELECT
    'legacy-link-' || md5(p."id" || ':' || p."confluence_ref"),
    fc."id",
    p."id",
    'Projeto',
    p."id",
    'Vínculo migrado de confluenceRef do Projeto. Revisar proveniência antes de considerar a fonte oficial.',
    CURRENT_TIMESTAMP
FROM "projetos" p
JOIN "fontes_conhecimento" fc
  ON fc."projeto_id" = p."id" AND fc."referencia" = p."confluence_ref"
WHERE p."confluence_ref" IS NOT NULL AND btrim(p."confluence_ref") <> ''
ON CONFLICT ("fonte_id", "entity_type", "entity_id") DO NOTHING;

INSERT INTO "fontes_vinculos" (
    "id", "fonte_id", "projeto_contexto_id", "entity_type", "entity_id", "contexto", "created_at"
)
SELECT
    'legacy-link-' || md5(p."id" || ':' || p."jira_ref"),
    fc."id",
    p."id",
    'Projeto',
    p."id",
    'Vínculo migrado de jiraRef do Projeto. Revisar proveniência antes de considerar a fonte oficial.',
    CURRENT_TIMESTAMP
FROM "projetos" p
JOIN "fontes_conhecimento" fc
  ON fc."projeto_id" = p."id" AND fc."referencia" = p."jira_ref"
WHERE p."jira_ref" IS NOT NULL AND btrim(p."jira_ref") <> ''
ON CONFLICT ("fonte_id", "entity_type", "entity_id") DO NOTHING;

COMMIT;
