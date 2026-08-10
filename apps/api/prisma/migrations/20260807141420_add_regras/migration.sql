-- CreateEnum
CREATE TYPE "regra_status" AS ENUM ('Ativo', 'Inativo');

-- CreateEnum
CREATE TYPE "prioridade_regra" AS ENUM ('Alta', 'Media', 'Baixa');

-- CreateTable
CREATE TABLE "regras" (
    "id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "grupo_id" TEXT NOT NULL,
    "numero_versao" INTEGER NOT NULL DEFAULT 1,
    "versao_atual" BOOLEAN NOT NULL DEFAULT true,
    "nome" TEXT NOT NULL,
    "status" "regra_status" NOT NULL DEFAULT 'Ativo',
    "condicao" TEXT,
    "resultado_esperado" TEXT,
    "excecoes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "exemplos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prioridade" "prioridade_regra",
    "vigencia_inicio" DATE,
    "vigencia_fim" DATE,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RegraModulos" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RegraModulos_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RegraFuncionalidades" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RegraFuncionalidades_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RegraJornadas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RegraJornadas_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "regras_produto_id_idx" ON "regras"("produto_id");

-- CreateIndex
CREATE INDEX "regras_grupo_id_idx" ON "regras"("grupo_id");

-- CreateIndex
CREATE INDEX "regras_status_idx" ON "regras"("status");

-- CreateIndex
CREATE INDEX "_RegraModulos_B_index" ON "_RegraModulos"("B");

-- CreateIndex
CREATE INDEX "_RegraFuncionalidades_B_index" ON "_RegraFuncionalidades"("B");

-- CreateIndex
CREATE INDEX "_RegraJornadas_B_index" ON "_RegraJornadas"("B");

-- AddForeignKey
ALTER TABLE "regras" ADD CONSTRAINT "regras_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RegraModulos" ADD CONSTRAINT "_RegraModulos_A_fkey" FOREIGN KEY ("A") REFERENCES "modulos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RegraModulos" ADD CONSTRAINT "_RegraModulos_B_fkey" FOREIGN KEY ("B") REFERENCES "regras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RegraFuncionalidades" ADD CONSTRAINT "_RegraFuncionalidades_A_fkey" FOREIGN KEY ("A") REFERENCES "funcionalidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RegraFuncionalidades" ADD CONSTRAINT "_RegraFuncionalidades_B_fkey" FOREIGN KEY ("B") REFERENCES "regras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RegraJornadas" ADD CONSTRAINT "_RegraJornadas_A_fkey" FOREIGN KEY ("A") REFERENCES "jornadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RegraJornadas" ADD CONSTRAINT "_RegraJornadas_B_fkey" FOREIGN KEY ("B") REFERENCES "regras"("id") ON DELETE CASCADE ON UPDATE CASCADE;
