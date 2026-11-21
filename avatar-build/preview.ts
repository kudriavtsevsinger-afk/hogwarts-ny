import { AssetLibrary, fetchSource } from './core/assets';
import { buildHuman } from './core/human';
import { DEFAULT_PARAMS, yearsToAge } from './core/params';
import { CLIPS } from './core/anim/clips';
import { Viewer } from './app/viewer';

const hair = { crop: 'short01', part: 'short02', waves: 'bob02', long: 'long01', bun: 'ponytail01', shaved: 'none' };
const walk = CLIPS.find(clip => clip.name === 'Walk') ?? null;

export async function createPreview(canvas: HTMLCanvasElement, assetUrl: string) {
  const library = await new AssetLibrary(fetchSource(assetUrl)).init();
  const viewer = new Viewer(canvas, file => library.textureUrl(file));

  return async function show(character: { base: string; cheek: number; hair: keyof typeof hair; age: number; hairColor: string }, isSelected: () => boolean) {
    const model = await buildHuman(library, {
      ...DEFAULT_PARAMS,
      gender: character.base === 'witch' ? 0 : 1,
      age: yearsToAge(character.age || 15),
      modifiers: { 'cheek/cheek-bones': (character.cheek - 50) / 50 },
      hair: hair[character.hair] ?? 'short02',
      hairTint: character.hairColor || DEFAULT_PARAMS.hairTint,
      detail: 'medium',
    });
    if (isSelected()) {
      viewer.show(model);
      viewer.play(walk);
    }
  };
}
