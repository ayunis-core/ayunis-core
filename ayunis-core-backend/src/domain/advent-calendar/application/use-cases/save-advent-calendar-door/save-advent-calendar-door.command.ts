import type { AdventCalendarButton } from 'src/domain/advent-calendar/domain/advent-calendar-button';

export class SaveAdventCalendarDoorCommand {
  readonly day: number;
  readonly title: string;
  readonly body: string;
  /** A Vimeo URL replaces any image; null keeps the image, if there is one. */
  readonly vimeoUrl: string | null;
  readonly buttons: readonly AdventCalendarButton[];

  constructor(params: {
    day: number;
    title: string;
    body: string;
    vimeoUrl: string | null;
    buttons: readonly AdventCalendarButton[];
  }) {
    this.day = params.day;
    this.title = params.title;
    this.body = params.body;
    this.vimeoUrl = params.vimeoUrl;
    this.buttons = params.buttons;
  }
}
