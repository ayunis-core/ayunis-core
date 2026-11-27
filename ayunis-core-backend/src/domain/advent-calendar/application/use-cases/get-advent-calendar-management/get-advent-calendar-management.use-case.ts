import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedAdventCalendarError } from 'src/domain/advent-calendar/application/advent-calendar.errors';
import type { AdventCalendarManagement } from 'src/domain/advent-calendar/application/models/advent-calendar-management';
import { AdventCalendarDoorsRepository } from 'src/domain/advent-calendar/application/ports/advent-calendar-doors.repository';
import { GetAdventCalendarEnabledUseCase } from 'src/iam/platform-config/application/use-cases/get-advent-calendar-enabled/get-advent-calendar-enabled.use-case';

/** The switch and every door with its full content, for super admins. */
@Injectable()
export class GetAdventCalendarManagementUseCase {
  private readonly logger = new Logger(GetAdventCalendarManagementUseCase.name);

  constructor(
    private readonly getEnabled: GetAdventCalendarEnabledUseCase,
    private readonly doors: AdventCalendarDoorsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAdventCalendarError)
  async execute(): Promise<AdventCalendarManagement> {
    this.logger.log('Getting the advent calendar for editing');
    const [enabled, doors] = await Promise.all([
      this.getEnabled.execute(),
      this.doors.findAll(),
    ]);
    return { enabled, doors };
  }
}
