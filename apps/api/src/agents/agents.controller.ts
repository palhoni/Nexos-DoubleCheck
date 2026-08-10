import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgentsService } from './agents.service';
import { RunUsAnalyserDto } from './dto/run-us-analyser.dto';

@UseGuards(JwtAuthGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post('analisador-us/executar')
  runUsAnalyser(@Body() dto: RunUsAnalyserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.agentsService.runUsAnalyser(dto, user.email);
  }

  @Post('analisador-us/iniciar')
  startUsAnalyser(@Body() dto: RunUsAnalyserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.agentsService.startUsAnalyser(dto, user.email);
  }

  @Get('execucoes/:id')
  getExecution(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.agentsService.getExecution(id, user.email);
  }
}
