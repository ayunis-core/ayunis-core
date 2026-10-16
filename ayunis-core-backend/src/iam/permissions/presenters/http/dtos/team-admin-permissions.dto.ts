import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsEnum } from 'class-validator';
import { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';

export class TeamAdminPermissionsResponseDto {
  @ApiProperty({
    enum: TeamAdminPermission,
    isArray: true,
    description:
      'What team admins may do inside the teams they administer, org-wide',
  })
  permissions: TeamAdminPermission[];
}

export class UpdateTeamAdminPermissionsDto {
  @ApiProperty({
    enum: TeamAdminPermission,
    isArray: true,
    description: 'Rights granted to team admins. May be empty.',
  })
  @IsArray()
  @IsEnum(TeamAdminPermission, { each: true })
  @ArrayUnique()
  permissions: TeamAdminPermission[];
}
