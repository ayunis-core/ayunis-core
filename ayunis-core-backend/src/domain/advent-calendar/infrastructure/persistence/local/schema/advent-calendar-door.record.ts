import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { AdventCalendarButton } from 'src/domain/advent-calendar/domain/advent-calendar-button';
import { AdventCalendarMediaType } from 'src/domain/advent-calendar/domain/advent-calendar-media';
import {
  ADVENT_CALENDAR_BODY_MAX_LENGTH,
  ADVENT_CALENDAR_TITLE_MAX_LENGTH,
} from 'src/domain/advent-calendar/domain/advent-calendar.constants';

/** One row per filled door; the 24 doors are platform-global. */
@Entity({ name: 'advent_calendar_doors' })
@Check(`"day" BETWEEN 1 AND 24`)
@Check(
  `("mediaType" IS NULL AND "mediaStorageKey" IS NULL AND "mediaContentType" IS NULL AND "vimeoVideoId" IS NULL AND "vimeoHash" IS NULL) OR ("mediaType" = 'image' AND "mediaStorageKey" IS NOT NULL AND "mediaContentType" IS NOT NULL AND "vimeoVideoId" IS NULL AND "vimeoHash" IS NULL) OR ("mediaType" = 'vimeo' AND "mediaStorageKey" IS NULL AND "mediaContentType" IS NULL AND "vimeoVideoId" IS NOT NULL)`,
)
export class AdventCalendarDoorRecord {
  @PrimaryColumn({ type: 'smallint' })
  day: number;

  @Column({ type: 'varchar', length: ADVENT_CALENDAR_TITLE_MAX_LENGTH })
  title: string;

  @Column({ type: 'varchar', length: ADVENT_CALENDAR_BODY_MAX_LENGTH })
  body: string;

  @Column({ type: 'enum', enum: AdventCalendarMediaType, nullable: true })
  mediaType: AdventCalendarMediaType | null;

  /** The storage object of an image. */
  @Column({ type: 'varchar', nullable: true })
  mediaStorageKey: string | null;

  @Column({ type: 'varchar', nullable: true })
  mediaContentType: string | null;

  @Column({ type: 'varchar', nullable: true })
  vimeoVideoId: string | null;

  /** The privacy hash of an unlisted Vimeo video. */
  @Column({ type: 'varchar', nullable: true })
  vimeoHash: string | null;

  @Column({ type: 'jsonb' })
  buttons: AdventCalendarButton[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
