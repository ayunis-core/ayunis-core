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
import { CreateLanguageModelCommand } from '../../application/use-cases/create-language-model/create-language-model.command';
import { CreateLanguageModelUseCase } from '../../application/use-cases/create-language-model/create-language-model.use-case';
import { UpdateLanguageModelCommand } from '../../application/use-cases/update-language-model/update-language-model.command';
import { UpdateLanguageModelUseCase } from '../../application/use-cases/update-language-model/update-language-model.use-case';
import { CreateLanguageModelRequestDto } from './dto/create-language-model-request.dto';
import { LanguageModelResponseDto } from './dto/language-model-response.dto';
import { UpdateLanguageModelRequestDto } from './dto/update-language-model-request.dto';
import { CatalogModelResponseDtoMapper } from './mappers/catalog-model-response-dto.mapper';

@ApiTags('Super Admin Models')
@Controller('super-admin/models')
@SystemRoles(SystemRole.SUPER_ADMIN)
@ApiExtraModels(
  CreateLanguageModelRequestDto,
  UpdateLanguageModelRequestDto,
  LanguageModelResponseDto,
)
export class SuperAdminLanguageCatalogModelsController {
  private readonly logger = new Logger(
    SuperAdminLanguageCatalogModelsController.name,
  );

  constructor(
    private readonly createLanguageModelUseCase: CreateLanguageModelUseCase,
    private readonly updateLanguageModelUseCase: UpdateLanguageModelUseCase,
    private readonly catalogModelResponseDtoMapper: CatalogModelResponseDtoMapper,
  ) {}

  @Post('catalog/language')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new language model in the catalog',
    description:
      'Create a new language model in the master catalog. This endpoint is only accessible to super admins.',
  })
  @ApiBody({ type: CreateLanguageModelRequestDto })
  @ApiCreatedResponse({
    description: 'Successfully created language model',
    type: LanguageModelResponseDto,
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
  async createLanguageModel(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() dto: CreateLanguageModelRequestDto,
  ): Promise<LanguageModelResponseDto> {
    this.logger.log(
      `Creating language model ${dto.name} by super admin ${userId}`,
    );
    const command = new CreateLanguageModelCommand({
      name: dto.name,
      provider: dto.provider,
      displayName: dto.displayName,
      canStream: dto.canStream,
      canUseTools: dto.canUseTools,
      isReasoning: dto.isReasoning,
      canVision: dto.canVision,
      isArchived: dto.isArchived,
      inputTokenCost: dto.inputTokenCost,
      outputTokenCost: dto.outputTokenCost,
      tier: dto.tier,
    });
    const model = await this.createLanguageModelUseCase.execute(command);
    const responseDto =
      this.catalogModelResponseDtoMapper.toLanguageModelDto(model);
    this.logger.log(`Successfully created language model ${model.id}`);
    return responseDto;
  }

  @Patch('catalog/language/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a language model in the catalog',
    description:
      'Update an existing language model in the master catalog. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'id',
    description: 'Model ID to update',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateLanguageModelRequestDto })
  @ApiOkResponse({
    description: 'Successfully updated language model',
    type: LanguageModelResponseDto,
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
  async updateLanguageModel(
    @Param('id') id: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() dto: UpdateLanguageModelRequestDto,
  ): Promise<LanguageModelResponseDto> {
    this.logger.log(`Updating language model ${id} by super admin ${userId}`);
    const command = new UpdateLanguageModelCommand({
      id,
      name: dto.name,
      provider: dto.provider,
      displayName: dto.displayName,
      canStream: dto.canStream,
      canUseTools: dto.canUseTools,
      isReasoning: dto.isReasoning,
      canVision: dto.canVision,
      isArchived: dto.isArchived,
      inputTokenCost: dto.inputTokenCost,
      outputTokenCost: dto.outputTokenCost,
      tier: dto.tier,
    });
    const model = await this.updateLanguageModelUseCase.execute(command);
    const responseDto =
      this.catalogModelResponseDtoMapper.toLanguageModelDto(model);
    this.logger.log(`Successfully updated language model ${id}`);
    return responseDto;
  }
}
