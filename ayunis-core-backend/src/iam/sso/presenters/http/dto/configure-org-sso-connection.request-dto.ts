import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  EMAIL_DOMAIN_PATTERN,
  MAX_SSO_EMAIL_DOMAINS,
} from 'src/iam/sso/domain/sso-connection-values';

export class ConfigureOrgSsoConnectionRequestDto {
  @ApiProperty({ type: [String], example: ['stadt.example', 'vhs.example'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_SSO_EMAIL_DOMAINS)
  @ArrayUnique((value: unknown) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString({ each: true })
  @MaxLength(253, { each: true })
  @Matches(new RegExp(EMAIL_DOMAIN_PATTERN, 'i'), { each: true })
  emailDomains: string[];

  @ApiProperty({ example: '385820595704561666', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^\S+$/u)
  zitadelOrgId: string;

  @ApiProperty({
    type: String,
    required: false,
    nullable: true,
    maxLength: 255,
    example: '388145187060187138',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^\S+$/u)
  zitadelIdpId?: string | null;

  @ApiProperty({
    description: 'Confirms every email domain was independently verified',
  })
  @IsBoolean()
  @Equals(true)
  domainVerified: true;
}
