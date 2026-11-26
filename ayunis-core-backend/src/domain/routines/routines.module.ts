import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import { ModelsModule } from 'src/domain/models/models.module';
import { McpModule } from 'src/domain/mcp/mcp.module';
import { KnowledgeBasesModule } from 'src/domain/knowledge-bases/knowledge-bases.module';
import { McpIntegrationDtoMapper } from 'src/domain/mcp/presenters/http/mappers/mcp-integration-dto.mapper';
import { KnowledgeBaseDtoMapper } from 'src/domain/knowledge-bases/presenters/http/mappers/knowledge-base-dto.mapper';
import { RunsModule } from 'src/domain/runs/runs.module';
import { ThreadsModule } from 'src/domain/threads/threads.module';
import { SubscriptionsModule } from 'src/iam/subscriptions/subscriptions.module';
import { TrialsModule } from 'src/iam/trials/trials.module';
import { UsersModule } from 'src/iam/users/users.module';
import { AcademyAccessModule } from 'src/iam/academy-access/academy-access.module';
import { PermissionsModule } from 'src/iam/permissions/permissions.module';
import { MarketplaceModule } from 'src/domain/marketplace/marketplace.module';
import { RoutineExecutionQueue } from './application/ports/routine-execution-queue.port';
import { RoutinesRepository } from './application/ports/routines.repository';
import { RoutineModelService } from './application/services/routine-model.service';
import { RoutineIntegrationService } from './application/services/routine-integration.service';
import { RoutineKnowledgeBaseService } from './application/services/routine-knowledge-base.service';
import { RoutineSubscriptionGate } from './application/services/routine-subscription-gate.service';
import { RoutineAcademyGate } from './application/services/routine-academy-gate.service';
import { RoutineFailureNotifier } from './application/services/routine-failure-notifier.service';
import { NotificationsModule } from 'src/domain/notifications/notifications.module';
import { CreateRoutineUseCase } from './application/use-cases/create-routine/create-routine.use-case';
import { DeleteRoutineUseCase } from './application/use-cases/delete-routine/delete-routine.use-case';
import { ExecuteRoutineUseCase } from './application/use-cases/execute-routine/execute-routine.use-case';
import { FindAllRoutinesUseCase } from './application/use-cases/find-all-routines/find-all-routines.use-case';
import { FindManageableRoutinesUseCase } from './application/use-cases/find-manageable-routines/find-manageable-routines.use-case';
import { FindRoutineUseCase } from './application/use-cases/find-routine/find-routine.use-case';
import { InstallRoutineFromMarketplaceUseCase } from './application/use-cases/install-routine-from-marketplace/install-routine-from-marketplace.use-case';
import { RunRoutineNowUseCase } from './application/use-cases/run-routine-now/run-routine-now.use-case';
import { SweepDueRoutinesUseCase } from './application/use-cases/sweep-due-routines/sweep-due-routines.use-case';
import { UpdateRoutineUseCase } from './application/use-cases/update-routine/update-routine.use-case';
import { ListRoutineMcpIntegrationsUseCase } from './application/use-cases/list-routine-mcp-integrations/list-routine-mcp-integrations.use-case';
import { AddMcpIntegrationToRoutineUseCase } from './application/use-cases/add-mcp-integration-to-routine/add-mcp-integration-to-routine.use-case';
import { RemoveMcpIntegrationFromRoutineUseCase } from './application/use-cases/remove-mcp-integration-from-routine/remove-mcp-integration-from-routine.use-case';
import { ListRoutineKnowledgeBasesUseCase } from './application/use-cases/list-routine-knowledge-bases/list-routine-knowledge-bases.use-case';
import { AddKnowledgeBaseToRoutineUseCase } from './application/use-cases/add-knowledge-base-to-routine/add-knowledge-base-to-routine.use-case';
import { RemoveKnowledgeBaseFromRoutineUseCase } from './application/use-cases/remove-knowledge-base-from-routine/remove-knowledge-base-from-routine.use-case';
import { LocalRoutinesRepositoryModule } from './infrastructure/persistence/local/local-routines-repository.module';
import { LocalRoutinesRepository } from './infrastructure/persistence/local/local-routines.repository';
import { ROUTINE_EXECUTION_QUEUE } from './infrastructure/queue/routine-execution.constants';
import { RoutineExecutionConsumer } from './infrastructure/queue/routine-execution.consumer';
import { RoutineExecutionProducer } from './infrastructure/queue/routine-execution.producer';
import { ROUTINE_SWEEP_QUEUE } from './infrastructure/queue/routine-sweep.constants';
import { RoutineSweepConsumer } from './infrastructure/queue/routine-sweep.consumer';
import { RoutineDtoMapper } from './presenters/http/mappers/routine-dto.mapper';
import { RoutinesController } from './presenters/http/routines.controller';
import { RoutineMcpIntegrationsController } from './presenters/http/routine-mcp-integrations.controller';
import { RoutineKnowledgeBasesController } from './presenters/http/routine-knowledge-bases.controller';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: ROUTINE_EXECUTION_QUEUE },
      { name: ROUTINE_SWEEP_QUEUE },
    ),
    LocalRoutinesRepositoryModule,
    ModelsModule,
    McpModule,
    KnowledgeBasesModule,
    ThreadsModule,
    forwardRef(() => RunsModule), // Runs → Routines → Runs (circular)
    UsersModule,
    SubscriptionsModule,
    TrialsModule,
    AcademyAccessModule,
    PermissionsModule,
    NotificationsModule,
    MarketplaceModule,
  ],
  controllers: [
    RoutinesController,
    RoutineMcpIntegrationsController,
    RoutineKnowledgeBasesController,
  ],
  providers: [
    { provide: RoutinesRepository, useExisting: LocalRoutinesRepository },
    RoutineExecutionProducer,
    { provide: RoutineExecutionQueue, useExisting: RoutineExecutionProducer },
    RoutineExecutionConsumer,
    RoutineSweepConsumer,
    RoutineModelService,
    RoutineIntegrationService,
    RoutineKnowledgeBaseService,
    RoutineSubscriptionGate,
    RoutineAcademyGate,
    RoutineFailureNotifier,
    CreateRoutineUseCase,
    FindAllRoutinesUseCase,
    FindManageableRoutinesUseCase,
    FindRoutineUseCase,
    UpdateRoutineUseCase,
    ListRoutineMcpIntegrationsUseCase,
    AddMcpIntegrationToRoutineUseCase,
    RemoveMcpIntegrationFromRoutineUseCase,
    ListRoutineKnowledgeBasesUseCase,
    AddKnowledgeBaseToRoutineUseCase,
    RemoveKnowledgeBaseFromRoutineUseCase,
    DeleteRoutineUseCase,
    RunRoutineNowUseCase,
    InstallRoutineFromMarketplaceUseCase,
    ExecuteRoutineUseCase,
    SweepDueRoutinesUseCase,
    RoutineDtoMapper,
    McpIntegrationDtoMapper,
    KnowledgeBaseDtoMapper,
  ],
  exports: [FindManageableRoutinesUseCase],
})
export class RoutinesModule {}
