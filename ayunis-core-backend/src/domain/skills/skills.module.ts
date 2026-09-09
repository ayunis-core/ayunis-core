import { ActivateWorkspaceSkillByNameUseCase } from './application/use-cases/activate-workspace-skill-by-name/activate-workspace-skill-by-name.use-case';
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SourcesModule } from 'src/domain/sources/sources.module';
import { McpModule } from 'src/domain/mcp/mcp.module';
import { MarketplaceModule } from 'src/domain/marketplace/marketplace.module';
import { LocalSkillRepositoryModule } from './infrastructure/persistence/local/local-skill-repository.module';
import { LocalSkillRepository } from './infrastructure/persistence/local/local-skill.repository';
import { SkillRepository } from './application/ports/skill.repository';
import { SkillRecord } from './infrastructure/persistence/local/schema/skill.record';
import { SkillActivationRecord } from './infrastructure/persistence/local/schema/skill-activation.record';
import { McpIntegrationRecord } from 'src/domain/mcp/infrastructure/persistence/postgres/schema/mcp-integration.record';
import { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import { KnowledgeBasesModule } from 'src/domain/knowledge-bases/knowledge-bases.module';
import { WorkspacesModule } from 'src/domain/workspaces/workspaces.module';
import { PermissionsModule } from 'src/iam/permissions/permissions.module';

// Use Cases
import { CreateSkillUseCase } from './application/use-cases/create-skill/create-skill.use-case';
import { UpdateSkillUseCase } from './application/use-cases/update-skill/update-skill.use-case';
import { DeleteSkillUseCase } from './application/use-cases/delete-skill/delete-skill.use-case';
import { FindOneSkillUseCase } from './application/use-cases/find-one-skill/find-one-skill.use-case';
import { ListAccessibleSkillsUseCase } from './application/use-cases/list-accessible-skills/list-accessible-skills.use-case';
import { SetSkillActivationUseCase } from './application/use-cases/set-skill-activation/set-skill-activation.use-case';
import { SetSkillPinUseCase } from './application/use-cases/set-skill-pin/set-skill-pin.use-case';
import { FindActiveSkillsUseCase } from './application/use-cases/find-active-skills/find-active-skills.use-case';
import { AddSourceToSkillUseCase } from './application/use-cases/add-source-to-skill/add-source-to-skill.use-case';
import { AddFileSourceToSkillUseCase } from './application/use-cases/add-file-source-to-skill/add-file-source-to-skill.use-case';
import { RemoveSourceFromSkillUseCase } from './application/use-cases/remove-source-from-skill/remove-source-from-skill.use-case';
import { ListSkillSourcesUseCase } from './application/use-cases/list-skill-sources/list-skill-sources.use-case';
import { AssignMcpIntegrationToSkillUseCase } from './application/use-cases/assign-mcp-integration-to-skill/assign-mcp-integration-to-skill.use-case';
import { UnassignMcpIntegrationFromSkillUseCase } from './application/use-cases/unassign-mcp-integration-from-skill/unassign-mcp-integration-from-skill.use-case';
import { ListSkillMcpIntegrationsUseCase } from './application/use-cases/list-skill-mcp-integrations/list-skill-mcp-integrations.use-case';
import { AssignKnowledgeBaseToSkillUseCase } from './application/use-cases/assign-knowledge-base-to-skill/assign-knowledge-base-to-skill.use-case';
import { UnassignKnowledgeBaseFromSkillUseCase } from './application/use-cases/unassign-knowledge-base-from-skill/unassign-knowledge-base-from-skill.use-case';
import { ListSkillKnowledgeBasesUseCase } from './application/use-cases/list-skill-knowledge-bases/list-skill-knowledge-bases.use-case';
import { FindSkillByNameUseCase } from './application/use-cases/find-skill-by-name/find-skill-by-name.use-case';
import { InstallSkillFromMarketplaceUseCase } from './application/use-cases/install-skill-from-marketplace/install-skill-from-marketplace.use-case';
import { CreateSkillWithUniqueNameUseCase } from './application/use-cases/create-skill-with-unique-name/create-skill-with-unique-name.use-case';
import { CheckKnowledgeBaseSkillShareAccessUseCase } from './application/use-cases/check-knowledge-base-skill-share-access/check-knowledge-base-skill-share-access.use-case';
import { FindKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase } from './application/use-cases/find-knowledge-base-ids-accessible-via-shared-skills/find-knowledge-base-ids-accessible-via-shared-skills.use-case';
import { GetSkillsByIdsUseCase } from './application/use-cases/get-skills-by-ids/get-skills-by-ids.use-case';

// Services
import { MarketplaceSkillInstallationService } from './application/services/marketplace-skill-installation.service';
import { FindActivatableSkillUseCase } from './application/use-cases/find-activatable-skill/find-activatable-skill.use-case';
import { SkillAuthorizationService } from './application/services/skill-authorization.service';
import { GetWorkspaceSkillsUseCase } from './application/use-cases/get-workspace-skills/get-workspace-skills.use-case';
import { SkillActivationService } from './application/services/skill-activation.service';
import { SkillCreatorNameService } from './application/services/skill-creator-name.service';

// Listeners
import { ShareDeletedListener } from './application/listeners/share-deleted.listener';
import { UserCreatedListener } from './application/listeners/user-created.listener';
import { SkillsWorkspaceDeletionRequestedListener } from './application/listeners/workspace-deletion-requested.listener';

// Strategies
import { SkillShareAuthorizationStrategy } from './application/strategies/skill-share-authorization.strategy';
import { getShareAuthStrategyToken } from 'src/domain/shares/application/factories/share-authorization.factory';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';

// Shares
import { SharesModule } from 'src/domain/shares/shares.module';

import { ThreadsModule } from 'src/domain/threads/threads.module';
import { UsersModule } from 'src/iam/users/users.module';

// Presenters
import { SkillsController } from './presenters/http/skills.controller';
import { SkillSourcesController } from './presenters/http/skill-sources.controller';
import { SkillMcpIntegrationsController } from './presenters/http/skill-mcp-integrations.controller';
import { SkillKnowledgeBasesController } from './presenters/http/skill-knowledge-bases.controller';
import { SkillDtoMapper } from './presenters/http/mappers/skill.mapper';
import { McpIntegrationDtoMapper } from 'src/domain/mcp/presenters/http/mappers/mcp-integration-dto.mapper';
import { KnowledgeBaseDtoMapper } from 'src/domain/knowledge-bases/presenters/http/mappers/knowledge-base-dto.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SkillRecord,
      SkillActivationRecord,
      McpIntegrationRecord,
      KnowledgeBaseRecord,
    ]),
    LocalSkillRepositoryModule,
    SourcesModule,
    McpModule,
    forwardRef(() => KnowledgeBasesModule),
    MarketplaceModule,
    UsersModule,
    forwardRef(() => SharesModule),
    forwardRef(() => ThreadsModule),
    forwardRef(() => WorkspacesModule),
    PermissionsModule,
  ],
  providers: [
    ActivateWorkspaceSkillByNameUseCase,
    GetWorkspaceSkillsUseCase,
    {
      provide: SkillRepository,
      useClass: LocalSkillRepository,
    },
    // Services
    SkillAuthorizationService,
    FindActivatableSkillUseCase,
    SkillActivationService,
    SkillCreatorNameService,

    // Use Cases
    CreateSkillUseCase,
    UpdateSkillUseCase,
    DeleteSkillUseCase,
    FindOneSkillUseCase,
    ListAccessibleSkillsUseCase,
    SetSkillActivationUseCase,
    SetSkillPinUseCase,
    FindActiveSkillsUseCase,
    AddSourceToSkillUseCase,
    AddFileSourceToSkillUseCase,
    RemoveSourceFromSkillUseCase,
    ListSkillSourcesUseCase,
    AssignMcpIntegrationToSkillUseCase,
    UnassignMcpIntegrationFromSkillUseCase,
    ListSkillMcpIntegrationsUseCase,
    AssignKnowledgeBaseToSkillUseCase,
    UnassignKnowledgeBaseFromSkillUseCase,
    ListSkillKnowledgeBasesUseCase,
    FindSkillByNameUseCase,
    InstallSkillFromMarketplaceUseCase,
    CreateSkillWithUniqueNameUseCase,
    CheckKnowledgeBaseSkillShareAccessUseCase,
    FindKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase,
    GetSkillsByIdsUseCase,

    // Services
    MarketplaceSkillInstallationService,

    // Listeners
    ShareDeletedListener,
    UserCreatedListener,
    SkillsWorkspaceDeletionRequestedListener,

    // Strategies
    SkillShareAuthorizationStrategy,
    {
      provide: getShareAuthStrategyToken(SharedEntityType.SKILL),
      useExisting: SkillShareAuthorizationStrategy,
    },

    // Presenters
    SkillDtoMapper,
    McpIntegrationDtoMapper,
    KnowledgeBaseDtoMapper,
  ],
  controllers: [
    SkillsController,
    SkillSourcesController,
    SkillMcpIntegrationsController,
    SkillKnowledgeBasesController,
  ],
  exports: [
    ActivateWorkspaceSkillByNameUseCase,
    GetWorkspaceSkillsUseCase,
    SkillRepository,
    FindActiveSkillsUseCase,
    FindSkillByNameUseCase,
    SkillActivationService,
    SkillShareAuthorizationStrategy,
    getShareAuthStrategyToken(SharedEntityType.SKILL),
    CreateSkillWithUniqueNameUseCase,
    CheckKnowledgeBaseSkillShareAccessUseCase,
    FindKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase,
  ],
})
export class SkillsModule {}
