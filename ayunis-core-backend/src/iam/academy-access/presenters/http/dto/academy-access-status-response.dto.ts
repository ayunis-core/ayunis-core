import { ApiProperty } from '@nestjs/swagger';
import { AcademyAccessMode } from '../../../domain/value-objects/academy-access-mode.enum';

export class AcademyAccessStatusResponseDto {
  @ApiProperty({
    enum: AcademyAccessMode,
    enumName: 'AcademyAccessMode',
    description: "The certificate requirement configured for the user's org",
  })
  mode: AcademyAccessMode;

  @ApiProperty({
    type: 'boolean',
    description:
      'Whether the gate applies to this user at all. False for unrestricted orgs and for orgs without the academy add-on.',
  })
  required: boolean;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the user may currently use Ayunis Core chat',
  })
  allowed: boolean;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    description:
      'When the user last completed the academy. Null when the gate does not apply — read GET /academy/progress for the completion date in that case.',
  })
  completedAt: Date | null;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    description:
      'When the certificate stops being valid. Only populated when the org requires annual renewal.',
  })
  expiresAt: Date | null;
}
