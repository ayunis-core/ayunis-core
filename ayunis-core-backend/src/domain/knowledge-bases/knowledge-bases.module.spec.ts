import { MODULE_METADATA } from '@nestjs/common/constants';
import { KnowledgeBasesModule } from './knowledge-bases.module';
import { KnowledgeBaseAccessService } from './application/services/knowledge-base-access.service';
import { FindAccessibleKnowledgeBaseUseCase } from './application/use-cases/find-accessible-knowledge-base/find-accessible-knowledge-base.use-case';
import { GetAccessibleKnowledgeBaseContextsUseCase } from './application/use-cases/get-accessible-knowledge-base-contexts/get-accessible-knowledge-base-contexts.use-case';

describe('knowledge-base public boundary', () => {
  it('exports access use cases, not the internal policy service', () => {
    const exports: unknown[] = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      KnowledgeBasesModule,
    );
    const providers: unknown[] = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      KnowledgeBasesModule,
    );
    expect(exports).not.toContain(KnowledgeBaseAccessService);
    expect(providers).toContain(KnowledgeBaseAccessService);
    expect(exports).toEqual(
      expect.arrayContaining([
        FindAccessibleKnowledgeBaseUseCase,
        GetAccessibleKnowledgeBaseContextsUseCase,
      ]),
    );
  });
});
