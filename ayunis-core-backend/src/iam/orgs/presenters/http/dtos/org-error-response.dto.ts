import { ApiProperty } from '@nestjs/swagger';
import { OrgErrorCode } from 'src/iam/orgs/application/orgs.errors';

export class OrgErrorResponseDto {
  @ApiProperty({ enum: OrgErrorCode, enumName: 'OrgErrorCode' })
  code: OrgErrorCode;

  @ApiProperty({
    description: 'Actionable error message, generic for server errors',
  })
  message: string;
}
