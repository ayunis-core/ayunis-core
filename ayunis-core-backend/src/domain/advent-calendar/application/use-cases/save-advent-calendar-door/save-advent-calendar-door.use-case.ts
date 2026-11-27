import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  AdventCalendarVideoInvalidError,
  UnexpectedAdventCalendarError,
} from 'src/domain/advent-calendar/application/advent-calendar.errors';
import { AdventCalendarDoorsRepository } from 'src/domain/advent-calendar/application/ports/advent-calendar-doors.repository';
import { AdventCalendarImageService } from 'src/domain/advent-calendar/application/services/advent-calendar-image.service';
import {
  AdventCalendarDoor,
  replacedImage,
} from 'src/domain/advent-calendar/domain/advent-calendar-door.entity';
import type { AdventCalendarMedia } from 'src/domain/advent-calendar/domain/advent-calendar-media';
import { parseVimeoUrl } from 'src/domain/advent-calendar/domain/advent-calendar-media';
import type { AdventCalendarImage } from 'src/domain/advent-calendar/domain/advent-calendar-media';
import { SaveAdventCalendarDoorCommand } from './save-advent-calendar-door.command';

/** Creates or replaces the content of a door. */
@Injectable()
export class SaveAdventCalendarDoorUseCase {
  private readonly logger = new Logger(SaveAdventCalendarDoorUseCase.name);

  constructor(
    private readonly doors: AdventCalendarDoorsRepository,
    private readonly images: AdventCalendarImageService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAdventCalendarError)
  async execute(
    command: SaveAdventCalendarDoorCommand,
  ): Promise<AdventCalendarDoor> {
    this.logger.log({ day: command.day }, 'Saving advent calendar door');
    const video =
      command.vimeoUrl === null ? null : parseVimeoUrl(command.vimeoUrl);
    if (command.vimeoUrl !== null && !video) {
      throw new AdventCalendarVideoInvalidError();
    }
    const { door, unused } = await this.save(command, video);
    await this.images.delete(unused);
    return door;
  }

  @Transactional()
  private async save(
    command: SaveAdventCalendarDoorCommand,
    video: AdventCalendarMedia | null,
  ): Promise<{ door: AdventCalendarDoor; unused: AdventCalendarImage | null }> {
    const current = await this.doors.findByDayForUpdate(command.day);
    const door = await this.doors.save(
      new AdventCalendarDoor({
        day: command.day,
        title: command.title,
        body: command.body,
        media: video ?? current?.image ?? null,
        buttons: command.buttons,
      }),
    );
    return { door, unused: replacedImage(current, door) };
  }
}
