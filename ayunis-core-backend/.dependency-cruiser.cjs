/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ═══════════════════════════════════════════════════════════════════════════
    // DOMAIN ENTITIES — Pure business objects
    // CAN import: other entities (any module)
    // CANNOT import: infrastructure, presenters, use cases
    // ═══════════════════════════════════════════════════════════════════════════
    {
      name: 'domain-no-infrastructure',
      comment: 'Domain layer cannot import infrastructure (repositories, records)',
      severity: 'error',
      from: {
        path: '^src/(domain|iam)/[^/]+/domain/',
      },
      to: {
        path: '^src/(domain|iam)/[^/]+/infrastructure/',
      },
    },
    {
      name: 'domain-no-presenters',
      comment: 'Domain layer cannot import presenters (controllers, DTOs)',
      severity: 'error',
      from: {
        path: '^src/(domain|iam)/[^/]+/domain/',
      },
      to: {
        path: '^src/(domain|iam)/[^/]+/presenters/',
      },
    },
    {
      name: 'domain-no-use-cases',
      comment: 'Domain entities cannot import use cases (application layer)',
      severity: 'error',
      from: {
        path: '^src/(domain|iam)/[^/]+/domain/',
      },
      to: {
        path: '^src/(domain|iam)/[^/]+/application/use-cases/',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // USE CASES — Business operations
    // CAN import: other use cases (any module), domain entities (any module), 
    //             ports (own module), services (own module)
    // CANNOT import: infrastructure, presenters
    // ═══════════════════════════════════════════════════════════════════════════
    {
      name: 'use-cases-no-infrastructure',
      comment: 'Use cases cannot import infrastructure (repositories, records, mappers)',
      severity: 'error',
      from: {
        path: '^src/(domain|iam)/[^/]+/application/use-cases/',
      },
      to: {
        path: '^src/(domain|iam)/[^/]+/infrastructure/',
      },
    },
    {
      name: 'use-cases-no-presenters',
      comment: 'Use cases cannot import presenters (controllers, HTTP DTOs, presenter mappers)',
      severity: 'error',
      from: {
        path: '^src/(domain|iam)/[^/]+/application/use-cases/',
      },
      to: {
        path: '^src/(domain|iam)/[^/]+/presenters/',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // PORTS — Abstract interfaces for INFRASTRUCTURE (repos, external APIs)
    // Ports define contracts that infrastructure adapters implement.
    // Cross-module communication goes through USE CASES, not ports.
    // ═══════════════════════════════════════════════════════════════════════════
    {
      name: 'ports-no-infrastructure',
      comment: 'Ports cannot import infrastructure implementations',
      severity: 'error',
      from: {
        path: '^src/(domain|iam)/[^/]+/application/ports/',
      },
      to: {
        path: '^src/(domain|iam)/[^/]+/infrastructure/',
      },
    },
    {
      name: 'ports-no-presenters',
      comment: 'Ports cannot import presenters',
      severity: 'error',
      from: {
        path: '^src/(domain|iam)/[^/]+/application/ports/',
      },
      to: {
        path: '^src/(domain|iam)/[^/]+/presenters/',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // INFRASTRUCTURE MAPPERS — Convert domain entities ↔ records
    // CAN import: entities, records, other mappers
    // CANNOT import: use cases, presenters
    // ═══════════════════════════════════════════════════════════════════════════
    {
      name: 'mappers-no-use-cases',
      comment: 'Infrastructure mappers cannot import use cases',
      severity: 'error',
      from: {
        path: '^src/(domain|iam)/[^/]+/infrastructure/.*/mappers/',
      },
      to: {
        path: '^src/(domain|iam)/[^/]+/application/use-cases/',
      },
    },
    {
      name: 'mappers-no-presenters',
      comment: 'Infrastructure mappers cannot import presenters',
      severity: 'error',
      from: {
        path: '^src/(domain|iam)/[^/]+/infrastructure/.*/mappers/',
      },
      to: {
        path: '^src/(domain|iam)/[^/]+/presenters/',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // RECORDS — TypeORM entities, no application layer imports
    // ═══════════════════════════════════════════════════════════════════════════
    {
      name: 'records-no-use-cases',
      comment: 'Records cannot import use cases',
      severity: 'error',
      from: {
        path: '^src/(domain|iam)/[^/]+/infrastructure/.*/schema/.*\\.record\\.ts$',
      },
      to: {
        path: '^src/(domain|iam)/[^/]+/application/use-cases/',
      },
    },
    {
      name: 'records-no-presenters',
      comment: 'Records cannot import presenters',
      severity: 'error',
      from: {
        path: '^src/(domain|iam)/[^/]+/infrastructure/.*/schema/.*\\.record\\.ts$',
      },
      to: {
        path: '^src/(domain|iam)/[^/]+/presenters/',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // CONTROLLERS — No direct infrastructure access
    // ═══════════════════════════════════════════════════════════════════════════
    {
      name: 'controllers-no-infrastructure',
      comment: 'Controllers cannot import infrastructure directly (use cases instead)',
      severity: 'error',
      from: {
        path: '^src/(domain|iam)/[^/]+/presenters/http/.*\\.controller\\.ts$',
      },
      to: {
        path: '^src/(domain|iam)/[^/]+/infrastructure/',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // GENERAL ARCHITECTURE RULES
    // ═══════════════════════════════════════════════════════════════════════════
    {
      name: 'no-circular-dependencies',
      comment: 'Circular dependencies indicate poor module design',
      severity: 'error',
      from: {
        // Exclude records (TypeORM bidirectional relations) and entities (inheritance patterns)
        pathNot: '(\\.record\\.ts$|\\.entity\\.ts$)',
      },
      to: {
        circular: true,
      },
    },
  ],

  options: {

    doNotFollow: {
      path: ['node_modules'],
    },
    exclude: {
      path: [
        // Test files
        '\\.spec\\.ts$',
        '\\.test\\.ts$',
        '\\.e2e-spec\\.ts$',
        // Test fixtures
        '/test/',
        // Generated code
        '/generated/',
        // Migrations
        '/db/migrations/',
        // Module files (NestJS wiring)
        '\\.module\\.ts$',
      ],
    },
    includeOnly: {
      path: '^src/',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: './tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/(@[^/]+/[^/]+|[^/]+)',
      },
      text: {
        highlightFocused: true,
      },
    },
  },
};
