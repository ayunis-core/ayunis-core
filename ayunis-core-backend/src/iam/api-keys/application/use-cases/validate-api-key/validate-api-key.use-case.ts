import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { CompareHashUseCase } from 'src/iam/hashing/application/use-cases/compare-hash/compare-hash.use-case';
import { CompareHashCommand } from 'src/iam/hashing/application/use-cases/compare-hash/compare-hash.command';
import { ApiKeysRepository } from '../../ports/api-keys.repository';
import { ApiKey } from '../../../domain/api-key.entity';
import { ValidateApiKeyCommand } from './validate-api-key.command';
import {
  ApiKeyExpiredError,
  ApiKeyNotFoundError,
  UnexpectedApiKeyError,
} from '../../api-keys.errors';

@Injectable()
export class ValidateApiKeyUseCase {
  private readonly logger = new Logger(ValidateApiKeyUseCase.name);

  constructor(
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly compareHashUseCase: CompareHashUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedApiKeyError)
  async execute(command: ValidateApiKeyCommand): Promise<ApiKey> {
    this.logger.log('execute');

    const apiKey = await this.lookupAndAuthenticate(command.token);
    this.assertNotExpired(apiKey);
    return apiKey;
  }

  // Unknown prefix, hash mismatch, and revoked keys collapse to a single
  // error — never reveal which branch failed.
  private async lookupAndAuthenticate(token: string): Promise<ApiKey> {
    const prefix = derivePrefix(token);
    if (prefix === null) {
      throw new ApiKeyNotFoundError();
    }

    const apiKey = await this.apiKeysRepository.findByPrefix(prefix);
    if (!apiKey) {
      throw new ApiKeyNotFoundError();
    }

    const matches = await this.compareHashUseCase.execute(
      new CompareHashCommand(token, apiKey.hash),
    );
    if (!matches || apiKey.revokedAt !== null) {
      throw new ApiKeyNotFoundError();
    }

    return apiKey;
  }

  private assertNotExpired(apiKey: ApiKey): void {
    if (apiKey.expiresAt === null || apiKey.expiresAt.getTime() > Date.now()) {
      return;
    }
    // Log apiKeyId server-side for forensics — never include in the public
    // payload (AYC-77 finding S4).
    this.logger.warn('Rejected expired API key', { apiKeyId: apiKey.id });
    throw new ApiKeyExpiredError();
  }
}

function derivePrefix(token: string): string | null {
  if (!token.startsWith(ApiKey.KEY_PREFIX)) {
    return null;
  }
  const randomPart = token.slice(ApiKey.KEY_PREFIX.length);
  if (randomPart.length < ApiKey.LOOKUP_PREFIX_LENGTH) {
    return null;
  }
  return randomPart.slice(0, ApiKey.LOOKUP_PREFIX_LENGTH);
}
