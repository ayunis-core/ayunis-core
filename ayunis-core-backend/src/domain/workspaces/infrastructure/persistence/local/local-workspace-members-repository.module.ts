import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalWorkspaceMembersRepository } from './local-workspace-members.repository';
import { WorkspaceMemberRecord } from './schema/workspace-member.record';
import { WorkspaceRecord } from './schema/workspace.record';
import { WorkspaceMemberMapper } from './mappers/workspace-member.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([WorkspaceRecord, WorkspaceMemberRecord])],
  providers: [LocalWorkspaceMembersRepository, WorkspaceMemberMapper],
  exports: [LocalWorkspaceMembersRepository],
})
export class LocalWorkspaceMembersRepositoryModule {}
