import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ModulosService } from './modulos.service';
import { CreateModuloDto } from './dto/create-modulo.dto';
import { UpdateModuloDto } from './dto/update-modulo.dto';
import { QueryModuloDto } from './dto/query-modulo.dto';

@UseGuards(JwtAuthGuard)
@Controller('produtos/:produtoId/modulos')
export class ModulosController {
  constructor(private readonly modulosService: ModulosService) {}

  @Get()
  findAll(@Param('produtoId') produtoId: string, @Query() query: QueryModuloDto) {
    return this.modulosService.findAll(produtoId, query);
  }

  @Get(':id')
  findOne(@Param('produtoId') produtoId: string, @Param('id') id: string) {
    return this.modulosService.findOneOrThrow(produtoId, id);
  }

  @Post()
  create(@Param('produtoId') produtoId: string, @Body() dto: CreateModuloDto, @CurrentUser() user: AuthenticatedUser) {
    return this.modulosService.create(produtoId, dto, user.userId);
  }

  @Patch(':id')
  update(@Param('produtoId') produtoId: string, @Param('id') id: string, @Body() dto: UpdateModuloDto, @CurrentUser() user: AuthenticatedUser) {
    return this.modulosService.update(produtoId, id, dto, user.userId);
  }

  @Patch(':id/toggle-status')
  toggleStatus(@Param('produtoId') produtoId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.modulosService.toggleStatus(produtoId, id, user.userId);
  }

  @Get(':id/historico')
  historico(@Param('produtoId') produtoId: string, @Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.modulosService.historico(produtoId, id, query.page, query.pageSize);
  }
}
