import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';
import type { UUID } from 'crypto';
import { ThreadOriginKind } from 'src/domain/threads/domain/thread-origin';

export class NotificationThreadOriginDto {
  @ApiProperty({ enum: [ThreadOriginKind.NOTIFICATION] })
  @IsIn([ThreadOriginKind.NOTIFICATION])
  kind: ThreadOriginKind.NOTIFICATION;

  @ApiProperty({
    description:
      "The user's notification to chat about; its content is given to the model",
    format: 'uuid',
  })
  @IsUUID()
  notificationId: UUID;
}

export class ReleaseNoteThreadOriginDto {
  @ApiProperty({ enum: [ThreadOriginKind.RELEASE_NOTE] })
  @IsIn([ThreadOriginKind.RELEASE_NOTE])
  kind: ThreadOriginKind.RELEASE_NOTE;

  @ApiProperty({
    description:
      'The release note to chat about; its content is given to the model',
    format: 'uuid',
  })
  @IsUUID()
  releaseNoteId: UUID;
}

/**
 * What an origin of any other kind is validated as. The validation pipe lets a
 * plain object without rules through, so without it the origin would be
 * stripped to `{}` instead of rejected.
 */
export class UnsupportedThreadOriginDto {
  @IsIn([ThreadOriginKind.NOTIFICATION, ThreadOriginKind.RELEASE_NOTE])
  kind: unknown;
}

/** The origins a client may set; routine threads are only created by routine runs. */
export type CreateThreadOriginDto =
  NotificationThreadOriginDto | ReleaseNoteThreadOriginDto;
