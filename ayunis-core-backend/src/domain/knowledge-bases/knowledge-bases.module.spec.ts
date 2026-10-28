import { MODULE_METADATA } from '@nestjs/common/constants';
import { KnowledgeBasesModule } from './knowledge-bases.module';
import { FindAccessibleKnowledgeBaseUseCase } from './application/use-cases/find-accessible-knowledge-base/find-accessible-knowledge-base.use-case';
import { GetAccessibleKnowledgeBaseContextsUseCase } from './application/use-cases/get-accessible-knowledge-base-contexts/get-accessible-knowledge-base-contexts.use-case';

describe('knowledge-base public boundary', () => {
  it('exports access use cases', () => {
    const exports: unknown[] = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      KnowledgeBasesModule,
    );
    expect(exports).toEqual(
      expect.arrayContaining([
        FindAccessibleKnowledgeBaseUseCase,
        GetAccessibleKnowledgeBaseContextsUseCase,
      ]),
    );
  });
});
