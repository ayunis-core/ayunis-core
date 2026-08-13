import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import { Repository } from 'typeorm';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspaceMapper } from './mappers/workspace.mapper';
import { WorkspaceRecord } from './schema/workspace.record';

@Injectable()
export class LocalWorkspacesRepository extends WorkspacesRepository {
  constructor(
    @InjectRepository(WorkspaceRecord)
    private readonly repo: Repository<WorkspaceRecord>,
    private readonly mapper: WorkspaceMapper,
  ) {
    super();
  }

  async findAllByUserId(userId: UUID): Promise<Workspace[]> {
    const records = await this.repo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
    return records.map((record) => this.mapper.toDomain(record));
  }

  async findById(userId: UUID, id: UUID): Promise<Workspace | null> {
    const record = await this.repo.findOne({ where: { userId, id } });
    return record ? this.mapper.toDomain(record) : null;
  }

  async save(workspace: Workspace): Promise<Workspace> {
    const saved = await this.repo.save(this.mapper.toRecord(workspace));
    return this.mapper.toDomain(saved);
  }

  async delete(userId: UUID, id: UUID): Promise<void> {
    const result = await this.repo.delete({ userId, id });
    if (!result.affected) {
      throw new WorkspaceNotFoundError(id);
    }
  }
}
