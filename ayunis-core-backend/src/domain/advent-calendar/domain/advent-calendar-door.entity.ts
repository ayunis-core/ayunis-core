import type { AdventCalendarButton } from './advent-calendar-button';
import type {
  AdventCalendarImage,
  AdventCalendarMedia,
} from './advent-calendar-media';
import { AdventCalendarMediaType } from './advent-calendar-media';

export interface AdventCalendarDoorParams {
  day: number;
  title: string;
  body: string;
  media: AdventCalendarMedia | null;
  buttons: readonly AdventCalendarButton[];
  updatedAt?: Date;
}

/** The content of one filled door; a door without a row is empty. */
export class AdventCalendarDoor {
  readonly day: number;
  readonly title: string;
  readonly body: string;
  readonly media: AdventCalendarMedia | null;
  readonly buttons: readonly AdventCalendarButton[];
  readonly updatedAt: Date;

  constructor(params: AdventCalendarDoorParams) {
    this.day = params.day;
    this.title = params.title;
    this.body = params.body;
    this.media = params.media;
    this.buttons = params.buttons;
    this.updatedAt = params.updatedAt ?? new Date();
  }

  get image(): AdventCalendarImage | null {
    return this.media?.type === AdventCalendarMediaType.IMAGE
      ? this.media
      : null;
  }
}

/** The stored image `previous` had that `next` no longer uses. */
export function replacedImage(
  previous: AdventCalendarDoor | null,
  next: AdventCalendarDoor | null,
): AdventCalendarImage | null {
  const image = previous?.image ?? null;
  if (!image || next?.image?.storageKey === image.storageKey) return null;
  return image;
}
