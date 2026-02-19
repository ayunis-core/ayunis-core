import type { ProductKnowledgeTopic } from 'src/domain/tools/domain/tools/product-knowledge-tool.entity';

export abstract class ProductKnowledgePort {
  abstract getContent(topic: ProductKnowledgeTopic): string;
}
