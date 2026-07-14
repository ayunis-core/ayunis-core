import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SetOrgDefaultLanguageModelCommand } from './set-org-default-language-model.command';
import { PermittedLanguageModel } from '../../../domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import {
  PermittedModelNotFoundError,
  UnexpectedModelError,
} from '../../models.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class SetOrgDefaultLanguageModelUseCase {
  private readonly logger = new Logger(SetOrgDefaultLanguageModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(
    command: SetOrgDefaultLanguageModelCommand,
  ): Promise<PermittedLanguageModel> {
    this.logger.log('execute', {
      permittedModelId: command.permittedModelId,
      orgId: command.orgId,
    });

    // Check if the user is authorized to set the organization default model
    this.assertAuthorized(command.orgId);

    // Only language models may participate in org-default flows.
    const permittedModel = await this.permittedModelsRepository.findOneLanguage(
      {
        id: command.permittedModelId,
        orgId: command.orgId,
      },
    );

    if (!permittedModel) {
      this.logger.error('Permitted model not found', {
        permittedModelId: command.permittedModelId,
        orgId: command.orgId,
      });
      throw new PermittedModelNotFoundError(command.permittedModelId);
    }

    // Check if there's already a default model
    const existingDefault =
      await this.permittedModelsRepository.findOrgDefaultLanguage(
        command.orgId,
      );

    const action = existingDefault ? 'updating' : 'setting';
    this.logger.debug(`Permitted model found, ${action} organization default`, {
      permittedModelId: command.permittedModelId,
      orgId: command.orgId,
      modelName: permittedModel.model.name,
      modelProvider: permittedModel.model.provider,
      existingDefaultId: existingDefault?.id,
    });

    // Set the model as the organization's default (handles both create and update)
    const orgDefaultModel = await this.permittedModelsRepository.setAsDefault({
      id: command.permittedModelId,
      orgId: command.orgId,
    });

    this.logger.debug(`Organization default model ${action} successfully`, {
      orgId: command.orgId,
      modelId: orgDefaultModel.id,
      action,
    });

    return orgDefaultModel;
  }

  private assertAuthorized(commandOrgId: UUID): void {
    const orgId = this.contextService.get('orgId');
    const systemRole = this.contextService.get('systemRole');
    const isFromOrg = orgId === commandOrgId;
    const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
    if (!isFromOrg && !isSuperAdmin) {
      throw new UnauthorizedAccessError();
    }
  }
}
