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
import { CreditsPerEuroResponseDto } from './dto/credits-per-euro-response.dto';
import { SetCreditsPerEuroRequestDto } from './dto/set-credits-per-euro-request.dto';

@ApiTags('Super Admin Platform Config')
@Controller('super-admin/platform-config')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminPlatformConfigController {
  private readonly logger = new Logger(SuperAdminPlatformConfigController.name);

  constructor(
    private readonly getCreditsPerEuroUseCase: GetCreditsPerEuroUseCase,
    private readonly setCreditsPerEuroUseCase: SetCreditsPerEuroUseCase,
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
}
