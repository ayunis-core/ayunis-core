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
import { RemoveAdventCalendarDoorImageCommand } from './remove-advent-calendar-door-image.command';

/** Removes the image of a door and keeps its other content; a video stays. */
@Injectable()
export class RemoveAdventCalendarDoorImageUseCase {
  private readonly logger = new Logger(
    RemoveAdventCalendarDoorImageUseCase.name,
  );

  constructor(
    private readonly doors: AdventCalendarDoorsRepository,
    private readonly images: AdventCalendarImageService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAdventCalendarError)
  async execute(
    command: RemoveAdventCalendarDoorImageCommand,
  ): Promise<AdventCalendarDoor> {
    const { day } = command;
    this.logger.log({ day }, 'Removing advent calendar door image');
    const { door, unused } = await this.detach(day);
    await this.images.delete(unused);
    return door;
  }

  @Transactional()
  private async detach(
    day: number,
  ): Promise<{ door: AdventCalendarDoor; unused: AdventCalendarImage | null }> {
    const current = await this.doors.findByDayForUpdate(day);
    if (!current) throw new AdventCalendarDoorNotFoundError(day);
    if (!current.image) return { door: current, unused: null };
    const door = await this.doors.save(
      new AdventCalendarDoor({ ...current, media: null }),
    );
    return { door, unused: replacedImage(current, door) };
  }
}
