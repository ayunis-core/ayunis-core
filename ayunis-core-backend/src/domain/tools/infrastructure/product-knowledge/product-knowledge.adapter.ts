import { Injectable } from '@nestjs/common';
import { ProductKnowledgePort } from 'src/domain/tools/application/ports/product-knowledge.port';
import { ProductKnowledgeTopic } from 'src/domain/tools/domain/tools/product-knowledge-tool.entity';
import {
  gettingStartedContent,
  agentsContent,
  toolsContent,
  promptsContent,
  sourcesContent,
  modelsContent,
} from './content';

@Injectable()
export class ProductKnowledgeAdapter extends ProductKnowledgePort {
  getContent(topic: ProductKnowledgeTopic): string {
    switch (topic) {
      case ProductKnowledgeTopic.GETTING_STARTED:
        return gettingStartedContent;
      case ProductKnowledgeTopic.AGENTS:
        return agentsContent;
      case ProductKnowledgeTopic.TOOLS:
        return toolsContent;
      case ProductKnowledgeTopic.PROMPTS:
        return promptsContent;
      case ProductKnowledgeTopic.SOURCES:
        return sourcesContent;
      case ProductKnowledgeTopic.MODELS:
        return modelsContent;
      default:
        throw new Error(`Unknown product knowledge topic: ${topic as string}`);
    }
  }
}
