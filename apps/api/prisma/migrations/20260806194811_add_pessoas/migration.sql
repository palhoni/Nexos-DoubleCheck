-- CreateEnum
CREATE TYPE "pessoa_status" AS ENUM ('Ativo', 'Inativo');

-- CreateTable
CREATE TABLE "pessoas" (
    "id" TEXT NOT NULL,
    "projeto_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email_corporativo" TEXT,
    "papel" TEXT,
    "cargo" TEXT,
    "time_id" TEXT,
    "produtos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "responsabilidades" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "especialidades" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nivel_decisao" TEXT,
    "pessoa_referencia" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "status" "pessoa_status" NOT NULL DEFAULT 'Ativo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pessoas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pessoas_projeto_id_idx" ON "pessoas"("projeto_id");

-- CreateIndex
CREATE INDEX "pessoas_time_id_idx" ON "pessoas"("time_id");

-- CreateIndex
CREATE INDEX "pessoas_status_idx" ON "pessoas"("status");

-- AddForeignKey
ALTER TABLE "pessoas" ADD CONSTRAINT "pessoas_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pessoas" ADD CONSTRAINT "pessoas_time_id_fkey" FOREIGN KEY ("time_id") REFERENCES "times"("id") ON DELETE SET NULL ON UPDATE CASCADE;
