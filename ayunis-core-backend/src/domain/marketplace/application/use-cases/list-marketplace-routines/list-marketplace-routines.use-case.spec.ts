import {
  aMarketplaceRoutineListEntry,
  createMockMarketplaceClient,
} from 'src/domain/marketplace/application/testing/marketplace.fixtures';
import { ListMarketplaceRoutinesUseCase } from './list-marketplace-routines.use-case';

describe('ListMarketplaceRoutinesUseCase', () => {
  it('lists featured routines before the rest and sorts the rest by name', async () => {
    const marketplaceClient = createMockMarketplaceClient();
    marketplaceClient.listRoutines.mockResolvedValue([
      aMarketplaceRoutineListEntry({ identifier: 'weather', name: 'Wetter' }),
      aMarketplaceRoutineListEntry({
        identifier: 'waste',
        name: 'Änderungen im Abfallkalender',
      }),
      aMarketplaceRoutineListEntry({
        identifier: 'council-agenda',
        name: 'Neue Tagesordnungen',
        featured: true,
      }),
    ]);
    const useCase = new ListMarketplaceRoutinesUseCase(marketplaceClient);

    const routines = await useCase.execute();

    expect(routines.map((routine) => routine.identifier)).toEqual([
      'council-agenda',
      'waste',
      'weather',
    ]);
  });
});
