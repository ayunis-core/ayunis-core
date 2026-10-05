import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { ResolveSubscriptionOverlapCommand } from 'src/iam/subscriptions/application/use-cases/resolve-subscription-overlap/resolve-subscription-overlap.command';
import { ResolveSubscriptionOverlapUseCase } from 'src/iam/subscriptions/application/use-cases/resolve-subscription-overlap/resolve-subscription-overlap.use-case';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { ResolveSubscriptionOverlapDto } from './dto/resolve-subscription-overlap.dto';
import { OrgIdParam } from './super-admin-subscriptions.decorators';

@ApiTags('Super Admin Subscriptions')
@Controller('super-admin/subscriptions')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminSubscriptionOverlapController {
  constructor(
    private readonly resolveSubscriptionOverlapUseCase: ResolveSubscriptionOverlapUseCase,
  ) {}

  @Post(':orgId/resolve-overlap')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Resolve an organization's overlapping subscription access",
    description:
      'Selects the authoritative serving subscription and atomically ends access for every conflicting subscription while preserving history. Super admins only.',
  })
  @OrgIdParam('Organization ID whose subscription overlap will be resolved')
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Subscription overlap resolved',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'The requested correction does not resolve the overlap',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  async resolveSubscriptionOverlap(
    @Param('orgId') orgId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() dto: ResolveSubscriptionOverlapDto,
  ): Promise<void> {
    await this.resolveSubscriptionOverlapUseCase.execute(
      new ResolveSubscriptionOverlapCommand({
        orgId,
        requestingUserId: userId,
        authoritativeSubscriptionId: dto.authoritativeSubscriptionId,
        adjustments: dto.adjustments.map((adjustment) => ({
          subscriptionId: adjustment.subscriptionId,
          accessEndsAt: new Date(adjustment.accessEndsAt),
        })),
        reason: dto.reason,
      }),
    );
  }
}
