import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ModelsModule } from 'src/domain/models/models.module';
import { McpModule } from 'src/domain/mcp/mcp.module';
import { RunsModule } from 'src/domain/runs/runs.module';
import { ThreadsModule } from 'src/domain/threads/threads.module';
import { SubscriptionsModule } from 'src/iam/subscriptions/subscriptions.module';
import { TrialsModule } from 'src/iam/trials/trials.module';
import { UsersModule } from 'src/iam/users/users.module';
import { AcademyAccessModule } from 'src/iam/academy-access/academy-access.module';
import { PermissionsModule } from 'src/iam/permissions/permissions.module';
import { RoutineExecutionQueue } from './application/ports/routine-execution-queue.port';
import { RoutinesRepository } from './application/ports/routines.repository';
import { RoutineModelService } from './application/services/routine-model.service';
import { RoutineIntegrationService } from './application/services/routine-integration.service';
import { RoutineSubscriptionGate } from './application/services/routine-subscription-gate.service';
import { RoutineAcademyGate } from './application/services/routine-academy-gate.service';
import { RoutineFailureNotifier } from './application/services/routine-failure-notifier.service';
import { NotificationsModule } from 'src/domain/notifications/notifications.module';
import { CreateRoutineUseCase } from './application/use-cases/create-routine/create-routine.use-case';
import { DeleteRoutineUseCase } from './application/use-cases/delete-routine/delete-routine.use-case';
import { ExecuteRoutineUseCase } from './application/use-cases/execute-routine/execute-routine.use-case';
import { FindAllRoutinesUseCase } from './application/use-cases/find-all-routines/find-all-routines.use-case';
import { FindRoutineUseCase } from './application/use-cases/find-routine/find-routine.use-case';
import { RunRoutineNowUseCase } from './application/use-cases/run-routine-now/run-routine-now.use-case';
import { SweepDueRoutinesUseCase } from './application/use-cases/sweep-due-routines/sweep-due-routines.use-case';
import { UpdateRoutineUseCase } from './application/use-cases/update-routine/update-routine.use-case';
import { LocalRoutinesRepositoryModule } from './infrastructure/persistence/local/local-routines-repository.module';
import { LocalRoutinesRepository } from './infrastructure/persistence/local/local-routines.repository';
import { ROUTINE_EXECUTION_QUEUE } from './infrastructure/queue/routine-execution.constants';
import { RoutineExecutionConsumer } from './infrastructure/queue/routine-execution.consumer';
import { RoutineExecutionProducer } from './infrastructure/queue/routine-execution.producer';
import { ROUTINE_SWEEP_QUEUE } from './infrastructure/queue/routine-sweep.constants';
import { RoutineSweepConsumer } from './infrastructure/queue/routine-sweep.consumer';
import { RoutineDtoMapper } from './presenters/http/mappers/routine-dto.mapper';
import { RoutinesController } from './presenters/http/routines.controller';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: ROUTINE_EXECUTION_QUEUE },
      { name: ROUTINE_SWEEP_QUEUE },
    ),
    LocalRoutinesRepositoryModule,
    ModelsModule,
    McpModule,
    ThreadsModule,
    RunsModule,
    UsersModule,
    SubscriptionsModule,
    TrialsModule,
    AcademyAccessModule,
    PermissionsModule,
    NotificationsModule,
  ],
  controllers: [RoutinesController],
  providers: [
    { provide: RoutinesRepository, useExisting: LocalRoutinesRepository },
    RoutineExecutionProducer,
    { provide: RoutineExecutionQueue, useExisting: RoutineExecutionProducer },
    RoutineExecutionConsumer,
    RoutineSweepConsumer,
    RoutineModelService,
    RoutineIntegrationService,
    RoutineSubscriptionGate,
    RoutineAcademyGate,
    RoutineFailureNotifier,
    CreateRoutineUseCase,
    FindAllRoutinesUseCase,
    FindRoutineUseCase,
    UpdateRoutineUseCase,
    DeleteRoutineUseCase,
    RunRoutineNowUseCase,
    ExecuteRoutineUseCase,
    SweepDueRoutinesUseCase,
    RoutineDtoMapper,
  ],
})
export class RoutinesModule {}
