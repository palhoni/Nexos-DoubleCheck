import { Controller, Get } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { MinhaAreaService } from './minha-area.service';

@Controller('minha-area')
export class MinhaAreaController {
  constructor(private readonly service: MinhaAreaService) {}

  @Get()
  resumo(@CurrentUser() user: AuthenticatedUser) {
    return this.service.resumo(user);
  }
}
