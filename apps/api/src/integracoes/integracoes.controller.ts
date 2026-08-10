import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { IntegracoesService } from './integracoes.service';
import { CreateIntegracaoDto } from './dto/create-integracao.dto';
import { UpdateIntegracaoDto } from './dto/update-integracao.dto';
import { QueryIntegracaoDto } from './dto/query-integracao.dto';

@UseGuards(JwtAuthGuard)
@Controller('produtos/:produtoId/integracoes')
export class IntegracoesController {
  constructor(private readonly integracoesService: IntegracoesService) {}

  @Get()
  findAll(@Param('produtoId') produtoId: string, @Query() query: QueryIntegracaoDto) {
    return this.integracoesService.findAll(produtoId, query);
  }

  @Get(':id')
  findOne(@Param('produtoId') produtoId: string, @Param('id') id: string) {
    return this.integracoesService.findOneOrThrow(produtoId, id);
  }

  @Post()
  create(@Param('produtoId') produtoId: string, @Body() dto: CreateIntegracaoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.integracoesService.create(produtoId, dto, user.userId);
  }

  @Patch(':id')
  update(@Param('produtoId') produtoId: string, @Param('id') id: string, @Body() dto: UpdateIntegracaoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.integracoesService.update(produtoId, id, dto, user.userId);
  }

  @Patch(':id/toggle-status')
  toggleStatus(@Param('produtoId') produtoId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.integracoesService.toggleStatus(produtoId, id, user.userId);
  }

  @Get(':id/historico')
  historico(@Param('produtoId') produtoId: string, @Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.integracoesService.historico(produtoId, id, query.page, query.pageSize);
  }
}
