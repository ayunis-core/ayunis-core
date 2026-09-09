import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { SkillsController } from './skills.controller';

interface RouteMetadata {
  method: RequestMethod;
  path: string;
}

describe(SkillsController.name, () => {
  it('exposes explicit state setters and no bodyless toggle routes', () => {
    const prototype = SkillsController.prototype as unknown as Record<
      string,
      object
    >;
    const routes = Object.getOwnPropertyNames(prototype)
      .filter((name) => name !== 'constructor')
      .map<RouteMetadata>((name) => ({
        method: Reflect.getMetadata(METHOD_METADATA, prototype[name]),
        path: Reflect.getMetadata(PATH_METADATA, prototype[name]),
      }));

    expect(routes).toEqual(
      expect.arrayContaining([
        { method: RequestMethod.PATCH, path: ':id/activation' },
        { method: RequestMethod.PATCH, path: ':id/pin' },
      ]),
    );
    expect(routes.map(({ path }) => path)).not.toEqual(
      expect.arrayContaining([':id/toggle-active', ':id/toggle-pinned']),
    );
  });
});
