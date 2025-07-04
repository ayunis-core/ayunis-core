import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermittedProviderRecord } from './schema/permitted-provider.record';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { UUID } from 'crypto';
import { PermittedProvidersRepository } from 'src/domain/models/application/ports/permitted-providers.repository';
import { PermittedProvider } from 'src/domain/models/domain/permitted-model-provider.entity';
import { PermittedProviderMapper } from './mappers/permitted-provider.mapper';

@Injectable()
export class LocalPermittedProvidersRepository extends PermittedProvidersRepository {
  private readonly logger = new Logger(LocalPermittedProvidersRepository.name);

  constructor(
    @InjectRepository(PermittedProviderRecord)
    private readonly localPermittedProvidersRepository: Repository<PermittedProviderRecord>,
    private readonly permittedProviderMapper: PermittedProviderMapper,
  ) {
    super();
  }

  async create(
    orgId: UUID,
    permittedProvider: PermittedProvider,
  ): Promise<PermittedProvider> {
    const permittedProviderRecord =
      this.permittedProviderMapper.toRecord(permittedProvider);
    const savedPermittedProvider =
      await this.localPermittedProvidersRepository.save(
        permittedProviderRecord,
      );
    return this.permittedProviderMapper.toDomain(savedPermittedProvider);
  }

  async delete(
    orgId: UUID,
    permittedProvider: PermittedProvider,
  ): Promise<void> {
    // First find the entity to trigger hooks
    const entityToDelete = await this.localPermittedProvidersRepository.findOne(
      {
        where: {
          orgId,
          provider: permittedProvider.provider,
        },
      },
    );

    if (entityToDelete) {
      // Use remove() instead of delete() to trigger entity hooks
      await this.localPermittedProvidersRepository.remove(entityToDelete);
    }
  }

  async findAll(orgId: UUID): Promise<PermittedProvider[]> {
    const permittedProviderRecords =
      await this.localPermittedProvidersRepository.find({
        where: { orgId },
      });
    return permittedProviderRecords.map((record) =>
      this.permittedProviderMapper.toDomain(record),
    );
  }
}
