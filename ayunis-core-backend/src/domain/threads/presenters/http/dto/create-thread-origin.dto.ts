import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsUUID } from 'class-validator';
import type { UUID } from 'crypto';
import { ThreadOriginKind } from 'src/domain/threads/domain/thread-origin';
import { OnboardingStage } from 'src/iam/onboarding/domain/value-objects/onboarding-stage.enum';
import { GuideFeature } from 'src/domain/threads/domain/guide-feature.enum';

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

export class OnboardingThreadOriginDto {
  @ApiProperty({ enum: [ThreadOriginKind.ONBOARDING] })
  @IsIn([ThreadOriginKind.ONBOARDING])
  kind: ThreadOriginKind.ONBOARDING;

  @ApiProperty({
    description: 'The onboarding stage the chat walks the user through',
    enum: OnboardingStage,
    enumName: 'OnboardingStage',
  })
  @IsEnum(OnboardingStage)
  stage: OnboardingStage;
}

export class FeatureGuideThreadOriginDto {
  @ApiProperty({ enum: [ThreadOriginKind.FEATURE_GUIDE] })
  @IsIn([ThreadOriginKind.FEATURE_GUIDE])
  kind: ThreadOriginKind.FEATURE_GUIDE;

  @ApiProperty({
    description: 'The feature the chat explains to the user',
    enum: GuideFeature,
    enumName: 'GuideFeature',
  })
  @IsEnum(GuideFeature)
  feature: GuideFeature;
}

/**
 * What an origin of any other kind is validated as. The validation pipe lets a
 * plain object without rules through, so without it the origin would be
 * stripped to `{}` instead of rejected.
 */
export class UnsupportedThreadOriginDto {
  @IsIn([
    ThreadOriginKind.NOTIFICATION,
    ThreadOriginKind.RELEASE_NOTE,
    ThreadOriginKind.ONBOARDING,
    ThreadOriginKind.FEATURE_GUIDE,
  ])
  kind: unknown;
}

/** The origins a client may set; routine threads are only created by routine runs. */
export type CreateThreadOriginDto =
  | NotificationThreadOriginDto
  | ReleaseNoteThreadOriginDto
  | OnboardingThreadOriginDto
  | FeatureGuideThreadOriginDto;
