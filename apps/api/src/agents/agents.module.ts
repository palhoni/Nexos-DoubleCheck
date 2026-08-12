import { Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { TestDesignerService } from './test-designer.service';
import { EndpointDiscoveryService } from './endpoint-discovery.service';
import { BugReportService } from './bug-report.service';
import { JourneyMapperService } from './journey-mapper.service';
import { AgentsRuntimeModule } from './runtime/agents-runtime.module';
import { JornadasModule } from '../jornadas/jornadas.module';
import { RegrasModule } from '../regras/regras.module';
import { FontesModule } from '../fontes/fontes.module';
import { DocumentosModule } from '../documentos/documentos.module';

@Module({
  imports: [AgentsRuntimeModule, JornadasModule, RegrasModule, FontesModule, DocumentosModule],
  controllers: [AgentsController],
  providers: [
    AgentsService,
    TestDesignerService,
    EndpointDiscoveryService,
    BugReportService,
    JourneyMapperService,
  ],
})
export class AgentsModule {}
