import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import type { UUID } from 'crypto';
import { HandoverResourceType } from 'src/domain/handovers/domain/handover-resource-type.enum';
import { IsOwnerReference } from 'src/common/validators/is-owner-reference.validator';
import { HandoverTargetTypeDto } from './handover-request.dto';

export class HandoverResourceTypeQueryDto {
  @ApiProperty({
    enum: HandoverResourceType,
    enumName: 'HandoverResourceType',
  })
  @IsEnum(HandoverResourceType)
  resourceType: HandoverResourceType;
}

export class PendingHandoverQueryDto extends HandoverResourceTypeQueryDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  @IsUUID()
  resourceId: UUID;
}

export class CreateHandoverRequestDto extends PendingHandoverQueryDto {
  @ApiProperty({ enum: HandoverTargetTypeDto, enumName: 'HandoverTargetType' })
  @IsEnum(HandoverTargetTypeDto)
  targetType: HandoverTargetTypeDto;

  @ApiProperty({ type: 'string', format: 'uuid', required: false })
  @IsOwnerReference(HandoverTargetTypeDto.TEAM, 'targetType')
  targetTeamId?: UUID;
}
