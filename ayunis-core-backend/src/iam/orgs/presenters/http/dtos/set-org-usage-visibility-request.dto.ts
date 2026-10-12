import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetOrgUsageVisibilityRequestDto {
  @ApiProperty({
    description: 'Hide individual user usage from organisation admins',
    default: false,
  })
  @IsBoolean()
  hideIndividualUsage: boolean;
}
