import type { AdventCalendarImageService } from 'src/domain/advent-calendar/application/services/advent-calendar-image.service';
import {
  aDoor,
  anImage,
  mockDoorsRepository,
  mockImageService,
} from 'src/domain/advent-calendar/application/testing/advent-calendar.fixtures';
import { ClearAdventCalendarDoorCommand } from './clear-advent-calendar-door.command';
import { ClearAdventCalendarDoorUseCase } from './clear-advent-calendar-door.use-case';

describe(ClearAdventCalendarDoorUseCase.name, () => {
  const doors = mockDoorsRepository();
  const images = mockImageService();
  const useCase = new ClearAdventCalendarDoorUseCase(
    doors,
    images as unknown as AdventCalendarImageService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('deletes the image of the cleared door', async () => {
    doors.delete.mockResolvedValueOnce(aDoor({ media: anImage() }));

    await useCase.execute(new ClearAdventCalendarDoorCommand(5));

    expect(images.delete).toHaveBeenCalledWith(anImage());
  });
});
