import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateFonteDto } from './dto/create-fonte.dto';
import { CreateFonteVinculoDto } from './dto/create-fonte-vinculo.dto';
import { QueryFonteDto } from './dto/query-fonte.dto';
import { QueryFonteVinculoDto } from './dto/query-fonte-vinculo.dto';
import { UpdateFonteDto } from './dto/update-fonte.dto';
import type { FonteEntityType } from './fontes.constants';
import { FontesService } from './fontes.service';

@UseGuards(JwtAuthGuard)
@Controller('fontes')
export class FontesController {
  constructor(private readonly fontesService: FontesService) {}

  @Get()
  findAll(@Query() query: QueryFonteDto) {
    return this.fontesService.findAll(query);
  }

  @Get('resumo')
  resumo(@Query('projetoId') projetoId: string) {
    return this.fontesService.resumo(projetoId);
  }

  @Get('vinculos')
  linksByEntity(@Query() query: QueryFonteVinculoDto) {
    return this.fontesService.listLinksByEntity(query.entityType as FonteEntityType, query.entityId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fontesService.findOneOrThrow(id);
  }

  @Post()
  create(@Body() dto: CreateFonteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.fontesService.create(dto, user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFonteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.fontesService.update(id, dto, user.userId);
  }

  @Patch(':id/toggle-status')
  toggleStatus(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.fontesService.toggleStatus(id, user.userId);
  }

  @Get(':id/historico')
  historico(@Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.fontesService.historico(id, query.page, query.pageSize);
  }

  @Post(':id/vinculos')
  createLink(@Param('id') id: string, @Body() dto: CreateFonteVinculoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.fontesService.createLink(id, dto, user.userId);
  }

  @Delete(':id/vinculos/:vinculoId')
  removeLink(@Param('id') id: string, @Param('vinculoId') vinculoId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.fontesService.removeLink(id, vinculoId, user.userId);
  }
}
