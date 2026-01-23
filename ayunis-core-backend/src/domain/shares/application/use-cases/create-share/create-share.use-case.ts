import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import {
  CreateOrgAgentShareCommand,
  CreateTeamAgentShareCommand,
  CreateShareCommand,
} from './create-share.command';
import { SharesRepository } from '../../ports/shares-repository.port';
import { AgentShare, Share } from 'src/domain/shares/domain/share.entity';
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
    // Get user context
    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (!orgId) {
      throw new UnauthorizedException('User organization not found');
    }

    // Check authorization for the specific entity type
    if (command instanceof CreateOrgAgentShareCommand) {
      const strategy = this.authorizationFactory.getStrategy(
        SharedEntityType.AGENT,
      );
      const canCreate = await strategy.canCreateShare(command.agentId, userId);

      if (!canCreate) {
        throw new ForbiddenException('User cannot create share for this agent');
      }

      // Check if share already exists
      const existingShare = await this.repository.findByEntityAndScope(
        SharedEntityType.AGENT,
        command.agentId,
        ShareScopeType.ORG,
        orgId,
      );

      if (existingShare) {
        throw new ShareAlreadyExistsError(command.agentId, 'org');
      }

      // Create org-scoped share
      const share = new AgentShare({
        agentId: command.agentId,
        scope: new OrgShareScope({ orgId }),
        ownerId: userId,
      });

      await this.repository.create(share);
      return share;
    } else if (command instanceof CreateTeamAgentShareCommand) {
      // Validate agent ownership
      const strategy = this.authorizationFactory.getStrategy(
        SharedEntityType.AGENT,
      );
      const canCreate = await strategy.canCreateShare(command.agentId, userId);

      if (!canCreate) {
        throw new ForbiddenException('User cannot create share for this agent');
      }

      // Validate user is a member of the team
      const isMember = await this.checkUserTeamMembershipUseCase.execute(
        new CheckUserTeamMembershipQuery({ userId, teamId: command.teamId }),
      );

      if (!isMember) {
        throw new ForbiddenException('User is not a member of this team');
      }

      // Check if share already exists
      const existingShare = await this.repository.findByEntityAndScope(
        SharedEntityType.AGENT,
        command.agentId,
        ShareScopeType.TEAM,
        command.teamId,
      );

      if (existingShare) {
        throw new ShareAlreadyExistsError(command.agentId, 'team');
      }

      // Create team-scoped share
      const share = new AgentShare({
        agentId: command.agentId,
        scope: new TeamShareScope({ teamId: command.teamId }),
        ownerId: userId,
      });

      await this.repository.create(share);
      return share;
    } else {
      throw new Error('Unsupported share command type');
    }
  }
}
