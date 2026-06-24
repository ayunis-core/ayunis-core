import { ApiProperty } from '@nestjs/swagger';
import { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';

export class AddonStatusResponseDto {
  @ApiProperty({
    enum: AddonType,
    enumName: 'AddonType',
    description: 'The add-on this status entry refers to',
  })
  type: AddonType;

  @ApiProperty({
    description: 'Whether the add-on is active for the organization',
  })
  active: boolean;
}
