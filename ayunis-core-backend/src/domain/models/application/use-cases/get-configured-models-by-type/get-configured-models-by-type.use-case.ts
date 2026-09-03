import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedModelError } from 'src/domain/models/application/models.errors';
import { ModelsRepository } from 'src/domain/models/application/ports/models.repository';
import { ModelConfigurationService } from 'src/domain/models/application/services/model-configuration.service';
import { Model } from 'src/domain/models/domain/model.entity';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { GetConfiguredModelsByTypeQuery } from './get-configured-models-by-type.query';

@Injectable()
export class GetConfiguredModelsByTypeUseCase {
  private readonly logger = new Logger(GetConfiguredModelsByTypeUseCase.name);

  constructor(
    private readonly modelsRepository: ModelsRepository,
    private readonly contextService: ContextService,
    private readonly modelConfiguration: ModelConfigurationService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(query: GetConfiguredModelsByTypeQuery): Promise<Model[]> {
    const orgRole = this.contextService.get('role');
    const systemRole = this.contextService.get('systemRole');
    if (orgRole !== UserRole.ADMIN && systemRole !== SystemRole.SUPER_ADMIN) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log(
      {
        orgId: query.orgId,
        type: query.type,
      },
      'getConfiguredModelsByType',
    );
    const allModels = await this.modelsRepository.findAll();
    const configuredModels = allModels.filter(
      (model) =>
        model.type === query.type &&
        this.modelConfiguration.isConfiguredAndActive(model),
    );
    this.logger.debug(
      {
        type: query.type,
        models: configuredModels,
      },
      'Configured models by type',
    );
    return configuredModels;
  }
}
