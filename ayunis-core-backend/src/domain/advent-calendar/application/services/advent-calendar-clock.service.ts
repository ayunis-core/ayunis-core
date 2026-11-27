import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * The time the doors open by. With `ADVENT_CALENDAR_NOW` set (e2e tests only)
 * the clock starts at that instant when the backend boots and runs on from
 * there, so countdowns still reach zero.
 */
@Injectable()
export class AdventCalendarClock {
  private readonly offsetMs: number;

  constructor(configService: ConfigService) {
    const override = configService.get<string | null>('adventCalendar.now');
    this.offsetMs = override ? Date.parse(override) - Date.now() : 0;
  }

  now(): Date {
    return new Date(Date.now() + this.offsetMs);
  }
}
