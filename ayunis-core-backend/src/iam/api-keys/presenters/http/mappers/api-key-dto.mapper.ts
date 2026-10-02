import { Injectable } from '@nestjs/common';
import { ApiKey } from 'src/iam/api-keys/domain/api-key.entity';
import { ApiKeyResponseDto } from 'src/iam/api-keys/presenters/http/dtos/api-key-response.dto';
import { CreateApiKeyResponseDto } from 'src/iam/api-keys/presenters/http/dtos/create-api-key-response.dto';

@Injectable()
export class ApiKeyDtoMapper {
  toDto(apiKey: ApiKey): ApiKeyResponseDto {
    return {
      id: apiKey.id,
      name: apiKey.name,
      description: apiKey.description,
      prefixPreview: `${ApiKey.KEY_PREFIX}${apiKey.prefix}...`,
      expiresAt: apiKey.expiresAt,
      revokedAt: apiKey.revokedAt,
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
