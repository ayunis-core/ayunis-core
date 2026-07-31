import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AcademyAccessMode } from '../../../domain/value-objects/academy-access-mode.enum';

export class UpsertOrgAcademyAccessSettingsDto {
  @ApiProperty({
    enum: AcademyAccessMode,
    enumName: 'AcademyAccessMode',
    description: 'The certificate requirement to apply to the org',
  })
  @IsEnum(AcademyAccessMode)
  mode: AcademyAccessMode;
}
