import type { SkinnedMesh } from 'three';
import { equip } from './hogwarts-equipment';
import { AssetLibrary, fetchSource } from './core/assets';
import { buildHuman } from './core/human';
import { DEFAULT_PARAMS, yearsToAge } from './core/params';
import { CLIPS } from './core/anim/clips';
import { Viewer } from './app/viewer';

const hair = { crop: 'short01', part: 'short02', waves: 'bob02', long: 'long01', bun: 'ponytail01', shaved: 'none' };
const walk = CLIPS.find(clip => clip.name === 'Walk') ?? null;

export async function createPreview(canvas: HTMLCanvasElement, assetUrl: string, editor = false) {
  const library = await new AssetLibrary(fetchSource(assetUrl)).init();
  const viewer = new Viewer(canvas, file => library.textureUrl(file));
  if (editor) viewer.focusFace(true);

  const sliders = {
    headWidth: 'head/head-scale-horiz', jaw: 'chin/chin-bones',
    cheek: 'cheek/cheek-bones', chin: 'chin/chin-prominent',
    eyes: 'eyes/eye-scale', eyeSpacing: 'eyes/eye-trans',
    nose: 'nose/nose-scale-vert', noseWidth: 'nose/nose-scale-horiz',
    mouth: 'mouth/mouth-scale-horiz', brow: 'eyebrows/eyebrows-trans',
  };
  type Appearance = Partial<Record<keyof typeof sliders, number>> & {
    base: string; hair: keyof typeof hair; age: number; hairColor: string; bodyHeight?: number; skin?: string; robe?: Parameters<typeof equip>[2]; wand?: Parameters<typeof equip>[3];
  };
  const sliderValue = (value = 50) => Math.max(-1, Math.min(1, (value - 50) / 50));
  let equipment: import("three").Mesh[] = [];
  async function show(character: Appearance, isSelected: () => boolean) {
    const model = await buildHuman(library, {
      ...DEFAULT_PARAMS,
      gender: character.base === 'witch' ? 0 : 1,
      age: yearsToAge(character.age || 15),
      modifiers: Object.fromEntries(Object.entries(sliders).map(([key, id]) => [id, sliderValue(character[key as keyof typeof sliders])])),
      height: (sliderValue(character.bodyHeight) + 1) / 2,
      skinTint: character.skin || DEFAULT_PARAMS.skinTint,
      hair: hair[character.hair] ?? 'short02',
      hairTint: character.hairColor || DEFAULT_PARAMS.hairTint,
      detail: 'medium',
    });
    if (isSelected()) {
      for (const item of equipment) {
        item.removeFromParent();
        item.geometry.dispose();
        (item.material as import('three').Material).dispose();
      }
      viewer.show(model);
      const mesh = (viewer as unknown as { mesh: SkinnedMesh }).mesh;
      equipment = mesh.isSkinnedMesh ? equip(mesh, model.height, character.robe, character.wand) : [];
      if (!editor) viewer.play(walk);
    }
  };
  return Object.assign(show, { focusFace: (value: boolean) => viewer.focusFace(value) });
}
