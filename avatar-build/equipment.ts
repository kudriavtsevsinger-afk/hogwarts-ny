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
  const sections = [
    { y: 0.865, width: 0.067, depth: 0.067, opening: 0.68 },
    { y: 0.815, width: 0.155, depth: 0.096, opening: 0.36 },
    { y: 0.730, width: 0.148, depth: 0.110, opening: 0.24 },
    { y: 0.595, width: 0.145, depth: 0.103, opening: 0.24 },
    { y: 0.490, width: 0.166, depth: 0.113, opening: 0.31 },
    { y: outfit.hem, width: outfit.flare, depth: outfit.flare * 0.67, opening: 0.46 },
  ];
  const segments = 48;
  const positions: number[] = [];
  const indices: number[] = [];
  const edges = [[], []] as THREE.Vector3[][];
  sections.forEach(({ y, width, depth, opening }, ring) => {
    for (let segment = 0; segment <= segments; segment++) {
      const angle = opening + segment / segments * (2 * Math.PI - 2 * opening);
      const fold = ring < 2 ? 1 : 1 + 0.035 * Math.sin(angle * 9);
      const point = new THREE.Vector3(
        height * width * fold * Math.sin(angle),
        height * y,
        height * depth * fold * Math.cos(angle),
      );
      positions.push(point.x, point.y, point.z);
      if (segment === 0) edges[0].push(point);
      if (segment === segments) edges[1].push(point);
      if (ring > 0 && segment < segments) {
        const lower = ring * (segments + 1) + segment;
        const upper = lower - segments - 1;
        indices.push(upper, upper + 1, lower, lower, upper + 1, lower + 1);
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mantle = new THREE.Mesh(geometry, cloth);
  mesh.add(mantle);
  const items: THREE.Mesh[] = [mantle];
  for (const edge of edges) {
    const border = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), 40, height * 0.0028, 6),
      new THREE.MeshStandardMaterial({ color: robe === 'ceremony' ? 0xb78d46 : 0x773043 }),
    );
    mesh.add(border);
    items.push(border);
  }

  const hand = mesh.skeleton.getBoneByName('RightHand');
  if (!hand) return items;
  const wandMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.002, 0.007, height * 0.18, 12),
    new THREE.MeshStandardMaterial({ color: woods[wand ?? 'oak'] ?? woods.oak, roughness: 0.85 }),
  );
  wandMesh.rotation.x = Math.PI / 2;
  wandMesh.position.set(0, height * 0.032, height * 0.065);
  hand.add(wandMesh);
  items.push(wandMesh);
  return items;
}
