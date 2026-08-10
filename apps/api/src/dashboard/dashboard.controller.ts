import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

/** Endpoints agregados, cross-projeto — alimentam a Home logo após o login. */
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('resumo')
  resumo() {
    return this.dashboardService.resumo();
  }

  @Get('atividade-recente')
  atividadeRecente(@Query('limit') limit?: string) {
    return this.dashboardService.atividadeRecente(limit ? Number(limit) : undefined);
  }

  @Get('pendencias')
  pendencias(@Query('limit') limit?: string) {
    return this.dashboardService.pendenciasDocumentacao(limit ? Number(limit) : undefined);
  }
}
