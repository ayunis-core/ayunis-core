import { Injectable, Logger } from '@nestjs/common';
import { OrgsRepository } from '../../../application/ports/orgs.repository';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { UUID } from 'crypto';
import {
  OrgNotFoundError,
  OrgCreationFailedError,
  OrgUpdateFailedError,
  OrgDeletionFailedError,
} from '../../../application/orgs.errors';

@Injectable()
export class CloudOrgsRepository extends OrgsRepository {
  private readonly logger = new Logger(CloudOrgsRepository.name);

  constructor() {
    super();
    this.logger.log('constructor');
  }

  async findById(id: UUID): Promise<Org> {
    this.logger.log('findById', { id });
    this.logger.error('Not implemented: findById');
    throw new OrgNotFoundError(id);
  }

  async findByUserId(userId: string): Promise<Org> {
    throw new Error('Not implemented');
  }

  async findAllIds(): Promise<UUID[]> {
    throw new Error('Not implemented');
  }

  async create(org: Org): Promise<Org> {
    this.logger.log('create', { id: org.id, name: org.name });
    this.logger.error('Not implemented: create');
    throw new OrgCreationFailedError('Cloud orgs repository not implemented');
  }

  async update(org: Org): Promise<Org> {
    this.logger.log('update', { id: org.id, name: org.name });
    this.logger.error('Not implemented: update');
    throw new OrgUpdateFailedError(
      org.id,
      'Cloud orgs repository not implemented',
    );
  }

  async delete(id: UUID): Promise<void> {
    this.logger.log('delete', { id });
    this.logger.error('Not implemented: delete');
    throw new OrgDeletionFailedError(
      id,
      'Cloud orgs repository not implemented',
    );
  }
}
