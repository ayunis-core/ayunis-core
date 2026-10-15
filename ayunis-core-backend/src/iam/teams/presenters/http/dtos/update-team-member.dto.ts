import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateTeamMemberDto {
  @ApiProperty({
    description: 'Whether the member is a team admin of this team',
    example: true,
  })
  @IsBoolean()
  isTeamAdmin: boolean;
}
