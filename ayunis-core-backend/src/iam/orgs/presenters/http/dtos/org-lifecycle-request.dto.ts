import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';
export class SetOrgArchivedRequestDto {
  @ApiProperty({
    description: 'Archive the organisation, or restore it when false',
  })
  @IsBoolean()
  archived: boolean;
}
export class DeleteOrgRequestDto {
  @ApiProperty({
    description: 'Exact organisation name confirming irreversible deletion',
  })
  @IsString()
  @IsNotEmpty()
  confirmationName: string;
}
