import { Injectable } from '@nestjs/common';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { GetThreadResponseDto } from '../dto/get-thread-response.dto';
import { McpIntegrationSummaryResponseDto } from '../dto/mcp-integration-summary-response.dto';
import { MessageDtoMapper } from './message.mapper';
import { SourceDtoMapper } from './source.mapper';
import { FindThreadResult } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { PiiMaskDtoMapper } from 'src/domain/thread-pii-masks/presenters/http/mappers/pii-mask.mapper';
import type { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { MarketplaceMcpIntegration } from 'src/domain/mcp/domain/integrations/marketplace-mcp-integration.entity';

@Injectable()
export class GetThreadDtoMapper {
  constructor(
    private readonly messageDtoMapper: MessageDtoMapper,
    private readonly sourceDtoMapper: SourceDtoMapper,
    private readonly piiMaskDtoMapper: PiiMaskDtoMapper,
  ) {}

  toDto(
    result: FindThreadResult,
    piiMasks: ThreadPiiMask[] = [],
    mcpIntegrations: McpIntegration[] = [],
  ): GetThreadResponseDto {
    const { thread, isLongChat } = result;

    return {
      id: thread.id,
      userId: thread.userId,
      permittedModelId: thread.model?.id,
      title: thread.title,
      sources:
        thread.sourceAssignments?.map((sourceAssignment) =>
          this.sourceDtoMapper.toDto(sourceAssignment.source),
        ) ?? [],
      messages: this.messageDtoMapper.toDtoArray(thread.messages),
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
      isAnonymous: thread.isAnonymous,
      isLongChat,
      knowledgeBases: thread.getUniqueKnowledgeBases(),
      piiMasks: this.piiMaskDtoMapper.toDtoArray(piiMasks),
      mcpIntegrations: mcpIntegrations.map((integration) =>
        this.toMcpIntegrationSummaryDto(integration),
      ),
    };
  }

  toDtoArray(threads: Thread[]): GetThreadResponseDto[] {
    return threads.map((thread) => this.toDto({ thread, isLongChat: false }));
  }

  private toMcpIntegrationSummaryDto(
    integration: McpIntegration,
  ): McpIntegrationSummaryResponseDto {
    return {
      id: integration.id,
      name: integration.name,
      logoUrl:
        integration instanceof MarketplaceMcpIntegration
          ? integration.logoUrl
          : undefined,
    };
  }
}
