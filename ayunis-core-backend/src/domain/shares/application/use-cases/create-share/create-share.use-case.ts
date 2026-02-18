import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import {
  CreateOrgAgentShareCommand,
  CreateTeamAgentShareCommand,
  CreateOrgSkillShareCommand,
  CreateTeamSkillShareCommand,
  CreateShareCommand,
} from './create-share.command';
import { SharesRepository } from '../../ports/shares-repository.port';
import {
  AgentShare,
  SkillShare,
  Share,
} from 'src/domain/shares/domain/share.entity';
import {
  OrgShareScope,
  TeamShareScope,
} from 'src/domain/shares/domain/share-scope.entity';
import { ShareAuthorizationFactory } from '../../factories/share-authorization.factory';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { ShareScopeType } from 'src/domain/shares/domain/value-objects/share-scope-type.enum';
import { CheckUserTeamMembershipUseCase } from 'src/iam/teams/application/use-cases/check-user-team-membership/check-user-team-membership.use-case';
import { CheckUserTeamMembershipQuery } from 'src/iam/teams/application/use-cases/check-user-team-membership/check-user-team-membership.query';
import { ShareAlreadyExistsError } from '../../shares.errors';

@Injectable()
export class CreateShareUseCase {
  constructor(
    private readonly contextService: ContextService,
    private readonly repository: SharesRepository,
    private readonly authorizationFactory: ShareAuthorizationFactory,
    private readonly checkUserTeamMembershipUseCase: CheckUserTeamMembershipUseCase,
  ) {}

  async execute(command: CreateShareCommand): Promise<Share> {
    const { userId, orgId } = this.getAuthenticatedContext();

    if (command instanceof CreateOrgAgentShareCommand) {
      return this.createOrgShare(
        SharedEntityType.AGENT,
        command.agentId,
        userId,
        orgId,
        (ownerId, scope) =>
          new AgentShare({ agentId: command.agentId, scope, ownerId }),
      );
    } else if (command instanceof CreateTeamAgentShareCommand) {
      return this.createTeamShare(
        SharedEntityType.AGENT,
        command.agentId,
        command.teamId,
        userId,
        (ownerId, scope) =>
          new AgentShare({ agentId: command.agentId, scope, ownerId }),
      );
    } else if (command instanceof CreateOrgSkillShareCommand) {
      return this.createOrgShare(
        SharedEntityType.SKILL,
        command.skillId,
        userId,
        orgId,
        (ownerId, scope) =>
          new SkillShare({ skillId: command.skillId, scope, ownerId }),
      );
    } else if (command instanceof CreateTeamSkillShareCommand) {
      return this.createTeamShare(
        SharedEntityType.SKILL,
        command.skillId,
        command.teamId,
        userId,
        (ownerId, scope) =>
          new SkillShare({ skillId: command.skillId, scope, ownerId }),
      );
    }
    throw new Error('Unsupported share command type');
  }

  private getAuthenticatedContext(): { userId: UUID; orgId: UUID } {
    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    if (!orgId) {
      throw new UnauthorizedException('User organization not found');
    }

    return { userId, orgId };
  }

  private async createOrgShare(
    entityType: SharedEntityType,
    entityId: UUID,
    userId: UUID,
    orgId: UUID,
    factory: (ownerId: UUID, scope: OrgShareScope) => Share,
  ): Promise<Share> {
    await this.authorizeCreateShare(entityType, entityId, userId);

    const existingShare = await this.repository.findByEntityAndScope(
      entityType,
      entityId,
      ShareScopeType.ORG,
      orgId,
    );

    if (existingShare) {
      throw new ShareAlreadyExistsError(entityId, 'org');
    }

    const share = factory(userId, new OrgShareScope({ orgId }));
    await this.repository.create(share);
    return share;
  }

  private async createTeamShare(
    entityType: SharedEntityType,
    entityId: UUID,
    teamId: UUID,
    userId: UUID,
    factory: (ownerId: UUID, scope: TeamShareScope) => Share,
  ): Promise<Share> {
    await this.authorizeCreateShare(entityType, entityId, userId);

    const isMember = await this.checkUserTeamMembershipUseCase.execute(
      new CheckUserTeamMembershipQuery({ userId, teamId }),
    );

    if (!isMember) {
      throw new ForbiddenException('User is not a member of this team');
    }

    const existingShare = await this.repository.findByEntityAndScope(
      entityType,
      entityId,
      ShareScopeType.TEAM,
      teamId,
    );

    if (existingShare) {
      throw new ShareAlreadyExistsError(entityId, 'team');
    }

    const share = factory(userId, new TeamShareScope({ teamId }));
    await this.repository.create(share);
    return share;
  }

  private async authorizeCreateShare(
    entityType: SharedEntityType,
    entityId: UUID,
    userId: UUID,
  ): Promise<void> {
    const strategy = this.authorizationFactory.getStrategy(entityType);
    const canCreate = await strategy.canCreateShare(entityId, userId);

    if (!canCreate) {
      throw new ForbiddenException(
        `User cannot create share for this ${entityType}`,
      );
    }
  }
}
