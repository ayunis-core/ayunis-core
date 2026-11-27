import { Injectable } from '@nestjs/common';
import type { AdventCalendarManagement } from 'src/domain/advent-calendar/application/models/advent-calendar-management';
import type { AdventCalendarView } from 'src/domain/advent-calendar/application/models/advent-calendar-view';
import type { AdventCalendarButton } from 'src/domain/advent-calendar/domain/advent-calendar-button';
import { AdventCalendarButtonKind } from 'src/domain/advent-calendar/domain/advent-calendar-button';
import type { AdventCalendarDoor } from 'src/domain/advent-calendar/domain/advent-calendar-door.entity';
import type { AdventCalendarMedia } from 'src/domain/advent-calendar/domain/advent-calendar-media';
import { AdventCalendarMediaType } from 'src/domain/advent-calendar/domain/advent-calendar-media';
import { ADVENT_CALENDAR_DOOR_COUNT } from 'src/domain/advent-calendar/domain/advent-calendar.constants';
import type { AdventCalendarButtonRequestDto } from 'src/domain/advent-calendar/presenters/http/dto/advent-calendar-button.dto';
import type {
  AdventCalendarDoorContentResponseDto,
  AdventCalendarDoorMediaResponseDto,
  AdventCalendarResponseDto,
  SuperAdminAdventCalendarDoorResponseDto,
  SuperAdminAdventCalendarResponseDto,
} from 'src/domain/advent-calendar/presenters/http/dto/advent-calendar-response.dto';

@Injectable()
export class AdventCalendarDtoMapper {
  toCalendarDto(view: AdventCalendarView): AdventCalendarResponseDto {
    return {
      visible: view.visible,
      preview: view.preview,
      now: view.now.toISOString(),
      doors: view.doors.map(({ day, state, door }) => ({
        day,
        state,
        content: door ? this.toContentDto(door) : null,
      })),
    };
  }

  toManagementDto(
    management: AdventCalendarManagement,
  ): SuperAdminAdventCalendarResponseDto {
    const byDay = new Map(management.doors.map((door) => [door.day, door]));
    return {
      enabled: management.enabled,
      doors: Array.from({ length: ADVENT_CALENDAR_DOOR_COUNT }, (_, index) => ({
        day: index + 1,
        content: this.toNullableContentDto(byDay.get(index + 1)),
      })),
    };
  }

  toButtons(
    dtos: readonly AdventCalendarButtonRequestDto[],
  ): AdventCalendarButton[] {
    return dtos.map((dto) => {
      switch (dto.kind) {
        case AdventCalendarButtonKind.LINK:
          return { kind: dto.kind, label: dto.label, url: dto.url };
        case AdventCalendarButtonKind.PROMPT:
          return { kind: dto.kind, label: dto.label, prompt: dto.prompt };
        case AdventCalendarButtonKind.QUIZ:
          return {
            kind: dto.kind,
            label: dto.label,
            question: dto.question,
            answers: [...dto.answers],
            correctAnswerIndex: dto.correctAnswerIndex,
            explanation: dto.explanation ?? null,
          };
      }
    });
  }

  toDoorDto(door: AdventCalendarDoor): SuperAdminAdventCalendarDoorResponseDto {
    return { day: door.day, content: this.toContentDto(door) };
  }

  private toNullableContentDto(
    door: AdventCalendarDoor | undefined,
  ): AdventCalendarDoorContentResponseDto | null {
    return door ? this.toContentDto(door) : null;
  }

  private toContentDto(
    door: AdventCalendarDoor,
  ): AdventCalendarDoorContentResponseDto {
    return {
      title: door.title,
      body: door.body,
      media: this.toMediaDto(door.media),
      buttons: door.buttons.map((button) => this.toButtonDto(button)),
      updatedAt: door.updatedAt.toISOString(),
    };
  }

  private toMediaDto(
    media: AdventCalendarMedia | null,
  ): AdventCalendarDoorMediaResponseDto | null {
    if (!media) return null;
    if (media.type === AdventCalendarMediaType.IMAGE) {
      return { type: media.type, vimeoVideoId: null, vimeoHash: null };
    }
    return {
      type: media.type,
      vimeoVideoId: media.videoId,
      vimeoHash: media.hash,
    };
  }

  private toButtonDto(
    button: AdventCalendarButton,
  ): AdventCalendarButtonRequestDto {
    switch (button.kind) {
      case AdventCalendarButtonKind.LINK:
        return { kind: button.kind, label: button.label, url: button.url };
      case AdventCalendarButtonKind.PROMPT:
        return {
          kind: button.kind,
          label: button.label,
          prompt: button.prompt,
        };
      case AdventCalendarButtonKind.QUIZ:
        return {
          kind: button.kind,
          label: button.label,
          question: button.question,
          answers: [...button.answers],
          correctAnswerIndex: button.correctAnswerIndex,
          explanation: button.explanation,
        };
    }
  }
}
