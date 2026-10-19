/*
Concept: SUNBURN is a sun-drenched voxel coastal city where two indebted outlaws pull off a daring bank heist, steal a getaway car, and battle a police blockade beneath a burning sunset. Every building, vehicle, person, palm tree, and piece of loot is constructed from individual cubes.

Shot 1 — Frames 0–111: High aerial dive along the coastal boulevard. Towering voxel buildings, palms, traffic, and the ocean open into view while the sun and city lights react to the beat.
Shot 2 — Frames 112–168: Low rear chase behind an orange getaway car. The camera accelerates with the car as road fragments and light streaks whip past.
Shot 3 — Frames 169–224: Elevated pursuit through the neon downtown corridor. A black-and-white police cruiser closes from behind while its red and blue light bar flips every beat.
Shot 4 — Frames 225–280: Push into a voxel bank as the reinforced vault swings open. Gold rises and erupts toward camera while the two leads stand silhouetted in the hot backlight.
Shot 5 — Frames 281–337: Ground-level boardwalk sprint. The camera retreats and pushes toward the two fleeing leads as the ocean burns red beside them.
Shot 6 — Frames 338–389: Wide sunset reveal over the voxel skyline. SUNBURN slams into frame, followed by COMING NOVEMBER, then holds for the final beat.
*/

import {
  useLayoutEffect,
  useMemo,
  useRef,
  type FC,
  type ReactNode,
} from "react";
import {random, useCurrentFrame} from "remotion";
import {ThreeCanvas} from "@remotion/three";
import {useThree} from "@react-three/fiber";
import * as THREE from "three";

type Cube = {
  p: [number, number, number];
  c: string;
  s: [number, number, number];
};

type CityAssets = {
  ground: Cube[];
  solid: Cube[];
  lights: Cube[];
  ocean: Cube[];
  foam: Cube[];
};

type CarAssets = {
  solid: Cube[];
  glow: Cube[];
  red: Cube[];
  blue: Cube[];
};

type BankAssets = {
  solid: Cube[];
  gold: Cube[];
  door: Cube[];
  beams: Cube[];
};

const BEAT = 14.0625;
const CELL = 0.72;

const addCube = (
  target: Cube[],
  p: [number, number, number],
  c: string,
  s: [number, number, number] = [0.69, 0.69, 0.69],
) => {
  target.push({p, c, s});
};

const nearestBeat = (frame: number) => Math.round(frame / BEAT);

const beatPulse = (frame: number) => {
  const distance = Math.abs(frame - nearestBeat(frame) * BEAT);
  return Math.max(0, 1 - distance / 5.4);
};

const makeCity = (): CityAssets => {
  const ground: Cube[] = [];
  const solid: Cube[] = [];
  const lights: Cube[] = [];
  const ocean: Cube[] = [];
  const foam: Cube[] = [];

  const sand = ["#d7ae78", "#c99a67", "#e0ba84"];
  const buildingColors = [
    "#e96b52",
    "#f1b66d",
    "#5e91a2",
    "#d85578",
    "#80699c",
    "#d98b63",
  ];

  for (let x = -40; x <= 40; x++) {
    for (let z = -28; z <= 30; z++) {
      const coastal = z > 21;
      const color = coastal
        ? sand[(x + z + 100) % sand.length]
        : (x + z) % 3 === 0
          ? "#c8925e"
          : (x + z) % 3 === 1
            ? "#d6a66c"
            : "#b97b4e";

      addCube(
        ground,
        [x * CELL, -0.58, z * CELL],
        color,
        [0.7, 0.7, 0.7],
      );
    }
  }

  for (let x = -40; x <= 40; x++) {
    for (let z = -4; z <= 4; z++) {
      const lane = z === 0 && x % 4 === 0;
      addCube(
        ground,
        [x * CELL, -0.16, z * CELL],
        lane ? "#f3d79c" : z % 2 === 0 ? "#303441" : "#363b48",
        [0.7, 0.28, 0.7],
      );
    }
  }

  for (const side of [-1, 1]) {
    for (let x = -40; x <= 40; x++) {
      addCube(
        ground,
        [x * CELL, 0.03, side * 5.25 * CELL],
        side === 1 ? "#e1bd86" : "#cfa36f",
        [0.7, 0.42, 0.7],
      );
    }
  }

  const startsX = [-29, -16, -3, 10, 23];
  const startsZ = [-24, -13, 9, 20];

  for (const startX of startsX) {
    for (const startZ of startsZ) {
      const width = 5 + Math.floor(random(`w-${startX}-${startZ}`) * 3);
      const depth = 5 + Math.floor(random(`d-${startX}-${startZ}`) * 3);
      const height = 13 + Math.floor(random(`h-${startX}-${startZ}`) * 16);
      const paint =
        buildingColors[
          Math.floor(random(`c-${startX}-${startZ}`) * buildingColors.length)
        ];

      for (let ix = 0; ix < width; ix++) {
        for (let iz = 0; iz < depth; iz++) {
          for (let iy = 0; iy < height; iy++) {
            const facade =
              ix === 0 ||
              ix === width - 1 ||
              iz === 0 ||
              iz === depth - 1;
            const trim = facade && iy % 5 === 0;
            const windowPattern =
              facade &&
              iy % 3 === 1 &&
              (ix + iz + iy) % 3 === 0;

            const cubeColor = windowPattern
              ? "#21394c"
              : trim
                ? "#f5d49c"
                : paint;

            addCube(
              solid,
              [(startX + ix) * CELL, iy * CELL + 0.3, (startZ + iz) * CELL],
              cubeColor,
              [0.69, 0.69, 0.69],
            );

            if (windowPattern) {
              const lit = random(
                `lit-${startX}-${startZ}-${ix}-${iz}-${iy}`,
              );

              if (lit > 0.2) {
                const lightColor =
                  lit > 0.55 ? "#ffd66f" : lit > 0.35 ? "#8ae3df" : "#ff7f87";

                if (ix === 0 || ix === width - 1) {
                  const sign = ix === 0 ? -1 : 1;

                  addCube(
                    lights,
                    [
                      (startX + ix) * CELL + sign * CELL * 0.51,
                      iy * CELL + 0.3,
                      (startZ + iz) * CELL,
                    ],
                    lightColor,
                    [0.08, 0.38, 0.35],
                  );
                } else {
                  const sign = iz === 0 ? -1 : 1;

                  addCube(
                    lights,
                    [
                      (startX + ix) * CELL,
                      iy * CELL + 0.3,
                      (startZ + iz) * CELL + sign * CELL * 0.51,
                    ],
                    lightColor,
                    [0.35, 0.38, 0.08],
                  );
                }
              }
            }
          }
        }
      }

      addCube(
        solid,
        [
          (startX + width * 0.5) * CELL,
          height * CELL + 0.65,
          (startZ + depth * 0.5) * CELL,
        ],
        "#526376",
        [1.5, 0.85, 1.5],
      );

      if (random(`billboard-${startX}-${startZ}`) > 0.55) {
        addCube(
          solid,
          [
            (startX + width * 0.5) * CELL,
            height * CELL + 1.65,
            (startZ + depth * 0.5) * CELL,
          ],
          "#ef5b66",
          [2.2, 0.72, 0.32],
        );
      }
    }
  }

  for (const side of [-1, 1]) {
    for (let x = -29; x <= 29; x += 9) {
      const base: [number, number, number] = [
        x * CELL,
        0.12,
        side * 6.9 * CELL,
      ];

      for (let iy = 0; iy < 8; iy++) {
        addCube(
          solid,
          [base[0], base[1] + 0.22 + iy * 0.42, base[2]],
          iy % 2 ? "#8a5938" : "#a66c40",
          [0.34, 0.48, 0.34],
        );
      }

      for (let leaf = 0; leaf < 9; leaf++) {
        const angle = (leaf / 9) * Math.PI * 2;
        const size = leaf % 2 === 0 ? 0.48 : 0.4;

        for (let segment = 1; segment <= 3; segment++) {
          addCube(
            solid,
            [
              base[0] + Math.cos(angle) * segment * 0.43,
              base[1] + 3.55 - segment * 0.1,
              base[2] + Math.sin(angle) * segment * 0.43,
            ],
            segment === 3 ? "#72b85f" : "#3f8a55",
            [size, 0.28, size],
          );
        }
      }
    }
  }

  const traffic = [
    [-24, -2.3, "#f2c85d"],
    [-18, 2.3, "#d85e71"],
    [-5, -2.3, "#55b8bd"],
    [7, 2.3, "#eee1c5"],
    [19, -2.3, "#eb704d"],
    [30, 2.3, "#8d76b4"],
  ] as const;

  for (const [x, z, color] of traffic) {
    addCube(solid, [x, 0.62, z], color, [2.5, 0.8, 1.05]);
    addCube(solid, [x + 0.2, 1.13, z], "#23394b", [1.15, 0.5, 0.92]);
  }

  for (let x = -40; x <= 40; x++) {
    for (let z = 31; z <= 50; z++) {
      const color =
        (x + z) % 4 === 0
          ? "#35b2b4"
          : (x + z) % 4 === 1
            ? "#2499a8"
            : (x + z) % 4 === 2
              ? "#187e95"
              : "#126f88";

      addCube(
        ocean,
        [x * CELL, -0.35, z * CELL],
        color,
        [0.7, 0.4, 0.7],
      );
    }
  }

  for (let x = -39; x <= 39; x += 2) {
    addCube(
      foam,
      [x * CELL, 0.03, 30.65 * CELL],
      x % 4 === 0 ? "#fff2ce" : "#c1eee4",
      [0.72, 0.1, 0.28],
    );
  }

  return {ground, solid, lights, ocean, foam};
};

const makeSun = (): Cube[] => {
  const cubes: Cube[] = [];
  const radius = 5.4;

  for (let x = -5; x <= 5; x++) {
    for (let y = -5; y <= 5; y++) {
      if (x * x + y * y <= radius * radius) {
        addCube(
          cubes,
          [x * 1.05, y * 1.05, 0],
          "#ffd15d",
          [1.03, 1.03, 0.72],
        );
      }
    }
  }

  return cubes;
};

const makeCar = (paint: string, police = false): CarAssets => {
  const solid: Cube[] = [];
  const glow: Cube[] = [];
  const red: Cube[] = [];
  const blue: Cube[] = [];

  for (let x = -3; x <= 3; x++) {
    for (const z of [-1.48, -0.74, 0, 0.74, 1.48]) {
      addCube(solid, [x * 0.7, 0.94, z], paint, [0.68, 0.68, 0.68]);
    }
  }

  for (const x of [-2.5, 2.5]) {
    for (const z of [-0.74, 0.74]) {
      addCube(solid, [x, 1.5, z], paint, [0.68, 0.68, 0.68]);
    }
  }

  for (let x = -1; x <= 1; x++) {
    for (const z of [-1.22, 1.22]) {
      addCube(solid, [x * 0.7, 1.96, z], "#17384b", [0.66, 0.78, 0.12]);
    }
  }

  for (const x of [-0.7, 0, 0.7]) {
    for (const z of [-0.7, 0.7]) {
      addCube(
        solid,
        [x, 2.51, z],
        police ? "#e9eee7" : "#f4c77f",
        [0.68, 0.48, 0.68],
      );
    }
  }

  for (const z of [-0.55, 0, 0.55]) {
    addCube(solid, [1.67, 2.02, z], "#1b4256", [0.12, 0.72, 0.48]);
  }

  for (const x of [-2.25, 2.25]) {
    for (const z of [-1.72, 1.72]) {
      addCube(solid, [x, 0.72, z], "#171a22", [1.3, 1.3, 0.56]);
      addCube(
        solid,
        [x, 0.72, z + (z > 0 ? 0.32 : -0.32)],
        "#d9bd72",
        [0.48, 0.48, 0.12],
      );
    }
  }

  for (const z of [-1.08, 1.08]) {
    addCube(glow, [3.57, 1.16, z], "#fff5b8", [0.18, 0.36, 0.46]);
    addCube(glow, [-3.57, 1.16, z], "#ff4c46", [0.18, 0.34, 0.42]);
  }

  for (const x of [-1.4, 0, 1.4]) {
    addCube(
      solid,
      [x, 1.54, 0],
      police ? "#25334e" : "#f6dfa7",
      [0.5, 0.08, 0.24],
    );
  }

  if (police) {
    addCube(solid, [0, 2.77, 0], "#273044", [1.15, 0.24, 0.76]);
    addCube(red, [-0.29, 2.94, 0], "#ff304f", [0.5, 0.36, 0.62]);
    addCube(blue, [0.29, 2.94, 0], "#36a9ff", [0.5, 0.36, 0.62]);
  }

  return {solid, glow, red, blue};
};

const makeStandingPerson = (
  shirt: string,
  trousers: string,
  accent: string,
): Cube[] => {
  const cubes: Cube[] = [];

  addCube(cubes, [0, 3.48, 0], "#dca77d", [0.7, 0.72, 0.68]);
  addCube(cubes, [0, 3.81, -0.03], accent, [0.74, 0.25, 0.7]);
  addCube(cubes, [0, 2.5, 0], shirt, [0.98, 1.22, 0.6]);
  addCube(cubes, [0, 1.77, 0], trousers, [0.84, 0.52, 0.54]);

  for (const side of [-1, 1]) {
    addCube(
      cubes,
      [side * 0.27, 0.97, 0],
      trousers,
      [0.38, 1.28, 0.42],
    );
    addCube(
      cubes,
      [side * 0.27, 0.27, 0.11],
      "#171922",
      [0.48, 0.32, 0.7],
    );
    addCube(
      cubes,
      [side * 0.69, 2.45, 0],
      shirt,
      [0.31, 1.17, 0.37],
    );
    addCube(
      cubes,
      [side * 0.69, 1.78, 0],
      "#dca77d",
      [0.33, 0.29, 0.35],
    );
  }

  return cubes;
};

const makeRunner = (
  frame: number,
  shirt: string,
  trousers: string,
  accent: string,
  phase: number,
): Cube[] => {
  const cubes: Cube[] = [];
  const cycle = Math.sin((frame / BEAT) * Math.PI * 2 + phase);
  const bob =
    Math.abs(Math.cos((frame / BEAT) * Math.PI * 2 + phase)) * 0.11;

  addCube(cubes, [0, 3.52 + bob, 0], "#dca77d", [0.7, 0.72, 0.68]);
  addCube(cubes, [0, 3.85 + bob, -0.04], accent, [0.75, 0.25, 0.7]);
  addCube(cubes, [0, 2.56 + bob, 0], shirt, [0.98, 1.22, 0.6]);
  addCube(cubes, [0, 1.82 + bob, 0], trousers, [0.84, 0.5, 0.54]);

  for (const side of [-1, 1]) {
    const swing = side === -1 ? cycle : -cycle;

    addCube(
      cubes,
      [side * 0.26, 1 + bob, swing * 0.43],
      trousers,
      [0.38, 1.28, 0.42],
    );
    addCube(
      cubes,
      [side * 0.26, 0.27 + bob, swing * 0.65 + 0.13],
      "#171922",
      [0.48, 0.32, 0.72],
    );
    addCube(
      cubes,
      [side * 0.69, 2.5 + bob, -swing * 0.52],
      shirt,
      [0.31, 1.18, 0.37],
    );
    addCube(
      cubes,
      [side * 0.69, 1.82 + bob, -swing * 0.73],
      "#dca77d",
      [0.33, 0.29, 0.35],
    );
  }

  return cubes;
};

const makeBank = (): BankAssets => {
  const solid: Cube[] = [];
  const gold: Cube[] = [];
  const door: Cube[] = [];
  const beams: Cube[] = [];
  const unit = 0.7;

  for (let x = -11; x <= 11; x++) {
    for (let z = -9; z <= 11; z++) {
      addCube(
        solid,
        [x * unit, -0.2, z * unit],
        (x + z) % 2 ? "#302b3a" : "#413a4d",
        [0.68, 0.42, 0.68],
      );
    }
  }

  for (let x = -10; x <= 10; x++) {
    for (let y = 0; y < 11; y++) {
      addCube(
        solid,
        [x * unit, y * unit + 0.34, -8 * unit],
        y % 5 === 0 ? "#8c7187" : "#51465e",
        [0.68, 0.68, 0.68],
      );
    }
  }

  for (const side of [-1, 1]) {
    for (let z = -8; z <= 11; z++) {
      for (let y = 0; y < 11; y++) {
        addCube(
          solid,
          [side * 10 * unit, y * unit + 0.34, z * unit],
          y % 5 === 0 ? "#7b657c" : "#443c50",
          [0.68, 0.68, 0.68],
        );
      }
    }
  }

  for (const x of [-6.2, 6.2]) {
    for (let y = 0; y < 7; y++) {
      addCube(
        solid,
        [x * unit, y * unit + 0.34, -1.2 * unit],
        "#8a758b",
        [0.76, 0.68, 0.76],
      );
    }
  }

  for (const x of [-4, 4]) {
    for (let y = 1; y <= 6; y++) {
      addCube(
        solid,
        [x * unit, y * unit, -7.54 * unit],
        "#b8a8a8",
        [0.76, 0.68, 0.5],
      );
    }
  }

  for (let y = 1; y <= 6; y++) {
    addCube(
      solid,
      [0, y * unit, -7.54 * unit],
      "#786d7c",
      [8.2 * unit, 0.68, 0.5],
    );
  }

  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 6; y++) {
      addCube(
        door,
        [x * unit, y * unit + 0.5, 0],
        (x + y) % 3 === 0 ? "#b3a4a8" : "#8e8794",
        [0.68, 0.68, 0.48],
      );
    }
  }

  addCube(
    door,
    [4 * unit, 3 * unit, 0.31],
    "#f0d39a",
    [0.72, 0.72, 0.52],
  );

  for (let stack = 0; stack < 24; stack++) {
    const x = (stack % 6) * 0.74 - 1.85;
    const z = -5.2 + Math.floor(stack / 6) * 0.74;
    const layers = 2 + (stack % 3);

    for (let layer = 0; layer < layers; layer++) {
      addCube(
        gold,
        [x, 0.28 + layer * 0.3, z],
        layer % 2 ? "#ffd85c" : "#eaa63a",
        [0.64, 0.28, 0.43],
      );
    }
  }

  for (let i = 0; i < 10; i++) {
    addCube(
      beams,
      [-2.4 + i * 0.53, 1.2 + (i % 3) * 0.28, -4.4],
      "#ffd767",
      [0.14, 4.4, 0.14],
    );
  }

  return {solid, gold, door, beams};
};

const makePromenade = (): {solid: Cube[]; water: Cube[]; lights: Cube[]} => {
  const solid: Cube[] = [];
  const water: Cube[] = [];
  const lights: Cube[] = [];

  for (let x = -6; x <= 5; x++) {
    for (let z = -15; z <= 21; z++) {
      addCube(
        solid,
        [x * 0.7, -0.05, z * 0.7],
        (x + z) % 2 ? "#b97849" : "#cf8d56",
        [0.68, 0.5, 0.68],
      );
    }
  }

  for (let x = 7; x <= 22; x++) {
    for (let z = -15; z <= 21; z++) {
      addCube(
        water,
        [x * 0.7, -0.2, z * 0.7],
        (x + z) % 3 === 0 ? "#2ca7ad" : "#188398",
        [0.68, 0.42, 0.68],
      );
    }
  }

  for (let z = -15; z <= 21; z++) {
    addCube(
      solid,
      [5.65, 0.5, z * 0.7],
      "#efc17e",
      [0.2, 1.3, 0.2],
    );
  }

  for (let z = -12; z <= 18; z += 6) {
    addCube(solid, [-4.55, 1.1, z * 0.7], "#684a3c", [0.22, 2.2, 0.22]);
    addCube(
      solid,
      [-4.55, 2.25, z * 0.7],
      "#ffe2a1",
      [0.45, 0.35, 0.45],
    );
    addCube(
      lights,
      [-4.55, 2.25, z * 0.7],
      "#fff0a4",
      [0.5, 0.4, 0.5],
    );
  }

  return {solid, water, lights};
};

const makeSpeedLines = (frame: number, carX: number): Cube[] => {
  const cubes: Cube[] = [];

  for (let i = 0; i < 20; i++) {
    const x = carX + 7 - ((frame * 0.76 + i * 3.7) % 30);
    const z = i % 2 === 0 ? -3.45 : 3.45;
    const y = 0.38 + (i % 4) * 0.3;

    addCube(
      cubes,
      [x, y, z],
      i % 3 === 0 ? "#ffd985" : "#fff1dd",
      [0.12, 0.12, 1.1],
    );
  }

  return cubes;
};

const makeCashBurst = (frame: number): Cube[] => {
  const cubes: Cube[] = [];
  const phase = ((frame - 267) % BEAT) / BEAT;
  const radius = 0.6 + phase * 4.5;

  for (let i = 0; i < 84; i++) {
    const angle = (i / 84) * Math.PI * 2 + phase * 0.5;
    const lift =
      1.1 + Math.sin(phase * Math.PI) * 4.9 + (i % 6) * 0.16;

    addCube(
      cubes,
      [
        Math.cos(angle) * radius,
        lift,
        -3.8 + Math.sin(angle) * radius * 0.68,
      ],
      i % 3 === 0 ? "#fff0a0" : i % 3 === 1 ? "#ffd052" : "#e99a2e",
      [0.5, 0.24, 0.72],
    );
  }

  return cubes;
};

const VoxelBatch: FC<{
  cubes: Cube[];
  basic?: boolean;
  opacity?: number;
}> = ({cubes, basic = false, opacity = 1}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const args = useMemo(
    () =>
      [undefined, undefined, cubes.length] as unknown as [
        THREE.BufferGeometry,
        THREE.Material,
        number,
      ],
    [cubes.length],
  );

  useLayoutEffect(() => {
    const mesh = ref.current;

    if (!mesh) {
      return;
    }

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    if (!mesh.instanceColor) {
      mesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(cubes.length * 3),
        3,
      );
    }

    cubes.forEach((cube, index) => {
      dummy.position.set(cube.p[0], cube.p[1], cube.p[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(cube.s[0], cube.s[1], cube.s[2]);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      color.set(cube.c);
      mesh.setColorAt(index, color);
    });

    mesh.count = cubes.length;
    mesh.instanceMatrix.needsUpdate = true;

    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }

    (mesh.material as THREE.Material).needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [cubes]);

  if (cubes.length === 0) {
    return null;
  }

  return (
    <instancedMesh ref={ref} args={args} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      {basic ? (
        <meshBasicMaterial
          vertexColors
          toneMapped={false}
          transparent={opacity < 1}
          opacity={opacity}
        />
      ) : (
        <meshStandardMaterial
          vertexColors
          roughness={0.78}
          metalness={0.04}
          transparent={opacity < 1}
          opacity={opacity}
        />
      )}
    </instancedMesh>
  );
};

const CityWorld: FC<{frame: number; city: CityAssets}> = ({
  frame,
  city,
}) => {
  const oceanLift = Math.sin(frame * 0.12) * 0.07;
  const foamShift = -((frame * 0.23) % 2.2);
  const windowOpacity = 0.68 + beatPulse(frame) * 0.32;

  return (
    <group>
      <VoxelBatch cubes={city.ground} />
      <VoxelBatch cubes={city.solid} />
      <VoxelBatch cubes={city.lights} basic opacity={windowOpacity} />
      <group position={[0, oceanLift, 0]}>
        <VoxelBatch cubes={city.ocean} />
      </group>
      <group position={[foamShift, 0, 0]}>
        <VoxelBatch cubes={city.foam} />
      </group>
    </group>
  );
};

const CameraRig: FC<{frame: number}> = ({frame}) => {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const target = new THREE.Vector3();
  const pulse = beatPulse(frame);

  camera.fov = 48;
  camera.near = 0.1;
  camera.far = 300;
  camera.up.set(0, 1, 0);

  if (frame < 112) {
    const u = frame / 111;
    camera.position.set(
      -40 + 58 * u,
      21 - 7 * u - pulse * 0.5,
      15,
    );
    target.set(-28 + 59 * u, 3.5, -2);
  } else if (frame < 169) {
    const u = (frame - 112) / 56;
    const carX = -22 + 55 * u;
    camera.position.set(carX - 6.8, 2.35, 3.55);
    target.set(carX + 0.8, 1.45, 0);
  } else if (frame < 225) {
    const u = (frame - 169) / 55;
    const carX = -7 + 43 * u;
    camera.position.set(
      carX - 7.5,
      6.2 + Math.sin(u * Math.PI) * 0.55,
      8,
    );
    target.set(carX + 1, 1.25, 0);
  } else if (frame < 281) {
    const u = (frame - 225) / 55;
    const impact = frame >= 267 ? pulse : 0;
    camera.position.set(
      11 - 7.2 * u + impact * 0.18,
      7.2 - 3.4 * u + impact * 0.1,
      14 - 8 * u,
    );
    target.set(0, 2.3, -3.1);
  } else if (frame < 338) {
    const u = (frame - 281) / 56;
    const runnerZ = -6 + 11 * u;
    camera.position.set(
      0.65 + Math.sin(u * Math.PI) * 0.55,
      3.2,
      10.2 - 1.3 * u,
    );
    target.set(0, 2.35, runnerZ + 0.9);
  } else {
    const u = Math.min(1, (frame - 338) / 7);
    camera.position.set(28 - 3 * u, 38 - 3 * u, 50 - 3 * u);
    target.set(-8, 4, -4);
  }

  camera.lookAt(target);

  if (frame >= 112 && frame < 169) {
    camera.rotation.z +=
      -0.014 * Math.sin((frame / BEAT) * Math.PI * 2);
  }

  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return null;
};

const Lighting: FC<{
  frame: number;
  sky: string;
  ground: string;
  key: string;
  intensity?: number;
}> = ({frame, sky, ground, key, intensity = 1}) => {
  const pulse = beatPulse(frame);

  return (
    <>
      <ambientLight intensity={0.58 * intensity} color={key} />
      <hemisphereLight args={[sky, ground, 1.62 * intensity]} />
      <directionalLight
        position={[-24, 34, 18]}
        color={key}
        intensity={(2.3 + pulse * 1.15) * intensity}
      />
    </>
  );
};

const PoliceCar: FC<{
  x: number;
  frame: number;
  car: CarAssets;
}> = ({x, frame, car}) => {
  const alternate = nearestBeat(frame) % 2 === 0;
  const pulse = beatPulse(frame);

  return (
    <group position={[x, 0, 0]}>
      <VoxelBatch cubes={car.solid} />
      <group visible={alternate}>
        <VoxelBatch cubes={car.red} basic />
      </group>
      <group visible={!alternate}>
        <VoxelBatch cubes={car.blue} basic />
      </group>
      <pointLight
        position={[0, 3.2, 0]}
        color={alternate ? "#ff3155" : "#2ca8ff"}
        intensity={5 + pulse * 14}
        distance={24}
        decay={2}
      />
    </group>
  );
};

const ShotOne: FC<{
  frame: number;
  city: CityAssets;
  sun: Cube[];
}> = ({frame, city, sun}) => {
  return (
    <>
      <color attach="background" args={["#f1a063"]} />
      <fog attach="fog" args={["#eda274", 50, 155]} />
      <Lighting
        frame={frame}
        sky="#ffdfaa"
        ground="#75425b"
        key="#ffd58b"
      />
      <CameraRig frame={frame} />
      <CityWorld frame={frame} city={city} />
      <group position={[28, 14, -43]} scale={1.35}>
        <VoxelBatch cubes={sun} basic />
      </group>
    </>
  );
};

const ShotTwo: FC<{
  frame: number;
  city: CityAssets;
  car: CarAssets;
}> = ({frame, city, car}) => {
  const u = (frame - 112) / 56;
  const carX = -22 + 55 * u;
  const lines = useMemo(
    () => makeSpeedLines(frame, carX),
    [frame, carX],
  );

  return (
    <>
      <color attach="background" args={["#dd7b61"]} />
      <fog attach="fog" args={["#d9826d", 45, 138]} />
      <Lighting
        frame={frame}
        sky="#ffd8a6"
        ground="#683a57"
        key="#ffc77e"
        intensity={1.1}
      />
      <CameraRig frame={frame} />
      <CityWorld frame={frame} city={city} />
      <group position={[carX, 0, 0]}>
        <VoxelBatch cubes={car.solid} />
        <VoxelBatch cubes={car.glow} basic />
      </group>
      <VoxelBatch cubes={lines} basic />
    </>
  );
};

const ShotThree: FC<{
  frame: number;
  city: CityAssets;
  car: CarAssets;
  police: CarAssets;
}> = ({frame, city, car, police}) => {
  const u = (frame - 169) / 55;
  const carX = -7 + 43 * u;

  return (
    <>
      <color attach="background" args={["#17162e"]} />
      <fog attach="fog" args={["#302047", 38, 122]} />
      <Lighting
        frame={frame}
        sky="#7481ff"
        ground="#1a1029"
        key="#ff9c70"
        intensity={1.08}
      />
      <CameraRig frame={frame} />
      <CityWorld frame={frame} city={city} />
      <group position={[carX, 0, 0]}>
        <VoxelBatch cubes={car.solid} />
        <VoxelBatch cubes={car.glow} basic />
      </group>
      <PoliceCar x={carX - 9.5} frame={frame} car={police} />
    </>
  );
};

const ShotFour: FC<{
  frame: number;
  bank: BankAssets;
}> = ({frame, bank}) => {
  const open = Math.min(1, (frame - 225) / 42);
  const easedOpen = 1 - Math.pow(1 - open, 3);
  const burst = useMemo(() => makeCashBurst(frame), [frame]);
  const leadA = useMemo(
    () => makeStandingPerson("#f35f3f", "#222638", "#35192d"),
    [],
  );
  const leadB = useMemo(
    () => makeStandingPerson("#39c7c9", "#25243c", "#57304f"),
    [],
  );
  const moneyPulse = beatPulse(frame) * 0.34;

  return (
    <>
      <color attach="background" args={["#120e1a"]} />
      <fog attach="fog" args={["#241329", 20, 70]} />
      <Lighting
        frame={frame}
        sky="#ffc96f"
        ground="#32172b"
        key="#ffd47a"
        intensity={1.12}
      />
      <CameraRig frame={frame} />
      <VoxelBatch cubes={bank.solid} />
      <group position={[0, moneyPulse, 0]}>
        <VoxelBatch cubes={bank.gold} />
      </group>
      <VoxelBatch cubes={bank.beams} basic opacity={0.22} />
      <group
        position={[-2.8, 0, 0]}
        rotation={[0, -1.42 * easedOpen, 0]}
      >
        <VoxelBatch cubes={bank.door} />
      </group>
      {frame >= 267 ? <VoxelBatch cubes={burst} basic /> : null}
      <group position={[-2.35, 0, 3.2]} scale={0.92}>
        <VoxelBatch cubes={leadA} />
      </group>
      <group position={[2.35, 0, 3.2]} scale={0.92}>
        <VoxelBatch cubes={leadB} />
      </group>
      <pointLight
        position={[0, 5.8, -3.8]}
        color="#ffc54b"
        intensity={10 + beatPulse(frame) * 11}
        distance={25}
        decay={2}
      />
    </>
  );
};

const ShotFive: FC<{
  frame: number;
  city: CityAssets;
}> = ({frame, city}) => {
  const promenade = useMemo(() => makePromenade(), []);
  const u = (frame - 281) / 56;
  const runnerZ = -6 + 11 * u;
  const runnerA = useMemo(
    () => makeRunner(frame, "#f06443", "#24263a", "#3a1c32", 0),
    [frame],
  );
  const runnerB = useMemo(
    () => makeRunner(frame, "#38c9ca", "#24243c", "#6d335b", Math.PI),
    [frame],
  );
  const sun = useMemo(() => makeSun(), []);

  return (
    <>
      <color attach="background" args={["#ef8c70"]} />
      <fog attach="fog" args={["#e99378", 42, 138]} />
      <Lighting
        frame={frame}
        sky="#ffdaa5"
        ground="#743b57"
        key="#ffbd76"
        intensity={1.13}
      />
      <CameraRig frame={frame} />
      <group position={[-38, 0, -3]} scale={0.72}>
        <CityWorld frame={frame} city={city} />
      </group>
      <VoxelBatch cubes={promenade.solid} />
      <group position={[0, Math.sin(frame * 0.11) * 0.06, 0]}>
        <VoxelBatch cubes={promenade.water} />
      </group>
      <VoxelBatch
        cubes={promenade.lights}
        basic
        opacity={0.78 + beatPulse(frame) * 0.22}
      />
      <group position={[11, 11, -28]} scale={1.15}>
        <VoxelBatch cubes={sun} basic />
      </group>
      <group position={[-1.25, 0, runnerZ]} scale={1.18}>
        <VoxelBatch cubes={runnerA} />
      </group>
      <group position={[1.25, 0, runnerZ + 0.38]} scale={1.18}>
        <VoxelBatch cubes={runnerB} />
      </group>
    </>
  );
};

const ShotSix: FC<{
  frame: number;
  city: CityAssets;
  sun: Cube[];
}> = ({frame, city, sun}) => {
  return (
    <>
      <color attach="background" args={["#f3a25f"]} />
      <fog attach="fog" args={["#f1aa68", 55, 175]} />
      <Lighting
        frame={frame}
        sky="#ffe1aa"
        ground="#7c3d52"
        key="#ffd17a"
        intensity={1.2}
      />
      <CameraRig frame={frame} />
      <CityWorld frame={frame} city={city} />
      <group position={[12, 14, -39]} scale={1.5}>
        <VoxelBatch cubes={sun} basic />
      </group>
    </>
  );
};

const Overlay: FC<{children: ReactNode}> = ({children}) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        pointerEvents: "none",
        overflow: "hidden",
        fontFamily: "Archivo, sans-serif",
        fontVariationSettings: "'wght' 900",
      }}
    >
      {children}
    </div>
  );
};

export const Trailer: FC = () => {
  const frame = useCurrentFrame();
  const city = useMemo(() => makeCity(), []);
  const sun = useMemo(() => makeSun(), []);
  const getawayCar = useMemo(() => makeCar("#ef6540"), []);
  const policeCar = useMemo(() => makeCar("#e7e9e1", true), []);
  const bank = useMemo(() => makeBank(), []);

  const showDebt = frame >= 21 && frame <= 74;
  const debtProgress = Math.max(0, Math.min(1, (frame - 21) / 7));
  const showTitle = frame >= 338;
  const titleProgress = Math.max(0, Math.min(1, (frame - 338) / 7));
  const releaseProgress = Math.max(0, Math.min(1, (frame - 340) / 5));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#18152f",
      }}
    >
      <ThreeCanvas
        width={1920}
        height={1080}
        camera={{
          position: [0, 10, 30],
          fov: 48,
          near: 0.1,
          far: 300,
        }}
        gl={{antialias: false, alpha: false}}
      >
        {frame < 112 ? (
          <ShotOne frame={frame} city={city} sun={sun} />
        ) : frame < 169 ? (
          <ShotTwo frame={frame} city={city} car={getawayCar} />
        ) : frame < 225 ? (
          <ShotThree
            frame={frame}
            city={city}
            car={getawayCar}
            police={policeCar}
          />
        ) : frame < 281 ? (
          <ShotFour frame={frame} bank={bank} />
        ) : frame < 338 ? (
          <ShotFive frame={frame} city={city} />
        ) : (
          <ShotSix frame={frame} city={city} sun={sun} />
        )}
      </ThreeCanvas>

      <Overlay>
        {showDebt ? (
          <div
            style={{
              position: "absolute",
              left: 80,
              right: 80,
              top: 116,
              textAlign: "center",
              color: "#fff3d4",
              fontSize: 68,
              lineHeight: 1,
              fontWeight: 900,
              letterSpacing: "0.075em",
              whiteSpace: "nowrap",
              opacity: debtProgress,
              transform: `translate3d(0, ${
                (1 - debtProgress) * -100
              }px, 0) skewX(${(1 - debtProgress) * -14}deg) scale(${
                0.9 + debtProgress * 0.1
              })`,
              clipPath: `inset(0 ${
                (1 - debtProgress) * 100
              }% 0 0)`,
              textShadow:
                "0 7px 0 #5a2038, 0 18px 42px rgba(55, 12, 39, 0.66)",
            }}
          >
            ONE CITY. TWO DEBTS.
          </div>
        ) : null}

        {showTitle ? (
          <>
            <div
              style={{
                position: "absolute",
                left: 80,
                right: 80,
                top: 302,
                textAlign: "center",
                color: "#ffd45e",
                fontSize: 188,
                lineHeight: 0.95,
                fontWeight: 900,
                letterSpacing: "0.035em",
                whiteSpace: "nowrap",
                opacity: titleProgress,
                transform: `translate3d(0, ${
                  (1 - titleProgress) * -170
                }px, 0) scale(${1.18 - titleProgress * 0.18})`,
                clipPath: `inset(${
                  (1 - titleProgress) * 48
                }% 0 ${(1 - titleProgress) * 48}% 0)`,
                textShadow:
                  "0 10px 0 #43162f, 0 24px 60px rgba(59, 12, 40, 0.74)",
              }}
            >
              SUNBURN
            </div>

            <div
              style={{
                position: "absolute",
                left: 80,
                right: 80,
                top: 532,
                textAlign: "center",
                color: "#fff5dc",
                fontSize: 48,
                lineHeight: 1,
                fontWeight: 800,
                letterSpacing: "0.28em",
                textIndent: "0.28em",
                whiteSpace: "nowrap",
                opacity: releaseProgress,
                transform: `translate3d(${
                  (1 - releaseProgress) * 90
                }px, 0, 0)`,
                clipPath: `inset(0 0 0 ${
                  (1 - releaseProgress) * 100
                }%)`,
                textShadow:
                  "0 7px 0 #4b1833, 0 14px 34px rgba(54, 11, 38, 0.72)",
              }}
            >
              COMING NOVEMBER
            </div>
          </>
        ) : null}
      </Overlay>
    </div>
  );
};