import { PATH_METADATA } from '@nestjs/common/constants';
import { WorkspaceContextController } from 'src/domain/workspaces/presenters/http/workspace-context.controller';

function routePaths(): string[] {
  const prototype = WorkspaceContextController.prototype;
  return Object.getOwnPropertyNames(prototype)
    .map((name) => {
      const handler = prototype[name as keyof typeof prototype];
      return typeof handler === 'function'
        ? (Reflect.getMetadata(PATH_METADATA, handler) as string | undefined)
        : undefined;
    })
    .filter((path): path is string => path !== undefined);
}

describe(WorkspaceContextController.name, () => {
  it('does not expose nested workspace knowledge-base resource routes', () => {
    const paths = routePaths();

    expect(
      paths.filter(
        (path) =>
          path === 'knowledge-bases' || path.startsWith('knowledge-bases/'),
      ),
    ).toEqual([]);
    expect(paths).toContain('skills/:skillId/knowledge-bases/:knowledgeBaseId');
  });
});
