import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedAdventCalendarError } from 'src/domain/advent-calendar/application/advent-calendar.errors';
import { AdventCalendarDoorsRepository } from 'src/domain/advent-calendar/application/ports/advent-calendar-doors.repository';
import { AdventCalendarImageService } from 'src/domain/advent-calendar/application/services/advent-calendar-image.service';
import { ClearAdventCalendarDoorCommand } from './clear-advent-calendar-door.command';

/** Empties a door: its content and its image go. Clearing an empty door is a no-op. */
@Injectable()
export class ClearAdventCalendarDoorUseCase {
  private readonly logger = new Logger(ClearAdventCalendarDoorUseCase.name);

  constructor(
    private readonly doors: AdventCalendarDoorsRepository,
    private readonly images: AdventCalendarImageService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAdventCalendarError)
  async execute(command: ClearAdventCalendarDoorCommand): Promise<void> {
    this.logger.log({ day: command.day }, 'Clearing advent calendar door');
    const deleted = await this.doors.delete(command.day);
    await this.images.delete(deleted?.image ?? null);
  }
}
