import {
  Controller,
  Get,
  Logger,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { DownloadAdventCalendarDoorImageQuery } from 'src/domain/advent-calendar/application/use-cases/download-advent-calendar-door-image/download-advent-calendar-door-image.query';
import { DownloadAdventCalendarDoorImageUseCase } from 'src/domain/advent-calendar/application/use-cases/download-advent-calendar-door-image/download-advent-calendar-door-image.use-case';
import { GetAdventCalendarUseCase } from 'src/domain/advent-calendar/application/use-cases/get-advent-calendar/get-advent-calendar.use-case';
import { streamAdventCalendarImage } from './advent-calendar-image-response';
import { AdventCalendarDayParamsDto } from './dto/advent-calendar-day-params.dto';
import { AdventCalendarResponseDto } from './dto/advent-calendar-response.dto';
import { AdventCalendarDtoMapper } from './mappers/advent-calendar-dto.mapper';

/** The advent calendar every signed-in user opens doors of. */
@ApiTags('advent-calendar')
@Controller('advent-calendar')
export class AdventCalendarController {
  private readonly logger = new Logger(AdventCalendarController.name);

  constructor(
    private readonly getAdventCalendarUseCase: GetAdventCalendarUseCase,
    private readonly downloadDoorImageUseCase: DownloadAdventCalendarDoorImageUseCase,
    private readonly mapper: AdventCalendarDtoMapper,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get the advent calendar with the doors the caller may open',
  })
  @ApiResponse({ status: 200, type: AdventCalendarResponseDto })
  async getCalendar(): Promise<AdventCalendarResponseDto> {
    this.logger.log('getCalendar');
    return this.mapper.toCalendarDto(
      await this.getAdventCalendarUseCase.execute(),
    );
  }

  @Get('doors/:day/image')
  @ApiOperation({ summary: 'Download the image of a door the caller may open' })
  @ApiResponse({ status: 200, description: 'Image streamed successfully' })
  @ApiResponse({
    status: 404,
    description: 'The door is not openable for the caller or has no image',
  })
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
}
