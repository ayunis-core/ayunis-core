import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import {
  PermittedModelNotFoundError,
  UnexpectedModelError,
} from '../../models.errors';
import { GetPermittedModelQuery } from './get-permitted-model.query';
import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

@Injectable()
export class GetPermittedModelUseCase {
  private readonly logger = new Logger(GetPermittedModelUseCase.name);
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(query: GetPermittedModelQuery): Promise<PermittedModel> {
    this.logger.log('execute', {
      query,
    });
    this.logger.debug('GetPermittedModelByIdQuery', {
      query,
    });
    const orgId = this.contextService.get('orgId');
    const systemRole = this.contextService.get('systemRole');
    const model = await this.permittedModelsRepository.findOne({
      id: query.permittedModelId,
    });
    const isFromOrg = orgId === model?.orgId;
    const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
    if (!isFromOrg && !isSuperAdmin) {
      throw new UnauthorizedAccessError();
    }
    if (!model) {
      this.logger.error('Permitted model not found', {
        query,
      });
      throw new PermittedModelNotFoundError(query.permittedModelId);
    }
    return model;
  }
}
