jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import type { AdventCalendarImageService } from 'src/domain/advent-calendar/application/services/advent-calendar-image.service';
import {
  aDoor,
  A_VIDEO,
  anImage,
  mockDoorsRepository,
  mockImageService,
} from 'src/domain/advent-calendar/application/testing/advent-calendar.fixtures';
import { SaveAdventCalendarDoorCommand } from './save-advent-calendar-door.command';
import { SaveAdventCalendarDoorUseCase } from './save-advent-calendar-door.use-case';

describe(SaveAdventCalendarDoorUseCase.name, () => {
  const doors = mockDoorsRepository();
  const images = mockImageService();
  const useCase = new SaveAdventCalendarDoorUseCase(
    doors,
    images as unknown as AdventCalendarImageService,
  );
  const command = (vimeoUrl: string | null) =>
    new SaveAdventCalendarDoorCommand({
      day: 5,
      title: 'Prompts',
      body: '',
      vimeoUrl,
      buttons: [],
    });

  beforeEach(() => jest.clearAllMocks());

  it('keeps the uploaded image when the text is saved without a video', async () => {
    doors.findByDayForUpdate.mockResolvedValueOnce(aDoor({ media: anImage() }));

    const saved = await useCase.execute(command(null));

    expect(saved.title).toBe('Prompts');
    expect(saved.media).toEqual(anImage());
    expect(images.delete).toHaveBeenCalledWith(null);
  });

  it('replaces the image with a normalized Vimeo video and deletes the old object', async () => {
    doors.findByDayForUpdate.mockResolvedValueOnce(aDoor({ media: anImage() }));

    const saved = await useCase.execute(
      command('https://player.vimeo.com/video/76979871'),
    );

    expect(saved.media).toEqual(A_VIDEO);
    expect(images.delete).toHaveBeenCalledWith(anImage());
  });

  it('drops a video when the door is saved without one', async () => {
    doors.findByDayForUpdate.mockResolvedValueOnce(aDoor({ media: A_VIDEO }));

    const saved = await useCase.execute(command(null));

    expect(saved.media).toBeNull();
  });
});
