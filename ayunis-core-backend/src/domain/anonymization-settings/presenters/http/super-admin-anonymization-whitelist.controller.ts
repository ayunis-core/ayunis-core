import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Logger,
} from '@nestjs/common';
import { UUID } from 'crypto';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { GlobalAnonymizationWhitelistWord } from 'src/domain/anonymization-settings/domain/global-anonymization-whitelist-word.entity';
import { GetGlobalPiiWhitelistUseCase } from 'src/domain/anonymization-settings/application/use-cases/get-global-pii-whitelist/get-global-pii-whitelist.use-case';
import { AddGlobalPiiWhitelistWordsUseCase } from 'src/domain/anonymization-settings/application/use-cases/add-global-pii-whitelist-words/add-global-pii-whitelist-words.use-case';
import { AddGlobalPiiWhitelistWordsCommand } from 'src/domain/anonymization-settings/application/use-cases/add-global-pii-whitelist-words/add-global-pii-whitelist-words.command';
import { DeleteGlobalPiiWhitelistWordUseCase } from 'src/domain/anonymization-settings/application/use-cases/delete-global-pii-whitelist-word/delete-global-pii-whitelist-word.use-case';
import { DeleteGlobalPiiWhitelistWordCommand } from 'src/domain/anonymization-settings/application/use-cases/delete-global-pii-whitelist-word/delete-global-pii-whitelist-word.command';
import { AddGlobalPiiWhitelistWordsRequestDto } from './dtos/add-global-pii-whitelist-words-request.dto';
import { AddGlobalPiiWhitelistWordsResponseDto } from './dtos/add-global-pii-whitelist-words-response.dto';
import { GlobalPiiWhitelistWordDto } from './dtos/global-pii-whitelist-word.dto';

@ApiTags('Super Admin Anonymization Whitelist')
@Controller('super-admin/anonymization-whitelist')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminAnonymizationWhitelistController {
  private readonly logger = new Logger(
    SuperAdminAnonymizationWhitelistController.name,
  );

  constructor(
    private readonly getGlobalPiiWhitelistUseCase: GetGlobalPiiWhitelistUseCase,
    private readonly addGlobalPiiWhitelistWordsUseCase: AddGlobalPiiWhitelistWordsUseCase,
    private readonly deleteGlobalPiiWhitelistWordUseCase: DeleteGlobalPiiWhitelistWordUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all global anonymization whitelist words' })
  @ApiResponse({ status: HttpStatus.OK, type: [GlobalPiiWhitelistWordDto] })
  @ApiUnauthorizedResponse({ description: 'Not authorized as super admin' })
  async list(): Promise<GlobalPiiWhitelistWordDto[]> {
    this.logger.log('list');

    const words = await this.getGlobalPiiWhitelistUseCase.execute();
    return words.map((word) => this.toDto(word));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add words to the global anonymization whitelist',
    description:
      'Words already on the whitelist for the category are skipped and returned as duplicates.',
  })
  @ApiBody({ type: AddGlobalPiiWhitelistWordsRequestDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: AddGlobalPiiWhitelistWordsResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Empty or invalid words' })
  @ApiUnauthorizedResponse({ description: 'Not authorized as super admin' })
  async add(
    @Body() dto: AddGlobalPiiWhitelistWordsRequestDto,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<AddGlobalPiiWhitelistWordsResponseDto> {
    this.logger.log({ category: dto.category, count: dto.words.length }, 'add');

    const { added, duplicates } =
      await this.addGlobalPiiWhitelistWordsUseCase.execute(
        new AddGlobalPiiWhitelistWordsCommand(dto.category, dto.words, userId),
      );
    return { added: added.map((word) => this.toDto(word)), duplicates };
  }

  @Delete(':wordId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a word from the global anonymization whitelist',
  })
  @ApiParam({ name: 'wordId', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Word removed' })
  @ApiNotFoundResponse({ description: 'Word not found' })
  @ApiUnauthorizedResponse({ description: 'Not authorized as super admin' })
  async remove(@Param('wordId') wordId: UUID): Promise<void> {
    this.logger.log({ wordId }, 'remove');

    await this.deleteGlobalPiiWhitelistWordUseCase.execute(
      new DeleteGlobalPiiWhitelistWordCommand(wordId),
    );
  }

  private toDto(
    word: GlobalAnonymizationWhitelistWord,
  ): GlobalPiiWhitelistWordDto {
    return {
      id: word.id,
      category: word.category,
      word: word.word,
      createdByEmail: word.createdByEmail,
      createdAt: word.createdAt,
    };
  }
}
