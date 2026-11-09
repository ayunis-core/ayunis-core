import { Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { RateLimit } from 'src/common/decorators/rate-limit.decorator';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { ResendExpiredInvitesCommand } from 'src/iam/invites/application/use-cases/resend-expired-invites/resend-expired-invites.command';
import { ResendExpiredInvitesUseCase } from 'src/iam/invites/application/use-cases/resend-expired-invites/resend-expired-invites.use-case';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { ResendExpiredInvitesResponseDto } from './dtos/resend-expired-invites-response.dto';

@ApiTags('invites')
@Controller('invites')
export class ExpiredInvitesController {
  private readonly logger = new Logger(ExpiredInvitesController.name);

  constructor(
    private readonly resendExpiredInvitesUseCase: ResendExpiredInvitesUseCase,
  ) {}

  @Post('resend-expired')
  @RateLimit({ limit: 5, windowMs: 15 * 60 * 1000 })
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Resend all expired invites',
    description:
      "Replace every expired, unaccepted invite of the caller's organization with a new one and send the invitation emails (Admin only)",
  })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'The expired invites have been renewed',
    type: ResendExpiredInvitesResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Unauthorized - Admin role required',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async resendAll(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<ResendExpiredInvitesResponseDto> {
    this.logger.log({ orgId }, 'resendAll');

    return this.resendExpiredInvitesUseCase.execute(
      new ResendExpiredInvitesCommand(orgId),
    );
  }
}
