import { Body, Controller, Get, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgentsService } from './agents.service';
import { RunUsAnalyserDto } from './dto/run-us-analyser.dto';
import { RunTestDesignerDto } from './dto/run-test-designer.dto';
import { TestDesignerService } from './test-designer.service';

@UseGuards(JwtAuthGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService, private readonly testDesignerService: TestDesignerService) {}

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

  @Post('desenhista-testes/iniciar')
  startTestDesigner(@Body() dto: RunTestDesignerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.testDesignerService.start(dto, user);
  }

  @Get('desenhista-testes/execucoes')
  listTestDesignerExecutions(@CurrentUser() user: AuthenticatedUser, @Query('analysisExecutionId') analysisExecutionId?: string) {
    return this.testDesignerService.list(user.userId, analysisExecutionId);
  }

  @Get('desenhista-testes/execucoes/:id')
  getTestDesignerExecution(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.testDesignerService.get(id, user.userId);
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
