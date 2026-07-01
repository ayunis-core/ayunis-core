import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import type { UUID } from 'crypto';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAddon } from 'src/iam/authorization/application/decorators/addon.decorator';
import { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { GetChapterQuizUseCase } from '../../application/use-cases/get-chapter-quiz/get-chapter-quiz.use-case';
import { GetChapterQuizQuery } from '../../application/use-cases/get-chapter-quiz/get-chapter-quiz.query';
import { SubmitChapterQuizUseCase } from '../../application/use-cases/submit-chapter-quiz/submit-chapter-quiz.use-case';
import { SubmitChapterQuizCommand } from '../../application/use-cases/submit-chapter-quiz/submit-chapter-quiz.command';
import { GetAcademyProgressUseCase } from '../../application/use-cases/get-academy-progress/get-academy-progress.use-case';
import { GetAcademyProgressQuery } from '../../application/use-cases/get-academy-progress/get-academy-progress.query';
import { QuizQuestionForTakingResponseDto } from './dto/quiz-question-for-taking-response.dto';
import { SubmitQuizRequestDto } from './dto/submit-quiz-request.dto';
import { QuizResultResponseDto } from './dto/quiz-result-response.dto';
import { AcademyProgressResponseDto } from './dto/academy-progress-response.dto';
import { AcademyResponseDtoMapper } from './mappers/academy-response-dto.mapper';

@ApiTags('Academy')
@Controller('academy')
@RequireAddon(AddonType.AYUNIS_CORE_ACADEMY)
export class AcademyQuizController {
  private readonly logger = new Logger(AcademyQuizController.name);

  constructor(
    private readonly getChapterQuizUseCase: GetChapterQuizUseCase,
    private readonly submitChapterQuizUseCase: SubmitChapterQuizUseCase,
    private readonly getAcademyProgressUseCase: GetAcademyProgressUseCase,
    private readonly responseMapper: AcademyResponseDtoMapper,
  ) {}

  @Get('chapters/:chapterId/quiz')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a chapter quiz',
    description:
      'Draw up to 10 random questions from the chapter pool (the whole pool if smaller). Correct answers are never included.',
  })
  @ApiParam({ name: 'chapterId', description: 'Chapter ID', format: 'uuid' })
  @ApiOkResponse({ type: [QuizQuestionForTakingResponseDto] })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or academy add-on not active',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getChapterQuiz(
    @Param('chapterId', ParseUUIDPipe) chapterId: UUID,
  ): Promise<QuizQuestionForTakingResponseDto[]> {
    this.logger.log(`Getting quiz for chapter ${chapterId}`);
    const questions = await this.getChapterQuizUseCase.execute(
      new GetChapterQuizQuery({ chapterId }),
    );
    return this.responseMapper.quizForTakingToDtoArray(questions);
  }

  @Post('chapters/:chapterId/quiz/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit a chapter quiz',
    description:
      'Grade a quiz submission against the chapter pass threshold, record progress and, when the whole academy is passed, stamp completion. Unlimited retries.',
  })
  @ApiParam({ name: 'chapterId', description: 'Chapter ID', format: 'uuid' })
  @ApiOkResponse({ type: QuizResultResponseDto })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or academy add-on not active',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async submitChapterQuiz(
    @Param('chapterId', ParseUUIDPipe) chapterId: UUID,
    @Body() dto: SubmitQuizRequestDto,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<QuizResultResponseDto> {
    this.logger.log(`Submitting quiz for chapter ${chapterId}`);
    const result = await this.submitChapterQuizUseCase.execute(
      new SubmitChapterQuizCommand({ userId, chapterId, answers: dto.answers }),
    );
    return this.responseMapper.quizResultToDto(result);
  }

  @Get('progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get academy progress',
    description:
      'Get the current user per-chapter pass state and the whole-academy completion date.',
  })
  @ApiOkResponse({ type: AcademyProgressResponseDto })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or academy add-on not active',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getProgress(
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<AcademyProgressResponseDto> {
    this.logger.log('Getting academy progress');
    const progress = await this.getAcademyProgressUseCase.execute(
      new GetAcademyProgressQuery({ userId }),
    );
    return this.responseMapper.progressToDto(progress);
  }
}
