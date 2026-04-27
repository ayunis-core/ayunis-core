import { Injectable, Logger } from '@nestjs/common';
import { ApiKeysRepository } from '../../ports/api-keys.repository';
import { ApiKey } from '../../../domain/api-key.entity';
import { ValidateApiKeyCommand } from './validate-api-key.command';
import {
  ApiKeyExpiredError,
  ApiKeyInvalidError,
  UnexpectedApiKeyError,
} from '../../api-keys.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { CompareHashUseCase } from 'src/iam/hashing/application/use-cases/compare-hash/compare-hash.use-case';
import { CompareHashCommand } from 'src/iam/hashing/application/use-cases/compare-hash/compare-hash.command';

@Injectable()
export class ValidateApiKeyUseCase {
  private readonly logger = new Logger(ValidateApiKeyUseCase.name);

  constructor(
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly compareHashUseCase: CompareHashUseCase,
  ) {}

  async execute(command: ValidateApiKeyCommand): Promise<ApiKey> {
    this.logger.log('execute');

    const token = command.token;
    if (!token.startsWith(ApiKey.KEY_PREFIX)) {
      throw new ApiKeyInvalidError();
    }

    const randomPart = token.slice(ApiKey.KEY_PREFIX.length);
    if (randomPart.length < ApiKey.LOOKUP_PREFIX_LENGTH) {
      throw new ApiKeyInvalidError();
    }

    const prefix = randomPart.slice(0, ApiKey.LOOKUP_PREFIX_LENGTH);

    try {
      const apiKey = await this.apiKeysRepository.findByPrefix(prefix);
      if (!apiKey) {
        throw new ApiKeyInvalidError();
      }

      const matches = await this.compareHashUseCase.execute(
        new CompareHashCommand(token, apiKey.hash),
      );
      if (!matches) {
        throw new ApiKeyInvalidError();
      }

      if (apiKey.expiresAt && apiKey.expiresAt.getTime() <= Date.now()) {
        throw new ApiKeyExpiredError({ apiKeyId: apiKey.id });
      }

      return apiKey;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to validate API key', error);
      throw new UnexpectedApiKeyError();
    }
  }
}
