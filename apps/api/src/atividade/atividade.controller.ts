import { Controller, Get, Query } from '@nestjs/common';
import { AtividadeService } from './atividade.service';
import { QueryAtividadeDto } from './dto/query-atividade.dto';

@Controller('atividade')
export class AtividadeController {
  constructor(private readonly service: AtividadeService) {}

  @Get()
  list(@Query() query: QueryAtividadeDto) {
    return this.service.list(query);
  }
}
