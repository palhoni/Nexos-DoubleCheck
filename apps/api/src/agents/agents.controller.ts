import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgentsService } from './agents.service';
import { RunUsAnalyserDto } from './dto/run-us-analyser.dto';
import { RunTestDesignerDto } from './dto/run-test-designer.dto';
import { StartEndpointDiscoveryDto } from './dto/start-endpoint-discovery.dto';
import { UpdateEndpointDecisionDto } from './dto/update-endpoint-decision.dto';
import { StartBugReportDto } from './dto/start-bug-report.dto';
import { UpdateBugStatusDto } from './dto/update-bug-status.dto';
import { TestDesignerService } from './test-designer.service';
import { EndpointDiscoveryService } from './endpoint-discovery.service';
import { BugReportService } from './bug-report.service';

@UseGuards(JwtAuthGuard)
@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly testDesignerService: TestDesignerService,
    private readonly endpointDiscoveryService: EndpointDiscoveryService,
    private readonly bugReportService: BugReportService,
  ) {}

  @Post('requisitos/extrair')
  @UseInterceptors(
    FileInterceptor('arquivo', { limits: { fileSize: 10_000_000 } }),
  )
  extractRequirement(@UploadedFile() file?: Express.Multer.File) {
    return this.agentsService.extractRequirementFile(file);
  }

  @Post('analisador-us/executar')
  runUsAnalyser(
    @Body() dto: RunUsAnalyserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.agentsService.runUsAnalyser(dto, user);
  }

  @Post('analisador-us/iniciar')
  startUsAnalyser(
    @Body() dto: RunUsAnalyserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.agentsService.startUsAnalyser(dto, user);
  }

  @Post('desenhista-testes/iniciar')
  startTestDesigner(
    @Body() dto: RunTestDesignerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.testDesignerService.start(dto, user);
  }

  @Get('desenhista-testes/execucoes')
  listTestDesignerExecutions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('analysisExecutionId') analysisExecutionId?: string,
  ) {
    return this.testDesignerService.list(user.userId, analysisExecutionId);
  }

  @Get('desenhista-testes/execucoes/:id')
  getTestDesignerExecution(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.testDesignerService.get(id, user.userId);
  }

  @Get('execucoes')
  listExecutions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('projetoId') projetoId?: string,
  ) {
    return this.agentsService.listExecutions(user.userId, projetoId);
  }

  @Get('execucoes/:id')
  getExecution(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.agentsService.getExecution(id, user.userId);
  }

  @Post('descobridor-endpoints/iniciar')
  startEndpointDiscovery(
    @Body() dto: StartEndpointDiscoveryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.endpointDiscoveryService.start(dto, user);
  }

  @Get('descobridor-endpoints/execucoes')
  listEndpointDiscoveryExecutions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('projetoId') projetoId?: string,
  ) {
    return this.endpointDiscoveryService.listExecutions(user.userId, projetoId);
  }

  @Get('descobridor-endpoints/execucoes/:id')
  getEndpointDiscoveryExecution(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.endpointDiscoveryService.getExecution(id, user.userId);
  }

  @Get('endpoints/backlogs')
  listEndpointBacklogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query('projetoId') projetoId?: string,
  ) {
    return this.endpointDiscoveryService.listBacklogs(user.userId, projetoId);
  }

  @Get('endpoints/backlogs/:id')
  getEndpointBacklog(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.endpointDiscoveryService.getBacklog(id, user.userId);
  }

  @Patch('endpoints/backlogs/:backlogId/itens/:itemId')
  updateEndpointDecision(
    @Param('backlogId') backlogId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateEndpointDecisionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.endpointDiscoveryService.updateDecision(
      backlogId,
      itemId,
      dto,
      user,
    );
  }

  @Post('gerador-bug-report/iniciar')
  startBugReport(
    @Body() dto: StartBugReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bugReportService.start(dto, user);
  }

  @Get('gerador-bug-report/execucoes')
  listBugReportExecutions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('projetoId') projetoId?: string,
  ) {
    return this.bugReportService.listExecutions(user.userId, projetoId);
  }

  @Get('gerador-bug-report/execucoes/:id')
  getBugReportExecution(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bugReportService.getExecution(id, user.userId);
  }

  @Get('bugs')
  listBugs(
    @CurrentUser() user: AuthenticatedUser,
    @Query('projetoId') projetoId?: string,
  ) {
    return this.bugReportService.listBugs(user.userId, projetoId);
  }

  @Get('bugs/:id')
  getBug(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bugReportService.getBug(id, user.userId);
  }

  @Patch('bugs/:id/status')
  updateBugStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBugStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bugReportService.updateStatus(id, dto, user);
  }
}
