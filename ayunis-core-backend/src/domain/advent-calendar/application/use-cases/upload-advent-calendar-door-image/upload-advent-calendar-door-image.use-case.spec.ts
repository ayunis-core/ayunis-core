jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { AdventCalendarDoorNotFoundError } from 'src/domain/advent-calendar/application/advent-calendar.errors';
import type { AdventCalendarImageService } from 'src/domain/advent-calendar/application/services/advent-calendar-image.service';
import {
  aDoor,
  A_VIDEO,
  anImage,
  mockDoorsRepository,
  mockImageService,
} from 'src/domain/advent-calendar/application/testing/advent-calendar.fixtures';
import { UploadAdventCalendarDoorImageCommand } from './upload-advent-calendar-door-image.command';
import { UploadAdventCalendarDoorImageUseCase } from './upload-advent-calendar-door-image.use-case';

describe(UploadAdventCalendarDoorImageUseCase.name, () => {
  const doors = mockDoorsRepository();
  const images = mockImageService();
  const useCase = new UploadAdventCalendarDoorImageUseCase(
    doors,
    images as unknown as AdventCalendarImageService,
  );
  const command = new UploadAdventCalendarDoorImageCommand(
    5,
    Buffer.from('png'),
  );

  beforeEach(() => jest.clearAllMocks());

  it('replaces the image and deletes the old object', async () => {
    doors.findByDayForUpdate.mockResolvedValueOnce(aDoor({ media: anImage() }));

    const saved = await useCase.execute(command);

    expect(saved.media).toEqual(anImage('new'));
    expect(saved.title).toBe('Skills');
    expect(images.delete).toHaveBeenCalledWith(anImage());
  });

  it('replaces a Vimeo video', async () => {
    doors.findByDayForUpdate.mockResolvedValueOnce(aDoor({ media: A_VIDEO }));

    const saved = await useCase.execute(command);

    expect(saved.media).toEqual(anImage('new'));
    expect(images.delete).toHaveBeenCalledWith(null);
  });

  it('deletes the uploaded object again when the door has no content', async () => {
    await expect(useCase.execute(command)).rejects.toThrow(
      AdventCalendarDoorNotFoundError,
    );
    expect(doors.save).not.toHaveBeenCalled();
    expect(images.delete).toHaveBeenCalledWith(anImage('new'));
  });
});
