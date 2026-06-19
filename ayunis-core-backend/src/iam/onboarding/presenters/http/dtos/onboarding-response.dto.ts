import { ApiProperty } from '@nestjs/swagger';

export class OnboardingResponseDto {
  @ApiProperty({
    description: 'IDs of the onboarding steps the user has completed',
    example: ['create-assistant', 'start-chat'],
    type: [String],
  })
  completedStepIds: string[];

  @ApiProperty({
    description: 'Whether the user has hidden the onboarding checklist',
    example: false,
  })
  hidden: boolean;
}
