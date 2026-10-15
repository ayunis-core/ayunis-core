import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeBaseRecord } from './schema/knowledge-base.record';
import { SourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import { LocalKnowledgeBaseRepository } from './local-knowledge-base.repository';
import { KnowledgeBaseMapper } from './mappers/knowledge-base.mapper';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { LocalSourceRepositoryModule } from 'src/domain/sources/infrastructure/persistence/local/local-source-repository.module';
import { KnowledgeBaseActivationRecord } from './schema/knowledge-base-activation.record';
import { AccessibleKnowledgeBasesByIdsRepository } from 'src/domain/knowledge-bases/application/ports/accessible-knowledge-bases-by-ids.repository';
import { CollectiveKnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/collective-knowledge-base.repository';
import { LocalCollectiveKnowledgeBaseRepository } from './local-collective-knowledge-base.repository';
import { WorkspaceKnowledgeBaseLinkRecord } from './schema/workspace-knowledge-base-link.record';
import { LocalWorkspaceKnowledgeBaseLinkRepository } from './local-workspace-knowledge-base-link.repository';
import { WorkspaceKnowledgeBaseLinkRepository } from 'src/domain/knowledge-bases/application/ports/workspace-knowledge-base-link.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KnowledgeBaseRecord,
      KnowledgeBaseActivationRecord,
      WorkspaceKnowledgeBaseLinkRecord,
      SourceRecord,
    ]),
    LocalSourceRepositoryModule,
  ],
  providers: [
    KnowledgeBaseMapper,
    LocalKnowledgeBaseRepository,
    {
      provide: KnowledgeBaseRepository,
      useExisting: LocalKnowledgeBaseRepository,
    },
    {
      provide: AccessibleKnowledgeBasesByIdsRepository,
      useExisting: LocalKnowledgeBaseRepository,
    },
    {
      provide: CollectiveKnowledgeBaseRepository,
      useClass: LocalCollectiveKnowledgeBaseRepository,
    },
    {
      provide: WorkspaceKnowledgeBaseLinkRepository,
      useClass: LocalWorkspaceKnowledgeBaseLinkRepository,
    },
  ],
  exports: [
    KnowledgeBaseRepository,
    AccessibleKnowledgeBasesByIdsRepository,
    CollectiveKnowledgeBaseRepository,
    WorkspaceKnowledgeBaseLinkRepository,
  ],
})
export class LocalKnowledgeBaseRepositoryModule {}
