import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  ErrorResponseDto,
  SuccessResponseDto,
} from 'src/iam/authentication/presenters/http/dtos/auth-response.dto';
import {
  RefreshTokenRequestDto,
  SessionTokensResponseDto,
} from 'src/iam/authentication/presenters/http/dtos/session-tokens.dto';

export function ApiRefresh() {
  return applyDecorators(
    ApiOperation({
      summary: 'Refresh authentication tokens',
      description:
        'Refresh expired access tokens using the refresh token stored in ' +
        'cookies and set new authentication cookies. Without a refresh ' +
        'cookie, a token client sends its refresh token in the body and ' +
        'receives the new tokens in the body; no cookies are written on ' +
        'that path.',
    }),
    ApiCookieAuth('refreshToken'),
    ApiBody({ type: RefreshTokenRequestDto, required: false }),
    ApiExtraModels(SuccessResponseDto, SessionTokensResponseDto),
    ApiResponse({
      status: HttpStatus.OK,
      description:
        'Token refresh successful. Cookie requests get new authentication ' +
        'cookies, body requests the new tokens.',
      schema: {
        oneOf: [
          { $ref: getSchemaPath(SuccessResponseDto) },
          { $ref: getSchemaPath(SessionTokensResponseDto) },
        ],
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid or expired refresh token',
      type: ErrorResponseDto,
    }),
    ApiInternalServerErrorResponse({
      description: 'Authentication configuration error',
      type: ErrorResponseDto,
    }),
  );
}
