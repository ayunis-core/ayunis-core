import {
  Body,
  Controller,
  Delete,
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
import { CreateLessonUseCase } from '../../application/use-cases/create-lesson/create-lesson.use-case';
import { CreateLessonCommand } from '../../application/use-cases/create-lesson/create-lesson.command';
import { UpdateLessonUseCase } from '../../application/use-cases/update-lesson/update-lesson.use-case';
import { UpdateLessonCommand } from '../../application/use-cases/update-lesson/update-lesson.command';
import { DeleteLessonUseCase } from '../../application/use-cases/delete-lesson/delete-lesson.use-case';
import { DeleteLessonCommand } from '../../application/use-cases/delete-lesson/delete-lesson.command';
import { ReorderLessonsUseCase } from '../../application/use-cases/reorder-lessons/reorder-lessons.use-case';
import { ReorderLessonsCommand } from '../../application/use-cases/reorder-lessons/reorder-lessons.command';
import { CreateLessonRequestDto } from './dto/create-lesson-request.dto';
import { UpdateLessonRequestDto } from './dto/update-lesson-request.dto';
import { ReorderLessonsRequestDto } from './dto/reorder-lessons-request.dto';
import { AcademyLessonResponseDto } from './dto/academy-lesson-response.dto';
import { AcademyResponseDtoMapper } from './mappers/academy-response-dto.mapper';

@ApiTags('Super Admin Academy')
@Controller('super-admin/academy')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminAcademyLessonsController {
  private readonly logger = new Logger(SuperAdminAcademyLessonsController.name);

  constructor(
    private readonly createLessonUseCase: CreateLessonUseCase,
    private readonly updateLessonUseCase: UpdateLessonUseCase,
    private readonly deleteLessonUseCase: DeleteLessonUseCase,
    private readonly reorderLessonsUseCase: ReorderLessonsUseCase,
    private readonly responseMapper: AcademyResponseDtoMapper,
  ) {}

  @Post('chapters/:chapterId/lessons')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new academy lesson',
    description:
      'Create a lesson in a chapter, appended after the last position. Only accessible to super admins.',
  })
  @ApiParam({ name: 'chapterId', description: 'Chapter ID', format: 'uuid' })
  @ApiBody({ type: CreateLessonRequestDto })
  @ApiCreatedResponse({
    description: 'Successfully created lesson',
    type: AcademyLessonResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Chapter not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async createLesson(
    @Param('chapterId', ParseUUIDPipe) chapterId: UUID,
    @Body() dto: CreateLessonRequestDto,
  ): Promise<AcademyLessonResponseDto> {
    this.logger.log(`Creating academy lesson in chapter ${chapterId}`);
    const lesson = await this.createLessonUseCase.execute(
      new CreateLessonCommand({
        chapterId,
        title: dto.title,
        description: dto.description,
        loomUrl: dto.loomUrl,
      }),
    );
    return this.responseMapper.lessonToDto(lesson);
  }

  @Put('chapters/:chapterId/lessons/order')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Reorder the lessons of a chapter',
    description:
      'Persist a new lesson order within a chapter. The submitted ids must be exactly the ids of all lessons in the chapter. Only accessible to super admins.',
  })
  @ApiParam({ name: 'chapterId', description: 'Chapter ID', format: 'uuid' })
  @ApiBody({ type: ReorderLessonsRequestDto })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully reordered lessons',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Submitted ids do not match the current lessons of the chapter',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Chapter not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async reorderLessons(
    @Param('chapterId', ParseUUIDPipe) chapterId: UUID,
    @Body() dto: ReorderLessonsRequestDto,
  ): Promise<void> {
    this.logger.log(
      `Reordering ${dto.lessonIds.length} lessons of chapter ${chapterId}`,
    );
    await this.reorderLessonsUseCase.execute(
      new ReorderLessonsCommand({ chapterId, lessonIds: dto.lessonIds }),
    );
  }

  @Put('lessons/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update an academy lesson',
    description:
      'Replace title, description, and Loom link of a lesson. Only accessible to super admins.',
  })
  @ApiParam({ name: 'id', description: 'Lesson ID', format: 'uuid' })
  @ApiBody({ type: UpdateLessonRequestDto })
  @ApiOkResponse({
    description: 'Successfully updated lesson',
    type: AcademyLessonResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lesson not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async updateLesson(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: UpdateLessonRequestDto,
  ): Promise<AcademyLessonResponseDto> {
    this.logger.log(`Updating academy lesson ${id}`);
    const lesson = await this.updateLessonUseCase.execute(
      new UpdateLessonCommand({
        lessonId: id,
        title: dto.title,
        description: dto.description,
        loomUrl: dto.loomUrl,
      }),
    );
    return this.responseMapper.lessonToDto(lesson);
  }

  @Delete('lessons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an academy lesson',
    description: 'Delete a lesson. Only accessible to super admins.',
  })
  @ApiParam({ name: 'id', description: 'Lesson ID', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully deleted lesson',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lesson not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async deleteLesson(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    this.logger.log(`Deleting academy lesson ${id}`);
    await this.deleteLessonUseCase.execute(
      new DeleteLessonCommand({ lessonId: id }),
    );
  }
}
