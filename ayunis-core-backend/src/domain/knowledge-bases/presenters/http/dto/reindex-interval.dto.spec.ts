import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { AddUrlToKnowledgeBaseDto } from 'src/domain/knowledge-bases/presenters/http/dto/add-url-to-knowledge-base.dto';
import {
  ReindexIntervalDto,
  toReindexInterval,
} from 'src/domain/knowledge-bases/presenters/http/dto/reindex-interval.dto';
import { SetDocumentReindexScheduleRequestDto } from 'src/domain/knowledge-bases/presenters/http/dto/set-document-reindex-schedule.request-dto';
import {
  ReindexInterval,
  ReindexIntervalUnit,
} from 'src/domain/sources/domain/reindex-interval';

/** Flattens nested errors into `field: [constraints]` like the global ValidationPipe. */
function fieldErrors(
  errors: ValidationError[],
  parent = '',
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const error of errors) {
    const field = parent ? `${parent}.${error.property}` : error.property;
    if (error.constraints) result[field] = Object.keys(error.constraints);
    Object.assign(result, fieldErrors(error.children ?? [], field));
  }
  return result;
}

async function errorsFor(type: new () => object, values: object) {
  return fieldErrors(await validate(plainToInstance(type, values)));
}

const URL = 'https://www.stadt.example/abfall';

describe('re-index interval transport validation', () => {
  describe(AddUrlToKnowledgeBaseDto.name, () => {
    it('accepts a URL without an interval', async () => {
      await expect(
        errorsFor(AddUrlToKnowledgeBaseDto, { url: URL }),
      ).resolves.toEqual({});
    });

    it.each([
      [1, 'weeks'],
      [52, 'weeks'],
      [1, 'months'],
      [12, 'months'],
    ])('accepts every %p %s', async (value, unit) => {
      await expect(
        errorsFor(AddUrlToKnowledgeBaseDto, {
          url: URL,
          reindexInterval: { value, unit },
        }),
      ).resolves.toEqual({});
    });

    it.each([
      [0, 'weeks', 'min'],
      [53, 'weeks', 'maxForUnit'],
      [13, 'months', 'maxForUnit'],
      [1.5, 'weeks', 'isInt'],
    ])(
      'rejects every %p %s on the value field with %s',
      async (value, unit, constraint) => {
        const errors = await errorsFor(AddUrlToKnowledgeBaseDto, {
          url: URL,
          reindexInterval: { value, unit },
        });

        expect(errors['reindexInterval.value']).toContain(constraint);
      },
    );

    it('rejects an unknown unit on the unit field', async () => {
      const errors = await errorsFor(AddUrlToKnowledgeBaseDto, {
        url: URL,
        reindexInterval: { value: 2, unit: 'days' },
      });

      expect(errors['reindexInterval.unit']).toContain('isEnum');
    });
  });

  describe(SetDocumentReindexScheduleRequestDto.name, () => {
    it('accepts null to stop automatic re-indexing', async () => {
      await expect(
        errorsFor(SetDocumentReindexScheduleRequestDto, {
          reindexInterval: null,
        }),
      ).resolves.toEqual({});
    });

    it('accepts an interval', async () => {
      await expect(
        errorsFor(SetDocumentReindexScheduleRequestDto, {
          reindexInterval: { value: 6, unit: 'months' },
        }),
      ).resolves.toEqual({});
    });

    it('requires the interval property so an empty body never clears a schedule', async () => {
      const errors = await errorsFor(SetDocumentReindexScheduleRequestDto, {});

      expect(errors.reindexInterval).toBeDefined();
    });

    it('rejects an interval that is not an object', async () => {
      const errors = await errorsFor(SetDocumentReindexScheduleRequestDto, {
        reindexInterval: '2 weeks',
      });

      expect(errors.reindexInterval).toBeDefined();
    });

    it('validates the nested interval', async () => {
      const errors = await errorsFor(SetDocumentReindexScheduleRequestDto, {
        reindexInterval: { value: 13, unit: 'months' },
      });

      expect(errors['reindexInterval.value']).toContain('maxForUnit');
    });
  });

  describe(toReindexInterval.name, () => {
    it('maps a validated interval to the domain value', () => {
      const dto = plainToInstance(ReindexIntervalDto, {
        value: 2,
        unit: 'weeks',
      });

      expect(toReindexInterval(dto)).toEqual(
        new ReindexInterval(2, ReindexIntervalUnit.WEEKS),
      );
    });

    it.each([null, undefined])('maps %p to no schedule', (dto) => {
      expect(toReindexInterval(dto)).toBeNull();
    });
  });
});
