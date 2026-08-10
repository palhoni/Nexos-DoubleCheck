import { Controller, Get, Query } from '@nestjs/common';
import { GovernancaService } from './governanca.service';
import { QueryGovernancaDto } from './dto/query-governanca.dto';

@Controller('governanca')
export class GovernancaController {
  constructor(private readonly service: GovernancaService) {}

  @Get('resumo')
  resumo(@Query() query: QueryGovernancaDto) {
    return this.service.resumo(query.projetoId);
  }
}
