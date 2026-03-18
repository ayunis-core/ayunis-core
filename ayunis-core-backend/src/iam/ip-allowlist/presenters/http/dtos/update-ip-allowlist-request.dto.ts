import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateIpAllowlistRequestDto {
  @ApiProperty({
    description: 'List of CIDR ranges to allow (e.g. "192.168.1.0/24")',
    example: ['203.0.113.0/24'],
    type: [String],
  })
  @Transform(({ value }: { value: string[] }) =>
    value.map((s: string) => s.trim()),
  )
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @MaxLength(43, { each: true })
  cidrs: string[];
}
