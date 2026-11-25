import { OparlEntityType } from 'src/domain/oparl/domain/oparl-entity-type.enum';
import type { OparlMirrorRepository } from 'src/domain/oparl/application/ports/oparl-mirror.repository';
import { OparlObjectExtractor } from './oparl-object-extractor.service';
import { OparlPageWriter } from './oparl-page-writer.service';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional: () => () => undefined,
}));

describe('OparlPageWriter', () => {
  it('counts objects without a usable ID as invalid, so the listing is not taken as complete', async () => {
    const mirror = {
      write: jest.fn().mockResolvedValue(1),
      delete: jest.fn().mockResolvedValue(0),
      markListed: jest.fn().mockResolvedValue(undefined),
    };
    const writer = new OparlPageWriter(
      mirror as unknown as OparlMirrorRepository,
      new OparlObjectExtractor(),
    );

    const result = await writer.writePage(
      {
        systemId: '9d0c3c55-4d1e-4f43-9d2b-3c2f6f4b1a10',
        bodyId: '0b8a5a8e-0d8e-4c55-9b47-2b8c3b1f6e10',
      },
      OparlEntityType.PAPER,
      [
        { id: 'https://ris.example.de/oparl/paper/1' },
        { id: '' },
        { name: 'Vorlage ohne ID' },
        'https://ris.example.de/oparl/paper/2',
      ],
      null,
    );

    expect(result.invalid).toBe(3);
  });
});
