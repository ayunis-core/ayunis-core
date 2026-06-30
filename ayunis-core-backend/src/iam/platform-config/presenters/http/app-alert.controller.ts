import { Controller, Get, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { GetAppAlertUseCase } from '../../application/use-cases/get-app-alert/get-app-alert.use-case';
import { AppAlertResponseDto } from './dto/app-alert-response.dto';

/**
 * Read-only endpoint for the app-wide alert banner, accessible to every
 * authenticated user (no super-admin requirement) so the banner can render on
 * all pages. Writing the configuration is restricted to super admins via
 * {@link SuperAdminPlatformConfigController}.
 */
@ApiTags('App Alert')
@Controller('app-alert')
export class AppAlertController {
  private readonly logger = new Logger(AppAlertController.name);

  constructor(private readonly getAppAlertUseCase: GetAppAlertUseCase) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get the current app-wide alert banner',
    description:
      'Retrieve the persistent alert banner configuration shown to all users. Returns `enabled: false` with an empty message when no banner has been configured.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved the app alert configuration',
    type: AppAlertResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getAppAlert(): Promise<AppAlertResponseDto> {
    this.logger.log('Getting app alert configuration');
    return this.getAppAlertUseCase.execute();
  }
}
