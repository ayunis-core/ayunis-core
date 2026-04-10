import { Controller, Get, Logger, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { ResolveGeneratedImageUseCase } from '../../application/use-cases/resolve-generated-image/resolve-generated-image.use-case';
import { ResolveGeneratedImageQuery } from '../../application/use-cases/resolve-generated-image/resolve-generated-image.query';
import { GeneratedImageUrlResponseDto } from './dto/generated-image-url-response.dto';

@ApiTags('threads')
@Controller('threads')
export class GeneratedImagesController {
  private readonly logger = new Logger(GeneratedImagesController.name);

  constructor(
    private readonly resolveGeneratedImageUseCase: ResolveGeneratedImageUseCase,
  ) {}

  @Get(':threadId/generated-images/:imageId')
  @ApiOperation({ summary: 'Get presigned URL for a generated image' })
  @ApiParam({ name: 'threadId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'imageId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Presigned URL for the generated image',
    type: GeneratedImageUrlResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Thread or image not found' })
  async resolve(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('threadId', ParseUUIDPipe) threadId: UUID,
    @Param('imageId', ParseUUIDPipe) imageId: UUID,
  ): Promise<GeneratedImageUrlResponseDto> {
    this.logger.log('resolve', { threadId, imageId });

    return this.resolveGeneratedImageUseCase.execute(
      new ResolveGeneratedImageQuery(threadId, imageId, userId),
    );
  }
}
