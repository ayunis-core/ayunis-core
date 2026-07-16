import { describe, expect, it } from 'vitest';
import {
  adjustFormulaReferences,
  columnIndexToLetter,
  columnLetterToIndex,
  remapFormulaColumns,
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

  it('never rewrites digit-suffixed function names like LOG10 or ATAN2', () => {
    expect(adjustFormulaReferences('=LOG10(C2)+ATAN2(C2, C3)', del(1))).toBe(
      '=LOG10(B2)+ATAN2(B2, B3)',
    );
  });

  it('never rewrites references inside string literals', () => {
    expect(adjustFormulaReferences('=CONCATENATE("see B2", C2)', del(1))).toBe(
      '=CONCATENATE("see B2", B2)',
    );
  });

  it('preserves sheet-qualified cell and range references', () => {
    const formula =
      "=OtherSheet!C2+SUM(OtherSheet!B2:OtherSheet!D4)+'Other Sheet'!A1";

    expect(adjustFormulaReferences(formula, del(1))).toBe(formula);
  });

  it('rewrites explicit references to the current sheet', () => {
    expect(adjustFormulaReferences('=Sheet1!C2', del(1))).toBe('=Sheet1!B2');
  });

  it('shrinks a current-sheet range whose end repeats the sheet qualifier', () => {
    expect(adjustFormulaReferences('=SUM(Sheet1!B2:Sheet1!D4)', del(1))).toBe(
      '=SUM(Sheet1!B2:C4)',
    );
  });

  it('keeps a range end that qualifies a different sheet intact', () => {
    const formula = '=SUM(Sheet1!B2:OtherSheet!D4)';

    expect(adjustFormulaReferences(formula, del(1))).toBe(formula);
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

  it('shrinks a current-sheet range whose end repeats the sheet qualifier', () => {
    expect(adjustFormulaReferences('=SUM(Sheet1!B2:Sheet1!B10)', del(3))).toBe(
      '=SUM(Sheet1!B2:B9)',
    );
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

  it('keeps a range start at the insertion point', () => {
    expect(adjustFormulaReferences('=SUM(B3:B5)', ins(1))).toBe('=SUM(B3:B6)');
  });
});

describe('full-column references', () => {
  const del = (index: number) =>
    ({ axis: 'column', index, delta: -1 }) as const;
  const ins = (index: number) => ({ axis: 'column', index, delta: 1 }) as const;

  it('rewrites full-column references after column changes', () => {
    expect(adjustFormulaReferences('=SUM(B:B)', del(1))).toBe('=SUM(#REF!)');
    expect(adjustFormulaReferences('=SUM(B:D)', del(1))).toBe('=SUM(B:C)');
    expect(adjustFormulaReferences('=SUM(B:D)', ins(1))).toBe('=SUM(B:E)');
  });

  it('preserves absolute markers on full-column references', () => {
    expect(adjustFormulaReferences('=SUM($B:$D)', ins(1))).toBe('=SUM($B:$E)');
  });
});

describe('column remapping (reorder)', () => {
  // move column A (0) after column C (2): order [B, C, A]
  const moveAtoEnd = (index: number) => [2, 0, 1][index] ?? index;

  it('remaps single references through the permutation', () => {
    expect(remapFormulaColumns('=A2*12', moveAtoEnd)).toBe('=C2*12');
    expect(remapFormulaColumns('=B2+C3', moveAtoEnd)).toBe('=A2+B3');
  });

  it('re-normalizes ranges so the rectangle survives', () => {
    // A2:B4 (cols 0..1) becomes cols {2,0} -> normalized A2:C4
    expect(remapFormulaColumns('=SUM(A2:B4)', moveAtoEnd)).toBe('=SUM(A2:C4)');
  });

  it('preserves absolute markers and string literals', () => {
    expect(remapFormulaColumns('=$A$2', moveAtoEnd)).toBe('=$C$2');
    expect(remapFormulaColumns('=CONCATENATE("see A2", A2)', moveAtoEnd)).toBe(
      '=CONCATENATE("see A2", C2)',
    );
  });

  it('preserves sheet-qualified references during column remapping', () => {
    const formula = "='Other Sheet'!C2+SUM(OtherSheet!A1:B2)";

    expect(remapFormulaColumns(formula, moveAtoEnd)).toBe(formula);
  });

  it('remaps explicit references to the current sheet', () => {
    expect(remapFormulaColumns('=Sheet1!A2', moveAtoEnd)).toBe('=Sheet1!C2');
  });

  it('remaps full-column references', () => {
    expect(remapFormulaColumns('=SUM(A:C)', moveAtoEnd)).toBe('=SUM(A:C)');
    expect(remapFormulaColumns('=SUM(A:B)', moveAtoEnd)).toBe('=SUM(A:C)');
  });
});
