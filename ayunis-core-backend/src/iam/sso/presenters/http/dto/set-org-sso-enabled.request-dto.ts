import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { EMAIL_DOMAIN_PATTERN } from 'src/iam/sso/domain/sso-connection-values';

export class SetOrgSsoEnabledRequestDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    required: false,
    description: 'Confirms the broker mapping was reviewed before enablement',
  })
  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;

  @ApiProperty({ required: false, example: 'stadt.example' })
  @ValidateIf((dto: SetOrgSsoEnabledRequestDto) => dto.enabled)
  @IsDefined()
  @IsString()
  @Matches(new RegExp(EMAIL_DOMAIN_PATTERN, 'i'))
  reviewedEmailDomain?: string;

  @ApiProperty({ required: false, example: '385820595704561666' })
  @ValidateIf((dto: SetOrgSsoEnabledRequestDto) => dto.enabled)
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^\S+$/u)
  reviewedZitadelOrgId?: string;
}
