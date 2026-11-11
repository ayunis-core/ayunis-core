import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn } from 'class-validator';
import type { UUID } from 'crypto';
import { IsIdForOwnerType } from 'src/common/validators/is-id-for-owner-type.validator';
import type {
  RecordingListScope,
  RecordingOwner,
  RecordingTransferOwner,
} from 'src/domain/recordings/application/models/recording-owner';

export enum RecordingOwnerType {
  PERSONAL = 'personal',
  WORKSPACE = 'workspace',
  TEAM = 'team',
  ORG = 'org',
}

const LIST_SCOPE_TYPES = [
  RecordingOwnerType.PERSONAL,
  RecordingOwnerType.WORKSPACE,
];
const TRANSFER_OWNER_TYPES = [
  RecordingOwnerType.PERSONAL,
  RecordingOwnerType.TEAM,
  RecordingOwnerType.ORG,
];

export class RecordingListScopeDto {
  @ApiProperty({
    enum: LIST_SCOPE_TYPES,
    description:
      'personal lists the own recordings plus those of the user’s teams and organization',
  })
  @IsIn(LIST_SCOPE_TYPES)
  ownerType: RecordingOwnerType.PERSONAL | RecordingOwnerType.WORKSPACE;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  @IsIdForOwnerType(RecordingOwnerType.WORKSPACE)
  workspaceId?: UUID;
}

export abstract class RecordingOwnerDto {
  @ApiProperty({ enum: RecordingOwnerType })
  @IsEnum(RecordingOwnerType)
  ownerType: RecordingOwnerType;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  @IsIdForOwnerType(RecordingOwnerType.WORKSPACE)
  workspaceId?: UUID;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  @IsIdForOwnerType(RecordingOwnerType.TEAM)
  teamId?: UUID;
}

/** The owners a recording can move between; workspace ones stay put. */
export class RecordingTransferOwnerDto {
  @ApiProperty({ enum: TRANSFER_OWNER_TYPES })
  @IsIn(TRANSFER_OWNER_TYPES)
  ownerType:
    | RecordingOwnerType.PERSONAL
    | RecordingOwnerType.TEAM
    | RecordingOwnerType.ORG;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  @IsIdForOwnerType(RecordingOwnerType.TEAM)
  teamId?: UUID;
}

export function toRecordingListScope(
  dto: RecordingListScopeDto,
): RecordingListScope {
  return dto.ownerType === RecordingOwnerType.WORKSPACE
    ? { type: 'workspace', workspaceId: dto.workspaceId! }
    : { type: 'personal' };
}

export function toRecordingOwner(dto: RecordingOwnerDto): RecordingOwner {
  switch (dto.ownerType) {
    case RecordingOwnerType.WORKSPACE:
      return { type: 'workspace', workspaceId: dto.workspaceId! };
    case RecordingOwnerType.TEAM:
      return { type: 'team', teamId: dto.teamId! };
    case RecordingOwnerType.ORG:
      return { type: 'org' };
    case RecordingOwnerType.PERSONAL:
      return { type: 'personal' };
  }
}

export function toRecordingTransferOwner(
  dto: RecordingTransferOwnerDto,
): RecordingTransferOwner {
  switch (dto.ownerType) {
    case RecordingOwnerType.TEAM:
      return { type: 'team', teamId: dto.teamId! };
    case RecordingOwnerType.ORG:
      return { type: 'org' };
    case RecordingOwnerType.PERSONAL:
      return { type: 'personal' };
  }
}
