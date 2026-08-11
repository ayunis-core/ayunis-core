CLI Commands
Administrative command-line interface for operator-managed workflows.

The CLI module provides terminal commands for platform administration using `nest-commander`. It supports user operations and the municipal SSO V1 onboarding commands `sso:configure`, `sso:enable`, `sso:disable`, and `sso:set-jit`. SSO commands are thin adapters over application use cases exported by `SsoModule`; they do not access persistence directly or accept customer IdP credentials. Seed commands live in `db/scripts/` to reduce memory usage.

The CLI bootstraps a standalone NestJS application context via `CommandFactory.run()` in `cli/main.ts`. `CliModule` configures its own `TypeOrmModule` and `ClsModule` with transactional support independently of `AppModule`, enabling it to run as a separate process. See `docs/runbooks/municipal-sso-v1.md` for the SSO operator sequence and rollback procedure.
