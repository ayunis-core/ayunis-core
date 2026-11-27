import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  AdventCalendarDoorNotFoundError,
  UnexpectedAdventCalendarError,
} from 'src/domain/advent-calendar/application/advent-calendar.errors';
import { AdventCalendarDoorsRepository } from 'src/domain/advent-calendar/application/ports/advent-calendar-doors.repository';
import { AdventCalendarImageService } from 'src/domain/advent-calendar/application/services/advent-calendar-image.service';
import {
  AdventCalendarDoor,
  replacedImage,
} from 'src/domain/advent-calendar/domain/advent-calendar-door.entity';
import type { AdventCalendarImage } from 'src/domain/advent-calendar/domain/advent-calendar-media';
import { UploadAdventCalendarDoorImageCommand } from './upload-advent-calendar-door-image.command';

/**
 * Sets the image of a door that has content, replacing its image or video.
 * The upload happens before the transaction, so no database connection is
 * held across it.
 */
@Injectable()
export class UploadAdventCalendarDoorImageUseCase {
  private readonly logger = new Logger(
    UploadAdventCalendarDoorImageUseCase.name,
  );

  constructor(
    private readonly doors: AdventCalendarDoorsRepository,
    private readonly images: AdventCalendarImageService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAdventCalendarError)
  async execute(
    command: UploadAdventCalendarDoorImageCommand,
  ): Promise<AdventCalendarDoor> {
    const { day } = command;
    this.logger.log({ day }, 'Uploading advent calendar door image');
    const image = await this.images.store(day, command.data);
    const result = await this.attach(day, image).catch(async (error) => {
      await this.images.delete(image);
      throw error;
    });
    if (!result) {
      await this.images.delete(image);
      throw new AdventCalendarDoorNotFoundError(day);
    }
    await this.images.delete(result.unused);
    return result.door;
  }

  @Transactional()
  private async attach(
    day: number,
    image: AdventCalendarImage,
  ): Promise<{
    door: AdventCalendarDoor;
    unused: AdventCalendarImage | null;
  } | null> {
    const current = await this.doors.findByDayForUpdate(day);
    if (!current) return null;
    const door = await this.doors.save(
      new AdventCalendarDoor({ ...current, media: image }),
    );
    return { door, unused: replacedImage(current, door) };
  }
}
