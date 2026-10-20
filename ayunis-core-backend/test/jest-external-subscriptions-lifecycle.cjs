const path = require('node:path');
const { jest: base } = require('../package.json');

module.exports = {
  ...base,
  rootDir: path.join(__dirname, '../src'),
  testRegex: 'external-subscriptions-lifecycle.e2e-spec.ts$',
  // Record decorators must use the production compiler's type metadata;
  // isolated transpilation emits Object for imported UUID aliases.
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { isolatedModules: false, diagnostics: { ignoreCodes: [151002] } },
    ],
  },
};
