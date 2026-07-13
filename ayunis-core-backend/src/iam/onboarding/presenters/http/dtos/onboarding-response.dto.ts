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

  @ApiProperty({
    description: 'When the user first dismissed the welcome video',
    example: '2026-08-05T12:00:00.000Z',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  welcomeVideoSeenAt: Date | null;
}
