#!/usr/bin/env node
// gen-catalog — regenerate references/catalog.md from the live React Bits registry + llms.txt.
//
//   node scripts/gen-catalog.mjs
//
// Two sources, cross-checked:
//   https://reactbits.dev/r/registry.json   — component names, deps, files (no category)
//   https://reactbits.dev/llms.txt          — category + one-line description (no deps)
// registry.json has no category field, so llms.txt is the only source for grouping.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE = 'https://reactbits.dev';
const CATEGORIES = ['Text Animations', 'Animations', 'Components', 'Backgrounds'];
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'references', 'catalog.md');

async function getJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  if (text.trimStart().startsWith('<')) throw new Error(`${url} returned the SPA HTML shell`);
  return JSON.parse(text);
}

async function getText(url) {
  const res = await fetch(url);
  const text = await res.text();
  if (text.trimStart().startsWith('<')) throw new Error(`${url} returned the SPA HTML shell`);
  return text;
}

// "name@range" -> "name", handling scoped packages like "@react-three/fiber@^9.3.0"
function depName(spec) {
  const m = /^(@[^/]+\/[^@]+|[^@]+)@?(.*)$/.exec(spec);
  return m ? m[1] : spec;
}

function parseLlmsTxt(text) {
  const byName = new Map();
  let category = null;
  for (const line of text.split('\n')) {
    const h = /^## (.+)$/.exec(line.trim());
    if (h) {
      category = h[1];
      continue;
    }
    if (!CATEGORIES.includes(category)) continue;
    const m = /^- \[.+?\]\(.+?\): (.+?) CLI: `(\w+)`\.$/.exec(line.trim());
    if (m) byName.set(m[2], { category, description: m[1] });
  }
  return byName;
}

const [registry, llms] = await Promise.all([
  getJson(`${BASE}/r/registry.json`),
  getText(`${BASE}/llms.txt`),
]);

const meta = parseLlmsTxt(llms);
const byTitle = new Map();
for (const item of registry.items) {
  if (!item.name.endsWith('-TS-TW')) continue; // one entry per component is enough for deps/description
  byTitle.set(item.title, item);
}

const missingFromLlms = [...byTitle.keys()].filter((t) => !meta.has(t));
const missingFromRegistry = [...meta.keys()].filter((t) => !byTitle.has(t));
if (missingFromLlms.length) throw new Error(`in registry but not llms.txt: ${missingFromLlms.join(', ')}`);
if (missingFromRegistry.length) throw new Error(`in llms.txt but not registry: ${missingFromRegistry.join(', ')}`);

const byCategory = new Map(CATEGORIES.map((c) => [c, []]));
for (const [name, { category, description }] of meta) {
  const deps = (byTitle.get(name).dependencies ?? []).map(depName);
  byCategory.get(category).push({ name, description, deps: deps.length ? deps.join(',') : 'none' });
}
for (const list of byCategory.values()) list.sort((a, b) => a.name.localeCompare(b.name));

const total = [...byCategory.values()].reduce((n, l) => n + l.length, 0);
const lines = [
  '# React Bits Component Catalog',
  '',
  `${total} components, 4 variants each (JS-CSS, JS-TW, TS-CSS, TS-TW). Generated from ${BASE}/llms.txt + ${BASE}/r/registry.json by \`scripts/gen-catalog.mjs\` — do not hand-edit, regenerate instead.`,
  '',
  'Format: `Name — one-line description (deps: ...)`. Fetch with:',
  '```',
  'node scripts/rb-add.mjs <Name> --variant <JS|TS>-<CSS|TW> --dest <path>',
  '```',
];
for (const category of CATEGORIES) {
  const items = byCategory.get(category);
  lines.push(`\n## ${category} (${items.length})\n`);
  for (const { name, description, deps } of items) {
    lines.push(`- **${name}** — ${description} (deps: ${deps})`);
  }
}

await writeFile(OUT, lines.join('\n') + '\n', 'utf8');
console.log(`wrote ${OUT} (${total} components)`);
