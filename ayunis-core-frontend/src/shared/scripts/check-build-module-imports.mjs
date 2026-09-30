import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { init, parse } from 'es-module-lexer';

const currentFilePath = fileURLToPath(import.meta.url);

export async function findMissingModuleImports(distDirectory) {
  await init;
  const assetsDirectory = resolve(distDirectory, 'assets');
  const moduleFiles = readdirSync(assetsDirectory).filter(
    (file) => file.endsWith('.mjs') || /^maplibre-gl-worker-.*\.js$/.test(file),
  );
  const missingImports = [];

  for (const file of moduleFiles) {
    const modulePath = resolve(assetsDirectory, file);
    const source = readFileSync(modulePath, 'utf8');
    const [imports] = parse(source);
    for (const moduleImport of imports) {
      const specifier = moduleImport.n;
      if (!specifier?.startsWith('.')) continue;
      if (!isDeployedFile(distDirectory, modulePath, specifier)) {
        missingImports.push(
          `${relative(distDirectory, modulePath)} -> ${specifier}`,
        );
      }
    }
  }

  return missingImports;
}

function isDeployedFile(distDirectory, modulePath, specifier) {
  const dependencyUrl = new URL(specifier, pathToFileURL(modulePath));
  dependencyUrl.search = '';
  dependencyUrl.hash = '';
  const dependencyPath = fileURLToPath(dependencyUrl);
  const relativePath = relative(distDirectory, dependencyPath);
  const isInsideDist =
    relativePath !== '..' &&
    !relativePath.startsWith(`..${sep}`) &&
    !isAbsolute(relativePath);
  return (
    isInsideDist &&
    existsSync(dependencyPath) &&
    statSync(dependencyPath).isFile()
  );
}

async function checkBuild() {
  const distDirectory = fileURLToPath(
    new URL('../../../dist/', import.meta.url),
  );
  const missingImports = await findMissingModuleImports(distDirectory);
  if (missingImports.length > 0) {
    throw new Error(
      `Production build contains unresolved module imports:\n${missingImports.join('\n')}`,
    );
  }
}

if (process.argv[1] && resolve(process.argv[1]) === currentFilePath) {
  await checkBuild();
}
