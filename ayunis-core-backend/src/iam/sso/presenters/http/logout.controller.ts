import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from 'src/common/guards/public.guard';
import { clearCookies } from 'src/common/util/cookie.util';
import { CompleteSsoLogoutCommand } from 'src/iam/sso/application/use-cases/complete-sso-logout/complete-sso-logout.command';
import { CompleteSsoLogoutUseCase } from 'src/iam/sso/application/use-cases/complete-sso-logout/complete-sso-logout.use-case';
import { LogoutResponseDto } from 'src/iam/sso/presenters/http/dto/logout.response-dto';
import { LogoutRequestDto } from 'src/iam/sso/presenters/http/dto/logout.request-dto';
import { AllowedClients } from 'src/iam/authorization/application/decorators/allowed-clients.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class LogoutController {
  constructor(
    private readonly completeLogout: CompleteSsoLogoutUseCase,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @AllowedClients('outlook')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke the current session and log out',
    description:
      'Revokes the session of the refresh cookie and clears the cookies. ' +
      'Without a refresh cookie, a token client sends its refresh token in ' +
      'the body and no cookies are written.',
  })
  @ApiBody({ type: LogoutRequestDto, required: false })
  @ApiOkResponse({ type: LogoutResponseDto })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() body: LogoutRequestDto,
  ): Promise<LogoutResponseDto> {
    const refreshTokenName = this.configService.get<string>(
      'auth.cookie.refreshTokenName',
      'refresh_token',
    );
    const cookieToken = this.cookieValue(request, refreshTokenName);
    const refreshToken = cookieToken ?? body.refreshToken;
    if (cookieToken || !body.refreshToken) {
      clearCookies(response, this.configService);
    }
    const result = await this.completeLogout.execute(
      new CompleteSsoLogoutCommand(refreshToken),
    );
    return { success: true, ...result };
  }

  private cookieValue(request: Request, name: string): string | undefined {
    const cookies = request.cookies as Record<string, string> | undefined;
    return cookies?.[name];
  }
}
