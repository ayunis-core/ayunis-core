import {
  extractTextByLineRange,
  validateTextExtraction,
} from './text-extraction.utils';
import { ToolExecutionFailedError } from '../tools.errors';

describe('extractTextByLineRange', () => {
  const defaultParams = {
    toolName: 'test_tool',
    maxLines: 500,
    maxChars: 50000,
  };

  it('should extract all lines when endLine is -1', () => {
    const result = extractTextByLineRange({
      ...defaultParams,
      text: 'Line 1\nLine 2\nLine 3',
      startLine: 1,
      endLine: -1,
    });

    expect(result.totalLines).toBe(3);
    expect(result.effectiveStartLine).toBe(1);
    expect(result.effectiveEndLine).toBe(3);
    expect(result.extractedText).toBe('Line 1\nLine 2\nLine 3');
    expect(result.isEmpty).toBe(false);
  });

  it('should return isEmpty true for empty text', () => {
    const result = extractTextByLineRange({
      ...defaultParams,
      text: '',
      startLine: 1,
      endLine: -1,
    });

    expect(result.isEmpty).toBe(true);
    expect(result.totalLines).toBe(0);
    expect(result.extractedText).toBe('');
  });

  it('should clamp startLine to valid range', () => {
    const result = extractTextByLineRange({
      ...defaultParams,
      text: 'Line 1\nLine 2\nLine 3',
      startLine: 0,
      endLine: 2,
    });

    expect(result.effectiveStartLine).toBe(1);
    expect(result.effectiveEndLine).toBe(2);
  });

  it('should clamp endLine to total lines', () => {
    const result = extractTextByLineRange({
      ...defaultParams,
      text: 'Line 1\nLine 2\nLine 3',
      startLine: 1,
      endLine: 100,
    });

    expect(result.effectiveEndLine).toBe(3);
  });

  it('should throw when startLine exceeds total lines', () => {
    expect(() =>
      extractTextByLineRange({
        ...defaultParams,
        text: 'Line 1\nLine 2',
        startLine: 10,
        endLine: 15,
      }),
    ).toThrow(ToolExecutionFailedError);
  });

  it('should throw when requested line count exceeds maxLines', () => {
    const text = Array.from({ length: 600 }, (_, i) => `Line ${i + 1}`).join(
      '\n',
    );
    expect(() =>
      extractTextByLineRange({
        ...defaultParams,
        text,
        startLine: 1,
        endLine: 550,
        maxLines: 500,
      }),
    ).toThrow(ToolExecutionFailedError);
  });

  it('should throw when extracted text exceeds maxChars', () => {
    const longLine = 'A'.repeat(10000);
    expect(() =>
      extractTextByLineRange({
        ...defaultParams,
        text: `${longLine}\n${longLine}\n${longLine}`,
        startLine: 1,
        endLine: -1,
        maxChars: 100,
      }),
    ).toThrow(ToolExecutionFailedError);
  });

  it('should extract a specific line range', () => {
    const result = extractTextByLineRange({
      ...defaultParams,
      text: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5',
      startLine: 2,
      endLine: 4,
    });

    expect(result.extractedText).toBe('Line 2\nLine 3\nLine 4');
    expect(result.effectiveStartLine).toBe(2);
    expect(result.effectiveEndLine).toBe(4);
  });
});

describe('validateTextExtraction', () => {
  const defaultParams = {
    toolName: 'test_tool',
    maxLines: 500,
    maxChars: 50000,
  };

  it('should validate pre-sliced text from DB', () => {
    const result = validateTextExtraction({
      ...defaultParams,
      dbResult: { totalLines: 10, text: 'Line 2\nLine 3\nLine 4' },
      startLine: 2,
      endLine: 4,
    });

    expect(result.totalLines).toBe(10);
    expect(result.effectiveStartLine).toBe(2);
    expect(result.effectiveEndLine).toBe(4);
    expect(result.extractedText).toBe('Line 2\nLine 3\nLine 4');
    expect(result.isEmpty).toBe(false);
  });

  it('should return empty result when totalLines is 0', () => {
    const result = validateTextExtraction({
      ...defaultParams,
      dbResult: { totalLines: 0, text: '' },
      startLine: 1,
      endLine: -1,
    });

    expect(result.isEmpty).toBe(true);
    expect(result.totalLines).toBe(0);
  });

  it('should clamp endLine to totalLines', () => {
    const result = validateTextExtraction({
      ...defaultParams,
      dbResult: {
        totalLines: 5,
        text: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5',
      },
      startLine: 1,
      endLine: 100,
    });

    expect(result.effectiveEndLine).toBe(5);
  });

  it('should resolve endLine -1 to totalLines', () => {
    const result = validateTextExtraction({
      ...defaultParams,
      dbResult: { totalLines: 3, text: 'Line 1\nLine 2\nLine 3' },
      startLine: 1,
      endLine: -1,
    });

    expect(result.effectiveEndLine).toBe(3);
  });

  it('should throw when startLine exceeds totalLines', () => {
    expect(() =>
      validateTextExtraction({
        ...defaultParams,
        dbResult: { totalLines: 5, text: '' },
        startLine: 10,
        endLine: 15,
      }),
    ).toThrow(ToolExecutionFailedError);
  });

  it('should throw when line count exceeds maxLines', () => {
    expect(() =>
      validateTextExtraction({
        ...defaultParams,
        dbResult: { totalLines: 600, text: 'lots of text' },
        startLine: 1,
        endLine: 550,
        maxLines: 500,
      }),
    ).toThrow(ToolExecutionFailedError);
  });

  it('should throw when text exceeds maxChars', () => {
    const longText = 'A'.repeat(200);
    expect(() =>
      validateTextExtraction({
        ...defaultParams,
        dbResult: { totalLines: 3, text: longText },
        startLine: 1,
        endLine: 3,
        maxChars: 100,
      }),
    ).toThrow(ToolExecutionFailedError);
  });
});
