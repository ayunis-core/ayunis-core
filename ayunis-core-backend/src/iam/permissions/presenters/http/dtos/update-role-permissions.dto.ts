import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsEnum } from 'class-validator';
import { Permission } from '../../../domain/value-objects/permission.enum';

export class UpdateRolePermissionsDto {
  @ApiProperty({
    enum: Permission,
    isArray: true,
    description:
      'Permissions granted to the role. Must contain at least one permission.',
  })
  @IsEnum(Permission, { each: true })
  @ArrayUnique()
  @ArrayMinSize(1, { message: 'A role must have at least one permission' })
  permissions: Permission[];
}
