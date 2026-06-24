import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ALLOWED_RETENTION_DAYS } from '../../../domain/retention-period';

export class UpdateRetentionPolicyRequestDto {
  @ApiProperty({
    description:
      'Days of inactivity after which conversation data is permanently ' +
      'deleted. Null disables retention (keep data forever). Must be one of ' +
      'the allowed windows.',
    enum: ALLOWED_RETENTION_DAYS,
    nullable: true,
    example: 90,
  })
  // IsIn (with null in the list) both constrains the value to the allowlist
  // and makes the field required — undefined is not a member, so it is
  // rejected with 400. The use case re-validates for non-HTTP callers.
  @IsIn([...ALLOWED_RETENTION_DAYS, null])
  retentionDays: number | null;
}
