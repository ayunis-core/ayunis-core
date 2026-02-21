import { Module } from '@nestjs/common';
import { LocalKnowledgeBaseRepositoryModule } from './infrastructure/persistence/local/local-knowledge-base-repository.module';

@Module({
  imports: [LocalKnowledgeBaseRepositoryModule],
  exports: [LocalKnowledgeBaseRepositoryModule],
})
export class KnowledgeBasesModule {}
