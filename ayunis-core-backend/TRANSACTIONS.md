# CLS transaction enrollment

`@Transactional()` owns the database transaction. Every repository and finder
called inside that boundary must resolve its TypeORM repository from
`TransactionHost<TransactionalAdapterTypeOrm>` **at operation time**. Reads must
participate too, so they see writes made earlier in the transaction.

```typescript
private get repository(): Repository<ExampleRecord> {
  const manager = this.txHost.tx as EntityManager | undefined;
  return manager?.getRepository(ExampleRecord) ?? this.defaultRepository;
}
```

The injected default repository supports background callers without an ambient
CLS context. For adapters that always have a configured fallback manager,
`this.txHost.tx.getRepository(ExampleRecord)` is also valid. Never capture the
manager or repository in the constructor. Multiple records, subtype repositories,
assignment helpers, finders, raw SQL, and QueryBuilders must all use the same
ambient manager. A local `manager.transaction(...)` must be invoked through that
resolved manager so it inherits an outer transaction.

## Review checklist

- Trace every transactional method through synchronous use-case calls, callbacks,
  index registries, repository collaborators, and all participating records.
- Check reads as well as writes; direct `@InjectRepository` use is only the fallback.
- Check `manager.query`, `manager.transaction`, and QueryBuilder creation for
  accidental use of the injected default repository.
- Preserve ownership and tenant predicates, conditional updates, and omission
  semantics. Enrollment does not change authorization policy or SQL shape.
- Prove rollback using a real PostgreSQL transaction and persisted-row assertions
  after a failure between statements. Include successful commit, no-op requests,
  and destructive removal/recreation where relevant.
- Verify callers outside CLS and operations before, during, and after a transaction.
- Database rollback cannot undo storage deletion, queued work, network calls, or
  event delivery. Verify their existing ordering separately; enrollment alone
  does not make those side effects atomic.

## AYC-496 audit

Already enrolled: users, invites and their count helpers; organizations, role
permissions, subscriptions and seat locks; trials, legal acceptance; teams and
members; sessions and refresh tokens; MFA; SSO connections, identities and locks;
sources and details; skills and activations; knowledge bases and activations;
catalog models.

Enrolled in this change:

| Transactional path | Repositories and collaborators |
| --- | --- |
| Source create/delete, skill and collection source removal | parent-child index |
| Thread source attachment, permitted-model replacement | threads, thread assignments |
| Artifact creation and version updates | artifacts, versions, document artifacts; letterhead lookup |
| Share deletion and access checks | shares, share scopes |
| Permitted-model deletion and dependent defaults | permitted models, permitted-model finder, user default models |
| Skill and collection authorization/assignment | workspace records and subtype lookups, skill page finder, MCP integration subtype lookups |
| Password reset | password-set tokens |
| Synchronous URL retrieval | crawl-domain grants |

The sweep follows synchronous constructor dependencies and registry dispatch.
Queue consumers and asynchronous event listeners are separate execution paths;
being injected into a transactional caller does not itself make their later work
part of that caller's transaction. Existing user deletion still commits row
removal before deferred external cleanup. Source processing storage/queue cleanup
retains its existing behavior; moving irreversible work is outside this ticket.
