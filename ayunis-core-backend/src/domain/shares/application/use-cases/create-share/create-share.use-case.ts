import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import {
  CreateAgentShareCommand,
  CreateShareCommand,
} from './create-share.command';
import { SharesRepository } from '../../ports/shares-repository.port';
import { AgentShare, Share } from 'src/domain/shares/domain/share.entity';
import { OrgShareScope } from 'src/domain/shares/domain/share-scope.entity';
import { ShareAuthorizationFactory } from '../../factories/share-authorization.factory';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';

@Injectable()
export class CreateShareUseCase {
  constructor(
    private readonly contextService: ContextService,
    private readonly repository: SharesRepository,
    private readonly authorizationFactory: ShareAuthorizationFactory,
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
    if (command instanceof CreateAgentShareCommand) {
      const strategy = this.authorizationFactory.getStrategy(
        SharedEntityType.AGENT,
      );
      const canCreate = await strategy.canCreateShare(command.agentId, userId);

      if (!canCreate) {
        throw new ForbiddenException('User cannot create share for this agent');
      }

      // Create org-scoped share
      const share = new AgentShare({
        agentId: command.agentId,
        scope: new OrgShareScope({}), // Always org-scoped
        ownerId: userId,
      });

      await this.repository.create(share);
      return share;
    } else {
      throw new Error('Unsupported share command type');
    }
  }
}
