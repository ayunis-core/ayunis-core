import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { RoutineResponseDto as MarketplaceRoutine } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import {
  getRequiredUserContext,
  type UserContext,
} from 'src/common/context/required-context';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { GetMarketplaceRoutineUseCase } from 'src/domain/marketplace/application/use-cases/get-marketplace-routine/get-marketplace-routine.use-case';
import { GetMarketplaceRoutineQuery } from 'src/domain/marketplace/application/use-cases/get-marketplace-routine/get-marketplace-routine.query';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { MarketplaceRoutineInstalledEvent } from 'src/domain/routines/application/events/marketplace-routine-installed.event';
import {
  RoutineInvalidMarketplaceEntryError,
  UnexpectedRoutineError,
} from 'src/domain/routines/application/routines.errors';
import { CreateRoutineUseCase } from 'src/domain/routines/application/use-cases/create-routine/create-routine.use-case';
import { CreateRoutineCommand } from 'src/domain/routines/application/use-cases/create-routine/create-routine.command';
import { RoutineInternetAccess } from 'src/domain/routines/domain/routine-internet-access';
import {
  ROUTINE_NAME_MAX_LENGTH,
  ROUTINE_PROMPT_MAX_LENGTH,
} from 'src/domain/routines/domain/routines.constants';
import type { Routine } from 'src/domain/routines/domain/routine.entity';
import { InstallRoutineFromMarketplaceCommand } from './install-routine-from-marketplace.command';

const INTERNET_ACCESS_MODES: readonly string[] = Object.values(
  RoutineInternetAccess,
);

/**
 * Creates the caller's own copy of a Marketplace routine, switched on with the
 * default model and without integrations or knowledge bases. The route
 * requires `manage_routines`; installing also needs
 * `install_marketplace_routines`.
 */
@Injectable()
export class InstallRoutineFromMarketplaceUseCase {
  private readonly logger = new Logger(
    InstallRoutineFromMarketplaceUseCase.name,
  );

  constructor(
    private readonly getMarketplaceRoutineUseCase: GetMarketplaceRoutineUseCase,
    private readonly createRoutineUseCase: CreateRoutineUseCase,
    private readonly hasPermissionUseCase: HasPermissionUseCase,
    private readonly contextService: ContextService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRoutineError)
  async execute(
    command: InstallRoutineFromMarketplaceCommand,
  ): Promise<Routine> {
    this.logger.log(
      { identifier: command.identifier },
      'Installing routine from the marketplace',
    );
    const user = getRequiredUserContext(this.contextService);
    await this.requireInstallPermission(user);
    const entry = await this.getMarketplaceRoutineUseCase.execute(
      new GetMarketplaceRoutineQuery(command.identifier),
    );
    const routine = await this.createRoutineUseCase.execute(
      this.toCreateCommand(entry),
    );
    this.emitInstalled(user, entry.identifier);
    return routine;
  }

  private async requireInstallPermission(user: UserContext): Promise<void> {
    const allowed = await this.hasPermissionUseCase.execute(
      new HasPermissionQuery(
        user.orgId,
        user.role,
        Permission.INSTALL_MARKETPLACE_ROUTINES,
      ),
    );
    if (!allowed) {
      throw new UnauthorizedAccessError({
        permission: Permission.INSTALL_MARKETPLACE_ROUTINES,
      });
    }
  }

  /** Schedule and allowed domains are checked by the create use case. */
  private toCreateCommand(entry: MarketplaceRoutine): CreateRoutineCommand {
    const invalid = (field: string) =>
      new RoutineInvalidMarketplaceEntryError(entry.identifier, field);
    if (!isRoutineText(entry.name, ROUTINE_NAME_MAX_LENGTH)) {
      throw invalid('name');
    }
    if (!isRoutineText(entry.prompt, ROUTINE_PROMPT_MAX_LENGTH)) {
      throw invalid('prompt');
    }
    if (!isObject(entry.schedule)) {
      throw invalid('schedule');
    }
    if (!isInternetAccess(entry.internetAccess)) {
      throw invalid('internetAccess');
    }
    if (!isStringArray(entry.allowedDomains)) {
      throw invalid('allowedDomains');
    }
    return new CreateRoutineCommand({
      name: entry.name,
      prompt: entry.prompt,
      schedule: entry.schedule,
      internetAccess: entry.internetAccess,
      allowedDomains: entry.allowedDomains,
      enabled: true,
      marketplaceIdentifier: entry.identifier,
    });
  }

  private emitInstalled(user: UserContext, identifier: string): void {
    this.eventEmitter
      .emitAsync(
        MarketplaceRoutineInstalledEvent.EVENT_NAME,
        new MarketplaceRoutineInstalledEvent(
          user.userId,
          user.orgId,
          identifier,
        ),
      )
      .catch((err: unknown) => {
        this.logger.error(
          { err: err as Error, identifier, userId: user.userId },
          'Failed to emit MarketplaceRoutineInstalledEvent',
        );
      });
  }
}

/** Like the create DTO: a non-blank string within the length limit. */
function isRoutineText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === 'string' && /\S/.test(value) && value.length <= maxLength
  );
}

function isObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null;
}

function isInternetAccess(value: unknown): value is RoutineInternetAccess {
  return typeof value === 'string' && INTERNET_ACCESS_MODES.includes(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}
