#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
node "$root/avatar-build/prepare-editor.mjs"
upstream="$(mktemp -d)"
trap 'rm -rf "$upstream"' EXIT
git -C "$upstream" init -q
git -C "$upstream" fetch --depth 1 https://github.com/TuriaArt/3d-gen-TU.git 3d78dcad462feeeb64db7fe667a7c34105a10a45
git -C "$upstream" checkout --detach -q FETCH_HEAD
cp "$root/avatar-build/preview.ts" "$upstream/src/hogwarts-preview.ts"
cp "$root/avatar-build/equipment.ts" "$upstream/src/hogwarts-equipment.ts"
cd "$upstream"
npm ci --no-audit --no-fund
node --import tsx scripts/setup-assets.ts
destination="$root/avatar-static/assets/real-avatar"
mkdir -p "$destination"
node -e 'require("esbuild").buildSync({entryPoints:["src/hogwarts-preview.ts"],bundle:true,format:"esm",legalComments:"eof",outfile:process.argv[1]})' "$destination/preview.js"
cp -R public/assets/{base.pack,targets.pack,catalog.json,textures,proxies,LICENSE.txt} "$destination/"
cp LICENSE "$destination/ARA-LICENSE.txt"
