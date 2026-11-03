import ts from "typescript";
import { join } from "node:path";

export function compatibilityAssignments(
  filename: string,
  prefix: string,
): string {
  const program = ts.createProgram([filename], { skipLibCheck: true });
  const source = program.getSourceFile(filename);
  if (!source) throw new Error("Baseline declaration entry is missing");
  const checker = program.getTypeChecker();
  const module = checker.getSymbolAtLocation(source);
  if (!module) throw new Error("Baseline declaration entry has no exports");
  return checker
    .getExportsOfModule(module)
    .map((symbol, index) => {
      const name = symbol.getName();
      if (!/^[$A-Z_a-z][$\w]*$/.test(name))
        throw new Error("Unsupported SDK export name");
      const resolved =
        symbol.flags & ts.SymbolFlags.Alias
          ? checker.getAliasedSymbol(symbol)
          : symbol;
      const reference = exportReference(resolved, checker, name);
      const kind = resolved.flags & ts.SymbolFlags.Value ? "typeof " : "";
      return (
        `declare const ${prefix}Current${index}: ${kind}${prefix}Current.${reference};\n` +
        `const ${prefix}Previous${index}: ${kind}${prefix}Previous.${reference} = ${prefix}Current${index};\n` +
        `declare const ${prefix}Old${index}: ${kind}${prefix}Previous.${reference};\n` +
        `const ${prefix}New${index}: ${kind}${prefix}Current.${reference} = ${prefix}Old${index};\n`
      );
    })
    .join("\n");
}

function exportReference(
  symbol: ts.Symbol,
  checker: ts.TypeChecker,
  name: string,
): string {
  const declaration = symbol.declarations?.find(
    (node) =>
      ts.isTypeAliasDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isClassDeclaration(node),
  );
  const parameters =
    declaration && "typeParameters" in declaration
      ? declaration.typeParameters
      : undefined;
  const argumentsList = parameters?.map((parameter) =>
    parameter.constraint
      ? checker.typeToString(
          checker.getTypeFromTypeNode(parameter.constraint),
          undefined,
          ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.InTypeAlias,
        )
      : "unknown",
  );
  return argumentsList?.length ? `${name}<${argumentsList.join(", ")}>` : name;
}

export function baselineConsumer(cwd: string): string {
  return ["contracts", "client"]
    .map((entry) => {
      const prefix = entry;
      return (
        `import * as ${prefix}Current from '@ayunis-core/connect-sdk/${entry}';\n` +
        `import * as ${prefix}Previous from 'previous-core-sdk/${entry}';\n` +
        compatibilityAssignments(
          join(cwd, `node_modules/previous-core-sdk/dist/${entry}.d.ts`),
          prefix,
        )
      );
    })
    .join("\n");
}
