jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import type { AdventCalendarImageService } from 'src/domain/advent-calendar/application/services/advent-calendar-image.service';
import {
  aDoor,
  anImage,
  mockDoorsRepository,
  mockImageService,
} from 'src/domain/advent-calendar/application/testing/advent-calendar.fixtures';
import { RemoveAdventCalendarDoorImageCommand } from './remove-advent-calendar-door-image.command';
import { RemoveAdventCalendarDoorImageUseCase } from './remove-advent-calendar-door-image.use-case';

describe(RemoveAdventCalendarDoorImageUseCase.name, () => {
  const doors = mockDoorsRepository();
  const images = mockImageService();
  const useCase = new RemoveAdventCalendarDoorImageUseCase(
    doors,
    images as unknown as AdventCalendarImageService,
  );

  it('keeps the text and deletes the image object', async () => {
    doors.findByDayForUpdate.mockResolvedValueOnce(aDoor({ media: anImage() }));

    const saved = await useCase.execute(
      new RemoveAdventCalendarDoorImageCommand(5),
    );

    expect(saved.media).toBeNull();
    expect(saved.title).toBe('Skills');
    expect(images.delete).toHaveBeenCalledWith(anImage());
  });
});
