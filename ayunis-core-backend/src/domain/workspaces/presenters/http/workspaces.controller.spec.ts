import { REQUIRE_PERMISSION_KEY } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { WorkspacesController } from './workspaces.controller';

describe(WorkspacesController.name, () => {
  it('requires create_workspaces to create a workspace', () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSION_KEY,
        WorkspacesController.prototype.create,
      ),
    ).toEqual([Permission.CREATE_WORKSPACES]);
  });

  it('leaves reading and changing existing workspaces to workspace access', () => {
    const prototype = WorkspacesController.prototype;
    for (const handler of [
      prototype.findAll,
      prototype.findOne,
      prototype.update,
      prototype.remove,
    ]) {
      expect(
        Reflect.getMetadata(REQUIRE_PERMISSION_KEY, handler),
      ).toBeUndefined();
    }
  });
});
