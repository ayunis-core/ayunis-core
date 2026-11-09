import { writeFileSync } from 'node:fs';
import { renderOutlookManifest } from 'src/domain/office-addins/application/util/render-outlook-manifest';

// Writes the Outlook manifest for a base URL so CI can validate it without
// starting the backend. Usage: render-outlook-manifest <base-url> <out-file>
const [baseUrl, outFile] = process.argv.slice(2);
if (!baseUrl || !outFile) {
  throw new Error('Usage: render-outlook-manifest <base-url> <out-file>');
}
writeFileSync(outFile, renderOutlookManifest(baseUrl));
