import { BaseUseCase } from './base-use-case';

class ExampleUseCase extends BaseUseCase {}

describe('BaseUseCase', () => {
  it('uses the subclass name as the logger context', () => {
    const useCase = new ExampleUseCase();

    expect((useCase as any).logger.context).toBe(ExampleUseCase.name);
  });
});
