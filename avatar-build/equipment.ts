import * as THREE from 'three';

const robes = {
  classic: { color: 0x252038, hem: 0.28, flare: 0.22 },
  traveler: { color: 0x4c3829, hem: 0.41, flare: 0.18 },
  ceremony: { color: 0x650f26, hem: 0.14, flare: 0.28 },
};
const woods = { oak: 0x624023, ash: 0xa17a4d, willow: 0x9a6548, yew: 0x462719 };

export function equip(mesh: THREE.SkinnedMesh, height: number, robe?: keyof typeof robes, wand?: keyof typeof woods) {
  const outfit = robes[robe ?? 'classic'] ?? robes.classic;
  const cloth = new THREE.MeshStandardMaterial({ color: outfit.color, side: THREE.DoubleSide });
  const length = height * (0.84 - outfit.hem);
  const cape = new THREE.Mesh(
    new THREE.CylinderGeometry(height * 0.125, height * outfit.flare, length, 32, 1, true, Math.PI / 2, Math.PI),
    cloth,
  );
  cape.scale.z = 0.72;
  cape.position.set(0, height * 0.84 - length / 2, -height * 0.025);
  mesh.add(cape);

  const hand = mesh.skeleton.getBoneByName('RightHand');
  if (!hand) return [cape];
  const wandMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.002, 0.007, height * 0.18, 12),
    new THREE.MeshStandardMaterial({ color: woods[wand ?? 'oak'] ?? woods.oak, roughness: 0.85 }),
  );
  wandMesh.rotation.x = Math.PI / 2;
  wandMesh.position.set(0, height * 0.032, height * 0.065);
  hand.add(wandMesh);
  return [cape, wandMesh];
}
