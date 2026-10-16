import { ActivateWorkspaceSkillByNameUseCase } from './application/use-cases/activate-workspace-skill-by-name/activate-workspace-skill-by-name.use-case';
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SourcesModule } from 'src/domain/sources/sources.module';
import { McpModule } from 'src/domain/mcp/mcp.module';
import { MarketplaceModule } from 'src/domain/marketplace/marketplace.module';
import { LocalSkillRepositoryModule } from './infrastructure/persistence/local/local-skill-repository.module';
import { LocalSkillRepository } from './infrastructure/persistence/local/local-skill.repository';
import { SkillRepository } from './application/ports/skill.repository';
import { CollectiveSkillRepository } from './application/ports/collective-skill.repository';
import { LocalCollectiveSkillRepository } from './infrastructure/persistence/local/local-collective-skill.repository';
import { SkillNameLookupService } from './application/services/skill-name-lookup.service';
import { SkillOwnershipContextService } from './application/services/skill-ownership-context.service';
import { OwnershipModule } from 'src/domain/ownership/ownership.module';
import { HandoversModule } from 'src/domain/handovers/handovers.module';
import { TransferSkillOwnershipUseCase } from './application/use-cases/transfer-skill-ownership/transfer-skill-ownership.use-case';
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
import { FindInstalledMarketplaceSkillUseCase } from './application/use-cases/find-installed-marketplace-skill/find-installed-marketplace-skill.use-case';
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
import { GetSkillsByIdsUseCase } from './application/use-cases/get-skills-by-ids/get-skills-by-ids.use-case';

// Services
import { MarketplaceSkillInstallationService } from './application/services/marketplace-skill-installation.service';
import { FindActivatableSkillUseCase } from './application/use-cases/find-activatable-skill/find-activatable-skill.use-case';
import { SkillAuthorizationService } from './application/services/skill-authorization.service';
import { GetWorkspaceSkillsUseCase } from './application/use-cases/get-workspace-skills/get-workspace-skills.use-case';
import { SkillActivationService } from './application/services/skill-activation.service';
import { SkillTextModelResolver } from './application/services/skill-text-model-resolver.service';
import { ImproveSkillTextUseCase } from './application/use-cases/improve-skill-text/improve-skill-text.use-case';
import { UsageModule } from 'src/domain/usage/usage.module';
import { QuotasModule } from 'src/iam/quotas/quotas.module';
import { TrialsModule } from 'src/iam/trials/trials.module';
import { ModelsModule } from 'src/domain/models/models.module';

// Listeners
import { UserCreatedListener } from './application/listeners/user-created.listener';
import { SkillsWorkspaceDeletionRequestedListener } from './application/listeners/workspace-deletion-requested.listener';

// Strategies

import { ThreadsModule } from 'src/domain/threads/threads.module';
import { UsersModule } from 'src/iam/users/users.module';

// Presenters
import { SkillsController } from './presenters/http/skills.controller';
import { SkillSourcesController } from './presenters/http/skill-sources.controller';
import { SkillLinksController } from './presenters/http/skill-links.controller';
import { ListLinkedWorkspaceSkillsUseCase } from './application/use-cases/list-linked-workspace-skills/list-linked-workspace-skills.use-case';
import { ListLinkableWorkspaceSkillsUseCase } from './application/use-cases/list-linkable-workspace-skills/list-linkable-workspace-skills.use-case';
import { LinkSkillsToWorkspaceUseCase } from './application/use-cases/link-skills-to-workspace/link-skills-to-workspace.use-case';
import { UnlinkSkillFromWorkspaceUseCase } from './application/use-cases/unlink-skill-from-workspace/unlink-skill-from-workspace.use-case';
import { GetLinkedWorkspaceSkillsUseCase } from './application/use-cases/get-linked-workspace-skills/get-linked-workspace-skills.use-case';
import { ListSkillLinkedWorkspacesUseCase } from './application/use-cases/list-skill-linked-workspaces/list-skill-linked-workspaces.use-case';
import { WorkspaceSkillLinkRepository } from './application/ports/workspace-skill-link.repository';
import { LocalWorkspaceSkillLinkRepository } from './infrastructure/persistence/local/local-workspace-skill-link.repository';
import { SkillMandatoryController } from './presenters/http/skill-mandatory.controller';
import { SetSkillMandatoryUseCase } from './application/use-cases/set-skill-mandatory/set-skill-mandatory.use-case';
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
    forwardRef(() => ThreadsModule),
    forwardRef(() => WorkspacesModule),
    PermissionsModule,
    forwardRef(() => ModelsModule),
    QuotasModule,
    UsageModule,
    TrialsModule,
    OwnershipModule,
    forwardRef(() => HandoversModule),
  ],
  providers: [
    SetSkillMandatoryUseCase,
    ActivateWorkspaceSkillByNameUseCase,
    GetWorkspaceSkillsUseCase,
    {
      provide: SkillRepository,
      useClass: LocalSkillRepository,
    },
    {
      provide: CollectiveSkillRepository,
      useClass: LocalCollectiveSkillRepository,
    },
    {
      provide: WorkspaceSkillLinkRepository,
      useExisting: LocalWorkspaceSkillLinkRepository,
    },
    ListLinkedWorkspaceSkillsUseCase,
    ListLinkableWorkspaceSkillsUseCase,
    LinkSkillsToWorkspaceUseCase,
    UnlinkSkillFromWorkspaceUseCase,
    GetLinkedWorkspaceSkillsUseCase,
    ListSkillLinkedWorkspacesUseCase,
    // Services
    SkillAuthorizationService,
    SkillNameLookupService,
    SkillOwnershipContextService,
    TransferSkillOwnershipUseCase,
    FindActivatableSkillUseCase,
    SkillActivationService,
    SkillTextModelResolver,
    ImproveSkillTextUseCase,

    // Use Cases
    CreateSkillUseCase,
    UpdateSkillUseCase,
    DeleteSkillUseCase,
    FindOneSkillUseCase,
    FindInstalledMarketplaceSkillUseCase,
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
    GetSkillsByIdsUseCase,

    // Services
    MarketplaceSkillInstallationService,

    // Listeners
    UserCreatedListener,
    SkillsWorkspaceDeletionRequestedListener,

    // Presenters
    SkillDtoMapper,
    McpIntegrationDtoMapper,
    KnowledgeBaseDtoMapper,
  ],
  controllers: [
    SkillMandatoryController,
    SkillLinksController,
    SkillsController,
    SkillSourcesController,
    SkillMcpIntegrationsController,
    SkillKnowledgeBasesController,
  ],
  exports: [
    TransferSkillOwnershipUseCase,
    ActivateWorkspaceSkillByNameUseCase,
    GetWorkspaceSkillsUseCase,
    GetLinkedWorkspaceSkillsUseCase,
    SkillRepository,
    FindActiveSkillsUseCase,
    FindOneSkillUseCase,
    FindSkillByNameUseCase,
    SkillActivationService,
    CreateSkillWithUniqueNameUseCase,
  ],
})
export class SkillsModule {}
