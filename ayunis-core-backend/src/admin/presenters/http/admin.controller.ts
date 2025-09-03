import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { GetModelUseCase } from 'src/domain/models/application/use-cases/get-model/get-model.use-case';
import { GetModelQuery } from 'src/domain/models/application/use-cases/get-model/get-model.query';
import { GetAllModelsUseCase } from 'src/domain/models/application/use-cases/get-all-models/get-all-models.use-case';
import { CreateLanguageModelUseCase } from 'src/domain/models/application/use-cases/create-language-model/create-language-model.use-case';
import { CreateLanguageModelCommand } from 'src/domain/models/application/use-cases/create-language-model/create-language-model.command';
import { CreateEmbeddingModelUseCase } from 'src/domain/models/application/use-cases/create-embedding-model/create-embedding-model.use-case';
import { CreateEmbeddingModelCommand } from 'src/domain/models/application/use-cases/create-embedding-model/create-embedding-model.command';
import { UpdateLanguageModelUseCase } from 'src/domain/models/application/use-cases/update-language-model/update-language-model.use-case';
import { UpdateLanguageModelCommand } from 'src/domain/models/application/use-cases/update-language-model/update-language-model.command';
import { UpdateEmbeddingModelUseCase } from 'src/domain/models/application/use-cases/update-embedding-model/update-embedding-model.use-case';
import { UpdateEmbeddingModelCommand } from 'src/domain/models/application/use-cases/update-embedding-model/update-embedding-model.command';
import { DeleteModelUseCase } from 'src/domain/models/application/use-cases/delete-model/delete-model.use-case';
import { DeleteModelCommand } from 'src/domain/models/application/use-cases/delete-model/delete-model.command';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { Public } from 'src/common/guards/public.guard';
import { Admin } from '../../application/decorators/admin.decorator';
import { AdminGuard } from '../../application/guards/admin.guard';
import { UUID } from 'crypto';
import { CreateLanguageModelDto } from './dtos/create-language-model.dto';
import { CreateEmbeddingModelDto } from './dtos/create-embedding-model.dto';
import { UpdateLanguageModelDto } from './dtos/update-language-model.dto';
import { UpdateEmbeddingModelDto } from './dtos/update-embedding-model.dto';

@Controller('admin')
@UseGuards(AdminGuard)
@Public() // Used to bypass the JWT guard
@Admin()
export class AdminController {
  constructor(
    private readonly getModelUseCase: GetModelUseCase,
    private readonly getAllModelsUseCase: GetAllModelsUseCase,
    private readonly createLanguageModelUseCase: CreateLanguageModelUseCase,
    private readonly createEmbeddingModelUseCase: CreateEmbeddingModelUseCase,
    private readonly updateLanguageModelUseCase: UpdateLanguageModelUseCase,
    private readonly updateEmbeddingModelUseCase: UpdateEmbeddingModelUseCase,
    private readonly deleteModelUseCase: DeleteModelUseCase,
  ) {}

  @Get('models')
  async getAllModels() {
    return this.getAllModelsUseCase.execute();
  }

  @Get('model')
  async getModel(
    @Query('name') name: string,
    @Query('provider') provider: keyof typeof ModelProvider,
  ) {
    return this.getModelUseCase.execute(
      new GetModelQuery(name, ModelProvider[provider]),
    );
  }

  @Post('language-models')
  async createLanguageModel(
    @Body() createLanguageModelDto: CreateLanguageModelDto,
  ) {
    return this.createLanguageModelUseCase.execute(
      new CreateLanguageModelCommand({
        name: createLanguageModelDto.name,
        provider: createLanguageModelDto.provider,
        displayName: createLanguageModelDto.displayName,
        canStream: createLanguageModelDto.canStream,
        canUseTools: createLanguageModelDto.canUseTools,
        isReasoning: createLanguageModelDto.isReasoning,
        isArchived: createLanguageModelDto.isArchived,
      }),
    );
  }

  @Post('embedding-models')
  async createEmbeddingModel(
    @Body() createEmbeddingModelDto: CreateEmbeddingModelDto,
  ) {
    return this.createEmbeddingModelUseCase.execute(
      new CreateEmbeddingModelCommand({
        name: createEmbeddingModelDto.name,
        provider: createEmbeddingModelDto.provider,
        displayName: createEmbeddingModelDto.displayName,
        isArchived: createEmbeddingModelDto.isArchived,
        dimensions: createEmbeddingModelDto.dimensions,
      }),
    );
  }

  @Put('language-models/:id')
  async updateLanguageModel(
    @Param('id') id: UUID,
    @Body() updateLanguageModelDto: UpdateLanguageModelDto,
  ) {
    return this.updateLanguageModelUseCase.execute(
      new UpdateLanguageModelCommand({
        id,
        name: updateLanguageModelDto.name,
        provider: updateLanguageModelDto.provider,
        displayName: updateLanguageModelDto.displayName,
        canStream: updateLanguageModelDto.canStream,
        canUseTools: updateLanguageModelDto.canUseTools,
        isReasoning: updateLanguageModelDto.isReasoning,
        isArchived: updateLanguageModelDto.isArchived,
      }),
    );
  }

  @Put('embedding-models/:id')
  async updateEmbeddingModel(
    @Param('id') id: UUID,
    @Body() updateEmbeddingModelDto: UpdateEmbeddingModelDto,
  ) {
    return this.updateEmbeddingModelUseCase.execute(
      new UpdateEmbeddingModelCommand({
        id,
        name: updateEmbeddingModelDto.name,
        provider: updateEmbeddingModelDto.provider,
        displayName: updateEmbeddingModelDto.displayName,
        isArchived: updateEmbeddingModelDto.isArchived,
        dimensions: updateEmbeddingModelDto.dimensions,
      }),
    );
  }

  @Delete('models/:id')
  async deleteModel(@Param('id') id: UUID) {
    await this.deleteModelUseCase.execute(new DeleteModelCommand(id));
    return { message: 'Model deleted successfully' };
  }
}
