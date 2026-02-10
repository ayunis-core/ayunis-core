# Bugbot Rules

## SUMMARY.md Sync Check

Every module and layer has a `SUMMARY.md` that documents its structure, responsibilities, and key files. When code changes are made within a module, verify that the corresponding `SUMMARY.md` still accurately reflects the actual code.

Flag as an issue if:

- A use case, service, entity, port, or controller was added or removed but `SUMMARY.md` wasn't updated
- Module boundaries or dependencies changed but `SUMMARY.md` still describes the old structure
- Exported providers or imports in a NestJS module file diverge from what `SUMMARY.md` documents

Locations to check:

- `ayunis-core-backend/src/domain/[module]/SUMMARY.md`
- `ayunis-core-backend/src/iam/[module]/SUMMARY.md`
- `ayunis-core-backend/src/common/[module]/SUMMARY.md`
- `ayunis-core-frontend/src/[layer]/SUMMARY.md`
