import type { UUID } from 'crypto';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
import { CreateEmbeddingModelCommand } from '../../application/use-cases/create-embedding-model/create-embedding-model.command';
import { CreateEmbeddingModelUseCase } from '../../application/use-cases/create-embedding-model/create-embedding-model.use-case';
import { UpdateEmbeddingModelCommand } from '../../application/use-cases/update-embedding-model/update-embedding-model.command';
import { UpdateEmbeddingModelUseCase } from '../../application/use-cases/update-embedding-model/update-embedding-model.use-case';
import { CreateEmbeddingModelRequestDto } from './dto/create-embedding-model-request.dto';
import { EmbeddingModelResponseDto } from './dto/embedding-model-response.dto';
import { UpdateEmbeddingModelRequestDto } from './dto/update-embedding-model-request.dto';
import { CatalogModelResponseDtoMapper } from './mappers/catalog-model-response-dto.mapper';

@ApiTags('Super Admin Models')
@Controller('super-admin/models')
@SystemRoles(SystemRole.SUPER_ADMIN)
@ApiExtraModels(
  CreateEmbeddingModelRequestDto,
  UpdateEmbeddingModelRequestDto,
  EmbeddingModelResponseDto,
)
export class SuperAdminEmbeddingCatalogModelsController {
  constructor(
    @InjectPinoLogger(SuperAdminEmbeddingCatalogModelsController.name)
    private readonly logger: PinoLogger,

    private readonly createEmbeddingModelUseCase: CreateEmbeddingModelUseCase,
    private readonly updateEmbeddingModelUseCase: UpdateEmbeddingModelUseCase,
    private readonly catalogModelResponseDtoMapper: CatalogModelResponseDtoMapper,
  ) {}

  @Post('catalog/embedding')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new embedding model in the catalog',
    description:
      'Create a new embedding model in the master catalog. This endpoint is only accessible to super admins.',
  })
  @ApiBody({ type: CreateEmbeddingModelRequestDto })
  @ApiCreatedResponse({
    description: 'Successfully created embedding model',
    type: EmbeddingModelResponseDto,
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
  async createEmbeddingModel(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() dto: CreateEmbeddingModelRequestDto,
  ): Promise<EmbeddingModelResponseDto> {
    this.logger.info(
      { modelName: dto.name, userId },
      'Creating embedding model by super admin',
    );
    const model = await this.createEmbeddingModelUseCase.execute(
      this.toCreateCommand(dto),
    );
    const responseDto =
      this.catalogModelResponseDtoMapper.toEmbeddingModelDto(model);
    this.logger.info(
      { modelId: model.id },
      'Successfully created embedding model',
    );
    return responseDto;
  }

  @Patch('catalog/embedding/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update an embedding model in the catalog',
    description:
      'Update an existing embedding model in the master catalog. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'id',
    description: 'Model ID to update',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateEmbeddingModelRequestDto })
  @ApiOkResponse({
    description: 'Successfully updated embedding model',
    type: EmbeddingModelResponseDto,
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
  async updateEmbeddingModel(
    @Param('id') id: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() dto: UpdateEmbeddingModelRequestDto,
  ): Promise<EmbeddingModelResponseDto> {
    this.logger.info(
      { modelId: id, userId },
      'Updating embedding model by super admin',
    );
    const model = await this.updateEmbeddingModelUseCase.execute(
      this.toUpdateCommand(id, dto),
    );
    const responseDto =
      this.catalogModelResponseDtoMapper.toEmbeddingModelDto(model);
    this.logger.info({ modelId: id }, 'Successfully updated embedding model');
    return responseDto;
  }

  private toCreateCommand(
    dto: CreateEmbeddingModelRequestDto,
  ): CreateEmbeddingModelCommand {
    return new CreateEmbeddingModelCommand({
      name: dto.name,
      provider: dto.provider,
      displayName: dto.displayName,
      dimensions: dto.dimensions,
      isArchived: dto.isArchived,
      inputTokenCost: dto.inputTokenCost,
      outputTokenCost: dto.outputTokenCost,
    });
  }

  private toUpdateCommand(
    id: UUID,
    dto: UpdateEmbeddingModelRequestDto,
  ): UpdateEmbeddingModelCommand {
    return new UpdateEmbeddingModelCommand({
      id,
      name: dto.name,
      provider: dto.provider,
      displayName: dto.displayName,
      dimensions: dto.dimensions,
      isArchived: dto.isArchived,
      inputTokenCost: dto.inputTokenCost,
      outputTokenCost: dto.outputTokenCost,
    });
  }
}
