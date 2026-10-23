import { getMetadataArgsStorage } from 'typeorm';
import { ThreadSourceAssignmentRecord } from './thread-source-assignment.record';

it('declares uniqueness of a source within a thread independently of skill provenance', () => {
  const constraints = getMetadataArgsStorage().uniques.filter(
    (constraint) => constraint.target === ThreadSourceAssignmentRecord,
  );
  expect(constraints).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ columns: ['threadId', 'sourceId'] }),
    ]),
  );
});
