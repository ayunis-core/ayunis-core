import { ThreadType } from 'src/domain/threads/presenters/http/dto/thread-type.enum';
import type { CreateThreadOriginDto } from 'src/domain/threads/presenters/http/dto/create-thread-origin.dto';
import type { ThreadOriginResponseDto } from 'src/domain/threads/presenters/http/dto/thread-origin-response.dto';
import {
  ThreadOriginKind,
  type ThreadOrigin,
} from 'src/domain/threads/domain/thread-origin';

export function toThreadOriginDto(
  origin: ThreadOrigin,
): ThreadOriginResponseDto {
  switch (origin.kind) {
    case ThreadOriginKind.CHAT:
      return { kind: origin.kind };
    case ThreadOriginKind.ROUTINE:
      return { kind: origin.kind, routineId: origin.routineId };
    case ThreadOriginKind.NOTIFICATION:
      return { kind: origin.kind, notificationId: origin.notificationId };
    case ThreadOriginKind.RELEASE_NOTE:
      return { kind: origin.kind, releaseNoteId: origin.releaseNoteId };
    case ThreadOriginKind.ONBOARDING:
      return { kind: origin.kind, stage: origin.stage };
    case ThreadOriginKind.FEATURE_GUIDE:
      return { kind: origin.kind, feature: origin.feature };
  }
}

/** `type=chat` keeps its meaning: every thread that is not a routine thread. */
export function toIsRoutineFilter(type?: ThreadType): boolean | undefined {
  return type === undefined ? undefined : type === ThreadType.ROUTINE;
}

export function toCreateThreadOrigin(
  origin?: CreateThreadOriginDto,
): ThreadOrigin | undefined {
  if (!origin) return undefined;
  switch (origin.kind) {
    case ThreadOriginKind.NOTIFICATION:
      return { kind: origin.kind, notificationId: origin.notificationId };
    case ThreadOriginKind.RELEASE_NOTE:
      return { kind: origin.kind, releaseNoteId: origin.releaseNoteId };
    case ThreadOriginKind.ONBOARDING:
      return { kind: origin.kind, stage: origin.stage };
    case ThreadOriginKind.FEATURE_GUIDE:
      return { kind: origin.kind, feature: origin.feature };
  }
}
