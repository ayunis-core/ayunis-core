import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class PageMarginsDto {
  @ApiProperty({ description: 'Top margin in mm', example: 55 })
  @IsNumber()
  @Min(0)
  top: number;

  @ApiProperty({ description: 'Bottom margin in mm', example: 20 })
  @IsNumber()
  @Min(0)
  bottom: number;

  @ApiProperty({ description: 'Left margin in mm', example: 25 })
  @IsNumber()
  @Min(0)
  left: number;

  @ApiProperty({ description: 'Right margin in mm', example: 15 })
  @IsNumber()
  @Min(0)
  right: number;
}
