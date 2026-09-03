import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import {
  ModelNotFoundByIdError,
  UnexpectedModelError,
} from 'src/domain/models/application/models.errors';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { GetEffectiveLanguageModelsQuery } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.query';
import { GetEffectiveLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.use-case';
import { GetPermittedLanguageModelQuery } from './get-permitted-language-model.query';

@Injectable()
export class GetPermittedLanguageModelUseCase {
  private readonly logger = new Logger(GetPermittedLanguageModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly getEffectiveLanguageModelsUseCase: GetEffectiveLanguageModelsUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(
    query: GetPermittedLanguageModelQuery,
  ): Promise<PermittedLanguageModel> {
    this.logger.log(
      { permittedModelId: query.id },
      'getPermittedLanguageModel',
    );
    const model = await this.permittedModelsRepository.findOneLanguage({
      id: query.id,
    });
    if (!model) {
      throw new ModelNotFoundByIdError(query.id);
    }

    const orgId = this.contextService.get('orgId');
    const systemRole = this.contextService.get('systemRole');
    const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
    if (orgId !== model.orgId && !isSuperAdmin) {
      throw new UnauthorizedAccessError();
    }

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }
    const { models } = await this.getEffectiveLanguageModelsUseCase.execute(
      new GetEffectiveLanguageModelsQuery(model.orgId, userId),
    );
    const effectiveModel = models.find(({ id }) => id === model.id);
    if (!effectiveModel) {
      throw new UnauthorizedAccessError();
    }
    return effectiveModel;
  }
}
