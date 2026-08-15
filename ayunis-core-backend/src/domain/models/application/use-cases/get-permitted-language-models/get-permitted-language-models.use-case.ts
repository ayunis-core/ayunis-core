import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { GetPermittedLanguageModelsQuery } from './get-permitted-language-models.query';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UnexpectedModelError } from '../../models.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

@Injectable()
export class GetPermittedLanguageModelsUseCase {
  constructor(
    @InjectPinoLogger(GetPermittedLanguageModelsUseCase.name)
    private readonly logger: PinoLogger,

    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    query: GetPermittedLanguageModelsQuery,
  ): Promise<PermittedLanguageModel[]> {
    this.logger.info(
      {
        orgId: query.orgId,
      },
      'Executing get permitted language models',
    );
    try {
      const orgId = this.contextService.get('orgId');
      const systemRole = this.contextService.get('systemRole');
      const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
      const isFromOrg = orgId === query.orgId;
      if (!isFromOrg && !isSuperAdmin) {
        throw new UnauthorizedAccessError();
      }
      return this.permittedModelsRepository.findManyLanguage(query.orgId);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          orgId: query.orgId,
          err: error instanceof Error ? error : new Error('Unknown error'),
        },
        'Error getting permitted language models',
      );
      throw new UnexpectedModelError(error as Error);
    }
  }
}
