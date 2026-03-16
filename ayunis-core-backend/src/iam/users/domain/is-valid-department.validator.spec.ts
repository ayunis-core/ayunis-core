import { validate } from 'class-validator';
import { IsOptional, IsString } from 'class-validator';
import { IsValidDepartment } from './is-valid-department.validator';

class TestDto {
  @IsOptional()
  @IsString()
  @IsValidDepartment()
  department?: string;
}

describe('IsValidDepartment validator', () => {
  it('should accept a known department key', async () => {
    const dto = Object.assign(new TestDto(), { department: 'hauptamt' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept other:<text> pattern', async () => {
    const dto = Object.assign(new TestDto(), {
      department: 'other:Wasserwerk',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept undefined (optional)', async () => {
    const dto = new TestDto();
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject an arbitrary string', async () => {
    const dto = Object.assign(new TestDto(), { department: 'random-value' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('department');
  });

  it('should reject other: with empty text', async () => {
    const dto = Object.assign(new TestDto(), { department: 'other:' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
  });

  it('should reject bare "other"', async () => {
    const dto = Object.assign(new TestDto(), { department: 'other' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('department');
  });
});
