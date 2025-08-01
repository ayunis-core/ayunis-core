import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOneParams,
  PermittedModelsRepository,
} from 'src/domain/models/application/ports/permitted-models.repository';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { Repository } from 'typeorm';
import { PermittedModelRecord } from './schema/permitted-model.record';
import { UUID } from 'crypto';
import { PermittedModelMapper } from './mappers/permitted-model.mapper';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

@Injectable()
export class LocalPermittedModelsRepository extends PermittedModelsRepository {
  private readonly logger = new Logger(LocalPermittedModelsRepository.name);
  constructor(
    @InjectRepository(PermittedModelRecord)
    private readonly permittedModelRepository: Repository<PermittedModelRecord>,
    private readonly permittedModelMapper: PermittedModelMapper,
  ) {
    super();
  }

  async findAll(
    orgId: UUID,
    filter?: {
      provider?: ModelProvider;
      modelId?: UUID;
    },
  ): Promise<PermittedModel[]> {
    const permittedModels = await this.permittedModelRepository.find({
      where: {
        orgId,
        model: { provider: filter?.provider, id: filter?.modelId },
      },
      relations: {
        model: true,
      },
    });
    return permittedModels.map((permittedModel) =>
      this.permittedModelMapper.toDomain(permittedModel),
    );
  }

  async findDefault(orgId: UUID): Promise<PermittedModel | undefined> {
    this.logger.log('findDefault', {
      orgId,
    });
    const permittedModel = await this.permittedModelRepository.findOneBy({
      orgId,
      isDefault: true,
    });
    this.logger.debug('Default model found', {
      permittedModel,
    });
    return permittedModel
      ? this.permittedModelMapper.toDomain(permittedModel)
      : undefined;
  }

  async findOne(params: FindOneParams): Promise<PermittedModel | undefined> {
    const where =
      'id' in params
        ? { id: params.id, orgId: params.orgId }
        : { name: params.name, provider: params.provider, orgId: params.orgId };
    const permittedModel = await this.permittedModelRepository.findOne({
      where,
    });
    return permittedModel
      ? this.permittedModelMapper.toDomain(permittedModel)
      : undefined;
  }

  async create(permittedModel: PermittedModel): Promise<PermittedModel> {
    const permittedModelEntity =
      this.permittedModelMapper.toRecord(permittedModel);
    const savedPermittedModel =
      await this.permittedModelRepository.save(permittedModelEntity);
    const reloadedPermittedModel =
      await this.permittedModelRepository.findOneOrFail({
        where: { id: savedPermittedModel.id },
        relations: {
          model: true,
        },
      });
    return this.permittedModelMapper.toDomain(reloadedPermittedModel);
  }

  async delete(params: { id: UUID; orgId: UUID }): Promise<void> {
    const result = await this.permittedModelRepository.delete(params);
    if (result.affected === 0) {
      throw new Error(
        `Permitted model with id ${params.id} and orgId ${params.orgId} not found`,
      );
    }
  }

  async setAsDefault(params: {
    id: UUID;
    orgId: UUID;
  }): Promise<PermittedModel> {
    this.logger.log('setAsDefault', {
      id: params.id,
      orgId: params.orgId,
    });

    // Start a transaction to ensure consistency
    return await this.permittedModelRepository.manager.transaction(
      async (manager) => {
        // First, unset any existing default for this organization
        await manager.update(
          PermittedModelRecord,
          { orgId: params.orgId, isDefault: true },
          { isDefault: false },
        );

        // Then set the specified model as default
        const updateResult = await manager.update(
          PermittedModelRecord,
          { id: params.id, orgId: params.orgId },
          { isDefault: true },
        );

        if (updateResult.affected === 0) {
          throw new Error(
            `Permitted model with id ${params.id} and orgId ${params.orgId} not found`,
          );
        }

        // Fetch and return the updated model
        const updatedModel = await manager.findOne(PermittedModelRecord, {
          where: { id: params.id, orgId: params.orgId },
          relations: ['model'],
        });

        if (!updatedModel) {
          throw new Error(
            `Failed to retrieve updated permitted model with id ${params.id}`,
          );
        }

        this.logger.debug('Model set as default', {
          id: params.id,
          orgId: params.orgId,
          modelName: updatedModel.model.name,
          modelProvider: updatedModel.model.provider,
        });

        return this.permittedModelMapper.toDomain(updatedModel);
      },
    );
  }
}
