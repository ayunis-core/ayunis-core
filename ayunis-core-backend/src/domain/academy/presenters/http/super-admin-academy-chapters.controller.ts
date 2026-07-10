import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { GetAcademyManagementContentUseCase } from '../../application/use-cases/get-academy-management-content/get-academy-management-content.use-case';
import { GetAcademyManagementContentQuery } from '../../application/use-cases/get-academy-management-content/get-academy-management-content.query';
import { CreateChapterUseCase } from '../../application/use-cases/create-chapter/create-chapter.use-case';
import { CreateChapterCommand } from '../../application/use-cases/create-chapter/create-chapter.command';
import { UpdateChapterUseCase } from '../../application/use-cases/update-chapter/update-chapter.use-case';
import { UpdateChapterCommand } from '../../application/use-cases/update-chapter/update-chapter.command';
import { DeleteChapterUseCase } from '../../application/use-cases/delete-chapter/delete-chapter.use-case';
import { DeleteChapterCommand } from '../../application/use-cases/delete-chapter/delete-chapter.command';
import { ReorderChaptersUseCase } from '../../application/use-cases/reorder-chapters/reorder-chapters.use-case';
import { ReorderChaptersCommand } from '../../application/use-cases/reorder-chapters/reorder-chapters.command';
import { CreateChapterRequestDto } from './dto/create-chapter-request.dto';
import { UpdateChapterRequestDto } from './dto/update-chapter-request.dto';
import { ReorderChaptersRequestDto } from './dto/reorder-chapters-request.dto';
import { AcademyChapterResponseDto } from './dto/academy-chapter-response.dto';
import { SuperAdminAcademyChapterResponseDto } from './dto/super-admin-academy-chapter-response.dto';
import { AcademyResponseDtoMapper } from './mappers/academy-response-dto.mapper';

@ApiTags('Super Admin Academy')
@Controller('super-admin/academy/chapters')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminAcademyChaptersController {
  private readonly logger = new Logger(
    SuperAdminAcademyChaptersController.name,
  );

  constructor(
    private readonly getAcademyManagementContentUseCase: GetAcademyManagementContentUseCase,
    private readonly createChapterUseCase: CreateChapterUseCase,
    private readonly updateChapterUseCase: UpdateChapterUseCase,
    private readonly deleteChapterUseCase: DeleteChapterUseCase,
    private readonly reorderChaptersUseCase: ReorderChaptersUseCase,
    private readonly responseMapper: AcademyResponseDtoMapper,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all academy chapters with their modules',
    description:
      'Retrieve all chapters with nested modules, ordered by position. Only accessible to super admins.',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved academy chapters',
    type: [SuperAdminAcademyChapterResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getChapters(): Promise<SuperAdminAcademyChapterResponseDto[]> {
    this.logger.log('Getting academy chapters');
    const chapters = await this.getAcademyManagementContentUseCase.execute(
      new GetAcademyManagementContentQuery(),
    );
    return this.responseMapper.chapterToSuperAdminDtoArray(chapters);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new academy chapter',
    description:
      'Create a new chapter appended after the last position. Only accessible to super admins.',
  })
  @ApiBody({ type: CreateChapterRequestDto })
  @ApiCreatedResponse({
    description: 'Successfully created chapter',
    type: AcademyChapterResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async createChapter(
    @Body() dto: CreateChapterRequestDto,
  ): Promise<AcademyChapterResponseDto> {
    this.logger.log(`Creating academy chapter: ${dto.title}`);
    const chapter = await this.createChapterUseCase.execute(
      new CreateChapterCommand({
        title: dto.title,
        description: dto.description,
      }),
    );
    return this.responseMapper.chapterToDto(chapter);
  }

  // NOTE: this route must stay declared before the ':id' routes —
  // Nest matches routes in declaration order and 'chapters/:id'
  // would otherwise swallow 'chapters/order'.
  @Put('order')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Reorder academy chapters',
    description:
      'Persist a new chapter order. The submitted ids must be exactly the ids of all existing chapters. Only accessible to super admins.',
  })
  @ApiBody({ type: ReorderChaptersRequestDto })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully reordered chapters',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Submitted ids do not match the current set of chapters',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async reorderChapters(@Body() dto: ReorderChaptersRequestDto): Promise<void> {
    this.logger.log(`Reordering ${dto.chapterIds.length} academy chapters`);
    await this.reorderChaptersUseCase.execute(
      new ReorderChaptersCommand({ chapterIds: dto.chapterIds }),
    );
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update an academy chapter',
    description:
      'Replace title and description of a chapter. Only accessible to super admins.',
  })
  @ApiParam({ name: 'id', description: 'Chapter ID', format: 'uuid' })
  @ApiBody({ type: UpdateChapterRequestDto })
  @ApiOkResponse({
    description: 'Successfully updated chapter',
    type: AcademyChapterResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Chapter not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async updateChapter(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: UpdateChapterRequestDto,
  ): Promise<AcademyChapterResponseDto> {
    this.logger.log(`Updating academy chapter ${id}`);
    const chapter = await this.updateChapterUseCase.execute(
      new UpdateChapterCommand({
        chapterId: id,
        title: dto.title,
        description: dto.description,
        quizEnabled: dto.quizEnabled,
      }),
    );
    return this.responseMapper.chapterToDto(chapter);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an academy chapter',
    description:
      'Delete a chapter and all of its modules. Only accessible to super admins.',
  })
  @ApiParam({ name: 'id', description: 'Chapter ID', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully deleted chapter',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Chapter not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async deleteChapter(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    this.logger.log(`Deleting academy chapter ${id}`);
    await this.deleteChapterUseCase.execute(
      new DeleteChapterCommand({ chapterId: id }),
    );
  }
}
