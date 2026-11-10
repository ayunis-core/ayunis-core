import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getUserContext } from 'src/common/context/required-context';
import { FeatureFlag } from 'src/config/features.config';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import { UnexpectedRoutineError } from 'src/domain/routines/application/routines.errors';
import type { Routine } from 'src/domain/routines/domain/routine.entity';

/**
 * The current user's routines, for callers outside the routines endpoints
 * (the chat's routine widgets). Returns null where those endpoints would
 * refuse the user: routines turned off, no user, or no `manage_routines`.
 */
@Injectable()
export class FindManageableRoutinesUseCase {
  private readonly logger = new Logger(FindManageableRoutinesUseCase.name);

  constructor(
    private readonly routinesRepository: RoutinesRepository,
    private readonly contextService: ContextService,
    private readonly hasPermissionUseCase: HasPermissionUseCase,
    private readonly configService: ConfigService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRoutineError)
  async execute(): Promise<Routine[] | null> {
    if (!this.configService.get<boolean>(`features.${FeatureFlag.Routines}`)) {
      return null;
    }
    const user = getUserContext(this.contextService);
    if (!user) return null;
    const permitted = await this.hasPermissionUseCase.execute(
      new HasPermissionQuery(user.orgId, user.role, Permission.MANAGE_ROUTINES),
    );
    if (!permitted) return null;
    this.logger.log('Listing manageable routines');
    return this.routinesRepository.findAllByUserId(user.userId);
  }
}
