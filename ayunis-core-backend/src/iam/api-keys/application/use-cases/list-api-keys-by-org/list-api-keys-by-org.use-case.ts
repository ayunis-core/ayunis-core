import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApiKeysRepository } from '../../ports/api-keys.repository';
import { ApiKey } from 'src/iam/api-keys/domain/api-key.entity';
import { UnexpectedApiKeyError } from '../../api-keys.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class ListApiKeysByOrgUseCase {
  constructor(
    @InjectPinoLogger(ListApiKeysByOrgUseCase.name)
    private readonly logger: PinoLogger,
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(): Promise<ApiKey[]> {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.info({ orgId }, 'execute');

    try {
      return await this.apiKeysRepository.findByOrgId(orgId);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error({ err: error as Error }, 'Failed to list API keys');
      throw new UnexpectedApiKeyError();
    }
  }
}
