import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsBoolean,
  IsDefined,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  EMAIL_DOMAIN_PATTERN,
  MAX_SSO_EMAIL_DOMAINS,
} from 'src/iam/sso/domain/sso-connection-values';

export class SetOrgSsoEnabledRequestDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    required: false,
    description: 'Confirms the broker mapping was reviewed before enablement',
  })
  @ValidateIf((dto: SetOrgSsoEnabledRequestDto) => dto.enabled === true)
  @IsDefined()
  @Equals(true)
  confirmed?: boolean;

  @ApiProperty({
    required: false,
    type: [String],
    example: ['stadt.example', 'vhs.example'],
  })
  @ValidateIf((dto: SetOrgSsoEnabledRequestDto) => dto.enabled === true)
  @IsDefined()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_SSO_EMAIL_DOMAINS)
  @ArrayUnique((value: unknown) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString({ each: true })
  @MaxLength(253, { each: true })
  @Matches(new RegExp(EMAIL_DOMAIN_PATTERN, 'i'), { each: true })
  reviewedEmailDomains?: string[];

  @ApiProperty({ required: false, example: '385820595704561666' })
  @ValidateIf((dto: SetOrgSsoEnabledRequestDto) => dto.enabled === true)
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^\S+$/u)
  reviewedZitadelOrgId?: string;
}
