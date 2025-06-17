import { Module } from '@nestjs/common';
import { ModelsModule } from 'src/domain/models/models.module';
import { ToolsModule } from 'src/domain/tools/tools.module';
import { MessagesModule } from 'src/domain/messages/messages.module';
import { ThreadsModule } from 'src/domain/threads/threads.module';
import { RunsController } from './presenters/http/runs.controller';
import { AgentsModule } from 'src/domain/agents/agents.module';
import { ExecuteRunUseCase } from './application/use-cases/execute-run/execute-run.use-case';
import { ExecuteRunAndSetTitleUseCase } from './application/use-cases/execute-run-and-set-title/execute-run-and-set-title.use-case';
import { RunSessionManager } from './presenters/http/sse/run-session.manager';

@Module({
  imports: [
    ModelsModule,
    ThreadsModule,
    MessagesModule,
    ToolsModule,
    AgentsModule,
  ],
  controllers: [RunsController],
  providers: [
    ExecuteRunUseCase,
    ExecuteRunAndSetTitleUseCase,
    RunSessionManager,
  ],
  exports: [ExecuteRunUseCase, ExecuteRunAndSetTitleUseCase],
})
export class RunsModule {}
