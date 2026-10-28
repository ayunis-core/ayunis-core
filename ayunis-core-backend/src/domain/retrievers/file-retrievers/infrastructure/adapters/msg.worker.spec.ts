import { buildMsgFile } from 'src/common/testing/msg-file.builder';
import { extractText } from './msg.worker';

describe('msg worker', () => {
  it('returns the extracted text of a readable message', () => {
    const result = extractText(buildMsgFile({ subject: 'Hallo' }));

    expect(result).toEqual({ text: 'Subject: Hallo' });
  });

  it('reports an unreadable message as an error result', () => {
    const result = extractText(Buffer.from('not an outlook message'));

    expect(result).toHaveProperty('error');
  });
});
