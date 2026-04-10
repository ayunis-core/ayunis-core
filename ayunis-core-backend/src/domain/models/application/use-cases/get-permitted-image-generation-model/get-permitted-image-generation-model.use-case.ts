import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { PermittedImageGenerationModel } from 'src/domain/models/domain/permitted-model.entity';
import {
  PermittedImageGenerationModelNotFoundForOrgError,
  UnexpectedModelError,
} from '../../models.errors';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { ModelPolicyService } from '../../services/model-policy.service';
import { GetPermittedImageGenerationModelQuery } from './get-permitted-image-generation-model.query';

@Injectable()
export class GetPermittedImageGenerationModelUseCase {
  private readonly logger = new Logger(
    GetPermittedImageGenerationModelUseCase.name,
  );

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly contextService: ContextService,
    private readonly modelPolicy: ModelPolicyService,
  ) {}

  async execute(
    query: GetPermittedImageGenerationModelQuery,
  ): Promise<PermittedImageGenerationModel> {
    this.logger.log('execute', {
      orgId: query.orgId,
    });

    try {
      const orgId = this.contextService.get('orgId');
      const systemRole = this.contextService.get('systemRole');
      const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
      const isFromOrg = orgId === query.orgId;
      if (!isFromOrg && !isSuperAdmin) {
        throw new UnauthorizedAccessError();
      }

      const model = await this.permittedModelsRepository.findOneImageGeneration(
        query.orgId,
      );
      if (!model || !(model instanceof PermittedImageGenerationModel)) {
        throw new PermittedImageGenerationModelNotFoundForOrgError(query.orgId);
      }

      this.modelPolicy.assertSupported(model.model);
      return model;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new UnexpectedModelError(error as Error);
    }
  }
}
