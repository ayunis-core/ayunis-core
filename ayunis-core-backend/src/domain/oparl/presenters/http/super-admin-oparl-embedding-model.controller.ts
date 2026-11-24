import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { GetOparlEmbeddingModelUseCase } from 'src/domain/oparl/application/use-cases/get-oparl-embedding-model/get-oparl-embedding-model.use-case';
import { SetOparlEmbeddingModelCommand } from 'src/domain/oparl/application/use-cases/set-oparl-embedding-model/set-oparl-embedding-model.command';
import { SetOparlEmbeddingModelUseCase } from 'src/domain/oparl/application/use-cases/set-oparl-embedding-model/set-oparl-embedding-model.use-case';
import {
  OparlEmbeddingModelResponseDto,
  SetOparlEmbeddingModelDto,
} from './dto/oparl-embedding-model.dto';
import { toOparlEmbeddingModelResponseDto } from './mappers/oparl-embedding-model-dto.mapper';

@ApiTags('Super Admin OParl')
@Controller('super-admin/oparl/embedding-model')
@SystemRoles(SystemRole.SUPER_ADMIN)
@RequireFeature(FeatureFlag.Oparl)
@ApiForbiddenResponse({ description: 'Not a super admin' })
@ApiNotFoundResponse({ description: 'OParl is disabled' })
export class SuperAdminOparlEmbeddingModelController {
  constructor(
    private readonly getModel: GetOparlEmbeddingModelUseCase,
    private readonly setModel: SetOparlEmbeddingModelUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get the OParl embedding model',
    description:
      'The catalog embedding model that embeds the chunks of every OParl mirror, installation-wide.',
  })
  @ApiOkResponse({ type: OparlEmbeddingModelResponseDto })
  async get(): Promise<OparlEmbeddingModelResponseDto> {
    return toOparlEmbeddingModelResponseDto(await this.getModel.execute());
  }

  @Put()
  @ApiOperation({
    summary: 'Set the OParl embedding model',
    description:
      'A change embeds every chunk again in the background; until then vector search ignores the chunks of the previous model.',
  })
  @ApiBody({ type: SetOparlEmbeddingModelDto })
  @ApiOkResponse({ type: OparlEmbeddingModelResponseDto })
  @ApiNotFoundResponse({
    description:
      'OParl is disabled, or the model is not an embedding model of the catalog or archived (OPARL_EMBEDDING_MODEL_NOT_FOUND)',
  })
  async set(
    @Body() dto: SetOparlEmbeddingModelDto,
  ): Promise<OparlEmbeddingModelResponseDto> {
    const model = await this.setModel.execute(
      new SetOparlEmbeddingModelCommand(dto.modelId as UUID),
    );
    return toOparlEmbeddingModelResponseDto(model);
  }
}
