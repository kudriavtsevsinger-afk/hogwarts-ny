import { readFile, writeFile } from 'node:fs/promises';

const worker = await readFile(new URL('../hogwarts-worker.mjs', import.meta.url), 'utf8');
const assetsLine = worker.split('\n').find(line => line.startsWith('const assets = '));
const assets = JSON.parse(assetsLine.slice('const assets = '.length, -1));
let player = Buffer.from(assets['/assets/player.js'][1], 'base64').toString('utf8');
const oldImport = "import('./avatar3d.js')";
if (!player.includes(oldImport)) throw new Error('Player avatar import not found');
player = player
  .replace("+choices('house')", "")
  .replace("house:Object.fromEntries(Object.entries(HOUSE).map(([k,v])=>[k,v.name])),", "")
  .replace('Одежда, рост, факультет и магическое оружие', 'Мантия, рост и древесина палочки')
  .replace("avatar=mod.createAvatar(container,character);", "avatar=mod.createAvatar(container,character);avatar.focusFace(currentTab!=='style');")
  .replace("currentTab=btn.dataset.tab;renderControls();", "currentTab=btn.dataset.tab;renderControls();avatar?.focusFace(currentTab!=='style');");
await writeFile(new URL('../avatar-static/assets/player.js', import.meta.url), player.replace(oldImport, "import('./editor-avatar.js')"));
