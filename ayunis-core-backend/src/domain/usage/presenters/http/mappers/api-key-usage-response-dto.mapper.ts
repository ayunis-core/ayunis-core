import { Injectable } from '@nestjs/common';
import type { ApiKeyUsageItem } from 'src/domain/usage/domain/api-key-usage-item.entity';
import type {
  ApiKeyUsageDto,
  ApiKeyUsageResponseDto,
} from 'src/domain/usage/presenters/http/dto/api-key-usage-response.dto';

@Injectable()
export class ApiKeyUsageResponseDtoMapper {
  toDto(items: ApiKeyUsageItem[]): ApiKeyUsageResponseDto {
    return { data: items.map((item) => this.toItemDto(item)) };
  }

  private toItemDto(item: ApiKeyUsageItem): ApiKeyUsageDto {
    return {
      apiKeyId: item.apiKeyId,
      name: item.name,
      revokedAt: item.revokedAt,
      expiresAt: item.expiresAt,
      inputTokens: item.inputTokens,
      outputTokens: item.outputTokens,
      totalTokens: item.totalTokens,
      requests: item.requests,
      credits: item.credits,
      unpricedRequests: item.unpricedRequests,
      lastUsedAt: item.lastUsedAt,
    };
  }
}
