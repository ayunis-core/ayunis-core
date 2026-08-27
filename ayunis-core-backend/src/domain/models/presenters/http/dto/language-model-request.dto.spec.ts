import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { CreateLanguageModelRequestDto } from './create-language-model-request.dto';
import { UpdateLanguageModelRequestDto } from './update-language-model-request.dto';

const validInput = {
  name: 'gpt-4o',
  provider: ModelProvider.AZURE,
  displayName: 'GPT-4o',
  canStream: true,
  canUseTools: true,
  isReasoning: false,
  canVision: true,
  isArchived: false,
};

describe('language model provider fault request validation', () => {
  it.each([CreateLanguageModelRequestDto, UpdateLanguageModelRequestDto])(
    '%s accepts an omitted provider fault status for backward compatibility',
    async (Dto) => {
      const dto = plainToInstance(Dto, validInput);

      await expect(validate(dto)).resolves.toHaveLength(0);
    },
  );

  it.each([CreateLanguageModelRequestDto, UpdateLanguageModelRequestDto])(
    '%s accepts an explicit boolean provider fault status',
    async (Dto) => {
      const dto = plainToInstance(Dto, {
        ...validInput,
        hasProviderFault: true,
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    },
  );

  it.each([CreateLanguageModelRequestDto, UpdateLanguageModelRequestDto])(
    '%s rejects a non-boolean provider fault status',
    async (Dto) => {
      const dto = plainToInstance(Dto, {
        ...validInput,
        hasProviderFault: 'yes',
      });

      const errors = await validate(dto);

      expect(errors.map(({ property }) => property)).toContain(
        'hasProviderFault',
      );
    },
  );
});
