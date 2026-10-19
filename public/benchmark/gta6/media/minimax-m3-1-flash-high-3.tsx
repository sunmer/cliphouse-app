// Concept: SUNBURN is a sun-drenched coastal crime epic about two fugitives, one impossible debt, and a city determined to keep them.
// Storyboard:
// 000-059  — Coastal reveal: a low ocean-side fly-through introduces the boulevard, skyline, getaway car, and turquoise water.
// 060-119  — Getaway chase: the camera drops close behind the red car and accelerates through the sunlit downtown corridor.
// 120-179  — Police pressure: a low reverse shot faces the car as two patrol cars close in through alternating emergency light.
// 180-239  — Voxel-bank heist: a rising three-quarter orbit reveals the open bank, both leads, and gold erupting into the plaza.
// 240-337  — Two leads on the run: a close side-tracking shot keeps both fugitives readable while police pressure builds behind them.
// 338-389  — Final title: a coastal crane shot settles over the sunset as SUNBURN slams into place and holds.

import React, {useLayoutEffect, useMemo, useRef} from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {ThreeCanvas} from "@remotion/three";
import {useThree} from "@react-three/fiber";
import * as THREE from "three";

type Cell = {
  p: [number, number, number];
  c: string;
};

type Beat = {
  index: number;
  pulse: number;
  bar: boolean;
};

const WORLD_SCALE = 0.18;
const CAR_SCALE = 0.21;

const SHOT_BOUNDS = {
  coast: [0, 59],
  chase: [60, 119],
  police: [120, 179],
  heist: [180, 239],
  run: [240, 337],
  final: [338, 389],
} as const;

const addCell = (
  cells: Cell[],
  x: number,
  y: number,
  z: number,
  c: string,
) => {
  cells.push({p: [x, y, z], c});
};

const progressIn = (frame: number, start: number, end: number) =>
  interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const beatAt = (frame: number): Beat => {
  const index = Math.round(frame / 14.0625);
  const hitFrame = Math.round(index * 14.0625);
  const distance = Math.abs(frame - hitFrame);
  const pulse = Math.max(0, 1 - distance / 3.25);

  return {
    index,
    pulse: pulse * pulse,
    bar: index % 4 === 0,
  };
};

const buildBuilding = (
  cells: Cell[],
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
  seed: number,
  base: string,
  trim: string,
) => {
  for (let y = 0; y < height; y++) {
    for (let xx = 0; xx < width; xx++) {
      for (let zz = 0; zz < depth; zz++) {
        const exterior =
          xx === 0 ||
          xx === width - 1 ||
          zz === 0 ||
          zz === depth - 1;
        const roof = y === height - 1;

        if (!exterior && !roof) {
          continue;
        }

        if (y === 0 || roof) {
          addCell(cells, x + xx, y, z + zz, trim);
          continue;
        }

        const variation = random(seed + y * 41 + xx * 13 + zz * 19);
        let color = base;

        if (exterior && y % 4 === 1 && variation > 0.18) {
          color = variation > 0.83 ? "#ffe3a0" : "#315767";
        } else if (variation > 0.94) {
          color = trim;
        } else if (variation < 0.09) {
          color = "#d7a17f";
        }

        addCell(cells, x + xx, y, z + zz, color);
      }
    }
  }

  for (let xx = 2; xx < width - 2; xx += 4) {
    for (let y = 3; y < height - 3; y += 5) {
      addCell(cells, x + xx, y, z + depth, "#263f50");
      addCell(cells, x + xx + 1, y, z + depth, "#ffc973");
    }
  }

  for (let xx = 1; xx < width - 1; xx += 3) {
    addCell(cells, x + xx, height, z + Math.floor(depth / 2), "#814755");
  }

  for (let xx = 2; xx < width - 3; xx += 3) {
    addCell(cells, x + xx, height + 1, z + 2, "#344a55");
    addCell(cells, x + xx, height + 2, z + 2, "#f1c286");
  }

  for (let x = 3; x < width - 2; x += 5) {
    addCell(cells, x, 1, z + depth + 1, trim);
    addCell(cells, x + 1, 1, z + depth + 1, "#f4cf88");
  }
};

const buildPalm = (cells: Cell[], x: number, z: number, seed: number) => {
  for (let y = 0; y < 10; y++) {
    const bend = Math.floor(y / 3);
    addCell(
      cells,
      x + bend,
      y,
      z + (y % 2 === 0 ? 0 : 1),
      y % 3 === 0 ? "#76503b" : "#9a6543",
    );
  }

  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  directions.forEach(([dx, dz], directionIndex) => {
    for (let length = 1; length <= 4; length++) {
      const color =
        (length + directionIndex + seed) % 3 === 0
          ? "#3f8950"
          : "#72aa4f";

      addCell(
        cells,
        x + 2 + dx * length,
        9 - (length > 2 ? 1 : 0),
        z + 1 + dz * length,
        color,
      );
    }
  });
};

const buildLamp = (cells: Cell[], x: number, z: number) => {
  for (let y = 0; y < 6; y++) {
    addCell(cells, x, y, z, "#2d4350");
  }

  addCell(cells, x + 1, 6, z, "#2d4350");
  addCell(cells, x + 2, 6, z, "#ffd57a");
  addCell(cells, x + 2, 5, z, "#ffe2a0");
};

const buildWorld = () => {
  const terrain: Cell[] = [];
  const water: Cell[] = [];
  const architecture: Cell[] = [];
  const palms: Cell[] = [];
  const lamps: Cell[] = [];

  for (let z = -132; z <= 98; z++) {
    for (let x = -6; x <= 6; x++) {
      const laneStripe = x === 0 && z % 5 === 0;
      const hotStripe = (x + z) % 7 === 0;

      addCell(
        terrain,
        x,
        -1,
        z,
        laneStripe
          ? "#e7b85e"
          : hotStripe
            ? "#353441"
            : "#252832",
      );
    }
  }

  for (let z = -132; z <= 98; z++) {
    for (let x = -10; x <= -7; x++) {
      addCell(
        terrain,
        x,
        -1,
        z,
        (x + z) % 2 === 0 ? "#d59b72" : "#c98c68",
      );
    }

    for (let x = 7; x <= 10; x++) {
      addCell(
        terrain,
        x,
        -1,
        z,
        (x + z) % 2 === 0 ? "#dfa879" : "#cb906b",
      );
    }
  }

  for (let z = -132; z <= 98; z++) {
    for (let x = 11; x <= 48; x++) {
      const shimmer = (x * 3 + z * 5 + Math.floor(z / 8)) % 17;

      addCell(
        water,
        x,
        -1,
        z,
        shimmer < 2
          ? "#67d4c5"
          : shimmer < 5
            ? "#39a9ad"
            : "#21859a",
      );
    }
  }

  for (let z = -132; z <= 98; z += 2) {
    addCell(terrain, 10, 0, z, "#f0c896");
    addCell(terrain, -10, 0, z, "#efbf8d");
  }

  buildBuilding(
    architecture,
    -27,
    -91,
    13,
    17,
    39,
    101,
    "#e87058",
    "#f2b36b",
  );
  buildBuilding(
    architecture,
    -45,
    -72,
    14,
    19,
    55,
    211,
    "#f0ae6f",
    "#f37d5f",
  );
  buildBuilding(
    architecture,
    -27,
    -49,
    13,
    18,
    34,
    307,
    "#d95850",
    "#f2ad68",
  );
  buildBuilding(
    architecture,
    -45,
    -28,
    14,
    19,
    61,
    419,
    "#e99070",
    "#9e5063",
  );
  buildBuilding(
    architecture,
    -27,
    -10,
    13,
    18,
    42,
    523,
    "#f2bc85",
    "#db6259",
  );
  buildBuilding(
    architecture,
    -45,
    15,
    14,
    20,
    52,
    641,
    "#d76051",
    "#f0aa68",
  );
  buildBuilding(
    architecture,
    -27,
    30,
    13,
    18,
    36,
    733,
    "#f3c38d",
    "#b94f59",
  );
  buildBuilding(
    architecture,
    -45,
    55,
    14,
    20,
    58,
    827,
    "#e58b69",
    "#efae6c",
  );

  [-104, -80, -57, -35, -12, 10, 34, 58, 81].forEach(
    (z, index) => {
      buildPalm(palms, 12, z, 17 + index * 31);
    },
  );

  [-117, -93, -69, -45, -21, 3, 27, 51, 75, 93].forEach((z) => {
    buildLamp(lamps, -9, z);
  });

  [-74, -25, 19, 63].forEach((z) => {
    buildLamp(lamps, 9, z);
  });

  return {terrain, water, architecture, palms, lamps};
};

const buildCar = (paint: string, police = false) => {
  const cells: Cell[] = [];

  for (let z = -5; z <= 4; z++) {
    for (let x = -2; x <= 2; x++) {
      if (Math.abs(x) === 2 && (z === -5 || z === 4)) {
        continue;
      }

      addCell(
        cells,
        x,
        0,
        z,
        Math.abs(x) === 2 && (z === -3 || z === 2)
          ? "#111820"
          : paint,
      );
    }
  }

  for (let z = -3; z <= 2; z++) {
    for (let x = -2; x <= 2; x++) {
      addCell(cells, x, 1, z, z === -3 ? paint : "#f08a67");
    }
  }

  for (let z = -2; z <= 1; z++) {
    for (let x = -1; x <= 1; x++) {
      addCell(
        cells,
        x,
        2,
        z,
        z <= 0 ? "#163e4a" : paint,
      );
    }
  }

  for (const z of [-3, 2]) {
    addCell(cells, -3, 0, z, "#090d14");
    addCell(cells, 3, 0, z, "#090d14");
    addCell(cells, -3, 1, z, "#171d25");
    addCell(cells, 3, 1, z, "#171d25");
  }

  addCell(cells, -1, 1, -5, "#ffe9a0");
  addCell(cells, 1, 1, -5, "#ffe9a0");
  addCell(cells, -1, 0, -5, "#ffb257");
  addCell(cells, 1, 0, -5, "#ffb257");
  addCell(cells, 0, 1, 4, "#8c1727");
  addCell(cells, 0, 0, 4, "#5d101c");

  if (police) {
    addCell(cells, -2, 2, -1, "#1e3d79");
    addCell(cells, 2, 2, -1, "#1e3d79");
    addCell(cells, 0, 2, 2, "#e6e3d8");
  }

  return cells;
};

const buildPerson = (jacket: string, trousers: string) => {
  const cells: Cell[] = [];

  addCell(cells, 0, 8, 0, "#241d25");
  addCell(cells, 0, 7, 0, "#b96849");
  addCell(cells, -1, 5, 0, jacket);
  addCell(cells, 0, 5, 0, jacket);
  addCell(cells, 1, 5, 0, jacket);
  addCell(cells, -1, 4, 0, jacket);
  addCell(cells, 0, 4, 0, jacket);
  addCell(cells, 1, 4, 0, jacket);
  addCell(cells, -1, 3, 0, "#b96849");
  addCell(cells, 1, 3, 0, "#b96849");
  addCell(cells, 0, 3, 0, trousers);
  addCell(cells, -1, 2, 0, trousers);
  addCell(cells, 1, 2, 0, trousers);
  addCell(cells, -1, 1, 0, trousers);
  addCell(cells, 1, 1, 0, trousers);
  addCell(cells, -1, 0, -1, "#151923");
  addCell(cells, 1, 0, 1, "#151923");

  return cells;
};

const buildBank = () => {
  const cells: Cell[] = [];

  for (let z = -12; z <= 12; z++) {
    for (let x = -21; x <= 21; x++) {
      addCell(
        cells,
        x,
        -1,
        z,
        (x + z) % 2 === 0 ? "#c98562" : "#b87559",
      );
    }
  }

  for (let y = 0; y <= 17; y++) {
    for (let x = -21; x <= 21; x++) {
      const windowBand = y % 5 === 2;

      addCell(
        cells,
        x,
        y,
        -11,
        windowBand ? "#294b58" : "#d8956c",
      );
    }
  }

  for (let y = 0; y <= 17; y++) {
    for (let z = -11; z <= 10; z++) {
      addCell(
        cells,
        -21,
        y,
        z,
        y % 5 === 2 ? "#315361" : "#dda078",
      );
      addCell(
        cells,
        21,
        y,
        z,
        y % 5 === 2 ? "#315361" : "#dda078",
      );
    }
  }

  [-17, -9, 9, 17].forEach((x, columnIndex) => {
    for (let y = 0; y <= 12; y++) {
      addCell(
        cells,
        x,
        y,
        9,
        y % 4 === 1 ? "#f3c792" : "#e4a879",
      );
    }

    addCell(
      cells,
      x,
      13,
      9,
      columnIndex % 2 === 0 ? "#f5d19c" : "#dc906c",
    );
  });

  for (let x = -20; x <= 20; x++) {
    addCell(cells, x, 18, 9, "#f2bd83");
    addCell(cells, x, 17, 9, "#8e4852");
  }

  for (let x = -4; x <= 4; x++) {
    addCell(cells, x, 0, 10, "#e6b07f");
  }

  for (let y = 0; y <= 8; y++) {
    for (let x = -3; x <= 3; x++) {
      if (x * x + y * y <= 17) {
        addCell(cells, x, 5 + y, 8, "#263a43");
      }
    }
  }

  for (let x = -4; x <= 4; x++) {
    addCell(cells, x, 5, 7, "#efc85c");
  }

  for (let stack = 0; stack < 8; stack++) {
    const x = -6 + stack * 2;
    const height = 1 + (stack % 3);

    for (let y = 0; y < height; y++) {
      addCell(cells, x, y, -2, "#f6d35d");
      addCell(cells, x + 1, y, -2, "#dba22e");
    }
  }

  return cells;
};

const buildHeistDistrict = () => {
  const cells: Cell[] = [];

  buildBuilding(cells, -32, -12, 12, 18, 32, 1901, "#d96a58", "#efaa6b");
  buildBuilding(cells, 18, -15, 13, 20, 39, 2003, "#e98d6e", "#f2b477");
  buildBuilding(cells, -31, 12, 12, 17, 25, 2111, "#f0ac76", "#d95b54");
  buildBuilding(cells, 19, 10, 12, 18, 29, 2221, "#d96154", "#f2b26e");

  for (let z = 4; z <= 20; z++) {
    for (let x = -28; x <= 28; x++) {
      addCell(
        cells,
        x,
        -1,
        z,
        (x + z) % 2 === 0 ? "#c88c67" : "#b9795d",
      );
    }
  }

  return cells;
};

const buildSun = () => {
  const cells: Cell[] = [];

  for (let y = -7; y <= 7; y++) {
    for (let x = -7; x <= 7; x++) {
      if (x * x + y * y <= 48) {
        addCell(
          cells,
          x,
          y,
          0,
          x * x + y * y > 34 ? "#ff8645" : "#ffb94f",
        );
      }
    }
  }

  return cells;
};

const GETAWAY_CAR = buildCar("#ef443d");
const TAXI_CAR = buildCar("#efb83f");
const POLICE_CAR = buildCar("#e7e4da", true);
const LEAD_ONE = buildPerson("#f04c3f", "#1c2331");
const LEAD_TWO = buildPerson("#168f83", "#242130");
const BANK_CELLS = buildBank();
const HEIST_DISTRICT = buildHeistDistrict();
const SUN_CELLS = buildSun();

const RendererSettings: React.FC = () => {
  const {gl} = useThree();

  useLayoutEffect(() => {
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.08;
  }, [gl]);

  return null;
};

const VoxelBatch: React.FC<{
  cells: Cell[];
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  opacity?: number;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
}> = ({
  cells,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  opacity = 1,
  metalness = 0.04,
  roughness = 0.78,
  emissive = "#000000",
  emissiveIntensity = 0,
}) => {
  const ref = useRef<THREE.InstancedMesh | null>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) {
      return;
    }

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    cells.forEach((cell, index) => {
      dummy.position.set(cell.p[0], cell.p[1], cell.p[2]);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, color.set(cell.c));
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [cells]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <instancedMesh
        ref={ref}
        args={[undefined, undefined, cells.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#ffffff"
          vertexColors
          flatShading
          transparent={opacity < 1}
          opacity={opacity}
          depthWrite={opacity >= 1}
          metalness={metalness}
          roughness={roughness}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
        />
      </instancedMesh>
    </group>
  );
};

const CameraRig: React.FC<{
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}> = ({position, target, fov}) => {
  const {camera} = useThree();

  useLayoutEffect(() => {
    camera.position.set(position[0], position[1], position[2]);
    camera.up.set(0, 1, 0);
    camera.lookAt(target[0], target[1], target[2]);

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [camera, position, target, fov]);

  return null;
};

const ShotLighting: React.FC<{
  frame: number;
  sky: string;
  ground: string;
  sun: string;
  position: [number, number, number];
}> = ({frame, sky, ground, sun, position}) => {
  const beat = beatAt(frame);
  const impact = beat.bar ? 1.2 : 1;

  return (
    <>
      <hemisphereLight
        color={sky}
        groundColor={ground}
        intensity={1.38 + beat.pulse * 0.2}
      />
      <directionalLight
        color={sun}
        intensity={(3.35 + beat.pulse * 0.7) * impact}
        position={position}
      />
      <ambientLight intensity={0.38 + beat.pulse * 0.04} />
    </>
  );
};

const CityWorld: React.FC<{
  includePalms?: boolean;
  includeArchitecture?: boolean;
}> = ({includePalms = true, includeArchitecture = true}) => {
  const world = useMemo(() => buildWorld(), []);

  return (
    <group>
      <VoxelBatch cells={world.terrain} scale={WORLD_SCALE} />
      <VoxelBatch
        cells={world.water}
        scale={WORLD_SCALE}
        opacity={0.9}
        metalness={0.28}
        roughness={0.3}
      />
      {includeArchitecture ? (
        <VoxelBatch cells={world.architecture} scale={WORLD_SCALE} />
      ) : null}
      <VoxelBatch cells={world.lamps} scale={WORLD_SCALE} />
      {includePalms ? (
        <VoxelBatch cells={world.palms} scale={WORLD_SCALE} />
      ) : null}
    </group>
  );
};

const PoliceCar: React.FC<{
  x: number;
  z: number;
  frame: number;
}> = ({x, z, frame}) => {
  const beat = beatAt(frame);
  const redOn = beat.index % 2 === 0;
  const redCells: Cell[] = [{p: [-1, 3, -1], c: "#ff294f"}];
  const blueCells: Cell[] = [{p: [1, 3, -1], c: "#3b86ff"}];

  return (
    <group>
      <VoxelBatch
        cells={POLICE_CAR}
        position={[x, 0, z]}
        scale={CAR_SCALE}
      />
      <VoxelBatch
        cells={redCells}
        position={[x, 0, z]}
        scale={CAR_SCALE}
        emissive="#ff1744"
        emissiveIntensity={redOn ? 3.6 : 0.3}
      />
      <VoxelBatch
        cells={blueCells}
        position={[x, 0, z]}
        scale={CAR_SCALE}
        emissive="#287dff"
        emissiveIntensity={redOn ? 0.3 : 3.6}
      />
      <pointLight
        position={[x - 0.18, 0.8, z]}
        color={redOn ? "#ff3155" : "#44182b"}
        intensity={redOn ? 4.8 : 0.18}
        distance={4.2}
      />
      <pointLight
        position={[x + 0.18, 0.8, z]}
        color={redOn ? "#25162f" : "#3e86ff"}
        intensity={redOn ? 0.18 : 4.8}
        distance={4.2}
      />
    </group>
  );
};

const CoastShot: React.FC<{frame: number}> = ({frame}) => {
  const progress = progressIn(frame, SHOT_BOUNDS.coast[0], SHOT_BOUNDS.coast[1]);
  const beat = beatAt(frame);
  const carZ = 6 - progress * 13;
  const trafficZ = 18 - progress * 25;

  return (
    <>
      <color attach="background" args={["#ef986d"]} />
      <fog attach="fog" args={["#ef986d", 18, 72]} />
      <ShotLighting
        frame={frame}
        sky="#ffd5a0"
        ground="#7a4361"
        sun="#ffad62"
        position={[10, 13, 8]}
      />
      <CityWorld />
      <VoxelBatch
        cells={SUN_CELLS}
        position={[7.2, 8.15, -39]}
        scale={0.72}
        emissive="#ff6a2f"
        emissiveIntensity={0.85}
        roughness={0.55}
      />
      <VoxelBatch
        cells={GETAWAY_CAR}
        position={[0, beat.pulse * 0.025, carZ]}
        scale={CAR_SCALE}
        rotation={[0, Math.sin(frame * 0.09) * 0.025, 0]}
      />
      <VoxelBatch
        cells={TAXI_CAR}
        position={[-0.08, 0, trafficZ]}
        scale={CAR_SCALE}
      />
      <CameraRig
        position={[
          interpolate(progress, [0, 1], [4.4, 2.25]),
          interpolate(progress, [0, 1], [2.7, 1.55]) +
            beat.pulse * 0.07,
          carZ + interpolate(progress, [0, 1], [7.8, 4.9]),
        ]}
        target={[-0.05, 0.62, carZ - 3.2]}
        fov={53 - progress * 2 + beat.pulse * 0.6}
      />
    </>
  );
};

const ChaseShot: React.FC<{frame: number}> = ({frame}) => {
  const progress = progressIn(frame, SHOT_BOUNDS.chase[0], SHOT_BOUNDS.chase[1]);
  const beat = beatAt(frame);
  const carZ = 8 - progress * 19;
  const shake = beat.pulse * 0.04;

  return (
    <>
      <color attach="background" args={["#dd7056"]} />
      <fog attach="fog" args={["#ce6853", 14, 60]} />
      <ShotLighting
        frame={frame}
        sky="#ffc18a"
        ground="#69354f"
        sun="#ff844c"
        position={[-7, 9, 6]}
      />
      <CityWorld />
      <VoxelBatch
        cells={GETAWAY_CAR}
        position={[0, beat.pulse * 0.035, carZ]}
        scale={CAR_SCALE}
        rotation={[0, 0, Math.sin(frame * 0.2) * 0.017]}
      />
      <CameraRig
        position={[
          1.15 + shake,
          0.88 + beat.pulse * 0.055,
          carZ + 3.15,
        ]}
        target={[0, 0.46, carZ - 3.2]}
        fov={55 - progress * 2}
      />
    </>
  );
};

const PoliceShot: React.FC<{frame: number}> = ({frame}) => {
  const progress = progressIn(frame, SHOT_BOUNDS.police[0], SHOT_BOUNDS.police[1]);
  const beat = beatAt(frame);
  const carZ = -8 - progress * 9;
  const cameraZ = carZ - 4.1 - progress * 0.35;

  return (
    <>
      <color attach="background" args={["#c45a59"]} />
      <fog attach="fog" args={["#ad4c52", 14, 58]} />
      <ShotLighting
        frame={frame}
        sky="#ffb287"
        ground="#512b4c"
        sun="#ff7450"
        position={[9, 7, -14]}
      />
      <CityWorld />
      <VoxelBatch
        cells={GETAWAY_CAR}
        position={[0, beat.pulse * 0.04, carZ]}
        scale={CAR_SCALE}
        rotation={[0, 0, -Math.sin(frame * 0.23) * 0.022]}
      />
      <PoliceCar x={-0.42} z={carZ + 4.2} frame={frame} />
      <PoliceCar x={0.42} z={carZ + 6.4} frame={frame} />
      <CameraRig
        position={[
          0.28 + beat.pulse * 0.035,
          0.82 + beat.pulse * 0.055,
          cameraZ,
        ]}
        target={[0, 0.48, carZ + 0.3]}
        fov={53 - progress * 1.5}
      />
    </>
  );
};

const HeistShot: React.FC<{frame: number}> = ({frame}) => {
  const progress = progressIn(frame, SHOT_BOUNDS.heist[0], SHOT_BOUNDS.heist[1]);
  const beat = beatAt(frame);
  const angle = interpolate(progress, [0, 1], [0.28, -0.28]);
  const money: Cell[] = [];

  for (let index = 0; index < 76; index++) {
    const x = (random(910 + index) - 0.5) * 20;
    const z = 11.5 + random(1110 + index) * 2.5;
    const baseHeight = random(1310 + index) * 1.8;
    const burst =
      ((index * 0.73 + beat.index * 1.9) % 5) + beat.pulse * 4.6;

    money.push({
      p: [x, 0.2 + baseHeight + burst, z],
      c:
        index % 3 === 0
          ? "#ffe980"
          : index % 3 === 1
            ? "#efb832"
            : "#d99020",
    });
  }

  return (
    <>
      <color attach="background" args={["#e88962"]} />
      <fog attach="fog" args={["#d67556", 18, 56]} />
      <ShotLighting
        frame={frame}
        sky="#ffd09a"
        ground="#71384c"
        sun="#ff9a52"
        position={[-7, 11, 9]}
      />
      <VoxelBatch cells={HEIST_DISTRICT} scale={0.25} />
      <VoxelBatch cells={BANK_CELLS} scale={0.32} />
      <VoxelBatch
        cells={money}
        scale={0.32}
        metalness={0.38}
        roughness={0.4}
      />
      <VoxelBatch
        cells={LEAD_ONE}
        position={[-0.8, 0, 12.2]}
        scale={0.36}
      />
      <VoxelBatch
        cells={LEAD_TWO}
        position={[0.45, 0, 12.25]}
        scale={0.36}
      />
      <VoxelBatch
        cells={GETAWAY_CAR}
        position={[3.5, 0, 13.8]}
        scale={CAR_SCALE}
        rotation={[0, -0.12, 0]}
      />
      <pointLight
        position={[0, 3.5, 1.2]}
        color="#ffd36a"
        intensity={4 + beat.pulse * 9}
        distance={12}
      />
      <CameraRig
        position={[
          Math.sin(angle) * 16.5,
          4.3 + progress * 2.7 + beat.pulse * 0.12,
          Math.cos(angle) * 16.5,
        ]}
        target={[0, 2.15, 0.4]}
        fov={47 - progress * 1.5}
      />
    </>
  );
};

const RunShot: React.FC<{frame: number}> = ({frame}) => {
  const progress = progressIn(frame, SHOT_BOUNDS.run[0], SHOT_BOUNDS.run[1]);
  const beat = beatAt(frame);
  const leadZ = 8 - progress * 23;
  const stride = Math.sin(frame * 0.62);
  const bob = Math.abs(stride) * 0.085;

  return (
    <>
      <color attach="background" args={["#ee7853"]} />
      <fog attach="fog" args={["#d7654d", 15, 63]} />
      <ShotLighting
        frame={frame}
        sky="#ffbe86"
        ground="#5d3049"
        sun="#ff874a"
        position={[8, 8, -12]}
      />
      <CityWorld includePalms={false} />
      <VoxelBatch
        cells={LEAD_ONE}
        position={[-0.64, bob, leadZ]}
        scale={0.42}
        rotation={[0, 0, -0.035 + stride * 0.015]}
      />
      <VoxelBatch
        cells={LEAD_TWO}
        position={[0.68, bob * 0.84, leadZ - 0.3]}
        scale={0.42}
        rotation={[0, 0, 0.045 - stride * 0.015]}
      />
      <PoliceCar x={0.02} z={leadZ + 5.4} frame={frame} />
      <VoxelBatch
        cells={GETAWAY_CAR}
        position={[0, 0, leadZ + 9.2]}
        scale={CAR_SCALE}
      />
      <CameraRig
        position={[
          interpolate(progress, [0, 1], [3.55, 3.1]),
          1.42 + beat.pulse * 0.07,
          leadZ + 1.2,
        ]}
        target={[0, 1.25, leadZ - 0.35]}
        fov={50 - progress * 1.5}
      />
    </>
  );
};

const FinalShot: React.FC<{frame: number}> = ({frame}) => {
  const progress = progressIn(frame, SHOT_BOUNDS.final[0], SHOT_BOUNDS.final[1]);
  const beat = beatAt(frame);
  const carZ = 5 - progress * 12;

  return (
    <>
      <color attach="background" args={["#d45c49"]} />
      <fog attach="fog" args={["#c85747", 20, 78]} />
      <ShotLighting
        frame={frame}
        sky="#ffc17b"
        ground="#592e43"
        sun="#ff8445"
        position={[10, 12, -18]}
      />
      <CityWorld />
      <VoxelBatch
        cells={SUN_CELLS}
        position={[7.2, 8.15, -39]}
        scale={0.72}
        emissive="#ff6a2f"
        emissiveIntensity={0.9}
        roughness={0.55}
      />
      <VoxelBatch
        cells={GETAWAY_CAR}
        position={[0.2, beat.pulse * 0.025, carZ]}
        scale={CAR_SCALE}
      />
      <CameraRig
        position={[
          interpolate(progress, [0, 1], [7.8, 5.2]),
          interpolate(progress, [0, 1], [4.7, 7.4]) +
            beat.pulse * 0.09,
          interpolate(progress, [0, 1], [10, -1]),
        ]}
        target={[-2.2, 1.5, -17]}
        fov={52 - progress * 1.5}
      />
    </>
  );
};

const TrailerScene: React.FC<{frame: number}> = ({frame}) => {
  if (frame <= SHOT_BOUNDS.coast[1]) {
    return <CoastShot frame={frame} />;
  }
  if (frame <= SHOT_BOUNDS.chase[1]) {
    return <ChaseShot frame={frame} />;
  }
  if (frame <= SHOT_BOUNDS.police[1]) {
    return <PoliceShot frame={frame} />;
  }
  if (frame <= SHOT_BOUNDS.heist[1]) {
    return <HeistShot frame={frame} />;
  }
  if (frame <= SHOT_BOUNDS.run[1]) {
    return <RunShot frame={frame} />;
  }
  return <FinalShot frame={frame} />;
};

const Typography: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const introProgress = spring({
    frame: frame - 10,
    fps,
    config: {
      damping: 14,
      stiffness: 185,
      mass: 0.72,
    },
  });

  const titleProgress = interpolate(
    frame,
    [338, 344],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        zIndex: 20,
        fontFamily: "Archivo, sans-serif",
      }}
    >
      {frame >= 10 && frame <= 59 ? (
        <div
          style={{
            position: "absolute",
            left: 96,
            bottom: 108,
            maxWidth: 1728,
            padding: "18px 42px 22px 0",
            background:
              "linear-gradient(90deg, rgba(42,17,31,0.82), rgba(42,17,31,0))",
            clipPath: `inset(0 ${(1 - introProgress) * 100}% 0 0)`,
            opacity: introProgress,
          }}
        >
          <div
            style={{
              display: "inline-block",
              transform: `translateX(${(1 - introProgress) * -110}px) skewX(${
                introProgress * -5
              }deg)`,
              color: "#fff0d1",
              fontSize: 76,
              fontWeight: 850,
              lineHeight: 0.98,
              letterSpacing: 3.5,
              whiteSpace: "nowrap",
              textShadow: "0 8px 30px rgba(52,12,30,0.7)",
            }}
          >
            ONE CITY. TWO DEBTS.
          </div>
        </div>
      ) : null}

      {frame >= 338 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 80,
            background:
              "radial-gradient(circle at 50% 45%, rgba(97,28,34,0.05), rgba(53,15,30,0.08) 47%, rgba(35,10,25,0.42) 100%)",
          }}
        >
          <div
            style={{
              color: "#fff0c9",
              fontSize: 164,
              fontWeight: 900,
              lineHeight: 0.88,
              letterSpacing: 18,
              textAlign: "center",
              textShadow:
                "0 10px 0 rgba(89,30,37,0.34), 0 26px 70px rgba(45,12,27,0.8)",
              transform: `scale(${1.3 - titleProgress * 0.3}) translateY(${
                (1 - titleProgress) * -38
              }px)`,
              opacity: titleProgress,
              clipPath: `inset(0 ${(1 - titleProgress) * 100}% 0 0)`,
              whiteSpace: "nowrap",
            }}
          >
            SUNBURN
          </div>
          <div
            style={{
              marginTop: 52,
              color: "#ffd68f",
              fontSize: 43,
              fontWeight: 650,
              lineHeight: 1,
              letterSpacing: 15,
              textAlign: "center",
              textShadow: "0 8px 24px rgba(48,12,27,0.86)",
              transform: `translateY(${(1 - titleProgress) * 30}px)`,
              opacity: titleProgress,
              clipPath: `inset(0 ${(1 - titleProgress) * 100}% 0 0)`,
              whiteSpace: "nowrap",
            }}
          >
            COMING NOVEMBER
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const Trailer: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill style={{backgroundColor: "#271521"}}>
      <div style={{position: "absolute", inset: 0}}>
        <ThreeCanvas
          width={1920}
          height={1080}
          dpr={1}
          camera={{fov: 55, near: 0.1, far: 180}}
          gl={{antialias: false, alpha: false}}
        >
          <RendererSettings />
          <TrailerScene frame={frame} />
        </ThreeCanvas>
      </div>
      <Typography frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};