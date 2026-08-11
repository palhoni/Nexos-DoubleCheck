import { Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { TestDesignerService } from './test-designer.service';
import { EndpointDiscoveryService } from './endpoint-discovery.service';
import { BugReportService } from './bug-report.service';
import { AgentsRuntimeModule } from './runtime/agents-runtime.module';

@Module({
  imports: [AgentsRuntimeModule],
  controllers: [AgentsController],
  providers: [
    AgentsService,
    TestDesignerService,
    EndpointDiscoveryService,
    BugReportService,
  ],
})
export class AgentsModule {}
