import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class SetOrgSsoIdpRequestDto {
  @ApiProperty({
    type: String,
    nullable: true,
    example: '387952532174929922',
    description:
      'Broker identity provider ID, or null to show the broker login page',
  })
  @ValidateIf((dto: SetOrgSsoIdpRequestDto) => dto.zitadelIdpId !== null)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^\S+$/u)
  zitadelIdpId: string | null;
}
