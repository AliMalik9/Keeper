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

// Keep one visual language across the app. Callers use semantic names while
// this generator owns the Solar variant applied to every icon.
const STYLE = 'bold-duotone';

// Every Solar icon referenced anywhere in the app, grouped by where it is used.
const NAMES = [
  // shell + auth
  'lightbulb-bolt',
  'notes-minimalistic',
  'widget-4',
  'clock-circle',
  'bell',
  'pen-new-round',
  'trash-bin-trash',
  'export',
  'import',
  'lock-keyhole',
  'lock-password',
  // notes
  'magnifer',
  'gallery-minimalistic',
  'list',
  'checklist-minimalistic',
  'close-circle',
  'add-circle',
  'document-add',
  'trash-bin-minimalistic',
  'check-circle',
  // board + planner
  'add-square',
  'link-minimalistic-2',
  'alt-arrow-down',
  'arrow-right',
  'copy',
  'undo-left-round',
  'undo-right-round',
  'download-minimalistic',
  'alarm',
];

const missing = [];
const out = {};

for (const name of NAMES) {
  const sourceName = `${name}-${STYLE}`;
  const data = getIconData(icons, sourceName);
  if (!data) {
    missing.push(sourceName);
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
// Variant: ${STYLE}

const SOLAR_ICONS = ${JSON.stringify(out, null, 2)};

export default SOLAR_ICONS;
`;

writeFileSync(resolve(ROOT, 'lib/solar-icons.js'), file, 'utf8');
console.log(`Wrote ${Object.keys(out).length} Solar icons to lib/solar-icons.js`);
