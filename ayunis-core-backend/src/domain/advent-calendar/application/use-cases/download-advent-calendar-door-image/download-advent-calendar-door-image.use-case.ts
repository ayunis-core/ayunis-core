import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  AdventCalendarDoorImageNotFoundError,
  UnexpectedAdventCalendarError,
} from 'src/domain/advent-calendar/application/advent-calendar.errors';
import { AdventCalendarDoorsRepository } from 'src/domain/advent-calendar/application/ports/advent-calendar-doors.repository';
import {
  AdventCalendarAccessService,
  openableDoorFor,
  seesDoors,
} from 'src/domain/advent-calendar/application/services/advent-calendar-access.service';
import {
  AdventCalendarImageService,
  type AdventCalendarImageDownload,
} from 'src/domain/advent-calendar/application/services/advent-calendar-image.service';
import { DownloadAdventCalendarDoorImageQuery } from './download-advent-calendar-door-image.query';

/** The image of a door the caller may open; 404 for every other door. */
@Injectable()
export class DownloadAdventCalendarDoorImageUseCase {
  private readonly logger = new Logger(
    DownloadAdventCalendarDoorImageUseCase.name,
  );

  constructor(
    private readonly access: AdventCalendarAccessService,
    private readonly doors: AdventCalendarDoorsRepository,
    private readonly images: AdventCalendarImageService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAdventCalendarError)
  async execute(
    query: DownloadAdventCalendarDoorImageQuery,
  ): Promise<AdventCalendarImageDownload> {
    const { day } = query;
    this.logger.log({ day }, 'Downloading advent calendar door image');
    const access = await this.access.resolve();
    const door = seesDoors(access) ? await this.doors.findByDay(day) : null;
    const image = openableDoorFor(access, day, door)?.image;
    if (!image) throw new AdventCalendarDoorImageNotFoundError(day);
    return this.images.download(day, image);
  }
}
