import { Body, Controller, Post } from '@nestjs/common';
import { RetrieveUrlUseCase } from '../../application/use-cases/retrieve-url/retrieve-url.use-case';
import { RetrieveUrlCommand } from '../../application/use-cases/retrieve-url/retrieve-url.command';
import { RetrieveUrlDto } from './dto/retrieve-url.dto';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';

@ApiTags('retrievers')
@Controller('retrievers/url')
export class UrlRetrieverController {
  constructor(private readonly retrieveUrlUseCase: RetrieveUrlUseCase) {}

  @Post()
  @ApiOperation({ summary: 'Retrieve content from a URL' })
  @ApiBody({ type: RetrieveUrlDto })
  @ApiResponse({
    status: 200,
    description: 'The content has been successfully retrieved',
  })
  async retrieveUrl(@Body() retrieveUrlDto: RetrieveUrlDto) {
    return this.retrieveUrlUseCase.execute(
      new RetrieveUrlCommand(retrieveUrlDto.url),
    );
  }
}
