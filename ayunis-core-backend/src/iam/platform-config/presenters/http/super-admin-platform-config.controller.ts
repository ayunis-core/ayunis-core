import {
  Controller,
  Get,
  Put,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { GetCreditsPerEuroUseCase } from '../../application/use-cases/get-credits-per-euro/get-credits-per-euro.use-case';
import { SetCreditsPerEuroUseCase } from '../../application/use-cases/set-credits-per-euro/set-credits-per-euro.use-case';
import { SetCreditsPerEuroCommand } from '../../application/use-cases/set-credits-per-euro/set-credits-per-euro.command';
import { GetFairUseLimitsUseCase } from '../../application/use-cases/get-fair-use-limits/get-fair-use-limits.use-case';
import { SetFairUseLimitUseCase } from '../../application/use-cases/set-fair-use-limit/set-fair-use-limit.use-case';
import { SetFairUseLimitCommand } from '../../application/use-cases/set-fair-use-limit/set-fair-use-limit.command';
import { SetImageFairUseLimitUseCase } from '../../application/use-cases/set-image-fair-use-limit/set-image-fair-use-limit.use-case';
import { SetImageFairUseLimitCommand } from '../../application/use-cases/set-image-fair-use-limit/set-image-fair-use-limit.command';
import { CreditsPerEuroResponseDto } from './dto/credits-per-euro-response.dto';
import { SetCreditsPerEuroRequestDto } from './dto/set-credits-per-euro-request.dto';
import { FairUseLimitsResponseDto } from './dto/fair-use-limits-response.dto';
import { SetFairUseLimitRequestDto } from './dto/set-fair-use-limit-request.dto';
import { SetImageFairUseLimitRequestDto } from './dto/set-image-fair-use-limit-request.dto';

@ApiTags('Super Admin Platform Config')
@Controller('super-admin/platform-config')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminPlatformConfigController {
  private readonly logger = new Logger(SuperAdminPlatformConfigController.name);

  constructor(
    private readonly getCreditsPerEuroUseCase: GetCreditsPerEuroUseCase,
    private readonly setCreditsPerEuroUseCase: SetCreditsPerEuroUseCase,
    private readonly getFairUseLimitsUseCase: GetFairUseLimitsUseCase,
    private readonly setFairUseLimitUseCase: SetFairUseLimitUseCase,
    private readonly setImageFairUseLimitUseCase: SetImageFairUseLimitUseCase,
  ) {}

  @Get('credits-per-euro')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get the current credits-per-euro configuration',
    description:
      'Retrieve the global credits-per-euro value used for credit calculations. Super admin only.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved credits-per-euro value',
    type: CreditsPerEuroResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Credits-per-euro value has not been configured',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async getCreditsPerEuro(): Promise<CreditsPerEuroResponseDto> {
    this.logger.log('Getting credits-per-euro configuration');
    const creditsPerEuro = await this.getCreditsPerEuroUseCase.execute();
    return { creditsPerEuro };
  }

  @Put('credits-per-euro')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Set the credits-per-euro configuration',
    description:
      'Update the global credits-per-euro value used for credit calculations. Super admin only.',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully updated credits-per-euro value',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid value provided (must be positive number)',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async setCreditsPerEuro(
    @Body() dto: SetCreditsPerEuroRequestDto,
  ): Promise<void> {
    this.logger.log(`Setting credits-per-euro to ${dto.creditsPerEuro}`);
    const command = new SetCreditsPerEuroCommand({
      creditsPerEuro: dto.creditsPerEuro,
    });
    await this.setCreditsPerEuroUseCase.execute(command);
    this.logger.log('Successfully updated credits-per-euro configuration');
  }

  @Get('fair-use-limits')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get the current fair-use limits',
    description:
      'Retrieve the configured fair-use limits: per-tier message limits (low, medium, high) plus a single global image-generation limit. Missing keys fall back to baked-in defaults so this endpoint always returns 200. Super admin only.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved fair-use limits',
    type: FairUseLimitsResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async getFairUseLimits(): Promise<FairUseLimitsResponseDto> {
    this.logger.log('Getting fair-use limits configuration');
    const limits = await this.getFairUseLimitsUseCase.execute();
    return limits;
  }

  @Put('fair-use-limits')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Set the fair-use limit for a single model tier',
    description:
      'Update the messages-per-window limit for one model tier (low, medium, or high). Super admin only.',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully updated fair-use limit for the given tier',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid value provided (limit and windowMs must be positive)',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async setFairUseLimit(@Body() dto: SetFairUseLimitRequestDto): Promise<void> {
    this.logger.log(
      `Setting fair-use limit for tier '${dto.tier}' to ${dto.limit}/${dto.windowMs}ms`,
    );
    const command = new SetFairUseLimitCommand({
      tier: dto.tier,
      limit: dto.limit,
      windowMs: dto.windowMs,
    });
    await this.setFairUseLimitUseCase.execute(command);
    this.logger.log('Successfully updated fair-use limit');
  }

  @Put('image-fair-use-limit')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Set the fair-use limit for image generation',
    description:
      'Update the images-per-window fair-use limit. Image generation has a single global bucket (no tiering), so this endpoint takes only limit + windowMs. Super admin only.',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully updated image fair-use limit',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid value provided (limit and windowMs must be positive)',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async setImageFairUseLimit(
    @Body() dto: SetImageFairUseLimitRequestDto,
  ): Promise<void> {
    this.logger.log(
      `Setting image fair-use limit to ${dto.limit}/${dto.windowMs}ms`,
    );
    const command = new SetImageFairUseLimitCommand({
      limit: dto.limit,
      windowMs: dto.windowMs,
    });
    await this.setImageFairUseLimitUseCase.execute(command);
    this.logger.log('Successfully updated image fair-use limit');
  }
}
