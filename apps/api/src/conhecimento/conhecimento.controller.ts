import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConhecimentoService } from './conhecimento.service';
import { QueryConhecimentoGrafoDto } from './dto/query-conhecimento-grafo.dto';

@UseGuards(JwtAuthGuard)
@Controller('conhecimento')
export class ConhecimentoController {
  constructor(private readonly conhecimentoService: ConhecimentoService) {}

  @Get('grafo')
  grafo(@Query() query: QueryConhecimentoGrafoDto) {
    return this.conhecimentoService.grafo(query);
  }
}
