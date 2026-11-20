import { Injectable } from '@nestjs/common';
import { NotificationMediaType } from 'src/domain/notifications/domain/notification-media';
import type { UserReleaseNote } from 'src/domain/release-notes/application/models/user-release-note';
import type { ReleaseNoteResponseDto } from 'src/domain/release-notes/presenters/http/dto/release-note-response.dto';

@Injectable()
export class ReleaseNoteDtoMapper {
  toDto({ note, unread }: UserReleaseNote): ReleaseNoteResponseDto {
    const { media } = note;
    return {
      id: note.id,
      headline: note.headline,
      body: note.body,
      media: media && {
        type: media.type,
        url: media.type === NotificationMediaType.LOOM ? media.url : null,
      },
      unread,
      date: note.date,
    };
  }
}
