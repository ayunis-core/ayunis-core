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
import { CreateModelUseCase } from 'src/domain/models/application/use-cases/create-model/create-model.use-case';
import { CreateModelCommand } from 'src/domain/models/application/use-cases/create-model/create-model.command';
import { UpdateModelUseCase } from 'src/domain/models/application/use-cases/update-model/update-model.use-case';
import { UpdateModelCommand } from 'src/domain/models/application/use-cases/update-model/update-model.command';
import { DeleteModelUseCase } from 'src/domain/models/application/use-cases/delete-model/delete-model.use-case';
import { DeleteModelCommand } from 'src/domain/models/application/use-cases/delete-model/delete-model.command';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { Public } from 'src/common/guards/public.guard';
import { Admin } from '../../application/decorators/admin.decorator';
import { AdminGuard } from '../../application/guards/admin.guard';
import { UUID } from 'crypto';
import { CreateModelDto } from './dtos/create-model-dto';
import { UpdateModelDto } from './dtos/update-model.dto';

@Controller('admin')
@UseGuards(AdminGuard)
@Public() // Used to bypass the JWT guard
@Admin()
export class AdminController {
  constructor(
    private readonly getModelUseCase: GetModelUseCase,
    private readonly getAllModelsUseCase: GetAllModelsUseCase,
    private readonly createModelUseCase: CreateModelUseCase,
    private readonly updateModelUseCase: UpdateModelUseCase,
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

  @Post('models')
  async createModel(@Body() createModelDto: CreateModelDto) {
    return this.createModelUseCase.execute(
      new CreateModelCommand(
        createModelDto.name,
        createModelDto.provider,
        createModelDto.displayName,
        createModelDto.canStream,
        createModelDto.isReasoning,
        createModelDto.isArchived,
      ),
    );
  }

  @Put('models/:id')
  async updateModel(
    @Param('id') id: UUID,
    @Body() updateModelDto: UpdateModelDto,
  ) {
    return this.updateModelUseCase.execute(
      new UpdateModelCommand(
        id,
        updateModelDto.name,
        updateModelDto.provider,
        updateModelDto.displayName,
        updateModelDto.canStream,
        updateModelDto.isReasoning,
        updateModelDto.isArchived,
      ),
    );
  }

  @Delete('models/:id')
  async deleteModel(@Param('id') id: UUID) {
    await this.deleteModelUseCase.execute(new DeleteModelCommand(id));
    return { message: 'Model deleted successfully' };
  }
}
