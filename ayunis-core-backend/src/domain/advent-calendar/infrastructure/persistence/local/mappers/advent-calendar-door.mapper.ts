import { AdventCalendarDoor } from 'src/domain/advent-calendar/domain/advent-calendar-door.entity';
import type { AdventCalendarMedia } from 'src/domain/advent-calendar/domain/advent-calendar-media';
import { AdventCalendarMediaType } from 'src/domain/advent-calendar/domain/advent-calendar-media';
import type { AdventCalendarDoorRecord } from 'src/domain/advent-calendar/infrastructure/persistence/local/schema/advent-calendar-door.record';

type MediaColumns = Pick<
  AdventCalendarDoorRecord,
  | 'mediaType'
  | 'mediaStorageKey'
  | 'mediaContentType'
  | 'vimeoVideoId'
  | 'vimeoHash'
>;

const NO_MEDIA: MediaColumns = {
  mediaType: null,
  mediaStorageKey: null,
  mediaContentType: null,
  vimeoVideoId: null,
  vimeoHash: null,
};

function mediaToColumns(media: AdventCalendarMedia | null): MediaColumns {
  if (!media) return NO_MEDIA;
  if (media.type === AdventCalendarMediaType.IMAGE) {
    return {
      ...NO_MEDIA,
      mediaType: media.type,
      mediaStorageKey: media.storageKey,
      mediaContentType: media.contentType,
    };
  }
  return {
    ...NO_MEDIA,
    mediaType: media.type,
    vimeoVideoId: media.videoId,
    vimeoHash: media.hash,
  };
}

function columnsToMedia(record: MediaColumns): AdventCalendarMedia | null {
  if (
    record.mediaType === AdventCalendarMediaType.IMAGE &&
    record.mediaStorageKey &&
    record.mediaContentType
  ) {
    return {
      type: AdventCalendarMediaType.IMAGE,
      storageKey: record.mediaStorageKey,
      contentType: record.mediaContentType,
    };
  }
  if (
    record.mediaType === AdventCalendarMediaType.VIMEO &&
    record.vimeoVideoId
  ) {
    return {
      type: AdventCalendarMediaType.VIMEO,
      videoId: record.vimeoVideoId,
      hash: record.vimeoHash,
    };
  }
  return null;
}

export const AdventCalendarDoorMapper = {
  toDomain(record: AdventCalendarDoorRecord): AdventCalendarDoor {
    return new AdventCalendarDoor({
      day: record.day,
      title: record.title,
      body: record.body,
      media: columnsToMedia(record),
      buttons: record.buttons,
      updatedAt: record.updatedAt,
    });
  },

  toColumns(
    door: AdventCalendarDoor,
  ): Omit<AdventCalendarDoorRecord, 'createdAt' | 'updatedAt'> {
    return {
      day: door.day,
      title: door.title,
      body: door.body,
      ...mediaToColumns(door.media),
      buttons: [...door.buttons],
    };
  },
};
