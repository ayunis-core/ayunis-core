import { ApiProperty } from '@nestjs/swagger';

export class OrgMfaRequirementResponseDto {
  @ApiProperty({
    description:
      'Whether two-factor authentication is required for all users of the ' +
      'org. Enforced at each user’s next login.',
    example: false,
  })
  required: boolean;
}
