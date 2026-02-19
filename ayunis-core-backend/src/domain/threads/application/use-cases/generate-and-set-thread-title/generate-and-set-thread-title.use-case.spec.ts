import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GenerateAndSetThreadTitleUseCase } from './generate-and-set-thread-title.use-case';
import { UpdateThreadTitleUseCase } from '../update-thread-title/update-thread-title.use-case';
import { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';

describe('GenerateAndSetThreadTitleUseCase - Markdown Stripping', () => {
  let useCase: GenerateAndSetThreadTitleUseCase;

  beforeEach(async () => {
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

  describe('stripMarkdownFormatting', () => {
    it('should strip bold formatting with **', () => {
      const input = '**Turnhalle mieten – Sportverein**';
      const expected = 'Turnhalle mieten – Sportverein';
      // @ts-expect-error - accessing private method for testing
      const result = useCase.stripMarkdownFormatting(input);
      expect(result).toBe(expected);
    });

    it('should strip bold formatting with __', () => {
      const input = '__KI-Unterstützung für Verwaltung__';
      const expected = 'KI-Unterstützung für Verwaltung';
      // @ts-expect-error - accessing private method for testing
      const result = useCase.stripMarkdownFormatting(input);
      expect(result).toBe(expected);
    });

    it('should strip italic formatting with *', () => {
      const input = '*Important Title*';
      const expected = 'Important Title';
      // @ts-expect-error - accessing private method for testing
      const result = useCase.stripMarkdownFormatting(input);
      expect(result).toBe(expected);
    });

    it('should strip quotes', () => {
      const input = '**"Turnhalle mieten – Sportverein"**';
      const expected = 'Turnhalle mieten – Sportverein';
      // @ts-expect-error - accessing private method for testing
      const result = useCase.stripMarkdownFormatting(input);
      expect(result).toBe(expected);
    });

    it('should strip inline code', () => {
      const input = '`Code Title` with text';
      const expected = 'Code Title with text';
      // @ts-expect-error - accessing private method for testing
      const result = useCase.stripMarkdownFormatting(input);
      expect(result).toBe(expected);
    });

    it('should strip strikethrough', () => {
      const input = '~~Old Title~~ New Title';
      const expected = 'Old Title New Title';
      // @ts-expect-error - accessing private method for testing
      const result = useCase.stripMarkdownFormatting(input);
      expect(result).toBe(expected);
    });

    it('should strip headers', () => {
      const input = '## Title Header';
      const expected = 'Title Header';
      // @ts-expect-error - accessing private method for testing
      const result = useCase.stripMarkdownFormatting(input);
      expect(result).toBe(expected);
    });

    it('should strip links and keep text', () => {
      const input = '[Title Link](https://example.com)';
      const expected = 'Title Link';
      // @ts-expect-error - accessing private method for testing
      const result = useCase.stripMarkdownFormatting(input);
      expect(result).toBe(expected);
    });

    it('should handle multiple markdown formats', () => {
      const input = '**"Important"** *Title* with `code`';
      const expected = 'Important Title with code';
      // @ts-expect-error - accessing private method for testing
      const result = useCase.stripMarkdownFormatting(input);
      expect(result).toBe(expected);
    });

    it('should clean up extra whitespace', () => {
      const input = '**Title**   with    extra     spaces';
      const expected = 'Title with extra spaces';
      // @ts-expect-error - accessing private method for testing
      const result = useCase.stripMarkdownFormatting(input);
      expect(result).toBe(expected);
    });

    it('should return empty string for input with only markdown', () => {
      const input = '**""**';
      const expected = '';
      // @ts-expect-error - accessing private method for testing
      const result = useCase.stripMarkdownFormatting(input);
      expect(result).toBe(expected);
    });
  });
});
