import { ApiProperty } from '@nestjs/swagger';
import {
  Equals,
  IsBoolean,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { EMAIL_DOMAIN_PATTERN } from 'src/iam/sso/domain/sso-connection-values';

export class ConfigureOrgSsoConnectionRequestDto {
  @ApiProperty({ example: 'stadt.example' })
  @IsString()
  @Matches(new RegExp(EMAIL_DOMAIN_PATTERN, 'i'))
  emailDomain: string;

  @ApiProperty({ example: '385820595704561666', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^\S+$/u)
  zitadelOrgId: string;

  @ApiProperty({
    description: 'Confirms the email domain was independently verified',
  })
  @IsBoolean()
  @Equals(true)
  domainVerified: true;
}
