import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';
import { buildOpenApiDocument } from './registry';

export const OPENAPI_FILE = fileURLToPath(
  new URL('../../../../../../docs/openapi.yaml', import.meta.url),
);

export const renderOpenApiYaml = (): string => stringify(buildOpenApiDocument(), { lineWidth: 0 });

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(OPENAPI_FILE, renderOpenApiYaml());
}
