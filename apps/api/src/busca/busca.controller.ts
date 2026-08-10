import { Controller, Get, Query } from '@nestjs/common';
import { BuscaService } from './busca.service';
import { QueryBuscaDto } from './dto/query-busca.dto';

@Controller('busca')
export class BuscaController {
  constructor(private readonly service: BuscaService) {}

  @Get()
  search(@Query() query: QueryBuscaDto) {
    return this.service.search(query);
  }
}
