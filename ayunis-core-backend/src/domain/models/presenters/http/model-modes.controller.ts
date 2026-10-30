import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResolveModelModesUseCase } from 'src/domain/models/application/use-cases/resolve-model-modes/resolve-model-modes.use-case';
import { ModelModeResolutionResponseDto } from './dto/model-mode-resolution-response.dto';

@ApiTags('models')
@Controller('models/modes')
export class ModelModesController {
  constructor(
    private readonly resolveModelModesUseCase: ResolveModelModesUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Which model each mode currently resolves to for the current user',
  })
  @ApiOkResponse({ type: [ModelModeResolutionResponseDto] })
  async getModelModes(): Promise<ModelModeResolutionResponseDto[]> {
    const resolutions = await this.resolveModelModesUseCase.execute();
    return resolutions.map((r) => ({
      mode: r.mode,
      permittedModelId: r.permittedModel?.id ?? null,
      anonymousPermittedModelId: r.anonymousPermittedModel?.id ?? null,
    }));
  }
}
