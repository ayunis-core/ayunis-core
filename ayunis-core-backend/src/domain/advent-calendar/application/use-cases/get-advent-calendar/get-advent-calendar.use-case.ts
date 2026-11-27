import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedAdventCalendarError } from 'src/domain/advent-calendar/application/advent-calendar.errors';
import type { AdventCalendarView } from 'src/domain/advent-calendar/application/models/advent-calendar-view';
import { AdventCalendarDoorsRepository } from 'src/domain/advent-calendar/application/ports/advent-calendar-doors.repository';
import {
  AdventCalendarAccessService,
  buildAdventCalendarView,
  seesDoors,
} from 'src/domain/advent-calendar/application/services/advent-calendar-access.service';

@Injectable()
export class GetAdventCalendarUseCase {
  private readonly logger = new Logger(GetAdventCalendarUseCase.name);

  constructor(
    private readonly access: AdventCalendarAccessService,
    private readonly doors: AdventCalendarDoorsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAdventCalendarError)
  async execute(): Promise<AdventCalendarView> {
    this.logger.log('Getting the advent calendar');
    const access = await this.access.resolve();
    const filled = seesDoors(access) ? await this.doors.findAll() : [];
    return buildAdventCalendarView(access, filled);
  }
}
