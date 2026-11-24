import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';

export class LinkOparlBodiesDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'Bodies of the catalog to link to the organization',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  bodyIds: string[];
}
