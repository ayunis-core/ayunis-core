import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Put,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ClearAdventCalendarDoorCommand } from 'src/domain/advent-calendar/application/use-cases/clear-advent-calendar-door/clear-advent-calendar-door.command';
import { ClearAdventCalendarDoorUseCase } from 'src/domain/advent-calendar/application/use-cases/clear-advent-calendar-door/clear-advent-calendar-door.use-case';
import { DownloadAdventCalendarDoorImageQuery } from 'src/domain/advent-calendar/application/use-cases/download-advent-calendar-door-image/download-advent-calendar-door-image.query';
import { DownloadAdventCalendarDoorImageUseCase } from 'src/domain/advent-calendar/application/use-cases/download-advent-calendar-door-image/download-advent-calendar-door-image.use-case';
import { GetAdventCalendarManagementUseCase } from 'src/domain/advent-calendar/application/use-cases/get-advent-calendar-management/get-advent-calendar-management.use-case';
import { RemoveAdventCalendarDoorImageCommand } from 'src/domain/advent-calendar/application/use-cases/remove-advent-calendar-door-image/remove-advent-calendar-door-image.command';
import { RemoveAdventCalendarDoorImageUseCase } from 'src/domain/advent-calendar/application/use-cases/remove-advent-calendar-door-image/remove-advent-calendar-door-image.use-case';
import { SaveAdventCalendarDoorCommand } from 'src/domain/advent-calendar/application/use-cases/save-advent-calendar-door/save-advent-calendar-door.command';
import { SaveAdventCalendarDoorUseCase } from 'src/domain/advent-calendar/application/use-cases/save-advent-calendar-door/save-advent-calendar-door.use-case';
import { UploadAdventCalendarDoorImageCommand } from 'src/domain/advent-calendar/application/use-cases/upload-advent-calendar-door-image/upload-advent-calendar-door-image.command';
import { UploadAdventCalendarDoorImageUseCase } from 'src/domain/advent-calendar/application/use-cases/upload-advent-calendar-door-image/upload-advent-calendar-door-image.use-case';
import { ADVENT_CALENDAR_IMAGE_MAX_BYTES } from 'src/domain/advent-calendar/domain/advent-calendar.constants';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SetAdventCalendarEnabledCommand } from 'src/iam/platform-config/application/use-cases/set-advent-calendar-enabled/set-advent-calendar-enabled.command';
import { SetAdventCalendarEnabledUseCase } from 'src/iam/platform-config/application/use-cases/set-advent-calendar-enabled/set-advent-calendar-enabled.use-case';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { streamAdventCalendarImage } from './advent-calendar-image-response';
import { AdventCalendarDayParamsDto } from './dto/advent-calendar-day-params.dto';
import { AdventCalendarEnabledDto } from './dto/advent-calendar-enabled.dto';
import {
  SuperAdminAdventCalendarDoorResponseDto,
  SuperAdminAdventCalendarResponseDto,
} from './dto/advent-calendar-response.dto';
import { SaveAdventCalendarDoorRequestDto } from './dto/save-advent-calendar-door-request.dto';
import { AdventCalendarDtoMapper } from './mappers/advent-calendar-dto.mapper';

const DoorImageInterceptor = FileInterceptor('file', {
  limits: { fileSize: ADVENT_CALENDAR_IMAGE_MAX_BYTES, files: 1 },
});

@ApiTags('Super Admin Advent Calendar')
@Controller('super-admin/advent-calendar')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminAdventCalendarController {
  private readonly logger = new Logger(SuperAdminAdventCalendarController.name);

  constructor(
    private readonly getManagementUseCase: GetAdventCalendarManagementUseCase,
    private readonly setEnabledUseCase: SetAdventCalendarEnabledUseCase,
    private readonly saveDoorUseCase: SaveAdventCalendarDoorUseCase,
    private readonly uploadDoorImageUseCase: UploadAdventCalendarDoorImageUseCase,
    private readonly removeDoorImageUseCase: RemoveAdventCalendarDoorImageUseCase,
    private readonly downloadDoorImageUseCase: DownloadAdventCalendarDoorImageUseCase,
    private readonly clearDoorUseCase: ClearAdventCalendarDoorUseCase,
    private readonly mapper: AdventCalendarDtoMapper,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get the switch and every door with its content' })
  @ApiResponse({ status: 200, type: SuperAdminAdventCalendarResponseDto })
  async getCalendar(): Promise<SuperAdminAdventCalendarResponseDto> {
    this.logger.log('getCalendar');
    return this.mapper.toManagementDto(
      await this.getManagementUseCase.execute(),
    );
  }

  @Put('enabled')
  @ApiOperation({ summary: 'Switch the advent calendar on or off for users' })
  @ApiResponse({ status: 200, type: AdventCalendarEnabledDto })
  async setEnabled(
    @Body() dto: AdventCalendarEnabledDto,
  ): Promise<AdventCalendarEnabledDto> {
    this.logger.log({ enabled: dto.enabled }, 'setEnabled');
    await this.setEnabledUseCase.execute(
      new SetAdventCalendarEnabledCommand(dto.enabled),
    );
    return { enabled: dto.enabled };
  }

  @Put('doors/:day')
  @ApiOperation({ summary: 'Create or replace the content of a door' })
  @ApiResponse({ status: 200, type: SuperAdminAdventCalendarDoorResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid door content' })
  async saveDoor(
    @Param() { day }: AdventCalendarDayParamsDto,
    @Body() dto: SaveAdventCalendarDoorRequestDto,
  ): Promise<SuperAdminAdventCalendarDoorResponseDto> {
    this.logger.log({ day }, 'saveDoor');
    const door = await this.saveDoorUseCase.execute(
      new SaveAdventCalendarDoorCommand({
        day,
        title: dto.title,
        body: dto.body,
        vimeoUrl: dto.vimeoUrl ?? null,
        buttons: this.mapper.toButtons(dto.buttons),
      }),
    );
    return this.mapper.toDoorDto(door);
  }

  @Put('doors/:day/image')
  @UseInterceptors(DoorImageInterceptor)
  @ApiOperation({
    summary: 'Upload or replace the image of a door that has content',
    description:
      'JPEG, PNG, GIF or WebP up to 10 MB, recognised by its bytes. Replaces a Vimeo video.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 200, type: SuperAdminAdventCalendarDoorResponseDto })
  @ApiResponse({ status: 400, description: 'No file or not a supported image' })
  @ApiResponse({ status: 404, description: 'The door has no content' })
  @ApiResponse({ status: 413, description: 'The image is larger than 10 MB' })
  async uploadDoorImage(
    @Param() { day }: AdventCalendarDayParamsDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<SuperAdminAdventCalendarDoorResponseDto> {
    this.logger.log({ day, size: file?.size }, 'uploadDoorImage');
    if (!file) throw new BadRequestException('An image file is required');
    const door = await this.uploadDoorImageUseCase.execute(
      new UploadAdventCalendarDoorImageCommand(day, file.buffer),
    );
    return this.mapper.toDoorDto(door);
  }

  @Delete('doors/:day/image')
  @ApiOperation({ summary: 'Remove the image of a door, keeping its text' })
  @ApiResponse({ status: 200, type: SuperAdminAdventCalendarDoorResponseDto })
  @ApiResponse({ status: 404, description: 'The door has no content' })
  async removeDoorImage(
    @Param() { day }: AdventCalendarDayParamsDto,
  ): Promise<SuperAdminAdventCalendarDoorResponseDto> {
    this.logger.log({ day }, 'removeDoorImage');
    const door = await this.removeDoorImageUseCase.execute(
      new RemoveAdventCalendarDoorImageCommand(day),
    );
    return this.mapper.toDoorDto(door);
  }

  @Get('doors/:day/image')
  @ApiOperation({ summary: 'Download the image of any door' })
  @ApiResponse({ status: 200, description: 'Image streamed successfully' })
  @ApiResponse({ status: 404, description: 'The door has no image' })
  async downloadDoorImage(
    @Param() { day }: AdventCalendarDayParamsDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.logger.log({ day }, 'downloadDoorImage');
    const download = await this.downloadDoorImageUseCase.execute(
      new DownloadAdventCalendarDoorImageQuery(day),
    );
    return streamAdventCalendarImage(download, res);
  }

  @Delete('doors/:day')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear a door: its content and image are deleted' })
  @ApiResponse({ status: 204, description: 'The door is empty' })
  async clearDoor(@Param() { day }: AdventCalendarDayParamsDto): Promise<void> {
    this.logger.log({ day }, 'clearDoor');
    await this.clearDoorUseCase.execute(
      new ClearAdventCalendarDoorCommand(day),
    );
  }
}
