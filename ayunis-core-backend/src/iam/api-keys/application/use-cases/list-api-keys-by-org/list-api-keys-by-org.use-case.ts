import { Injectable, Logger } from '@nestjs/common';
import { ApiKeysRepository } from '../../ports/api-keys.repository';
import { ApiKey } from '../../../domain/api-key.entity';
import { UnexpectedApiKeyError } from '../../api-keys.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class ListApiKeysByOrgUseCase {
  private readonly logger = new Logger(ListApiKeysByOrgUseCase.name);

  constructor(
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(): Promise<ApiKey[]> {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('execute', { orgId });

    try {
      return await this.apiKeysRepository.findByOrgId(orgId);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to list API keys', error);
      throw new UnexpectedApiKeyError();
    }
  }
}
