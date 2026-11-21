import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { OnboardingStage } from 'src/iam/onboarding/domain/value-objects/onboarding-stage.enum';

export class OnboardingStageResponseDto {
  @ApiProperty({
    description:
      'The onboarding hint to show the user, or null when none applies (including while memory is disabled)',
    enum: OnboardingStage,
    enumName: 'OnboardingStage',
    nullable: true,
    example: OnboardingStage.PROFILE,
  })
  stage: OnboardingStage | null;

  @ApiProperty({
    description:
      'The permitted model a profile chat should use; null for every other stage',
    type: String,
    format: 'uuid',
    nullable: true,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  modelId: UUID | null;
}
