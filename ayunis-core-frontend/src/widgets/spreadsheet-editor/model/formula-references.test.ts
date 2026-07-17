import { describe, expect, it } from 'vitest';
import {
  adjustFormulaReferences,
  columnIndexToLetter,
  columnLetterToIndex,
} from './formula-references';

describe('column letter conversion', () => {
  it('round-trips letters and indices', () => {
    expect(columnLetterToIndex('A')).toBe(0);
    expect(columnLetterToIndex('B')).toBe(1);
    expect(columnLetterToIndex('Z')).toBe(25);
    expect(columnLetterToIndex('AA')).toBe(26);
    expect(columnIndexToLetter(0)).toBe('A');
    expect(columnIndexToLetter(25)).toBe('Z');
    expect(columnIndexToLetter(26)).toBe('AA');
    expect(columnIndexToLetter(701)).toBe('ZZ');
  });
});

describe('column deletion', () => {
  const del = (index: number) =>
    ({ axis: 'column', index, delta: -1 }) as const;

  it('breaks single references to the deleted column', () => {
    expect(adjustFormulaReferences('=B2*2', del(1))).toBe('=#REF!*2');
  });

  it('shifts references past the deleted column down', () => {
    expect(adjustFormulaReferences('=C2+D3', del(1))).toBe('=B2+C3');
  });

  it('leaves references before the deleted column alone', () => {
    expect(adjustFormulaReferences('=A2*2', del(1))).toBe('=A2*2');
  });

  it('shrinks ranges that span the deleted column', () => {
    expect(adjustFormulaReferences('=SUM(A2:C4)', del(1))).toBe('=SUM(A2:B4)');
    expect(adjustFormulaReferences('=SUM(B2:D4)', del(1))).toBe('=SUM(B2:C4)');
    expect(adjustFormulaReferences('=SUM(A2:B4)', del(1))).toBe('=SUM(A2:A4)');
  });

  it('breaks ranges entirely inside the deleted column', () => {
    expect(adjustFormulaReferences('=SUM(B2:B10)', del(1))).toBe('=SUM(#REF!)');
  });

  it('preserves absolute reference markers', () => {
    expect(adjustFormulaReferences('=$C$2+C2', del(1))).toBe('=$B$2+B2');
  });

  it('never rewrites references inside string literals', () => {
    expect(adjustFormulaReferences('=CONCATENATE("see B2", C2)', del(1))).toBe(
      '=CONCATENATE("see B2", B2)',
    );
  });
});

describe('row deletion', () => {
  // data row index 0 = sheet row 2
  const del = (index: number) => ({ axis: 'row', index, delta: -1 }) as const;

  it('breaks single references to the deleted row', () => {
    expect(adjustFormulaReferences('=B2+1', del(0))).toBe('=#REF!+1');
  });

  it('shifts references below the deleted row up', () => {
    expect(adjustFormulaReferences('=B3+B4', del(0))).toBe('=B2+B3');
  });

  it('never touches the header row reference', () => {
    expect(adjustFormulaReferences('=B1', del(0))).toBe('=B1');
  });

  it('shrinks ranges that span the deleted row', () => {
    expect(adjustFormulaReferences('=SUM(B2:B10)', del(3))).toBe('=SUM(B2:B9)');
  });
});

describe('row insertion', () => {
  const ins = (index: number) => ({ axis: 'row', index, delta: 1 }) as const;

  it('shifts references at and below the inserted row down', () => {
    expect(adjustFormulaReferences('=B2+B5', ins(1))).toBe('=B2+B6');
    expect(adjustFormulaReferences('=B3', ins(1))).toBe('=B4');
  });

  it('extends ranges spanning the insertion point', () => {
    expect(adjustFormulaReferences('=SUM(B2:B4)', ins(1))).toBe('=SUM(B2:B5)');
  });
});
