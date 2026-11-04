import { Controller, Get, Res } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import type { Response } from 'express';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { GetSsoAccountLinkStatusUseCase } from 'src/iam/sso/application/use-cases/get-sso-account-link-status/get-sso-account-link-status.use-case';
import { GetSsoAccountLinkStatusQuery } from 'src/iam/sso/application/use-cases/get-sso-account-link-status/get-sso-account-link-status.query';
import { SsoAccountLinkStatusResponseDto } from './dto/sso-account-link-status.response-dto';

@ApiTags('SSO')
@Controller('auth/sso/link')
export class SsoAccountController {
  constructor(private readonly status: GetSsoAccountLinkStatusUseCase) {}

  @Get('status')
  @ApiOkResponse({ type: SsoAccountLinkStatusResponseDto })
  getStatus(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SsoAccountLinkStatusResponseDto> {
    response.setHeader('Cache-Control', 'no-store');
    return this.status.execute(new GetSsoAccountLinkStatusQuery(userId, orgId));
  }
}
