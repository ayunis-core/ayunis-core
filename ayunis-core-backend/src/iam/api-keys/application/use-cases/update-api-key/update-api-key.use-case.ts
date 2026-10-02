import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredOrgId } from 'src/common/context/required-context';
import {
  ApiKeysRepository,
  type ApiKeyMetadataChanges,
} from 'src/iam/api-keys/application/ports/api-keys.repository';
import {
  ApiKeyInvalidInputError,
  ApiKeyNotEditableError,
  ApiKeyNotFoundError,
  UnexpectedApiKeyError,
} from 'src/iam/api-keys/application/api-keys.errors';
import type { ApiKey } from 'src/iam/api-keys/domain/api-key.entity';
import { UpdateApiKeyCommand } from './update-api-key.command';

@Injectable()
export class UpdateApiKeyUseCase {
  private readonly logger = new Logger(UpdateApiKeyUseCase.name);

  constructor(
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedApiKeyError)
  async execute(command: UpdateApiKeyCommand): Promise<ApiKey> {
    const orgId = getRequiredOrgId(this.contextService);
    const changes = normalizeChanges(command.changes);

    this.logger.log(
      {
        apiKeyId: command.apiKeyId,
        orgId,
        fields: Object.keys(changes),
      },
      'execute',
    );

    const updated = await this.apiKeysRepository.updateMetadataIfActive(
      command.apiKeyId,
      orgId,
      changes,
    );

    const apiKey = await this.apiKeysRepository.findById(command.apiKeyId);
    // Missing and cross-org keys both surface as "not found" so callers cannot
    // enumerate API key IDs across organizations (same as revoke).
    if (apiKey?.orgId !== orgId) {
      throw new ApiKeyNotFoundError(command.apiKeyId);
    }
    if (!updated) {
      throw new ApiKeyNotEditableError(command.apiKeyId);
    }
    return apiKey;
  }
}

function normalizeChanges(changes: {
  name?: string;
  description?: string | null;
}): ApiKeyMetadataChanges {
  const normalized: ApiKeyMetadataChanges = {};

  if (changes.name !== undefined) {
    const name = changes.name.trim();
    if (!name) {
      throw new ApiKeyInvalidInputError('Name cannot be empty');
    }
    normalized.name = name;
  }

  if (changes.description !== undefined) {
    normalized.description = changes.description?.trim() || null;
  }

  if (Object.keys(normalized).length === 0) {
    throw new ApiKeyInvalidInputError('Provide a name or a description');
  }
  return normalized;
}
