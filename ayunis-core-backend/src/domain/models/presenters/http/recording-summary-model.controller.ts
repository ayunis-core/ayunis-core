import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { GetRecordingSummaryModelUseCase } from 'src/domain/models/application/use-cases/get-recording-summary-model/get-recording-summary-model.use-case';
import { SetRecordingSummaryModelCommand } from 'src/domain/models/application/use-cases/set-recording-summary-model/set-recording-summary-model.command';
import { SetRecordingSummaryModelUseCase } from 'src/domain/models/application/use-cases/set-recording-summary-model/set-recording-summary-model.use-case';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedLanguageModelResponseDtoNullable } from './dto/permitted-language-model-response.dto';
import { SetRecordingSummaryModelDto } from './dto/set-recording-summary-model.dto';
import { ModelResponseDtoMapper } from './mappers/model-response-dto.mapper';

@ApiTags('models')
@Controller('models/org/recording-summary-model')
@RequireFeature(FeatureFlag.Recordings)
@Roles(UserRole.ADMIN)
export class RecordingSummaryModelController {
  constructor(
    private readonly getRecordingSummaryModelUseCase: GetRecordingSummaryModelUseCase,
    private readonly setRecordingSummaryModelUseCase: SetRecordingSummaryModelUseCase,
    private readonly modelResponseDtoMapper: ModelResponseDtoMapper,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get the model that summarizes recordings',
    description:
      'Returns null when no model is selected and summaries use the organization default model.',
  })
  @ApiResponse({ status: 200, type: PermittedLanguageModelResponseDtoNullable })
  async getRecordingSummaryModel(): Promise<PermittedLanguageModelResponseDtoNullable> {
    const model = await this.getRecordingSummaryModelUseCase.execute();
    return this.toDto(model);
  }

  @Put()
  @ApiOperation({
    summary: 'Set or clear the model that summarizes recordings',
  })
  @ApiBody({ type: SetRecordingSummaryModelDto })
  @ApiResponse({ status: 200, type: PermittedLanguageModelResponseDtoNullable })
  @ApiResponse({
    status: 400,
    description: 'The model may only receive anonymized input',
  })
  @ApiResponse({
    status: 404,
    description: 'The model is not permitted organization-wide',
  })
  async setRecordingSummaryModel(
    @Body() dto: SetRecordingSummaryModelDto,
  ): Promise<PermittedLanguageModelResponseDtoNullable> {
    const model = await this.setRecordingSummaryModelUseCase.execute(
      new SetRecordingSummaryModelCommand(dto.permittedModelId),
    );
    return this.toDto(model);
  }

  private toDto(
    model: PermittedLanguageModel | null,
  ): PermittedLanguageModelResponseDtoNullable {
    return {
      permittedLanguageModel: model
        ? this.modelResponseDtoMapper.toLanguageModelDto(model)
        : undefined,
    };
  }
}
