/*
 * SUNBURN — concept: a sun-drenched coastal crime epic in which a debt-ridden
 * duo steals their way through a living voxel city while police close in from
 * the streets, the rooftops, and the sky.
 *
 * Storyboard:
 *   0–69   — "Golden coast": a sweeping coastal fly-in follows the ocean
 *            boulevard into the colorful downtown grid; the opening line slams
 *            in from the left as the camera dives toward the waterfront.
 *  70–140  — "Getaway": a low rear chase camera locks onto a bright orange
 *            sports car as it tears down the coast with police closing ahead.
 * 141–210  — "Blue lights": a fast, low three-quarter orbit surrounds the car
 *            while patrol cars pinch the street from three directions.
 * 211–280  — "Take the bank": an angled push reveals the masked duo outside a
 *            gold-lit bank as a storm of voxel cash erupts from the doorway.
 * 281–337  — "Two debts": the strongest action beat follows the leads sprinting
 *            across a rooftop while a police helicopter bears down from above.
 * 338–389  — "SUNBURN": the camera rises into a symmetrical coastal reveal and
 *            holds on the final title and release date.
 */

import React, {useLayoutEffect, useMemo, useRef} from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  random,
  useCurrentFrame,
} from "remotion";
import {ThreeCanvas} from "@remotion/three";
import * as THREE from "three";
import {useThree} from "@react-three/fiber";

type Vec3 = [number, number, number];

type Voxel = {
  p: Vec3;
  c: string;
};

type CarProps = {
  position?: Vec3;
  rotation?: Vec3;
  color: string;
  scale?: number;
};

const BEAT = 14.0625;

const PALETTE = {
  asphalt: "#4a5260",
  asphaltAlt: "#596170",
  sidewalk: "#e89a72",
  sidewalkEdge: "#b76658",
  sand: "#f2c978",
  sandLight: "#ffe29a",
  ocean: "#1b9db0",
  oceanLight: "#63d9d1",
  oceanDark: "#117694",
  building: "#e28b70",
  buildingLight: "#f5b77d",
  buildingDark: "#a96059",
  glass: "#285b70",
  glassLight: "#66cbd0",
  yellow: "#ffdc62",
  orange: "#ff7138",
  red: "#f04449",
  cyan: "#4cebd5",
  blue: "#4288ff",
  black: "#202733",
  white: "#fff4dc",
  skin: "#c67a55",
  hair: "#342129",
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const smooth = (t: number) => {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
};

const seededValue = (seed: number, index: number, salt = 0) =>
  random(seed + index * 8191 + salt * 131071);

const beatInfo = (frame: number) => {
  const nearestBeat = Math.round(frame / BEAT);
  const distance = frame - nearestBeat * BEAT;
  const pulse = Math.exp(-Math.abs(distance) * 0.52);
  const barPulse = nearestBeat % 4 === 0 ? pulse : 0;
  return {nearestBeat, pulse, barPulse};
};

const push = (voxels: Voxel[], p: Vec3, c: string) => {
  voxels.push({p, c});
};

const makeWorld = () => {
  const road: Voxel[] = [];
  const sidewalk: Voxel[] = [];
  const beach: Voxel[] = [];
  const water: Voxel[] = [];
  const buildings: Voxel[] = [];
  const palms: Voxel[] = [];
  const sun: Voxel[] = [];

  for (let z = -120; z <= 120; z++) {
    const atCrossing = [-84, -36, 12, 60, 108].some(
      (crossing) => Math.abs(z - crossing) <= 4,
    );

    for (let x = -9; x <= 9; x++) {
      if (atCrossing) continue;

      const centerMarker = x === 0 && ((z + 120) % 8) < 4;
      const laneShade = seededValue(12, z * 31 + x, 1) > 0.86;

      push(
        road,
        [x, 0, z],
        centerMarker
          ? PALETTE.yellow
          : laneShade
            ? PALETTE.asphaltAlt
            : PALETTE.asphalt,
      );
    }

    for (const side of [-1, 1]) {
      for (let x = 10; x <= 13; x++) {
        push(
          sidewalk,
          [side * x, 0, z],
          x === 10 || x === 13
            ? PALETTE.sidewalkEdge
            : PALETTE.sidewalk,
        );
      }
    }

    for (let x = 31; x <= 43; x++) {
      const shade = seededValue(22, z * 41 + x, 2);
      push(
        beach,
        [x, -1, z],
        shade > 0.72 ? PALETTE.sandLight : PALETTE.sand,
      );
    }

    for (let x = 44; x <= 100; x++) {
      const wave = Math.sin(z * 0.34 + x * 0.19) * 0.65;
      const shade = seededValue(32, z * 53 + x, 3);
      const color =
        shade > 0.82
          ? PALETTE.oceanLight
          : shade > 0.32
            ? PALETTE.ocean
            : PALETTE.oceanDark;

      push(water, [x, -2 + wave, z], color);
    }
  }

  for (const crossing of [-84, -36, 12, 60, 108]) {
    for (let z = crossing - 4; z <= crossing + 4; z++) {
      for (let x = -34; x <= 34; x++) {
        if (x >= -9 && x <= 9) continue;

        const marker = z === crossing && ((x + 34) % 8) < 4;

        push(
          road,
          [x, 0, z],
          marker
            ? PALETTE.yellow
            : seededValue(42, crossing * 91 + x * 7, 4) > 0.86
              ? PALETTE.asphaltAlt
              : PALETTE.asphalt,
        );
      }
    }
  }

  let buildingIndex = 0;

  for (let z = -108; z <= 108; z += 18) {
    for (const side of [-1, 1]) {
      for (const lane of [0, 1]) {
        if (side === 1 && z >= -72 && z <= -18) continue;

        const width = 6 + Math.floor(seededValue(52, z * 11 + side, lane) * 3);
        const depth = 6 + Math.floor(seededValue(62, z * 17 + side, lane) * 3);
        const height =
          9 + Math.floor(seededValue(72, z * 23 + side, lane) * 15);
        const centerX = side * (17 + lane * 14);
        const halfWidth = Math.floor(width / 2);
        const halfDepth = Math.floor(depth / 2);
        const baseColor =
          seededValue(82, z * 29 + side, lane) > 0.48
            ? PALETTE.buildingLight
            : PALETTE.building;

        for (let y = 1; y <= height; y++) {
          for (let ix = -halfWidth; ix <= halfWidth; ix++) {
            for (let iz = -halfDepth; iz <= halfDepth; iz++) {
              const edge =
                ix === -halfWidth ||
                ix === halfWidth ||
                iz === -halfDepth ||
                iz === halfDepth;

              if (!edge) continue;

              const windowRow = y > 3 && y % 3 !== 0;
              const isWindow =
                windowRow &&
                seededValue(
                  92,
                  z * 101 + y * 19 + ix * 7 + iz * 3,
                  lane,
                ) > 0.27;

              const color = isWindow
                ? seededValue(
                    102,
                    z * 107 + y * 23 + ix * 11 + iz,
                    lane,
                  ) > 0.74
                  ? PALETTE.cyan
                  : PALETTE.glass
                : y % 5 === 0
                  ? PALETTE.buildingDark
                  : baseColor;

              push(buildings, [centerX + ix, y, z + iz], color);
            }
          }
        }

        for (let ix = -halfWidth; ix <= halfWidth; ix++) {
          for (let iz = -halfDepth; iz <= halfDepth; iz++) {
            if (
              ix === -halfWidth ||
              ix === halfWidth ||
              iz === -halfDepth ||
              iz === halfDepth
            ) {
              push(
                buildings,
                [centerX + ix, height + 1, z + iz],
                PALETTE.buildingDark,
              );
            }
          }
        }

        if (buildingIndex % 3 === 0) {
          for (let y = 5; y <= height; y += 3) {
            push(
              buildings,
              [centerX + side * (halfWidth + 1), y, z - halfDepth + 1],
              buildingIndex % 2 === 0 ? PALETTE.orange : PALETTE.cyan,
            );
          }
        }

        buildingIndex++;
      }
    }
  }

  for (let z = -108; z <= 108; z += 27) {
    const x = 37 + Math.sin(z * 0.11) * 1.2;

    for (let y = 0; y <= 9; y++) {
      push(
        palms,
        [x + Math.sin(y * 0.65) * 0.65, y, z],
        y > 7 ? "#80583e" : "#a36b43",
      );
    }

    for (let i = -5; i <= 5; i++) {
      push(palms, [x + i, 10, z], "#35a66b");
      push(palms, [x, 10, z + i], "#48bd76");
    }

    for (let i = -3; i <= 3; i++) {
      push(palms, [x + i, 11, z + Math.sign(i)], "#287b59");
      push(palms, [x + Math.sign(i), 11, z + i], "#39966a");
    }
  }

  for (let x = -9; x <= 9; x++) {
    for (let y = -9; y <= 9; y++) {
      if (x * x + y * y > 81) continue;
      push(sun, [57 + x * 1.5, 39 + y * 1.5, -116], PALETTE.yellow);
    }
  }

  return {road, sidewalk, beach, water, buildings, palms, sun};
};

const makeCar = (bodyColor: string): Voxel[] => {
  const voxels: Voxel[] = [];

  for (let x = -2; x <= 2; x++) {
    for (let y = 1; y <= 2; y++) {
      for (let z = -4; z <= 4; z++) {
        push(voxels, [x, y, z], bodyColor);
      }
    }
  }

  for (let x = -1; x <= 1; x++) {
    for (let z = -2; z <= 2; z++) {
      push(voxels, [x, 3, z], PALETTE.glass);
    }

    for (let z = -1; z <= 1; z++) {
      push(voxels, [x, 4, z], bodyColor);
    }
  }

  for (let y = 3; y <= 4; y++) {
    for (let z = -4; z <= -3; z++) {
      for (let x = -1; x <= 1; x++) {
        push(voxels, [x, y, z], bodyColor);
      }
    }
  }

  for (const side of [-1, 1]) {
    for (let y = 0; y <= 1; y++) {
      for (let z = -3; z <= 2; z++) {
        push(voxels, [side * 3, y, z], PALETTE.black);
      }
    }

    push(voxels, [side * 2, 2, -5], PALETTE.white);
    push(voxels, [side * 2, 2, 5], PALETTE.red);
    push(voxels, [side * 3, 3, 2], PALETTE.glass);
    push(voxels, [side * 2, 2, 0], bodyColor);
  }

  push(voxels, [0, 0, -5], PALETTE.black);
  push(voxels, [0, 0, 5], PALETTE.black);

  return voxels;
};

const makePoliceCar = () => {
  const body = makeCar(PALETTE.white);
  const lights: Voxel[] = [];

  for (let x = -1; x <= 1; x++) {
    push(body, [x, 5, 0], PALETTE.black);
  }

  push(lights, [-1, 5, 0], PALETTE.red);
  push(lights, [1, 5, 0], PALETTE.blue);

  return {body, lights};
};

const makePerson = (
  jacket: string,
  trousers: string,
  masked = false,
): {
  body: Voxel[];
  head: Voxel[];
  leftArm: Voxel[];
  rightArm: Voxel[];
  leftLeg: Voxel[];
  rightLeg: Voxel[];
} => {
  const body: Voxel[] = [];
  const head: Voxel[] = [];
  const leftArm: Voxel[] = [];
  const rightArm: Voxel[] = [];
  const leftLeg: Voxel[] = [];
  const rightLeg: Voxel[] = [];

  for (let y = 3; y <= 5; y++) {
    for (let x = -1; x <= 1; x++) {
      push(body, [x, y, 0], jacket);
    }
  }

  push(body, [0, 4, 1], PALETTE.white);
  push(body, [0, 3, 1], PALETTE.black);

  for (let y = 6; y <= 7; y++) {
    for (let x = -1; x <= 1; x++) {
      push(head, [x, y, 0], PALETTE.skin);
      push(head, [x, y, 1], PALETTE.skin);
    }
  }

  for (let x = -1; x <= 1; x++) {
    push(head, [x, 8, 0], PALETTE.hair);
    push(head, [x, 8, 1], PALETTE.hair);
    push(head, [x, 8, -1], PALETTE.hair);
  }

  if (masked) {
    for (let x = -1; x <= 1; x++) {
      push(head, [x, 6, 1], PALETTE.black);
      push(head, [x, 7, 1], PALETTE.black);
    }
  }

  for (let y = -2; y <= 0; y++) {
    push(leftArm, [0, y, 0], jacket);
    push(rightArm, [0, y, 0], jacket);
  }

  push(leftArm, [0, -2, 0], PALETTE.skin);
  push(rightArm, [0, -2, 0], PALETTE.skin);

  for (let y = 0; y <= 2; y++) {
    push(leftLeg, [0, y, 0], trousers);
    push(rightLeg, [0, y, 0], trousers);
  }

  push(leftLeg, [0, 0, 1], PALETTE.black);
  push(rightLeg, [0, 0, 1], PALETTE.black);

  return {body, head, leftArm, rightArm, leftLeg, rightLeg};
};

const makeBank = (): Voxel[] => {
  const voxels: Voxel[] = [];
  const frontZ = -39;
  const backZ = -52;

  for (let y = 1; y <= 10; y++) {
    for (let x = 12; x <= 28; x++) {
      for (let z = frontZ; z >= backZ; z--) {
        const side = x === 12 || x === 28;
        const back = z === backZ;
        const front = z === frontZ;
        const doorway = front && x >= 17 && x <= 22 && y <= 6;

        if ((side || back || front) && !doorway) {
          push(
            voxels,
            [x, y, z],
            y % 4 === 0 ? PALETTE.buildingDark : PALETTE.buildingLight,
          );
        }
      }
    }
  }

  for (let x = 12; x <= 28; x++) {
    for (let z = frontZ; z >= backZ; z--) {
      if (x === 12 || x === 28 || z === frontZ || z === backZ) {
        push(voxels, [x, 11, z], PALETTE.buildingDark);
      }
    }
  }

  for (const x of [14, 16, 24, 26]) {
    for (let y = 1; y <= 9; y++) {
      push(voxels, [x, y, frontZ + 1], PALETTE.white);
    }
  }

  for (let x = 17; x <= 22; x++) {
    for (let y = 1; y <= 6; y++) {
      push(voxels, [x, y, frontZ], "#273849");
    }
  }

  for (let step = 0; step < 3; step++) {
    for (let x = 15; x <= 24; x++) {
      push(voxels, [x, step, frontZ + 1 + step], PALETTE.building);
    }
  }

  for (let x = 17; x <= 22; x++) {
    push(voxels, [x, 2, -44], PALETTE.yellow);
  }

  const vault = [
    [19, 8],
    [18, 7],
    [20, 7],
    [17, 6],
    [21, 6],
    [16, 5],
    [22, 5],
  ];

  for (const [x, y] of vault) {
    push(voxels, [x, y, backZ + 1], PALETTE.yellow);
  }

  return voxels;
};

const makeRooftop = (): Voxel[] => {
  const voxels: Voxel[] = [];

  for (let x = -6; x <= 6; x++) {
    for (let z = -38; z <= 42; z++) {
      push(
        voxels,
        [x, 8, z],
        z % 10 === 0 ? PALETTE.buildingDark : PALETTE.building,
      );
    }
  }

  for (let z = -38; z <= 42; z++) {
    push(voxels, [-6, 9, z], PALETTE.orange);
    push(voxels, [6, 9, z], PALETTE.orange);
  }

  for (let z = -30; z <= 34; z += 12) {
    push(voxels, [-4, 9, z], PALETTE.black);
    push(voxels, [-4, 10, z], PALETTE.glass);
    push(voxels, [4, 9, z], PALETTE.black);
    push(voxels, [4, 10, z], PALETTE.glass);
  }

  return voxels;
};

const makeHelicopter = () => {
  const body: Voxel[] = [];
  const rotor: Voxel[] = [];

  for (let x = -2; x <= 2; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -2; z <= 2; z++) {
        push(body, [x, y, z], PALETTE.glass);
      }
    }
  }

  for (let x = -2; x <= 2; x++) {
    push(body, [x, -1, 0], PALETTE.yellow);
  }

  for (let z = 3; z <= 8; z++) {
    for (let y = 0; y <= 1; y++) {
      push(body, [0, y, z], PALETTE.black);
    }
  }

  push(body, [0, 1, 8], PALETTE.yellow);
  push(body, [0, 2, 0], PALETTE.black);

  for (let x = -6; x <= 6; x++) {
    push(rotor, [x, 2, 0], PALETTE.black);
  }

  for (let z = -6; z <= 6; z++) {
    push(rotor, [0, 2, z], PALETTE.black);
  }

  return {body, rotor};
};

const VoxelBatch: React.FC<{
  voxels: Voxel[];
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  unlit?: boolean;
}> = ({
  voxels,
  roughness = 0.78,
  metalness = 0.04,
  emissive = "#000000",
  emissiveIntensity = 0,
  unlit = false,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    voxels.forEach((voxel, index) => {
      dummy.position.set(voxel.p[0], voxel.p[1], voxel.p[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(0.94);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      color.set(voxel.c);
      mesh.setColorAt(index, color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [voxels]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, voxels.length]}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      {unlit ? (
        <meshBasicMaterial vertexColors toneMapped={false} />
      ) : (
        <meshStandardMaterial
          vertexColors
          roughness={roughness}
          metalness={metalness}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          flatShading
        />
      )}
    </instancedMesh>
  );
};

const AnimatedCash: React.FC<{frame: number}> = ({frame}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const cash = useMemo(
    () =>
      Array.from({length: 180}, (_, index) => ({
        angle: seededValue(201, index, 1) * Math.PI * 2,
        speed: 0.35 + seededValue(211, index, 2) * 0.72,
        lift: 0.65 + seededValue(221, index, 3) * 0.8,
        offsetX: (seededValue(231, index, 4) - 0.5) * 2.6,
        offsetZ: (seededValue(241, index, 5) - 0.5) * 2.6,
        color:
          seededValue(251, index, 6) > 0.28
            ? PALETTE.yellow
            : "#e9b44c",
      })),
    [],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const phase = (frame % 28) / 28;
    const spread = smooth(phase);

    cash.forEach((bill, index) => {
      const radius = spread * bill.speed * 6.5;
      dummy.position.set(
        19.5 + bill.offsetX + Math.cos(bill.angle) * radius,
        3 + bill.lift * spread * 6.5 - 14 * phase * phase,
        -37.5 + bill.offsetZ + Math.sin(bill.angle) * radius,
      );
      dummy.rotation.set(phase * 9 + bill.angle, phase * 7, bill.angle);
      dummy.scale.setScalar(0.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      color.set(bill.color);
      mesh.setColorAt(index, color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [cash, frame]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, cash.length]}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial vertexColors toneMapped={false} />
    </instancedMesh>
  );
};

const CameraRig: React.FC<{
  position: Vec3;
  target: Vec3;
  fov: number;
}> = ({position, target, fov}) => {
  const {camera} = useThree();

  camera.position.set(position[0], position[1], position[2]);

  if (camera instanceof THREE.PerspectiveCamera) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }

  camera.lookAt(target[0], target[1], target[2]);

  return null;
};

const LightRig: React.FC<{frame: number; shot: number}> = ({frame, shot}) => {
  const {pulse, barPulse} = beatInfo(frame);
  const evening = shot >= 2;

  return (
    <>
      <hemisphereLight
        args={[
          evening ? "#ffc8a8" : "#ffe4b9",
          evening ? "#41405b" : "#5b6671",
          evening ? 2.1 : 2.4,
        ]}
      />
      <ambientLight
        intensity={evening ? 1.2 : 1.35}
        color={evening ? "#ffd8c2" : "#fff2dc"}
      />
      <directionalLight
        position={[24 + frame * 0.035, 38, 28 - frame * 0.045]}
        intensity={2.8 + barPulse * 0.6}
        color={evening ? "#ffab79" : "#ffe8b9"}
      />
      <pointLight
        position={[2 + Math.sin(frame * 0.08) * 4, 14, -5 - frame * 0.035]}
        intensity={52 + pulse * 44}
        distance={82}
        decay={2}
        color={frame % 28 < 14 ? "#ff7548" : "#52e1d5"}
      />
    </>
  );
};

const Car: React.FC<CarProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color,
  scale = 1,
}) => {
  const voxels = useMemo(() => makeCar(color), [color]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <VoxelBatch voxels={voxels} unlit />
    </group>
  );
};

const PoliceCar: React.FC<{
  position: Vec3;
  rotation?: Vec3;
  frame: number;
  scale?: number;
}> = ({position, rotation = [0, 0, 0], frame, scale = 1}) => {
  const model = useMemo(() => makePoliceCar(), []);
  const {nearestBeat, pulse} = beatInfo(frame);
  const redOn = nearestBeat % 2 === 0;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <VoxelBatch voxels={model.body} unlit />
      <VoxelBatch
        voxels={model.lights}
        emissive={redOn ? "#ff1717" : "#176dff"}
        emissiveIntensity={2.5}
      />
      <pointLight
        position={[redOn ? -1.5 : 1.5, 5, 0]}
        intensity={(redOn ? 85 : 42) * pulse + 24}
        distance={27}
        decay={2}
        color={redOn ? "#ff2929" : "#3180ff"}
      />
    </group>
  );
};

const Person: React.FC<{
  position: Vec3;
  rotation?: Vec3;
  jacket: string;
  trousers: string;
  masked?: boolean;
  runPhase: number;
  scale?: number;
}> = ({
  position,
  rotation = [0, 0, 0],
  jacket,
  trousers,
  masked = false,
  runPhase,
  scale = 1,
}) => {
  const model = useMemo(
    () => makePerson(jacket, trousers, masked),
    [jacket, trousers, masked],
  );

  const stride = Math.sin(runPhase) * 0.72;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <VoxelBatch voxels={model.body} unlit />
      <VoxelBatch voxels={model.head} unlit />
      <group position={[-2, 5, 0]} rotation={[-stride, 0, 0]}>
        <VoxelBatch voxels={model.leftArm} unlit />
      </group>
      <group position={[2, 5, 0]} rotation={[stride, 0, 0]}>
        <VoxelBatch voxels={model.rightArm} unlit />
      </group>
      <group position={[-1, 0, 0]} rotation={[stride, 0, 0]}>
        <VoxelBatch voxels={model.leftLeg} unlit />
      </group>
      <group position={[1, 0, 0]} rotation={[-stride, 0, 0]}>
        <VoxelBatch voxels={model.rightLeg} unlit />
      </group>
    </group>
  );
};

const Traffic: React.FC<{frame: number}> = ({frame}) => {
  const cars = useMemo(
    () => [
      {lane: -3.5, base: -103, speed: 1.25, color: PALETTE.orange},
      {lane: 3.5, base: -47, speed: -1.45, color: PALETTE.cyan},
      {lane: -3.5, base: 15, speed: 1.65, color: PALETTE.yellow},
      {lane: 3.5, base: 71, speed: -1.18, color: PALETTE.red},
      {lane: -3.5, base: 112, speed: 1.38, color: PALETTE.white},
      {lane: 3.5, base: -115, speed: -1.72, color: PALETTE.glassLight},
    ],
    [],
  );

  return (
    <>
      {cars.map((car, index) => {
        const raw = car.base + frame * car.speed;
        const z = ((((raw + 120) % 240) + 240) % 240) - 120;
        const rotation: Vec3 = [0, car.speed > 0 ? 0 : Math.PI, 0];

        return (
          <Car
            key={index}
            position={[car.lane, 0, z]}
            rotation={rotation}
            color={car.color}
            scale={0.62}
          />
        );
      })}
    </>
  );
};

const World: React.FC<{frame: number}> = ({frame}) => {
  const world = useMemo(() => makeWorld(), []);

  return (
    <group>
      <VoxelBatch voxels={world.road} unlit />
      <VoxelBatch voxels={world.sidewalk} unlit />
      <group position={[0, Math.sin(frame * 0.075) * 0.07, 0]}>
        <VoxelBatch voxels={world.water} unlit />
      </group>
      <VoxelBatch voxels={world.beach} unlit />
      <VoxelBatch voxels={world.buildings} unlit />
      <VoxelBatch voxels={world.palms} unlit />
      <VoxelBatch voxels={world.sun} unlit />
      <Traffic frame={frame} />
    </group>
  );
};

const ShotOne: React.FC<{frame: number}> = ({frame}) => {
  const t = smooth(frame / 69);
  const {barPulse} = beatInfo(frame);
  const shake = Math.sin(frame * 2.2) * barPulse * 0.08;

  return (
    <>
      <CameraRig
        position={[
          lerp(7, 0, t) + shake,
          lerp(21, 14, t),
          lerp(58, 27, t),
        ]}
        target={[
          lerp(-3, 0, t),
          lerp(5, 3.5, t),
          lerp(-32, -47, t),
        ]}
        fov={lerp(53, 58, t)}
      />
      <pointLight
        position={[43, 30, -45]}
        intensity={135 + barPulse * 65}
        distance={90}
        decay={2}
        color="#ff8a43"
      />
    </>
  );
};

const ShotTwo: React.FC<{frame: number}> = ({frame}) => {
  const t = (frame - 70) / 70;
  const carZ = 26 - t * 78;
  const {pulse, barPulse} = beatInfo(frame);
  const shake = Math.sin(frame * 1.85) * (pulse * 0.05 + barPulse * 0.05);

  return (
    <>
      <CameraRig
        position={[shake, 5.2, carZ + 15.5]}
        target={[0, 1.4, carZ - 4]}
        fov={46}
      />
      <Car position={[0, 0, carZ]} color={PALETTE.orange} scale={0.9} />
      <PoliceCar
        position={[2.8, 0, carZ - 25]}
        rotation={[0, 0.05, 0]}
        frame={frame}
        scale={0.78}
      />
      <pointLight
        position={[0, 5, carZ - 7]}
        intensity={78 + barPulse * 65}
        distance={34}
        decay={2}
        color="#ff6136"
      />
    </>
  );
};

const ShotThree: React.FC<{frame: number}> = ({frame}) => {
  const t = (frame - 141) / 69;
  const angle = -0.8 + t * 2.8;
  const radius = lerp(20, 16, t);
  const {pulse} = beatInfo(frame);

  return (
    <>
      <CameraRig
        position={[
          Math.sin(angle) * radius,
          4.8 + Math.sin(t * Math.PI) * 0.75,
          Math.cos(angle) * radius,
        ]}
        target={[0, 1.35, -1]}
        fov={43}
      />
      <Car position={[0, 0, 0]} color={PALETTE.orange} scale={0.9} />
      <PoliceCar
        position={[0, 0, 18]}
        rotation={[0, Math.PI, 0]}
        frame={frame}
        scale={0.72}
      />
      <PoliceCar
        position={[-6.5, 0, -16]}
        rotation={[0, 0.16, 0]}
        frame={frame + 7}
        scale={0.72}
      />
      <PoliceCar
        position={[6.5, 0, -23]}
        rotation={[0, -0.18, 0]}
        frame={frame + 13}
        scale={0.72}
      />
      <pointLight
        position={[0, 6, 3]}
        intensity={74 + pulse * 76}
        distance={40}
        decay={2}
        color={frame % 28 < 14 ? "#ff2831" : "#2878ff"}
      />
    </>
  );
};

const ShotFour: React.FC<{frame: number}> = ({frame}) => {
  const t = smooth((frame - 211) / 69);
  const bank = useMemo(() => makeBank(), []);
  const {pulse, barPulse} = beatInfo(frame);

  return (
    <>
      <CameraRig
        position={[
          lerp(29, 25, t),
          lerp(8.2, 5.6, t),
          lerp(-16, -22, t),
        ]}
        target={[lerp(19, 19.5, t), 3.2, -38]}
        fov={lerp(57, 53, t)}
      />
      <VoxelBatch voxels={bank} unlit />
      <Person
        position={[17.1, 0, -35.7]}
        rotation={[0, 0.12, 0]}
        jacket={PALETTE.red}
        trousers="#263244"
        masked
        runPhase={frame * 0.2}
        scale={1.12}
      />
      <Person
        position={[20.8, 0, -36.2]}
        rotation={[0, -0.12, 0]}
        jacket={PALETTE.cyan}
        trousers="#242a38"
        masked
        runPhase={frame * 0.2 + Math.PI}
        scale={1.12}
      />
      <AnimatedCash frame={frame} />
      <pointLight
        position={[19.5, 7, -39]}
        intensity={115 + barPulse * 115 + pulse * 35}
        distance={42}
        decay={2}
        color="#ffc84e"
      />
      <pointLight
        position={[19.5, 3, -35]}
        intensity={48 + pulse * 28}
        distance={25}
        decay={2}
        color="#ff7043"
      />
    </>
  );
};

const ShotFive: React.FC<{frame: number}> = ({frame}) => {
  const t = (frame - 281) / 56;
  const leadZ = 23 - t * 42;
  const rooftop = useMemo(() => makeRooftop(), []);
  const helicopter = useMemo(() => makeHelicopter(), []);
  const {pulse, barPulse, nearestBeat} = beatInfo(frame);
  const runPhase = frame * 0.48;
  const bob = Math.abs(Math.sin(runPhase)) * 0.16;
  const heliX = 7 + Math.sin(frame * 0.08) * 2.2;
  const heliZ = leadZ - 14;
  const redOn = nearestBeat % 2 === 0;

  return (
    <>
      <CameraRig
        position={[
          lerp(10.5, 8.5, t) + Math.sin(frame * 1.6) * pulse * 0.05,
          11.2 + Math.sin(t * Math.PI) * 0.6,
          leadZ + 8,
        ]}
        target={[0, 9.4, leadZ - 1]}
        fov={lerp(40, 38, t)}
      />
      <VoxelBatch voxels={rooftop} unlit />
      <Person
        position={[-1.9, 8.55 + bob, leadZ]}
        rotation={[0, Math.PI + 0.08, 0]}
        jacket={PALETTE.red}
        trousers="#202a3b"
        runPhase={runPhase}
        scale={1.13}
      />
      <Person
        position={[2.1, 8.55 + bob, leadZ - 2.8]}
        rotation={[0, Math.PI - 0.1, 0]}
        jacket={PALETTE.cyan}
        trousers="#252a38"
        runPhase={runPhase + Math.PI}
        scale={1.13}
      />
      <group position={[heliX, 16.5, heliZ]} rotation={[0, -0.16, 0]}>
        <VoxelBatch voxels={helicopter.body} unlit />
        <group rotation={[0, frame * 0.96, 0]}>
          <VoxelBatch voxels={helicopter.rotor} unlit />
        </group>
        <pointLight
          position={[0, -2, 0]}
          intensity={145 + barPulse * 145}
          distance={48}
          decay={2}
          color={redOn ? "#ff2630" : "#2677ff"}
        />
      </group>
      <PoliceCar
        position={[0, 0, 43]}
        rotation={[0, Math.PI, 0]}
        frame={frame}
        scale={0.72}
      />
      <pointLight
        position={[0, 12, leadZ]}
        intensity={78 + barPulse * 105}
        distance={38}
        decay={2}
        color="#ff5f3b"
      />
    </>
  );
};

const ShotSix: React.FC<{frame: number}> = ({frame}) => {
  const t = smooth((frame - 338) / 51);
  const {barPulse} = beatInfo(frame);

  return (
    <>
      <CameraRig
        position={[
          lerp(2, 0, t),
          lerp(18, 24, t),
          lerp(44, 56, t),
        ]}
        target={[0, 5, lerp(-29, -21, t)]}
        fov={lerp(54, 57, t)}
      />
      <pointLight
        position={[45, 31, -32]}
        intensity={165 + barPulse * 85}
        distance={115}
        decay={2}
        color="#ff7e3d"
      />
    </>
  );
};

const OpeningText: React.FC<{frame: number}> = ({frame}) => {
  const enter = interpolate(frame, [10, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const exit = interpolate(frame, [60, 68], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });

  const opacity = enter * exit;

  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        bottom: 120,
        margin: 0,
        color: PALETTE.white,
        fontFamily: "Archivo, sans-serif",
        fontSize: 76,
        fontWeight: 900,
        letterSpacing: -2.2,
        lineHeight: 0.95,
        textTransform: "uppercase",
        opacity,
        transform: `translateX(${(1 - enter) * -150}px) skewX(${
          (1 - enter) * -12
        }deg) scale(${0.9 + enter * 0.1})`,
        clipPath: `inset(0 ${(1 - enter) * 100}% 0 0)`,
        textShadow:
          "0 5px 0 rgba(92, 34, 31, 0.65), 0 18px 42px rgba(31, 12, 18, 0.9)",
        whiteSpace: "nowrap",
      }}
    >
      ONE CITY. TWO DEBTS.
    </div>
  );
};

const FinalTitle: React.FC<{frame: number}> = ({frame}) => {
  if (frame < 338) return null;

  const titleEnter = interpolate(frame, [338, 345], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const subtitleEnter = interpolate(frame, [341, 345], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background:
          "linear-gradient(180deg, rgba(26, 12, 19, 0.02) 0%, rgba(26, 12, 19, 0.12) 48%, rgba(26, 12, 19, 0.5) 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 268,
          left: 80,
          right: 80,
          textAlign: "center",
          color: PALETTE.white,
          fontFamily: "Archivo, sans-serif",
          fontSize: 202,
          fontWeight: 900,
          letterSpacing: 12,
          lineHeight: 0.9,
          opacity: titleEnter,
          transform: `translateY(${(1 - titleEnter) * -80}px) scale(${
            0.7 + titleEnter * 0.3
          })`,
          clipPath: `inset(0 ${(1 - titleEnter) * 100}% 0 0)`,
          textShadow:
            "0 8px 0 rgba(103, 34, 27, 0.55), 0 28px 70px rgba(20, 8, 16, 0.95)",
        }}
      >
        SUNBURN
      </div>
      <div
        style={{
          position: "absolute",
          top: 526,
          left: 80,
          right: 80,
          textAlign: "center",
          color: PALETTE.white,
          fontFamily: "Archivo, sans-serif",
          fontSize: 48,
          fontWeight: 700,
          letterSpacing: 12,
          lineHeight: 1,
          opacity: subtitleEnter,
          transform: `translateY(${(1 - subtitleEnter) * 36}px)`,
          clipPath: `inset(0 0 ${(1 - subtitleEnter) * 100}% 0)`,
          textShadow: "0 8px 28px rgba(25, 9, 16, 0.95)",
        }}
      >
        COMING NOVEMBER
      </div>
      <div
        style={{
          position: "absolute",
          top: 610,
          left: "50%",
          width: 500,
          height: 5,
          transform: `translateX(-50%) scaleX(${subtitleEnter})`,
          transformOrigin: "center",
          background: `linear-gradient(90deg, transparent, ${PALETTE.orange}, transparent)`,
          boxShadow: `0 0 34px ${PALETTE.orange}`,
        }}
      />
    </AbsoluteFill>
  );
};

export const Trailer: React.FC = () => {
  const frame = useCurrentFrame();

  const shot =
    frame < 70
      ? 0
      : frame < 141
        ? 1
        : frame < 211
          ? 2
          : frame < 281
            ? 3
            : frame < 338
              ? 4
              : 5;

  const background =
    shot === 0
      ? "#ee9865"
      : shot === 1
        ? "#dd7956"
        : shot === 2
          ? "#735a76"
          : shot === 3
            ? "#a65f54"
            : shot === 4
              ? "#65496f"
              : "#e98158";

  return (
    <AbsoluteFill
      style={{
        backgroundColor: background,
        overflow: "hidden",
      }}
    >
      <ThreeCanvas
        width={1920}
        height={1080}
        dpr={1}
        camera={{position: [0, 0, 0], fov: 55, near: 0.1, far: 420}}
        gl={{antialias: true, powerPreference: "high-performance"}}
        onCreated={({gl}) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.18;
        }}
      >
        <color attach="background" args={[background]} />
        <fog attach="fog" args={[background, 100, 310]} />
        <LightRig frame={frame} shot={shot} />
        <World frame={frame} />

        {shot === 0 && <ShotOne frame={frame} />}
        {shot === 1 && <ShotTwo frame={frame} />}
        {shot === 2 && <ShotThree frame={frame} />}
        {shot === 3 && <ShotFour frame={frame} />}
        {shot === 4 && <ShotFive frame={frame} />}
        {shot === 5 && <ShotSix frame={frame} />}
      </ThreeCanvas>

      <AbsoluteFill
        style={{
          pointerEvents: "none",
          boxShadow: "inset 0 0 180px rgba(34, 14, 23, 0.28)",
        }}
      />

      <OpeningText frame={frame} />
      <FinalTitle frame={frame} />
    </AbsoluteFill>
  );
};