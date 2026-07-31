import { ApiProperty } from '@nestjs/swagger';
import { AcademyAccessMode } from '../../../domain/value-objects/academy-access-mode.enum';

export class OrgAcademyAccessSettingsResponseDto {
  @ApiProperty({
    enum: AcademyAccessMode,
    enumName: 'AcademyAccessMode',
    description: 'The certificate requirement configured for the org',
  })
  mode: AcademyAccessMode;
}
