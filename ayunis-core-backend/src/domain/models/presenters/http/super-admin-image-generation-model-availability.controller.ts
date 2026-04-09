import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { GetAvailableImageGenerationModelsQuery } from '../../application/use-cases/get-available-image-generation-models/get-available-image-generation-models.query';
import { GetAvailableImageGenerationModelsUseCase } from '../../application/use-cases/get-available-image-generation-models/get-available-image-generation-models.use-case';
import { GetPermittedModelsQuery } from '../../application/use-cases/get-permitted-models/get-permitted-models.query';
import { GetPermittedModelsUseCase } from '../../application/use-cases/get-permitted-models/get-permitted-models.use-case';
import { PermittedImageGenerationModel } from '../../domain/permitted-model.entity';
import { AvailableImageGenerationModelResponseDto } from './dto/available-image-generation-model-response.dto';
import { AvailableImageGenerationModelResponseDtoMapper } from './mappers/available-image-generation-model-response-dto.mapper';

@ApiTags('Super Admin Models')
@Controller('super-admin/models')
@SystemRoles(SystemRole.SUPER_ADMIN)
@ApiExtraModels(AvailableImageGenerationModelResponseDto)
export class SuperAdminImageGenerationModelAvailabilityController {
  private readonly logger = new Logger(
    SuperAdminImageGenerationModelAvailabilityController.name,
  );

  constructor(
    private readonly getAvailableImageGenerationModelsUseCase: GetAvailableImageGenerationModelsUseCase,
    private readonly getPermittedModelsUseCase: GetPermittedModelsUseCase,
    private readonly availableImageGenerationModelResponseDtoMapper: AvailableImageGenerationModelResponseDtoMapper,
  ) {}

  @Get(':orgId/available/image-generation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all available image-generation models',
    description:
      'Retrieve all available image-generation models with their permitted status for the specified organization. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID to check image-generation model status for',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved available image-generation models',
    schema: {
      type: 'array',
      items: {
        $ref: getSchemaPath(AvailableImageGenerationModelResponseDto),
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async getAvailableImageGenerationModels(
    @Param('orgId') orgId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<AvailableImageGenerationModelResponseDto[]> {
    this.logger.log(
      `Getting available image-generation models for org ${orgId} by super admin ${userId}`,
    );
    const query = new GetAvailableImageGenerationModelsQuery(orgId);
    const availableModels =
      await this.getAvailableImageGenerationModelsUseCase.execute(query);
    const permittedModels = await this.getPermittedModelsUseCase.execute(
      new GetPermittedModelsQuery(orgId),
    );
    const responseDtos =
      this.availableImageGenerationModelResponseDtoMapper.toDto(
        availableModels,
        permittedModels.filter(
          (model): model is PermittedImageGenerationModel =>
            model instanceof PermittedImageGenerationModel,
        ),
      );
    this.logger.log(
      `Successfully retrieved ${availableModels.length} available image-generation models for org ${orgId}`,
    );
    return responseDtos;
  }
}
