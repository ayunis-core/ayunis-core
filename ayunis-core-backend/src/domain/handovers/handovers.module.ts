import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeBasesModule } from 'src/domain/knowledge-bases/knowledge-bases.module';
import { OwnershipModule } from 'src/domain/ownership/ownership.module';
import { SkillsModule } from 'src/domain/skills/skills.module';
import { PermissionsModule } from 'src/iam/permissions/permissions.module';
import { TeamsModule } from 'src/iam/teams/teams.module';
import { HandoverRequestsRepository } from './application/ports/handover-requests.repository';
import { HandoverPolicy } from './application/services/handover-policy.service';
import { HandoverResourceGateway } from './application/services/handover-resource.gateway';
import { CreateHandoverRequestUseCase } from './application/use-cases/create-handover-request/create-handover-request.use-case';
import { DecideHandoverRequestUseCase } from './application/use-cases/decide-handover-request/decide-handover-request.use-case';
import { FindPendingHandoverUseCase } from './application/use-cases/find-pending-handover/find-pending-handover.use-case';
import { GetHandoverSummaryUseCase } from './application/use-cases/get-handover-summary/get-handover-summary.use-case';
import { IsHandoverReviewerUseCase } from './application/use-cases/is-handover-reviewer/is-handover-reviewer.use-case';
import { ListHandoverTargetsUseCase } from './application/use-cases/list-handover-targets/list-handover-targets.use-case';
import { ListReviewableHandoversUseCase } from './application/use-cases/list-reviewable-handovers/list-reviewable-handovers.use-case';
import { LocalHandoverRequestsRepository } from './infrastructure/persistence/local/local-handover-requests.repository';
import { HandoverRequestMapper } from './infrastructure/persistence/local/mappers/handover-request.mapper';
import { HandoverRequestRecord } from './infrastructure/persistence/local/schema/handover-request.record';
import { HandoverRequestsController } from './presenters/http/handover-requests.controller';
import { HandoverRequestDtoMapper } from './presenters/http/mappers/handover-request-dto.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([HandoverRequestRecord]),
    OwnershipModule,
    PermissionsModule,
    TeamsModule,
    forwardRef(() => SkillsModule),
    forwardRef(() => KnowledgeBasesModule),
  ],
  controllers: [HandoverRequestsController],
  providers: [
    HandoverRequestMapper,
    {
      provide: HandoverRequestsRepository,
      useClass: LocalHandoverRequestsRepository,
    },
    HandoverPolicy,
    HandoverResourceGateway,
    ListHandoverTargetsUseCase,
    CreateHandoverRequestUseCase,
    DecideHandoverRequestUseCase,
    ListReviewableHandoversUseCase,
    GetHandoverSummaryUseCase,
    FindPendingHandoverUseCase,
    IsHandoverReviewerUseCase,
    HandoverRequestDtoMapper,
  ],
  exports: [IsHandoverReviewerUseCase],
})
export class HandoversModule {}
