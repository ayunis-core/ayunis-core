import { createPageMargins } from './page-margins';
import { InvalidPageMarginsError } from '../../application/letterheads.errors';

describe('createPageMargins', () => {
  it('should create valid page margins with positive values', () => {
    const margins = createPageMargins({
      top: 55,
      bottom: 20,
      left: 15,
      right: 15,
    });

    expect(margins).toEqual({ top: 55, bottom: 20, left: 15, right: 15 });
  });

  it('should accept zero margins', () => {
    const margins = createPageMargins({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    });

    expect(margins).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });

  it('should reject negative top margin', () => {
    expect(() =>
      createPageMargins({ top: -1, bottom: 20, left: 15, right: 15 }),
    ).toThrow(InvalidPageMarginsError);
  });

  it('should reject negative bottom margin', () => {
    expect(() =>
      createPageMargins({ top: 55, bottom: -5, left: 15, right: 15 }),
    ).toThrow(InvalidPageMarginsError);
  });

  it('should reject negative left margin', () => {
    expect(() =>
      createPageMargins({ top: 55, bottom: 20, left: -10, right: 15 }),
    ).toThrow(InvalidPageMarginsError);
  });

  it('should reject negative right margin', () => {
    expect(() =>
      createPageMargins({ top: 55, bottom: 20, left: 15, right: -3 }),
    ).toThrow(InvalidPageMarginsError);
  });

  it('should reject Infinity', () => {
    expect(() =>
      createPageMargins({ top: Infinity, bottom: 20, left: 15, right: 15 }),
    ).toThrow(InvalidPageMarginsError);
  });

  it('should reject NaN', () => {
    expect(() =>
      createPageMargins({ top: 55, bottom: NaN, left: 15, right: 15 }),
    ).toThrow(InvalidPageMarginsError);
  });

  it('should include field name and value in error message', () => {
    expect(() =>
      createPageMargins({ top: -7, bottom: 20, left: 15, right: 15 }),
    ).toThrow("'top' must be a non-negative finite number, got -7");
  });
});
