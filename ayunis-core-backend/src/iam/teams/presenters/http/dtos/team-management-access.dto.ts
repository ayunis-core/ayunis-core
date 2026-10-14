import { ApiProperty } from '@nestjs/swagger';
export class TeamManagementAccessDto {
  @ApiProperty({
    description:
      'Whether the current human principal satisfies the organisation usage-privacy restriction; mutation permissions are checked separately',
  })
  canManage: boolean;
}
