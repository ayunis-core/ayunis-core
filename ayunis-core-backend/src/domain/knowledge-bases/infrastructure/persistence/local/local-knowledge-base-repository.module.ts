import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeBaseRecord } from './schema/knowledge-base.record';
import { LocalKnowledgeBaseRepository } from './local-knowledge-base.repository';
import { KnowledgeBaseMapper } from './mappers/knowledge-base.mapper';
import { KnowledgeBaseRepository } from '../../../application/ports/knowledge-base.repository';

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgeBaseRecord])],
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
