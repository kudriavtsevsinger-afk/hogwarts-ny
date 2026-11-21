import { readFile, writeFile } from 'node:fs/promises';

const worker = await readFile(new URL('../hogwarts-worker.mjs', import.meta.url), 'utf8');
const assetsLine = worker.split('\n').find(line => line.startsWith('const assets = '));
const assets = JSON.parse(assetsLine.slice('const assets = '.length, -1));
const player = Buffer.from(assets['/assets/player.js'][1], 'base64').toString('utf8');
const oldImport = "import('./avatar3d.js')";
if (!player.includes(oldImport)) throw new Error('Player avatar import not found');
await writeFile(new URL('../avatar-static/assets/player.js', import.meta.url), player.replace(oldImport, "import('./editor-avatar.js')"));
