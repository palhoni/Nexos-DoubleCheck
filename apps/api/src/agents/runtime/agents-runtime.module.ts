import { Module } from '@nestjs/common';
import { ClaudeTextRunner } from './claude-text.runner';
import { ClaudeAgentSdkTextRunner } from './claude-agent-sdk-text.runner';
import { AgentRunnerFactory } from './agent-runner.factory';

@Module({
  providers: [ClaudeTextRunner, ClaudeAgentSdkTextRunner, AgentRunnerFactory],
  exports: [AgentRunnerFactory],
})
export class AgentsRuntimeModule {}
