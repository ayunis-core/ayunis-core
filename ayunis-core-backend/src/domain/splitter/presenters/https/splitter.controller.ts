import { Body, Controller, Get, Post, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SplitterProvider } from '../../domain/splitter-provider.enum';
import { ProcessTextCommand } from '../../application/use-cases/process-text/process-text.command';
import { GetAvailableProvidersQuery } from '../../application/use-cases/get-available-providers/get-available-providers.query';
import { SplitTextDto } from './dto/split-text.dto';
import { SplitResultDto } from './dto/split-result.dto';
import { SplitResultMapper } from './mappers/split-result.mapper';
import { ProcessTextUseCase } from '../../application/use-cases/process-text/process-text.use-case';
import { GetAvailableProvidersUseCase } from '../../application/use-cases/get-available-providers/get-available-providers.use-case';

@ApiTags('splitter')
@Controller('splitter')
export class SplitterController {
  private readonly logger = new Logger(SplitterController.name);

  constructor(
    private readonly processTextUseCase: ProcessTextUseCase,
    private readonly getAvailableProvidersUseCase: GetAvailableProvidersUseCase,
    private readonly splitResultMapper: SplitResultMapper,
  ) {}

  @Get('providers')
  @ApiOperation({ summary: 'Get available text splitter providers' })
  @ApiResponse({
    status: 200,
    description: 'List of available splitter providers',
    schema: {
      type: 'object',
      properties: {
        providers: {
          type: 'array',
          items: {
            type: 'string',
            enum: Object.values(SplitterProvider),
          },
        },
      },
    },
  })
  getAvailableProviders(): { providers: SplitterProvider[] } {
    const providers = this.getAvailableProvidersUseCase.execute(
      new GetAvailableProvidersQuery(),
    );
    this.logger.debug(`Available splitter providers: ${providers.join(', ')}`);
    return { providers };
  }

  @Post('split')
  @ApiOperation({ summary: 'Split text using the specified provider' })
  @ApiBody({ type: SplitTextDto })
  @ApiResponse({
    status: 201,
    description: 'The text has been successfully split into chunks',
    type: SplitResultDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Splitter provider not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  async splitText(@Body() body: SplitTextDto): Promise<SplitResultDto> {
    this.logger.debug(
      `Received split text request using provider: ${body.provider}`,
    );

    const command = new ProcessTextCommand(
      body.text,
      body.provider,
      body.metadata,
    );

    const result = this.processTextUseCase.execute(command);
    return this.splitResultMapper.mapToDto(result);
  }
}
