import { validate } from 'class-validator';
import { IsStringRecord } from './is-string-record.validator';

class TestDto {
  @IsStringRecord({ message: 'all values must be strings' })
  data: Record<string, string>;
}

describe('IsStringRecord', () => {
  function createDto(data: unknown): TestDto {
    const dto = new TestDto();
    dto.data = data as Record<string, string>;
    return dto;
  }

  it('accepts an object with all string values', async () => {
    const dto = createDto({ key1: 'value1', key2: 'value2' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts an empty object', async () => {
    const dto = createDto({});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects an object with a numeric value', async () => {
    const dto = createDto({ apiToken: 123 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toBeDefined();
  });

  it('rejects an object with a null value', async () => {
    const dto = createDto({ key: null });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
  });

  it('rejects an object with a boolean value', async () => {
    const dto = createDto({ enabled: true });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
  });

  it('rejects an object with a nested object value', async () => {
    const dto = createDto({ nested: { inner: 'value' } });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
  });

  it('rejects an object with an undefined value', async () => {
    const dto = createDto({ key: undefined });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
  });

  it('rejects an array of strings', async () => {
    const dto = createDto(['value1', 'value2']);
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
  });

  it('rejects an empty array', async () => {
    const dto = createDto([]);
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
  });

  it('rejects a Date instance', async () => {
    const dto = createDto(new Date());
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
  });

  it('rejects a class instance', async () => {
    class MyClass {
      value = 'test';
    }
    const dto = createDto(new MyClass());
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
  });

  it('rejects a Map instance', async () => {
    const dto = createDto(new Map());
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
  });

  it('accepts an object created with Object.create(null)', async () => {
    const obj = Object.create(null);
    obj.key = 'value';
    const dto = createDto(obj);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('uses custom message when provided', async () => {
    const dto = createDto({ key: 42 });
    const errors = await validate(dto);
    expect(errors[0].constraints).toEqual(
      expect.objectContaining({
        isStringRecord: 'all values must be strings',
      }),
    );
  });
});
