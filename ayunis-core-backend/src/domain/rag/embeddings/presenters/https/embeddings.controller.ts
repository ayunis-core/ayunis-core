import {
  Body,
  Controller,
  Post,
  Logger,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { EmbedTextDto } from './dto/embed-text.dto';
import { EmbeddingResultsDto } from './dto/embedding-result.dto';
import { EmbeddingResultMapper } from './mappers/embedding-result.mapper';
import { EmbedTextCommand } from '../../application/use-cases/embed-text/embed-text.command';
import { EmbedTextUseCase } from '../../application/use-cases/embed-text/embed-text.use-case';

@ApiTags('embeddings')
@Controller('embeddings')
@UsePipes(new ValidationPipe({ transform: true }))
export class EmbeddingsController {
  private readonly logger = new Logger(EmbeddingsController.name);

  constructor(
    private readonly embedTextUseCase: EmbedTextUseCase,
    private readonly embeddingResultMapper: EmbeddingResultMapper,
  ) {}

  @Post('embed')
  @ApiOperation({
    summary: 'Embed text into a vector using the specified provider',
  })
  @ApiBody({ type: EmbedTextDto })
  @ApiResponse({
    status: 201,
    description: 'The text has been successfully embedded',
    type: EmbeddingResultsDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Embeddings provider not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  async embedText(@Body() body: EmbedTextDto): Promise<EmbeddingResultsDto> {
    this.logger.log('Embedding text', { texts: body.texts.length });
    const result = await this.embedTextUseCase.execute(
      new EmbedTextCommand(body.texts),
    );
    return this.embeddingResultMapper.mapToDto(result);
  }
}
