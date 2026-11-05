import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GenerateAndSetThreadTitleUseCase } from './generate-and-set-thread-title.use-case';
import { UpdateThreadTitleUseCase } from 'src/domain/threads/application/use-cases/update-thread-title/update-thread-title.use-case';
import { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import { GenerateAndSetThreadTitleCommand } from './generate-and-set-thread-title.command';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { InferenceAbortedError } from 'src/domain/models/application/models.errors';

describe('GenerateAndSetThreadTitleUseCase - Markdown Stripping', () => {
  let useCase: GenerateAndSetThreadTitleUseCase;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerateAndSetThreadTitleUseCase,
        {
          provide: UpdateThreadTitleUseCase,
          useValue: {},
        },
        {
          provide: GetInferenceUseCase,
          useValue: {},
        },
      ],
    }).compile();

    useCase = module.get<GenerateAndSetThreadTitleUseCase>(
      GenerateAndSetThreadTitleUseCase,
    );
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('stripMarkdownFormatting', () => {
    it.each([
      {
        name: 'strip bold formatting with **',
        input: '**Turnhalle mieten – Sportverein**',
        expected: 'Turnhalle mieten – Sportverein',
      },
      {
        name: 'strip bold formatting with __',
        input: '__KI-Unterstützung für Verwaltung__',
        expected: 'KI-Unterstützung für Verwaltung',
      },
      {
        name: 'strip italic formatting with *',
        input: '*Important Title*',
        expected: 'Important Title',
      },
      {
        name: 'strip quotes',
        input: '**"Turnhalle mieten – Sportverein"**',
        expected: 'Turnhalle mieten – Sportverein',
      },
      {
        name: 'strip inline code',
        input: '`Code Title` with text',
        expected: 'Code Title with text',
      },
      {
        name: 'strip strikethrough',
        input: '~~Old Title~~ New Title',
        expected: 'Old Title New Title',
      },
      {
        name: 'strip headers',
        input: '## Title Header',
        expected: 'Title Header',
      },
      {
        name: 'strip links and keep text',
        input: '[Title Link](https://example.com)',
        expected: 'Title Link',
      },
      {
        name: 'handle multiple markdown formats',
        input: '**"Important"** *Title* with `code`',
        expected: 'Important Title with code',
      },
      {
        name: 'clean up extra whitespace',
        input: '**Title**   with    extra     spaces',
        expected: 'Title with extra spaces',
      },
      {
        name: 'return empty string for input with only markdown',
        input: '**""**',
        expected: '',
      },
    ])('should $name', ({ input, expected }) => {
      // @ts-expect-error - accessing private method for testing
      expect(useCase.stripMarkdownFormatting(input)).toBe(expected);
    });
  });

  describe('cancellation', () => {
    const updateThreadTitle = { execute: jest.fn() };
    const getInference = {
      execute: jest.fn().mockResolvedValue({
        content: [new TextMessageContent('Haushaltsplan 2026')],
      }),
    };
    const titleUseCase = new GenerateAndSetThreadTitleUseCase(
      updateThreadTitle as unknown as UpdateThreadTitleUseCase,
      getInference as unknown as GetInferenceUseCase,
    );

    function command(signal: AbortSignal): GenerateAndSetThreadTitleCommand {
      return new GenerateAndSetThreadTitleCommand({
        thread: { id: 'thread-id' } as unknown as Thread,
        model: {} as LanguageModel,
        message: 'Fasse den Haushaltsplan zusammen',
        signal,
      });
    }

    it('saves the title while its signal is not aborted', async () => {
      const { signal } = new AbortController();

      const title = await titleUseCase.execute(command(signal));

      expect(title).toBe('Haushaltsplan 2026');
      expect(getInference.execute).toHaveBeenCalledWith(
        expect.objectContaining({ signal }),
      );
      expect(updateThreadTitle.execute).toHaveBeenCalledTimes(1);
    });

    it('does not call the model once its signal is aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      const title = await titleUseCase.execute(command(controller.signal));

      expect(title).toBeNull();
      expect(getInference.execute).not.toHaveBeenCalled();
      expect(updateThreadTitle.execute).not.toHaveBeenCalled();
    });

    it('does not save a title whose signal aborts during the model call', async () => {
      const controller = new AbortController();
      getInference.execute.mockImplementationOnce(() => {
        controller.abort();
        return Promise.reject(new InferenceAbortedError());
      });

      const title = await titleUseCase.execute(command(controller.signal));

      expect(title).toBeNull();
      expect(updateThreadTitle.execute).not.toHaveBeenCalled();
    });
  });
});
