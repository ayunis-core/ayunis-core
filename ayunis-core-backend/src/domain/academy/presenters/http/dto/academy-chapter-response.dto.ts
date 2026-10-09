import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { CourseModuleResponseDto } from './course-module-response.dto';

export class AcademyChapterResponseDto {
  @ApiProperty({
    type: 'string',
    format: 'uuid',
    description: 'The unique identifier of the chapter',
  })
  id: UUID;

  @ApiProperty({
    type: 'string',
    description: 'The title of the chapter',
    example: 'Getting Started',
  })
  title: string;

  @ApiProperty({
    type: 'string',
    description: 'A description of what the chapter covers',
    example: 'Learn the basics of working with Ayunis Core.',
  })
  description: string;

  @ApiProperty({
    type: 'integer',
    description: 'The position of the chapter (0-based)',
    example: 0,
  })
  position: number;

  @ApiProperty({
    type: [CourseModuleResponseDto],
    description: 'The modules of the chapter, ordered by position',
  })
  courseModules: CourseModuleResponseDto[];

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    description: 'The date the chapter was created',
  })
  createdAt: Date;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    description: 'The date the chapter was last updated',
  })
  updatedAt: Date;
}
