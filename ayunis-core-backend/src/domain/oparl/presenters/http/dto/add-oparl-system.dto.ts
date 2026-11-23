import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddOparlSystemDto {
  @ApiProperty({
    description: 'The URL of the OParl System object',
    example: 'https://rim.ekom21.de/aarbergen/webservice/oparl/v1.1/system',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  url: string;
}
