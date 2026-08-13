import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { UnexpectedModelError } from '../../models.errors';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { GetEffectiveModelInternetAccessQuery } from './get-effective-model-internet-access.query';

@Injectable()
export class GetEffectiveModelInternetAccessUseCase {
  private readonly logger = new Logger(
    GetEffectiveModelInternetAccessUseCase.name,
  );

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(query: GetEffectiveModelInternetAccessQuery): Promise<boolean> {
    const selected = query.permittedModel;
    this.logger.log('Resolve effective model internet access', {
      permittedModelId: selected.id,
      scope: selected.scope,
    });
    if (selected.scope === PermittedModelScope.ORG) {
      return selected.internetAccessEnabled;
    }
    const orgModels = await this.permittedModelsRepository.findAll(
      selected.orgId,
      { modelId: selected.model.id },
    );
    const orgModel = orgModels.at(0);
    return (
      selected.internetAccessEnabled &&
      (orgModel?.internetAccessEnabled ?? false)
    );
  }
}
