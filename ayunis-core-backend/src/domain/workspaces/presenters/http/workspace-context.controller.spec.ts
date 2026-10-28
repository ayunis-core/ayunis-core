import { PATH_METADATA } from '@nestjs/common/constants';
import { WorkspaceContextController } from './workspace-context.controller';

describe(WorkspaceContextController.name, () => {
  it('exposes only the workspace run-context and instruction routes', () => {
    const prototype = WorkspaceContextController.prototype as unknown as Record<
      string,
      object
    >;
    const methods = Object.getOwnPropertyNames(prototype).filter(
      (name) => name !== 'constructor',
    );
    const paths = methods.map((name) =>
      Reflect.getMetadata(PATH_METADATA, prototype[name]),
    );
    expect(paths).toEqual(['/', 'instruction']);
  });
});
