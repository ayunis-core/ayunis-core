import { ApiProperty } from '@nestjs/swagger';
import { NotificationMediaType } from 'src/domain/notifications/domain/notification-media';

export class ReleaseNoteMediaResponseDto {
  @ApiProperty({
    enum: NotificationMediaType,
    enumName: 'NotificationMediaType',
  })
  type: NotificationMediaType;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'The Loom embed URL of a Loom video; null for an image, which `GET /release-notes/{id}/image` serves',
  })
  url: string | null;
}

export class ReleaseNoteResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  headline: string;

  @ApiProperty({ description: 'Markdown; may contain links' })
  body: string;

  @ApiProperty({ type: ReleaseNoteMediaResponseDto, nullable: true })
  media: ReleaseNoteMediaResponseDto | null;

  @ApiProperty({
    description:
      'Announced after the current user joined and not opened by them yet',
  })
  unread: boolean;

  @ApiProperty({
    format: 'date',
    example: '2026-11-05',
    description: 'The day the release note is dated',
  })
  date: string;
}

export class InstantOpenReleaseNoteResponseDto {
  @ApiProperty({
    type: ReleaseNoteResponseDto,
    nullable: true,
    description:
      'The newest release note Announcable wants opened right away, while the current user has not read it; else null',
  })
  releaseNote: ReleaseNoteResponseDto | null;
}

export class UnreadReleaseNoteCountResponseDto {
  @ApiProperty({ example: 1 })
  count: number;
}
