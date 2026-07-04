import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateOrgMfaRequirementRequestDto {
  @ApiProperty({
    description:
      'Whether two-factor authentication is required for all users of the ' +
      'org. Takes effect at each user’s next login.',
    example: true,
  })
  @IsBoolean()
  required: boolean;
}
