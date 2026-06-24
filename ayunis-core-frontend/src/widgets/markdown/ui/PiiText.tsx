import { Fragment } from 'react';
import { splitPiiTokens } from '../lib/pii-token';
import PiiMaskInline from './PiiMaskInline';

interface PiiTextProps {
  readonly children: string;
}

/**
 * Plain-text counterpart to the markdown pipeline: resolves `{{pii:...}}`
 * tokens inside a raw string (tool results, thinking transcripts).
 */
export default function PiiText({ children }: PiiTextProps) {
  const parts = splitPiiTokens(children);
  return (
    <>
      {parts.map((part, index) =>
        part.kind === 'text' ? (
          <Fragment key={index}>{part.text}</Fragment>
        ) : (
          <PiiMaskInline key={index} token={part.token} />
        ),
      )}
    </>
  );
}
