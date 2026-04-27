import { Injectable } from '@nestjs/common';
import { ApiKey } from '../../../domain/api-key.entity';
import { ApiKeyResponseDto } from '../dtos/api-key-response.dto';
import { CreateApiKeyResponseDto } from '../dtos/create-api-key-response.dto';

@Injectable()
export class ApiKeyDtoMapper {
  toDto(apiKey: ApiKey): ApiKeyResponseDto {
    return {
      id: apiKey.id,
      name: apiKey.name,
      prefixPreview: `${ApiKey.KEY_PREFIX}${apiKey.prefix}...`,
      expiresAt: apiKey.expiresAt,
      createdByUserId: apiKey.createdByUserId,
      createdAt: apiKey.createdAt,
    };
  }

  toDtoList(apiKeys: ApiKey[]): ApiKeyResponseDto[] {
    return apiKeys.map((apiKey) => this.toDto(apiKey));
  }

  toCreateDto(apiKey: ApiKey, secret: string): CreateApiKeyResponseDto {
    return {
      ...this.toDto(apiKey),
      secret,
    };
  }
}
