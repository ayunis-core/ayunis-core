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
import { CreateCourseModuleUseCase } from '../../application/use-cases/create-course-module/create-course-module.use-case';
import { CreateCourseModuleCommand } from '../../application/use-cases/create-course-module/create-course-module.command';
import { UpdateCourseModuleUseCase } from '../../application/use-cases/update-course-module/update-course-module.use-case';
import { UpdateCourseModuleCommand } from '../../application/use-cases/update-course-module/update-course-module.command';
import { DeleteCourseModuleUseCase } from '../../application/use-cases/delete-course-module/delete-course-module.use-case';
import { DeleteCourseModuleCommand } from '../../application/use-cases/delete-course-module/delete-course-module.command';
import { ReorderCourseModulesUseCase } from '../../application/use-cases/reorder-course-modules/reorder-course-modules.use-case';
import { ReorderCourseModulesCommand } from '../../application/use-cases/reorder-course-modules/reorder-course-modules.command';
import { CreateCourseModuleRequestDto } from './dto/create-course-module-request.dto';
import { UpdateCourseModuleRequestDto } from './dto/update-course-module-request.dto';
import { ReorderCourseModulesRequestDto } from './dto/reorder-course-modules-request.dto';
import { CourseModuleResponseDto } from './dto/course-module-response.dto';
import { AcademyResponseDtoMapper } from './mappers/academy-response-dto.mapper';

@ApiTags('Super Admin Academy')
@Controller('super-admin/academy')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminAcademyCourseModulesController {
  private readonly logger = new Logger(
    SuperAdminAcademyCourseModulesController.name,
  );

  constructor(
    private readonly createCourseModuleUseCase: CreateCourseModuleUseCase,
    private readonly updateCourseModuleUseCase: UpdateCourseModuleUseCase,
    private readonly deleteCourseModuleUseCase: DeleteCourseModuleUseCase,
    private readonly reorderCourseModulesUseCase: ReorderCourseModulesUseCase,
    private readonly responseMapper: AcademyResponseDtoMapper,
  ) {}

  @Post('chapters/:chapterId/course-modules')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new academy module',
    description:
      'Create a module in a chapter, appended after the last position. Only accessible to super admins.',
  })
  @ApiParam({ name: 'chapterId', description: 'Chapter ID', format: 'uuid' })
  @ApiBody({ type: CreateCourseModuleRequestDto })
  @ApiCreatedResponse({
    description: 'Successfully created module',
    type: CourseModuleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Chapter not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async createCourseModule(
    @Param('chapterId', ParseUUIDPipe) chapterId: UUID,
    @Body() dto: CreateCourseModuleRequestDto,
  ): Promise<CourseModuleResponseDto> {
    this.logger.log(`Creating academy module in chapter ${chapterId}`);
    const courseModule = await this.createCourseModuleUseCase.execute(
      new CreateCourseModuleCommand({
        chapterId,
        title: dto.title,
        description: dto.description,
        loomUrl: dto.loomUrl,
      }),
    );
    return this.responseMapper.courseModuleToDto(courseModule);
  }

  @Put('chapters/:chapterId/course-modules/order')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Reorder the modules of a chapter',
    description:
      'Persist a new module order within a chapter. The submitted ids must be exactly the ids of all modules in the chapter. Only accessible to super admins.',
  })
  @ApiParam({ name: 'chapterId', description: 'Chapter ID', format: 'uuid' })
  @ApiBody({ type: ReorderCourseModulesRequestDto })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully reordered modules',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Submitted ids do not match the current modules of the chapter',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Chapter not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async reorderCourseModules(
    @Param('chapterId', ParseUUIDPipe) chapterId: UUID,
    @Body() dto: ReorderCourseModulesRequestDto,
  ): Promise<void> {
    this.logger.log(
      `Reordering ${dto.courseModuleIds.length} modules of chapter ${chapterId}`,
    );
    await this.reorderCourseModulesUseCase.execute(
      new ReorderCourseModulesCommand({
        chapterId,
        courseModuleIds: dto.courseModuleIds,
      }),
    );
  }

  @Put('course-modules/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update an academy module',
    description:
      'Replace title, description, and Loom link of a module. Only accessible to super admins.',
  })
  @ApiParam({ name: 'id', description: 'Module ID', format: 'uuid' })
  @ApiBody({ type: UpdateCourseModuleRequestDto })
  @ApiOkResponse({
    description: 'Successfully updated module',
    type: CourseModuleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async updateCourseModule(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: UpdateCourseModuleRequestDto,
  ): Promise<CourseModuleResponseDto> {
    this.logger.log(`Updating academy module ${id}`);
    const courseModule = await this.updateCourseModuleUseCase.execute(
      new UpdateCourseModuleCommand({
        courseModuleId: id,
        title: dto.title,
        description: dto.description,
        loomUrl: dto.loomUrl,
      }),
    );
    return this.responseMapper.courseModuleToDto(courseModule);
  }

  @Delete('course-modules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an academy module',
    description: 'Delete a module. Only accessible to super admins.',
  })
  @ApiParam({ name: 'id', description: 'Module ID', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully deleted module',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async deleteCourseModule(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<void> {
    this.logger.log(`Deleting academy module ${id}`);
    await this.deleteCourseModuleUseCase.execute(
      new DeleteCourseModuleCommand({ courseModuleId: id }),
    );
  }
}
