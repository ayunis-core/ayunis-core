import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeBaseRecord } from './schema/knowledge-base.record';
import { SourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import { LocalKnowledgeBaseRepository } from './local-knowledge-base.repository';
import { KnowledgeBaseMapper } from './mappers/knowledge-base.mapper';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { LocalSourceRepositoryModule } from 'src/domain/sources/infrastructure/persistence/local/local-source-repository.module';
import { KnowledgeBaseActivationRecord } from './schema/knowledge-base-activation.record';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KnowledgeBaseRecord,
      KnowledgeBaseActivationRecord,
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
  ],
  exports: [KnowledgeBaseRepository],
})
export class LocalKnowledgeBaseRepositoryModule {}
