import { Injectable, Logger } from '@nestjs/common';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import {
  ProductKnowledgeTool,
  ProductKnowledgeTopic,
} from '../../domain/tools/product-knowledge-tool.entity';
import { ProductKnowledgePort } from '../ports/product-knowledge.port';
import { ToolExecutionFailedError } from '../tools.errors';

@Injectable()
export class ProductKnowledgeToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(ProductKnowledgeToolHandler.name);

  constructor(private readonly productKnowledgePort: ProductKnowledgePort) {
    super();
  }

  async execute(params: {
    tool: ProductKnowledgeTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;

    try {
      tool.validateParams(input);
    } catch (error) {
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: `Invalid input: ${error instanceof Error ? error.message : 'Unknown error'}`,
        exposeToLLM: true,
      });
    }

    const topic = input.topic as ProductKnowledgeTopic;
    this.logger.log('Retrieving product knowledge', { topic });

    try {
      const content = this.productKnowledgePort.getContent(topic);
      return await Promise.resolve(content);
    } catch (error) {
      this.logger.error('Failed to retrieve product knowledge', error);
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: `Failed to retrieve documentation for topic: ${topic}`,
        exposeToLLM: true,
      });
    }
  }
}
