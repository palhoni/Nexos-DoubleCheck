import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface PaginatedResult<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entityType: string, entityId: string, label: string, actorUserId?: string) {
    await this.prisma.historyEntry.create({
      data: { entityType, entityId, label, actorUserId: actorUserId ?? null },
    });
  }

  async list(
    entityType: string,
    entityId: string,
    page = 1,
    pageSize = 10,
  ): Promise<PaginatedResult<{ label: string; ts: Date; actorUserId: string | null }>> {
    const where = { entityType, entityId };
    const [rows, total] = await Promise.all([
      this.prisma.historyEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.historyEntry.count({ where }),
    ]);
    return {
      data: rows.map((r) => ({ label: r.label, ts: r.createdAt, actorUserId: r.actorUserId })),
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    };
  }

  /** Feed cross-entidade, mais recentes primeiro — alimenta a "Atividade recente" da Home. */
  async listGlobal(limit = 10): Promise<{ id: string; entityType: string; label: string; actorNome: string | null; ts: Date }[]> {
    const rows = await this.prisma.historyEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { actor: { select: { nome: true } } },
    });
    return rows.map((r) => ({ id: r.id, entityType: r.entityType, label: r.label, actorNome: r.actor?.nome ?? null, ts: r.createdAt }));
  }
}
