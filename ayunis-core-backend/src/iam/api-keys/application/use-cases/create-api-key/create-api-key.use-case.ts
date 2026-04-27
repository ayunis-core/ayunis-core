import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { QueryFailedError } from 'typeorm';
import { ApiKeysRepository } from '../../ports/api-keys.repository';
import { ApiKey } from '../../../domain/api-key.entity';
import { CreateApiKeyCommand } from './create-api-key.command';
import { CreateApiKeyResult } from './create-api-key.result';
import {
  ApiKeyExpirationInPastError,
  ApiKeyInvalidInputError,
  UnexpectedApiKeyError,
} from '../../api-keys.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { HashTextUseCase } from 'src/iam/hashing/application/use-cases/hash-text/hash-text.use-case';
import { HashTextCommand } from 'src/iam/hashing/application/use-cases/hash-text/hash-text.command';
import type { UUID } from 'crypto';

const SECRET_BYTES = 32;
const PG_UNIQUE_VIOLATION = '23505';
const MAX_PREFIX_COLLISION_RETRIES = 1;

@Injectable()
export class CreateApiKeyUseCase {
  private readonly logger = new Logger(CreateApiKeyUseCase.name);

  constructor(
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly contextService: ContextService,
    private readonly hashTextUseCase: HashTextUseCase,
  ) {}

  async execute(command: CreateApiKeyCommand): Promise<CreateApiKeyResult> {
    const orgId = this.contextService.get('orgId');
    const userId = this.contextService.get('userId');

    if (!orgId || !userId) {
      throw new UnauthorizedAccessError();
    }

    const trimmedName = command.name.trim();

    this.logger.log('execute', { orgId });

    if (!trimmedName) {
      throw new ApiKeyInvalidInputError('Name cannot be empty');
    }

    if (command.expiresAt && command.expiresAt.getTime() <= Date.now()) {
      throw new ApiKeyExpirationInPastError();
    }

    try {
      return await this.persistWithCollisionRetry({
        name: trimmedName,
        expiresAt: command.expiresAt,
        orgId,
        userId,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to create API key', error);
      throw new UnexpectedApiKeyError();
    }
  }

  private async persistWithCollisionRetry(params: {
    name: string;
    expiresAt: Date | null;
    orgId: UUID;
    userId: UUID;
  }): Promise<CreateApiKeyResult> {
    for (let attempt = 0; attempt <= MAX_PREFIX_COLLISION_RETRIES; attempt++) {
      const { secret, prefix, hash } = await this.generateSecretAndHash();
      const apiKey = new ApiKey({
        name: params.name,
        prefix,
        hash,
        expiresAt: params.expiresAt,
        orgId: params.orgId,
        createdByUserId: params.userId,
      });

      try {
        const created = await this.apiKeysRepository.create(apiKey);
        this.logger.debug('API key created', {
          id: created.id,
          orgId: params.orgId,
        });
        return { apiKey: created, secret };
      } catch (error) {
        if (!isUniquePrefixViolation(error)) throw error;
        this.logger.warn('API key prefix collision, retrying', {
          orgId: params.orgId,
          attempt,
        });
      }
    }

    // Astronomically unlikely with 72 bits of entropy in the prefix.
    throw new Error('Exhausted retries generating a unique API key prefix');
  }

  private async generateSecretAndHash(): Promise<{
    secret: string;
    prefix: string;
    hash: string;
  }> {
    const randomPart = randomBytes(SECRET_BYTES).toString('base64url');
    const secret = `${ApiKey.KEY_PREFIX}${randomPart}`;
    const prefix = randomPart.slice(0, ApiKey.LOOKUP_PREFIX_LENGTH);
    const hash = await this.hashTextUseCase.execute(
      new HashTextCommand(secret),
    );
    return { secret, prefix, hash };
  }
}

function isUniquePrefixViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string } | undefined)?.code ===
      PG_UNIQUE_VIOLATION
  );
}
