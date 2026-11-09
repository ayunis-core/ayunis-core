import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from 'src/common/guards/public.guard';
import { RateLimit } from 'src/common/decorators/rate-limit.decorator';
import {
  HandoffOriginNotAllowedError,
  InvalidTokenError,
} from 'src/iam/authentication/application/authentication.errors';
import { HandOffSessionCommand } from 'src/iam/authentication/application/use-cases/hand-off-session/hand-off-session.command';
import { HandOffSessionUseCase } from 'src/iam/authentication/application/use-cases/hand-off-session/hand-off-session.use-case';
import {
  SessionHandoffRequestDto,
  SessionTokensResponseDto,
} from 'src/iam/authentication/presenters/http/dtos/session-tokens.dto';
import { ErrorResponseDto } from 'src/iam/authentication/presenters/http/dtos/auth-response.dto';
import { SessionTokensResponseDtoMapper } from 'src/iam/authentication/presenters/http/mappers/session-tokens-response-dto.mapper';

@ApiTags('Authentication')
@Controller('auth/session')
export class SessionHandoffController {
  private readonly logger = new Logger(SessionHandoffController.name);

  constructor(
    private readonly handOffSessionUseCase: HandOffSessionUseCase,
    private readonly configService: ConfigService,
    private readonly sessionTokensMapper: SessionTokensResponseDtoMapper,
  ) {}

  @Public()
  // Same budget as /auth/refresh: every handoff issues a refresh token.
  @RateLimit({ limit: 300, windowMs: 15 * 60 * 1000 })
  @Post('handoff')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start a token client session from the cookie session',
    description:
      'Authenticates the refresh cookie, starts a separate session bound to ' +
      'the given client and returns its tokens in the body. The cookie ' +
      'session and its cookies stay as they are. Used by the Office add-in ' +
      'dialog after a regular login.',
  })
  @ApiCookieAuth('refreshToken')
  @ApiBody({ type: SessionHandoffRequestDto })
  @ApiOkResponse({ type: SessionTokensResponseDto })
  @ApiUnauthorizedResponse({
    description: 'No refresh cookie, or the refresh token is not valid',
    type: ErrorResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Unknown client',
    type: ErrorResponseDto,
  })
  async handoff(
    @Req() req: Request,
    @Body() body: SessionHandoffRequestDto,
  ): Promise<SessionTokensResponseDto> {
    this.logger.log({ client: body.client }, 'handoff');
    this.assertDialogOrigin(req);
    const refreshToken = this.refreshCookie(req);
    if (!refreshToken) {
      throw new InvalidTokenError('Refresh token not provided');
    }
    const tokens = await this.handOffSessionUseCase.execute(
      new HandOffSessionCommand(refreshToken, body.client),
    );
    return this.sessionTokensMapper.toDto(tokens);
  }

  // The dialog always runs on the frontend origin. Self-hosted deployments may
  // reflect any origin in CORS, and the cookie travels with same-site requests,
  // so without this check a page on a sibling domain could read the tokens.
  private assertDialogOrigin(req: Request): void {
    const frontendOrigin = new URL(
      this.configService.get<string>('app.frontend.baseUrl', ''),
    ).origin;
    if (req.headers.origin === frontendOrigin) return;
    this.logger.warn(
      { origin: req.headers.origin },
      'Session handoff refused for a foreign origin',
    );
    throw new HandoffOriginNotAllowedError();
  }

  private refreshCookie(req: Request): string | undefined {
    const name = this.configService.get<string>(
      'auth.cookie.refreshTokenName',
      'refresh_token',
    );
    const cookies = req.cookies as Record<string, string> | undefined;
    return cookies?.[name];
  }
}
