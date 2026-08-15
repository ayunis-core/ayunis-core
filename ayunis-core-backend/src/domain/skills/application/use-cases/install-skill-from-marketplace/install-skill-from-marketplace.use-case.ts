import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { InstallSkillFromMarketplaceCommand } from './install-skill-from-marketplace.command';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { MarketplaceInstallFailedError } from '../../skills.errors';
import { MarketplaceSkillInstallationService } from '../../services/marketplace-skill-installation.service';
import { MarketplaceSkillInstalledEvent } from '../../events/marketplace-skill-installed.event';

@Injectable()
export class InstallSkillFromMarketplaceUseCase {
  constructor(
    @InjectPinoLogger(InstallSkillFromMarketplaceUseCase.name)
    private readonly logger: PinoLogger,
    private readonly skillInstallationService: MarketplaceSkillInstallationService,
    private readonly contextService: ContextService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: InstallSkillFromMarketplaceCommand): Promise<Skill> {
    this.logger.info({ identifier: command.identifier }, 'execute');

    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');
    if (!userId || !orgId) {
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      const skill = await this.skillInstallationService.installFromMarketplace(
        command.identifier,
        userId,
      );

      const identifier = skill.marketplaceIdentifier ?? command.identifier;
      this.eventEmitter
        .emitAsync(
          MarketplaceSkillInstalledEvent.EVENT_NAME,
          new MarketplaceSkillInstalledEvent(userId, orgId, identifier),
        )
        .catch((err: unknown) => {
          this.logger.error(
            {
              err: err as Error,
              identifier,
              userId,
            },
            'Failed to emit MarketplaceSkillInstalledEvent',
          );
        });

      return skill;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          identifier: command.identifier,
          userId,
          err: error as Error,
        },
        'Failed to install marketplace skill',
      );
      throw new MarketplaceInstallFailedError(command.identifier);
    }
  }
}
