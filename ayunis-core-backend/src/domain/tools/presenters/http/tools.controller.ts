import {
  Controller,
  Post,
  Body,
  Param,
  Logger,
  ParseUUIDPipe,
  Delete,
} from '@nestjs/common';
import { CreateHttpToolDto } from './dto/create-tool.dto';
import { HttpTool } from '../../domain/tools/http-tool.entity';
import { UUID } from 'crypto';
import { CreateHttpToolCommand } from '../../application/use-cases/create-tool/create-tool.command';
import { ApiBody, ApiResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ToolType } from '../../domain/value-objects/tool-type.enum';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { CreateToolUseCase } from '../../application/use-cases/create-tool/create-tool.use-case';
import { DeleteToolUseCase } from '../../application/use-cases/delete-tool/delete-tool.use-case';
import { DeleteToolCommand } from '../../application/use-cases/delete-tool/delete-tool.command';

@ApiTags('tools')
@Controller('tools')
export class ToolsController {
  private readonly logger = new Logger(ToolsController.name);

  constructor(
    private readonly createToolUseCase: CreateToolUseCase,
    private readonly deleteToolUseCase: DeleteToolUseCase,
  ) {
    this.logger.log('constructor');
  }

  @Post(ToolType.HTTP)
  @ApiOperation({ summary: 'Create a new HTTP tool for current user' })
  @ApiBody({ type: CreateHttpToolDto })
  @ApiResponse({
    status: 201,
    description: 'The HTTP tool has been successfully created.',
    type: HttpTool,
  })
  async createHttpTool(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() createDto: CreateHttpToolDto,
  ): Promise<HttpTool> {
    this.logger.log('createHttpTool', createDto);

    const command = new CreateHttpToolCommand(
      userId,
      createDto.displayName,
      createDto.description,
      createDto.endpointUrl,
      createDto.method,
      createDto.parameters,
    );

    return this.createToolUseCase.execute(command) as Promise<HttpTool>;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tool by ID' })
  @ApiResponse({
    status: 200,
    description: 'The tool has been successfully deleted.',
  })
  deleteTool(
    @Param('id', ParseUUIDPipe) id: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<void> {
    this.logger.log('deleteTool', id);
    return this.deleteToolUseCase.execute(new DeleteToolCommand(id, userId));
  }
}
