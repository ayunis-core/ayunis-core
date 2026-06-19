import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsBoolean, IsString } from 'class-validator';

export class UpdateUserOnboardingDto {
  @ApiProperty({
    description: 'IDs of the onboarding steps the user has completed',
    example: ['create-assistant', 'start-chat'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  completedStepIds: string[];

  @ApiProperty({
    description: 'Whether the user has hidden the onboarding checklist',
    example: false,
  })
  @IsBoolean()
  hidden: boolean;
}
