/**
 * Bakes the Solar icons this app uses into lib/solar-icons.js.
 *
 * Keeping a generated subset in the repo means the runtime has no icon
 * dependency and no network call — @iconify-json/solar stays a devDependency.
 *
 *   node scripts/build-icons.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { icons } from '@iconify-json/solar';
import { getIconData } from '@iconify/utils';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Every Solar icon referenced anywhere in the app, grouped by where it is used.
const NAMES = [
  // shell + auth
  'lightbulb-bolt-bold',
  'notes-minimalistic-bold',
  'widget-4-linear',
  'clock-circle-linear',
  'clock-circle-bold',
  'bell-linear',
  'pen-new-round-linear',
  'trash-bin-trash-linear',
  'export-bold',
  'import-bold',
  'lock-keyhole-linear',
  'lock-password-bold',
  // notes
  'magnifer-linear',
  'gallery-minimalistic-linear',
  'list-linear',
  'checklist-minimalistic-linear',
  'close-circle-linear',
  'add-circle-linear',
  'document-add-linear',
  'trash-bin-minimalistic-linear',
  'check-circle-bold',
  // board + planner
  'add-square-linear',
  'link-minimalistic-2-linear',
  'alt-arrow-down-linear',
  'arrow-right-linear',
  'copy-linear',
  'undo-left-round-linear',
  'undo-right-round-linear',
  'download-minimalistic-linear',
  'alarm-linear',
];

const missing = [];
const out = {};

for (const name of NAMES) {
  const data = getIconData(icons, name);
  if (!data) {
    missing.push(name);
    continue;
  }
  out[name] = {
    body: data.body,
    left: data.left ?? 0,
    top: data.top ?? 0,
    width: data.width ?? 24,
    height: data.height ?? 24,
  };
}

if (missing.length) {
  console.error('Missing Solar icons:\n  ' + missing.join('\n  '));
  process.exit(1);
}

const file = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/build-icons.mjs
// Source: @iconify-json/solar (Solar icon set, CC BY 4.0, by 480 Design).

const SOLAR_ICONS = ${JSON.stringify(out, null, 2)};

export default SOLAR_ICONS;
`;

writeFileSync(resolve(ROOT, 'lib/solar-icons.js'), file, 'utf8');
console.log(`Wrote ${Object.keys(out).length} Solar icons to lib/solar-icons.js`);
