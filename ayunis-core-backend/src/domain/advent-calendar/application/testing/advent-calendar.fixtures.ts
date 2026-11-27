import type { AdventCalendarDoorsRepository } from 'src/domain/advent-calendar/application/ports/advent-calendar-doors.repository';
import type { AdventCalendarImageService } from 'src/domain/advent-calendar/application/services/advent-calendar-image.service';
import { AdventCalendarButtonKind } from 'src/domain/advent-calendar/domain/advent-calendar-button';
import type { AdventCalendarQuizButton } from 'src/domain/advent-calendar/domain/advent-calendar-button';
import {
  AdventCalendarDoor,
  type AdventCalendarDoorParams,
} from 'src/domain/advent-calendar/domain/advent-calendar-door.entity';
import type {
  AdventCalendarImage,
  AdventCalendarVimeoVideo,
} from 'src/domain/advent-calendar/domain/advent-calendar-media';
import { AdventCalendarMediaType } from 'src/domain/advent-calendar/domain/advent-calendar-media';

export const A_QUIZ: AdventCalendarQuizButton = {
  kind: AdventCalendarButtonKind.QUIZ,
  label: 'Quiz',
  question: 'Which model answers in German?',
  answers: ['All of them', 'None'],
  correctAnswerIndex: 0,
  explanation: 'Every model speaks German.',
};

export function anImage(name = 'old'): AdventCalendarImage {
  return {
    type: AdventCalendarMediaType.IMAGE,
    storageKey: `advent-calendar/5/${name}.png`,
    contentType: 'image/png',
  };
}

export const A_VIDEO: AdventCalendarVimeoVideo = {
  type: AdventCalendarMediaType.VIMEO,
  videoId: '76979871',
  hash: null,
};

export function aDoor(
  params: Partial<AdventCalendarDoorParams> = {},
): AdventCalendarDoor {
  return new AdventCalendarDoor({
    day: 5,
    title: 'Skills',
    body: 'Try a **skill**.',
    media: null,
    buttons: [A_QUIZ],
    ...params,
  });
}

export function mockDoorsRepository(): jest.Mocked<AdventCalendarDoorsRepository> {
  return {
    findAll: jest.fn().mockResolvedValue([]),
    findByDay: jest.fn().mockResolvedValue(null),
    findByDayForUpdate: jest.fn().mockResolvedValue(null),
    save: jest.fn((door: AdventCalendarDoor) => Promise.resolve(door)),
    delete: jest.fn().mockResolvedValue(null),
  };
}

export function mockImageService(): jest.Mocked<
  Pick<AdventCalendarImageService, 'store' | 'download' | 'delete'>
> {
  return {
    store: jest.fn().mockResolvedValue(anImage('new')),
    download: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}
