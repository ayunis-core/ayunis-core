import { ApiProperty } from '@nestjs/swagger';
import { ThreadOriginKind } from 'src/domain/threads/domain/thread-origin';
import { OnboardingStage } from 'src/iam/onboarding/domain/value-objects/onboarding-stage.enum';

export class ChatThreadOriginResponseDto {
  @ApiProperty({ enum: [ThreadOriginKind.CHAT] })
  kind: ThreadOriginKind.CHAT;
}

export class RoutineThreadOriginResponseDto {
  @ApiProperty({ enum: [ThreadOriginKind.ROUTINE] })
  kind: ThreadOriginKind.ROUTINE;

  @ApiProperty({
    type: String,
    description:
      'The routine whose run created this thread; null once the routine is deleted',
    format: 'uuid',
    nullable: true,
  })
  routineId: string | null;
}

export class NotificationThreadOriginResponseDto {
  @ApiProperty({ enum: [ThreadOriginKind.NOTIFICATION] })
  kind: ThreadOriginKind.NOTIFICATION;

  @ApiProperty({
    type: String,
    description:
      'The notification this chat was started about; null once the notification is deleted',
    format: 'uuid',
    nullable: true,
  })
  notificationId: string | null;
}

export class ReleaseNoteThreadOriginResponseDto {
  @ApiProperty({ enum: [ThreadOriginKind.RELEASE_NOTE] })
  kind: ThreadOriginKind.RELEASE_NOTE;

  @ApiProperty({
    type: String,
    description:
      'The release note this chat was started about; null once the release note is deleted',
    format: 'uuid',
    nullable: true,
  })
  releaseNoteId: string | null;
}

export class OnboardingThreadOriginResponseDto {
  @ApiProperty({ enum: [ThreadOriginKind.ONBOARDING] })
  kind: ThreadOriginKind.ONBOARDING;

  @ApiProperty({
    description: 'The onboarding stage this chat walks the user through',
    enum: OnboardingStage,
    enumName: 'OnboardingStage',
  })
  stage: OnboardingStage;
}

export type ThreadOriginResponseDto =
  | ChatThreadOriginResponseDto
  | RoutineThreadOriginResponseDto
  | NotificationThreadOriginResponseDto
  | ReleaseNoteThreadOriginResponseDto
  | OnboardingThreadOriginResponseDto;
