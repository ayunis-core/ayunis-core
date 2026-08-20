import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import { Repository } from 'typeorm';
import {
  WorkspaceMembersRepository,
  type WorkspaceMember,
} from 'src/domain/workspaces/application/ports/workspace-members-repository.port';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { WorkspaceMemberRecord } from './schema/workspace-member.record';
import { WorkspaceRecord } from './schema/workspace.record';
import { WorkspaceMemberMapper } from './mappers/workspace-member.mapper';

@Injectable()
export class LocalWorkspaceMembersRepository extends WorkspaceMembersRepository {
  constructor(
    @InjectRepository(WorkspaceRecord)
    private readonly workspaceRepo: Repository<WorkspaceRecord>,
    @InjectRepository(WorkspaceMemberRecord)
    private readonly memberRepo: Repository<WorkspaceMemberRecord>,
    private readonly mapper: WorkspaceMemberMapper,
  ) {
    super();
  }

  async findMember(
    workspaceId: UUID,
    userId: UUID,
  ): Promise<WorkspaceMember | null> {
    const record = await this.memberRepo.findOne({
      where: { workspaceId, userId },
    });
    return record ? this.mapper.toDomain(record) : null;
  }

  async findInvitation(
    workspaceId: UUID,
    userId: UUID,
    orgId: UUID,
  ): Promise<WorkspaceMember | null> {
    const workspace = await this.workspaceRepo.findOne({
      where: { id: workspaceId, orgId },
    });
    if (!workspace) return null;
    return this.findMember(workspaceId, userId);
  }

  async createMember(member: WorkspaceMember): Promise<WorkspaceMember | null> {
    try {
      await this.memberRepo.insert(this.mapper.toRecord(member));
      return member;
    } catch (error: unknown) {
      if (!this.isUniqueViolation(error)) throw error;
      return null;
    }
  }

  async activateInvitation(
    workspaceId: UUID,
    userId: UUID,
    orgId: UUID,
  ): Promise<WorkspaceMember | null> {
    const member = await this.findInvitation(workspaceId, userId, orgId);
    if (member?.status !== WorkspaceMemberStatus.PENDING) return null;
    const result = await this.memberRepo.update(
      { workspaceId, userId, status: WorkspaceMemberStatus.PENDING },
      { status: WorkspaceMemberStatus.ACTIVE },
    );
    return result.affected === 1
      ? { ...member, status: WorkspaceMemberStatus.ACTIVE }
      : null;
  }

  async declineInvitation(
    workspaceId: UUID,
    userId: UUID,
    orgId: UUID,
  ): Promise<boolean> {
    const workspace = await this.workspaceRepo.findOne({
      where: { id: workspaceId, orgId },
    });
    if (!workspace) return false;
    const result = await this.memberRepo.delete({
      workspaceId,
      userId,
      status: WorkspaceMemberStatus.PENDING,
    });
    return result.affected === 1;
  }

  async updateMemberRole(
    workspaceId: UUID,
    userId: UUID,
    role: WorkspaceRole,
  ): Promise<WorkspaceMember | null> {
    const result = await this.memberRepo.update(
      { workspaceId, userId },
      { role },
    );
    if (result.affected !== 1) return null;
    return this.findMember(workspaceId, userId);
  }

  async deleteMember(workspaceId: UUID, userId: UUID): Promise<void> {
    await this.memberRepo.delete({ workspaceId, userId });
  }

  private isUniqueViolation(error: unknown): boolean {
    const driverError = (error as { driverError?: { code?: unknown } })
      .driverError;
    return driverError?.code === '23505';
  }
}
