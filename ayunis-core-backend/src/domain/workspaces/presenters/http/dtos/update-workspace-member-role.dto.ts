import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export class UpdateWorkspaceMemberRoleDto {
  @ApiProperty({
    description: 'The role of the member within the workspace',
    enum: UserRole,
    example: UserRole.MANAGER,
  })
  @IsEnum(UserRole)
  role: UserRole;
}
