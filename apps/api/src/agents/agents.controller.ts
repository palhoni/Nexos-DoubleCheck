import { Body, Controller, Get, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgentsService } from './agents.service';
import { RunUsAnalyserDto } from './dto/run-us-analyser.dto';

@UseGuards(JwtAuthGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post('requisitos/extrair')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 10_000_000 } }))
  extractRequirement(@UploadedFile() file?: Express.Multer.File) {
    return this.agentsService.extractRequirementFile(file);
  }

  @Post('analisador-us/executar')
  runUsAnalyser(@Body() dto: RunUsAnalyserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.agentsService.runUsAnalyser(dto, user);
  }

  @Post('analisador-us/iniciar')
  startUsAnalyser(@Body() dto: RunUsAnalyserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.agentsService.startUsAnalyser(dto, user);
  }

  @Get('execucoes')
  listExecutions(@CurrentUser() user: AuthenticatedUser, @Query('projetoId') projetoId?: string) {
    return this.agentsService.listExecutions(user.userId, projetoId);
  }

  @Get('execucoes/:id')
  getExecution(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.agentsService.getExecution(id, user.userId);
  }
}
