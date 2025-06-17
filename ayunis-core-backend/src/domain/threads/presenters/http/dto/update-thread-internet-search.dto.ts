import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateThreadInternetSearchDto {
  @ApiProperty({
    description: 'Whether internet search is enabled for the thread',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  isInternetSearchEnabled: boolean;
}
