import { BadRequestException } from '@nestjs/common';
import { ThreadType } from 'src/domain/threads/presenters/http/dto/thread-type.enum';
import type { ThreadMetadataResponseDto } from 'src/domain/threads/presenters/http/dto/thread-metadata-response.dto';
import type { CreateThreadDto } from 'src/domain/threads/presenters/http/dto/create-thread.dto';
import {
  ThreadOriginKind,
  type ThreadOrigin,
} from 'src/domain/threads/domain/thread-origin';

type ThreadOriginFields = Pick<
  ThreadMetadataResponseDto,
  'type' | 'routineId' | 'sourceNotificationId' | 'sourceReleaseNoteId'
>;

/** The flat response fields that describe a thread's origin. */
export function toThreadOriginFields(origin: ThreadOrigin): ThreadOriginFields {
  return {
    type:
      origin.kind === ThreadOriginKind.ROUTINE
        ? ThreadType.ROUTINE
        : ThreadType.CHAT,
    routineId:
      origin.kind === ThreadOriginKind.ROUTINE ? origin.routineId : null,
    sourceNotificationId:
      origin.kind === ThreadOriginKind.NOTIFICATION
        ? origin.notificationId
        : null,
    sourceReleaseNoteId:
      origin.kind === ThreadOriginKind.RELEASE_NOTE
        ? origin.releaseNoteId
        : null,
  };
}

/** `type=chat` keeps its meaning: every thread that is not a routine thread. */
export function toIsRoutineFilter(type?: ThreadType): boolean | undefined {
  return type === undefined ? undefined : type === ThreadType.ROUTINE;
}

export function toCreateThreadOrigin(
  dto: CreateThreadDto,
): ThreadOrigin | undefined {
  if (dto.sourceNotificationId && dto.sourceReleaseNoteId) {
    throw new BadRequestException(
      'A chat can be about a notification or a release note, not both',
    );
  }
  if (dto.sourceNotificationId) {
    return {
      kind: ThreadOriginKind.NOTIFICATION,
      notificationId: dto.sourceNotificationId,
    };
  }
  if (dto.sourceReleaseNoteId) {
    return {
      kind: ThreadOriginKind.RELEASE_NOTE,
      releaseNoteId: dto.sourceReleaseNoteId,
    };
  }
  return undefined;
}
