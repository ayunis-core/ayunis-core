import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UUID } from 'crypto';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
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
import { GlobalAnonymizationWhitelistWord } from '../../domain/global-anonymization-whitelist-word.entity';
import { GetGlobalPiiWhitelistUseCase } from '../../application/use-cases/get-global-pii-whitelist/get-global-pii-whitelist.use-case';
import { AddGlobalPiiWhitelistWordUseCase } from '../../application/use-cases/add-global-pii-whitelist-word/add-global-pii-whitelist-word.use-case';
import { AddGlobalPiiWhitelistWordCommand } from '../../application/use-cases/add-global-pii-whitelist-word/add-global-pii-whitelist-word.command';
import { DeleteGlobalPiiWhitelistWordUseCase } from '../../application/use-cases/delete-global-pii-whitelist-word/delete-global-pii-whitelist-word.use-case';
import { DeleteGlobalPiiWhitelistWordCommand } from '../../application/use-cases/delete-global-pii-whitelist-word/delete-global-pii-whitelist-word.command';
import { AddGlobalPiiWhitelistWordRequestDto } from './dtos/add-global-pii-whitelist-word-request.dto';
import { GlobalPiiWhitelistWordDto } from './dtos/global-pii-whitelist-word.dto';

@ApiTags('Super Admin Anonymization Whitelist')
@Controller('super-admin/anonymization-whitelist')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminAnonymizationWhitelistController {
  constructor(
    @InjectPinoLogger(SuperAdminAnonymizationWhitelistController.name)
    private readonly logger: PinoLogger,
    private readonly getGlobalPiiWhitelistUseCase: GetGlobalPiiWhitelistUseCase,
    private readonly addGlobalPiiWhitelistWordUseCase: AddGlobalPiiWhitelistWordUseCase,
    private readonly deleteGlobalPiiWhitelistWordUseCase: DeleteGlobalPiiWhitelistWordUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all global anonymization whitelist words' })
  @ApiResponse({ status: HttpStatus.OK, type: [GlobalPiiWhitelistWordDto] })
  @ApiUnauthorizedResponse({ description: 'Not authorized as super admin' })
  async list(): Promise<GlobalPiiWhitelistWordDto[]> {
    this.logger.info('list');

    const words = await this.getGlobalPiiWhitelistUseCase.execute();
    return words.map((word) => this.toDto(word));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a word to the global anonymization whitelist' })
  @ApiBody({ type: AddGlobalPiiWhitelistWordRequestDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: GlobalPiiWhitelistWordDto })
  @ApiBadRequestResponse({ description: 'Empty or invalid word' })
  @ApiConflictResponse({
    description: 'Word already on the whitelist for this category',
  })
  @ApiUnauthorizedResponse({ description: 'Not authorized as super admin' })
  async add(
    @Body() dto: AddGlobalPiiWhitelistWordRequestDto,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<GlobalPiiWhitelistWordDto> {
    this.logger.info({ category: dto.category }, 'add');

    const word = await this.addGlobalPiiWhitelistWordUseCase.execute(
      new AddGlobalPiiWhitelistWordCommand(dto.category, dto.word, userId),
    );
    return this.toDto(word);
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
    this.logger.info({ wordId }, 'remove');

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
