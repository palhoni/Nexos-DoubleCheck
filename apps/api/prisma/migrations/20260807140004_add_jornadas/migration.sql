-- CreateEnum
CREATE TYPE "jornada_status" AS ENUM ('Ativo', 'Inativo');

-- CreateTable
CREATE TABLE "jornadas" (
    "id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "status" "jornada_status" NOT NULL DEFAULT 'Ativo',
    "descricao" TEXT,
    "publico_alvo_id" TEXT,
    "objetivo" TEXT,
    "evento_inicial" TEXT,
    "resultado_esperado" TEXT,
    "etapas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "paises" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jornadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_JornadaFuncionalidades" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_JornadaFuncionalidades_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_JornadaModulos" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_JornadaModulos_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_JornadaProdutosParticipantes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_JornadaProdutosParticipantes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "jornadas_produto_id_idx" ON "jornadas"("produto_id");

-- CreateIndex
CREATE INDEX "jornadas_status_idx" ON "jornadas"("status");

-- CreateIndex
CREATE INDEX "jornadas_publico_alvo_id_idx" ON "jornadas"("publico_alvo_id");

-- CreateIndex
CREATE INDEX "_JornadaFuncionalidades_B_index" ON "_JornadaFuncionalidades"("B");

-- CreateIndex
CREATE INDEX "_JornadaModulos_B_index" ON "_JornadaModulos"("B");

-- CreateIndex
CREATE INDEX "_JornadaProdutosParticipantes_B_index" ON "_JornadaProdutosParticipantes"("B");

-- AddForeignKey
ALTER TABLE "jornadas" ADD CONSTRAINT "jornadas_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jornadas" ADD CONSTRAINT "jornadas_publico_alvo_id_fkey" FOREIGN KEY ("publico_alvo_id") REFERENCES "publico_alvo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JornadaFuncionalidades" ADD CONSTRAINT "_JornadaFuncionalidades_A_fkey" FOREIGN KEY ("A") REFERENCES "funcionalidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JornadaFuncionalidades" ADD CONSTRAINT "_JornadaFuncionalidades_B_fkey" FOREIGN KEY ("B") REFERENCES "jornadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JornadaModulos" ADD CONSTRAINT "_JornadaModulos_A_fkey" FOREIGN KEY ("A") REFERENCES "jornadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JornadaModulos" ADD CONSTRAINT "_JornadaModulos_B_fkey" FOREIGN KEY ("B") REFERENCES "modulos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JornadaProdutosParticipantes" ADD CONSTRAINT "_JornadaProdutosParticipantes_A_fkey" FOREIGN KEY ("A") REFERENCES "jornadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JornadaProdutosParticipantes" ADD CONSTRAINT "_JornadaProdutosParticipantes_B_fkey" FOREIGN KEY ("B") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
