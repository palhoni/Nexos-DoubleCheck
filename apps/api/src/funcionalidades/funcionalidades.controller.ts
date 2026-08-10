import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FuncionalidadesService } from './funcionalidades.service';
import { CreateFuncionalidadeDto } from './dto/create-funcionalidade.dto';
import { UpdateFuncionalidadeDto } from './dto/update-funcionalidade.dto';
import { QueryFuncionalidadeDto } from './dto/query-funcionalidade.dto';

@UseGuards(JwtAuthGuard)
@Controller('produtos/:produtoId/funcionalidades')
export class FuncionalidadesController {
  constructor(private readonly funcionalidadesService: FuncionalidadesService) {}

  @Get()
  findAll(@Param('produtoId') produtoId: string, @Query() query: QueryFuncionalidadeDto) {
    return this.funcionalidadesService.findAll(produtoId, query);
  }

  @Get(':id')
  findOne(@Param('produtoId') produtoId: string, @Param('id') id: string) {
    return this.funcionalidadesService.findOneOrThrow(produtoId, id);
  }

  @Post()
  create(@Param('produtoId') produtoId: string, @Body() dto: CreateFuncionalidadeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.funcionalidadesService.create(produtoId, dto, user.userId);
  }

  @Patch(':id')
  update(@Param('produtoId') produtoId: string, @Param('id') id: string, @Body() dto: UpdateFuncionalidadeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.funcionalidadesService.update(produtoId, id, dto, user.userId);
  }

  @Patch(':id/toggle-status')
  toggleStatus(@Param('produtoId') produtoId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.funcionalidadesService.toggleStatus(produtoId, id, user.userId);
  }

  @Get(':id/historico')
  historico(@Param('produtoId') produtoId: string, @Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.funcionalidadesService.historico(produtoId, id, query.page, query.pageSize);
  }
}
