import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
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
import { DeleteModelCommand } from '../../application/use-cases/delete-model/delete-model.command';
import { DeleteModelUseCase } from '../../application/use-cases/delete-model/delete-model.use-case';
import { GetAllModelsUseCase } from '../../application/use-cases/get-all-models/get-all-models.use-case';
import { GetModelByIdQuery } from '../../application/use-cases/get-model-by-id/get-model-by-id.query';
import { GetModelByIdUseCase } from '../../application/use-cases/get-model-by-id/get-model-by-id.use-case';
import { EmbeddingModelResponseDto } from './dto/embedding-model-response.dto';
import { ImageGenerationModelResponseDto } from './dto/image-generation-model-response.dto';
import { LanguageModelResponseDto } from './dto/language-model-response.dto';
import { ModelResponseDto } from './dto/model-response.dto';
import { CatalogModelResponseDtoMapper } from './mappers/catalog-model-response-dto.mapper';

@ApiTags('Super Admin Models')
@Controller('super-admin/models')
@SystemRoles(SystemRole.SUPER_ADMIN)
@ApiExtraModels(
  LanguageModelResponseDto,
  EmbeddingModelResponseDto,
  ImageGenerationModelResponseDto,
)
export class SuperAdminCatalogModelsController {
  private readonly logger = new Logger(SuperAdminCatalogModelsController.name);

  constructor(
    private readonly getAllModelsUseCase: GetAllModelsUseCase,
    private readonly getModelByIdUseCase: GetModelByIdUseCase,
    private readonly catalogModelResponseDtoMapper: CatalogModelResponseDtoMapper,
    private readonly deleteModelUseCase: DeleteModelUseCase,
  ) {}

  @Get('catalog')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all models in the catalog',
    description:
      'Retrieve all models (language, embedding, and image-generation) from the master catalog. This endpoint is only accessible to super admins.',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved all models',
    schema: {
      type: 'array',
      items: {
        oneOf: [
          { $ref: getSchemaPath(LanguageModelResponseDto) },
          { $ref: getSchemaPath(EmbeddingModelResponseDto) },
          { $ref: getSchemaPath(ImageGenerationModelResponseDto) },
        ],
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async getAllCatalogModels(
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<ModelResponseDto[]> {
    this.logger.log(`Getting all catalog models by super admin ${userId}`);
    const models = await this.getAllModelsUseCase.execute();
    const responseDtos = this.catalogModelResponseDtoMapper.toDtoArray(models);
    this.logger.log(`Successfully retrieved ${models.length} catalog models`);
    return responseDtos;
  }

  @Get('catalog/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a model by ID from the catalog',
    description:
      'Retrieve a specific model from the master catalog by its ID. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'id',
    description: 'Model ID to retrieve',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved model',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(LanguageModelResponseDto) },
        { $ref: getSchemaPath(EmbeddingModelResponseDto) },
        { $ref: getSchemaPath(ImageGenerationModelResponseDto) },
      ],
    },
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
  async getCatalogModelById(
    @Param('id') id: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<ModelResponseDto> {
    this.logger.log(`Getting catalog model ${id} by super admin ${userId}`);
    const query = new GetModelByIdQuery(id);
    const model = await this.getModelByIdUseCase.execute(query);
    const responseDto = this.catalogModelResponseDtoMapper.toDto(model);
    this.logger.log(`Successfully retrieved catalog model ${id}`);
    return responseDto;
  }

  @Delete('catalog/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a model from the catalog',
    description:
      'Remove a model (language, embedding, or image-generation) from the master catalog. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'id',
    description: 'Model ID to delete',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully deleted model',
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
  async deleteCatalogModel(
    @Param('id') id: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<void> {
    this.logger.log(`Deleting catalog model ${id} by super admin ${userId}`);
    const command = new DeleteModelCommand(id);
    await this.deleteModelUseCase.execute(command);
    this.logger.log(`Successfully deleted catalog model ${id}`);
  }
}
