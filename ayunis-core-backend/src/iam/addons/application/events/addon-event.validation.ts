import type { UUID } from 'crypto';
import { IsEnum, IsUUID, ValidateIf, validateSync } from 'class-validator';
import { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';

class AddonEventShape {
  @IsUUID() orgId!: UUID;
  @IsEnum(AddonType) addonType!: AddonType;
  @ValidateIf((event: AddonEventShape) => event.actorUserId !== null)
  @IsUUID()
  actorUserId!: UUID | null;
}

export function readAddonEvent(
  value: unknown,
): { orgId: UUID; addonType: AddonType; actorUserId: UUID | null } | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return null;
  const event = Object.assign(new AddonEventShape(), value);
  return validateSync(event).length === 0 ? event : null;
}
