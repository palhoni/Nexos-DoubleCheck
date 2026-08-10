import { Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { TestDesignerService } from './test-designer.service';

@Module({
  controllers: [AgentsController],
  providers: [AgentsService, TestDesignerService],
})
export class AgentsModule {}
