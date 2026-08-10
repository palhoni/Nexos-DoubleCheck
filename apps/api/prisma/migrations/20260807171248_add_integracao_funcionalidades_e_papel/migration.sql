-- AlterTable
ALTER TABLE "integracoes" ADD COLUMN     "papel_dependencia" TEXT;

-- CreateTable
CREATE TABLE "_IntegracaoFuncionalidades" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_IntegracaoFuncionalidades_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_IntegracaoFuncionalidades_B_index" ON "_IntegracaoFuncionalidades"("B");

-- AddForeignKey
ALTER TABLE "_IntegracaoFuncionalidades" ADD CONSTRAINT "_IntegracaoFuncionalidades_A_fkey" FOREIGN KEY ("A") REFERENCES "funcionalidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IntegracaoFuncionalidades" ADD CONSTRAINT "_IntegracaoFuncionalidades_B_fkey" FOREIGN KEY ("B") REFERENCES "integracoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
