// @ts-check
import path from 'node:path';

/**
 * Bans `../` imports in favour of the package's path alias — `src/…` on the
 * backend, `@/…` on the frontend. Same-directory `./sibling` imports stay
 * relative: they move with the file, so they carry no cross-tree coupling.
 *
 * Written locally rather than pulled from npm because
 * `eslint-plugin-no-relative-import-paths` still calls `context.getCwd()`,
 * which ESLint 10 removed.
 *
 * The rewrite target is derived from the resolved absolute path: everything
 * after the last `/src/` segment. Imports that resolve outside `src` (config
 * files, `package.json`) have no alias form and are left alone.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require the path alias instead of parent-relative import paths',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: { prefix: { type: 'string' } },
        additionalProperties: false,
      },
    ],
    messages: {
      relativeParent:
        "Use the absolute import '{{replacement}}' instead of '{{original}}'. Relative paths are only for same-directory siblings.",
    },
  },

  create(context) {
    const prefix = context.options[0]?.prefix ?? 'src';
    const marker = `${path.sep}src${path.sep}`;

    /** @param {{ source?: { value?: unknown, range?: unknown } | null }} node */
    function check(node) {
      const source = node.source;
      if (!source || typeof source.value !== 'string') return;
      if (!source.value.startsWith('../')) return;

      const absolute = path.resolve(
        path.dirname(context.filename),
        source.value,
      );
      const index = absolute.lastIndexOf(marker);
      if (index === -1) return;

      const withinSrc = absolute
        .slice(index + marker.length)
        .split(path.sep)
        .join('/');
      const replacement = `${prefix}/${withinSrc}`;

      context.report({
        node: /** @type {never} */ (source),
        messageId: 'relativeParent',
        data: { replacement, original: source.value },
        fix: (fixer) =>
          fixer.replaceText(/** @type {never} */ (source), `'${replacement}'`),
      });
    }

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
    };
  },
};
