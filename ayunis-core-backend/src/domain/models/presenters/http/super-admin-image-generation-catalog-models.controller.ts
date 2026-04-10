import type { UUID } from 'crypto';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { CreateImageGenerationModelCommand } from '../../application/use-cases/create-image-generation-model/create-image-generation-model.command';
import { CreateImageGenerationModelUseCase } from '../../application/use-cases/create-image-generation-model/create-image-generation-model.use-case';
import { UpdateImageGenerationModelCommand } from '../../application/use-cases/update-image-generation-model/update-image-generation-model.command';
import { UpdateImageGenerationModelUseCase } from '../../application/use-cases/update-image-generation-model/update-image-generation-model.use-case';
import { CreateImageGenerationModelRequestDto } from './dto/create-image-generation-model-request.dto';
import { ImageGenerationModelResponseDto } from './dto/image-generation-model-response.dto';
import { UpdateImageGenerationModelRequestDto } from './dto/update-image-generation-model-request.dto';
import { CatalogModelResponseDtoMapper } from './mappers/catalog-model-response-dto.mapper';

@ApiTags('Super Admin Models')
@Controller('super-admin/models')
@SystemRoles(SystemRole.SUPER_ADMIN)
@ApiExtraModels(
  CreateImageGenerationModelRequestDto,
  UpdateImageGenerationModelRequestDto,
  ImageGenerationModelResponseDto,
)
export class SuperAdminImageGenerationCatalogModelsController {
  private readonly logger = new Logger(
    SuperAdminImageGenerationCatalogModelsController.name,
  );

  constructor(
    private readonly createImageGenerationModelUseCase: CreateImageGenerationModelUseCase,
    private readonly updateImageGenerationModelUseCase: UpdateImageGenerationModelUseCase,
    private readonly catalogModelResponseDtoMapper: CatalogModelResponseDtoMapper,
  ) {}

  @Post('catalog/image-generation')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new image-generation model in the catalog',
    description:
      'Create a new image-generation model in the master catalog. This endpoint is only accessible to super admins.',
  })
  @ApiBody({ type: CreateImageGenerationModelRequestDto })
  @ApiCreatedResponse({
    description: 'Successfully created image-generation model',
    type: ImageGenerationModelResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid model data provided',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Model already exists',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async createImageGenerationModel(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() dto: CreateImageGenerationModelRequestDto,
  ): Promise<ImageGenerationModelResponseDto> {
    this.logger.log(
      `Creating image-generation model ${dto.name} by super admin ${userId}`,
    );
    const command = new CreateImageGenerationModelCommand({
      name: dto.name,
      provider: dto.provider,
      displayName: dto.displayName,
      isArchived: dto.isArchived,
    });
    const model = await this.createImageGenerationModelUseCase.execute(command);
    return this.catalogModelResponseDtoMapper.toImageGenerationModelDto(model);
  }

  @Patch('catalog/image-generation/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update an image-generation model in the catalog',
    description:
      'Update an existing image-generation model in the master catalog. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'id',
    description: 'Model ID to update',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateImageGenerationModelRequestDto })
  @ApiOkResponse({
    description: 'Successfully updated image-generation model',
    type: ImageGenerationModelResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid model data provided',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Model not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async updateImageGenerationModel(
    @Param('id') id: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() dto: UpdateImageGenerationModelRequestDto,
  ): Promise<ImageGenerationModelResponseDto> {
    this.logger.log(
      `Updating image-generation model ${id} by super admin ${userId}`,
    );
    const command = new UpdateImageGenerationModelCommand({
      id,
      name: dto.name,
      provider: dto.provider,
      displayName: dto.displayName,
      isArchived: dto.isArchived,
    });
    const model = await this.updateImageGenerationModelUseCase.execute(command);
    return this.catalogModelResponseDtoMapper.toImageGenerationModelDto(model);
  }
}
