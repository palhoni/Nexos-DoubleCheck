import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { CreateDocumentoVersaoDto } from './dto/create-documento-versao.dto';
import { CreateDocumentoVinculoDto } from './dto/create-documento-vinculo.dto';
import { QueryDocumentoDto } from './dto/query-documento.dto';
import { QueryDocumentoVinculoDto } from './dto/query-documento-vinculo.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
import type { DocumentoEntityType } from './documentos.constants';
import { DocumentosService } from './documentos.service';

@UseGuards(JwtAuthGuard)
@Controller('documentos')
export class DocumentosController {
  constructor(private readonly documentosService: DocumentosService) {}

  @Get()
  findAll(@Query() query: QueryDocumentoDto) {
    return this.documentosService.findAll(query);
  }

  @Get('resumo')
  resumo(@Query('projetoId') projetoId: string) {
    return this.documentosService.resumo(projetoId);
  }

  @Get('vinculos')
  linksByEntity(@Query() query: QueryDocumentoVinculoDto) {
    return this.documentosService.listLinksByEntity(query.entityType as DocumentoEntityType, query.entityId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentosService.findOneOrThrow(id);
  }

  @Post()
  create(@Body() dto: CreateDocumentoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.documentosService.create(dto, user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDocumentoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.documentosService.update(id, dto, user.userId);
  }

  @Post(':id/versoes')
  createVersion(@Param('id') id: string, @Body() dto: CreateDocumentoVersaoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.documentosService.createVersion(id, dto, user.userId);
  }

  @Get(':id/versoes')
  versions(@Param('id') id: string) {
    return this.documentosService.listVersions(id);
  }

  @Get(':id/historico')
  history(@Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.documentosService.historico(id, query.page, query.pageSize);
  }

  @Post(':id/vinculos')
  createLink(@Param('id') id: string, @Body() dto: CreateDocumentoVinculoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.documentosService.createLink(id, dto, user.userId);
  }

  @Delete(':id/vinculos/:vinculoId')
  removeLink(@Param('id') id: string, @Param('vinculoId') vinculoId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentosService.removeLink(id, vinculoId, user.userId);
  }
}
