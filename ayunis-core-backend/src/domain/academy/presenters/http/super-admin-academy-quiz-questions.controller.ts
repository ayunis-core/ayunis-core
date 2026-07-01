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
import type { UUID } from 'crypto';
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
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { CreateQuizQuestionUseCase } from '../../application/use-cases/create-quiz-question/create-quiz-question.use-case';
import { CreateQuizQuestionCommand } from '../../application/use-cases/create-quiz-question/create-quiz-question.command';
import { UpdateQuizQuestionUseCase } from '../../application/use-cases/update-quiz-question/update-quiz-question.use-case';
import { UpdateQuizQuestionCommand } from '../../application/use-cases/update-quiz-question/update-quiz-question.command';
import { DeleteQuizQuestionUseCase } from '../../application/use-cases/delete-quiz-question/delete-quiz-question.use-case';
import { DeleteQuizQuestionCommand } from '../../application/use-cases/delete-quiz-question/delete-quiz-question.command';
import { CreateQuizQuestionRequestDto } from './dto/create-quiz-question-request.dto';
import { UpdateQuizQuestionRequestDto } from './dto/update-quiz-question-request.dto';
import { QuizQuestionResponseDto } from './dto/quiz-question-response.dto';
import { AcademyResponseDtoMapper } from './mappers/academy-response-dto.mapper';

@ApiTags('Super Admin Academy')
@Controller('super-admin/academy')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminAcademyQuizQuestionsController {
  private readonly logger = new Logger(
    SuperAdminAcademyQuizQuestionsController.name,
  );

  constructor(
    private readonly createQuizQuestionUseCase: CreateQuizQuestionUseCase,
    private readonly updateQuizQuestionUseCase: UpdateQuizQuestionUseCase,
    private readonly deleteQuizQuestionUseCase: DeleteQuizQuestionUseCase,
    private readonly responseMapper: AcademyResponseDtoMapper,
  ) {}

  @Post('chapters/:chapterId/quiz-questions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new academy quiz question',
    description:
      'Add a question to a chapter quiz pool, appended after the last position. Only accessible to super admins.',
  })
  @ApiParam({ name: 'chapterId', description: 'Chapter ID', format: 'uuid' })
  @ApiBody({ type: CreateQuizQuestionRequestDto })
  @ApiCreatedResponse({
    description: 'Successfully created quiz question',
    type: QuizQuestionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Chapter not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid question (bad option count or no single correct)',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async createQuizQuestion(
    @Param('chapterId', ParseUUIDPipe) chapterId: UUID,
    @Body() dto: CreateQuizQuestionRequestDto,
  ): Promise<QuizQuestionResponseDto> {
    this.logger.log(`Creating academy quiz question in chapter ${chapterId}`);
    const quizQuestion = await this.createQuizQuestionUseCase.execute(
      new CreateQuizQuestionCommand({
        chapterId,
        text: dto.text,
        options: dto.options.map((option) => ({
          text: option.text,
          isCorrect: option.isCorrect,
        })),
      }),
    );
    return this.responseMapper.quizQuestionToDto(quizQuestion);
  }

  @Put('quiz-questions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update an academy quiz question',
    description:
      'Replace the prompt and answer options of a quiz question. Only accessible to super admins.',
  })
  @ApiParam({ name: 'id', description: 'Quiz question ID', format: 'uuid' })
  @ApiBody({ type: UpdateQuizQuestionRequestDto })
  @ApiOkResponse({
    description: 'Successfully updated quiz question',
    type: QuizQuestionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Quiz question not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid question (bad option count or no single correct)',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async updateQuizQuestion(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: UpdateQuizQuestionRequestDto,
  ): Promise<QuizQuestionResponseDto> {
    this.logger.log(`Updating academy quiz question ${id}`);
    const quizQuestion = await this.updateQuizQuestionUseCase.execute(
      new UpdateQuizQuestionCommand({
        quizQuestionId: id,
        text: dto.text,
        options: dto.options.map((option) => ({
          text: option.text,
          isCorrect: option.isCorrect,
        })),
      }),
    );
    return this.responseMapper.quizQuestionToDto(quizQuestion);
  }

  @Delete('quiz-questions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an academy quiz question',
    description: 'Delete a quiz question. Only accessible to super admins.',
  })
  @ApiParam({ name: 'id', description: 'Quiz question ID', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully deleted quiz question',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Quiz question not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async deleteQuizQuestion(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<void> {
    this.logger.log(`Deleting academy quiz question ${id}`);
    await this.deleteQuizQuestionUseCase.execute(
      new DeleteQuizQuestionCommand({ quizQuestionId: id }),
    );
  }
}
