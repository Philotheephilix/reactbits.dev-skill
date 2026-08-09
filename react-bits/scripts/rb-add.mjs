#!/usr/bin/env node
// rb-add — fetch React Bits components from the public shadcn registry.
//
//   node scripts/rb-add.mjs Aurora BlurText --variant TS-TW --dest src/components
//   node scripts/rb-add.mjs --list
//   node scripts/rb-add.mjs Aurora --install
//
// The registry is a static shadcn registry:
//   index      https://reactbits.dev/r/registry.json
//   component  https://reactbits.dev/r/<Name>-<JS|TS>-<CSS|TW>.json
//
// reactbits.dev is an SPA: unknown paths return HTTP 200 with an HTML shell,
// so every response must be JSON-validated. Status code alone proves nothing.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const BASE = 'https://reactbits.dev';
const VARIANTS = ['JS-CSS', 'JS-TW', 'TS-CSS', 'TS-TW'];

async function getJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  if (text.trimStart().startsWith('<')) {
    throw new Error(`${url} returned the SPA HTML shell (component does not exist)`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${url} returned non-JSON (${res.status}, ${text.length} bytes)`);
  }
}

// Deps are "name@range" strings, but 10 components use scoped packages
// ("@react-three/fiber@^9.3.0"). Splitting on "@" naively yields "".
export function parseDep(spec) {
  const m = /^(@[^/]+\/[^@]+|[^@]+)@(.*)$/.exec(spec);
  return m ? { name: m[1], range: m[2] } : { name: spec, range: '' };
}

async function loadIndex() {
  const reg = await getJson(`${BASE}/r/registry.json`);
  const byTitle = new Map();
  for (const item of reg.items) {
    const variant = item.name.slice(item.title.length + 1);
    if (!byTitle.has(item.title)) byTitle.set(item.title, { title: item.title, variants: {} });
    byTitle.get(item.title).variants[variant] = item;
  }
  return byTitle;
}

function resolveName(index, input) {
  if (index.has(input)) return input;
  const hit = [...index.keys()].find((t) => t.toLowerCase() === input.toLowerCase().replace(/-/g, ''));
  if (hit) return hit;
  const near = [...index.keys()].filter((t) => t.toLowerCase().includes(input.toLowerCase())).slice(0, 5);
  throw new Error(`unknown component "${input}"${near.length ? ` — did you mean: ${near.join(', ')}?` : ''}`);
}

async function add(name, { variant, dest, index }) {
  const title = resolveName(index, name);
  const entry = index.get(title);
  if (!entry.variants[variant]) {
    throw new Error(`${title} has no ${variant} variant (has: ${Object.keys(entry.variants).join(', ')})`);
  }
  const item = await getJson(`${BASE}/r/${title}-${variant}.json`);
  if (!item.files?.length) throw new Error(`${title}-${variant} has no files`);

  const written = [];
  for (const file of item.files) {
    if (!file.content) throw new Error(`${title}-${variant}: ${file.path} has empty content`);
    const out = resolve(dest, file.path);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, file.content, 'utf8');
    written.push({ path: join(dest, file.path), bytes: file.content.length });
  }
  return { title, description: item.description, written, deps: (item.dependencies ?? []).map(parseDep) };
}

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const variant = flag('variant', 'TS-TW');
const dest = flag('dest', 'src/components');
const doInstall = argv.includes('--install');
const names = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.match(/^--(variant|dest)$/));

if (!VARIANTS.includes(variant)) {
  console.error(`--variant must be one of ${VARIANTS.join(', ')}`);
  process.exit(1);
}

const index = await loadIndex();

if (argv.includes('--list')) {
  for (const title of [...index.keys()].sort()) console.log(title);
  console.log(`\n${index.size} components`);
  process.exit(0);
}

if (!names.length) {
  console.error('usage: rb-add <Component...> [--variant TS-TW] [--dest src/components] [--install] [--list]');
  process.exit(1);
}

const deps = new Map();
let failed = 0;

for (const name of names) {
  try {
    const r = await add(name, { variant, dest, index });
    for (const d of r.deps) deps.set(d.name, d.range);
    const files = r.written.map((w) => `${w.path} (${w.bytes}B)`).join(', ');
    console.log(`ok   ${r.title.padEnd(20)} ${files}`);
  } catch (err) {
    failed++;
    console.error(`FAIL ${name.padEnd(20)} ${err.message}`);
  }
}

if (deps.size) {
  const specs = [...deps].map(([n, r]) => (r ? `${n}@${r}` : n));
  console.log(`\ndependencies: ${specs.join(' ')}`);
  if (doInstall) {
    console.log('installing...');
    execFileSync('npm', ['install', ...specs], { stdio: 'inherit' });
  } else {
    console.log(`\n  npm install ${specs.join(' ')}`);
  }
}

process.exit(failed ? 1 : 0);
