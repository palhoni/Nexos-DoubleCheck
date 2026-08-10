CREATE TABLE "agent_executions" (
    "id" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "projeto_id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "titulo" TEXT,
    "requisito" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT NOT NULL,
    "partial_content" TEXT NOT NULL DEFAULT '',
    "result" JSONB,
    "error" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_executions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "agent_executions_actor_user_id_created_at_idx" ON "agent_executions"("actor_user_id", "created_at");
CREATE INDEX "agent_executions_projeto_id_created_at_idx" ON "agent_executions"("projeto_id", "created_at");
CREATE INDEX "agent_executions_status_idx" ON "agent_executions"("status");

ALTER TABLE "agent_executions"
ADD CONSTRAINT "agent_executions_projeto_id_fkey"
FOREIGN KEY ("projeto_id") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_executions"
ADD CONSTRAINT "agent_executions_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
