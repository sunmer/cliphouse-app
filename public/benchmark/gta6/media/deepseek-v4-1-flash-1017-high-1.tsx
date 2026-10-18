/*
CONCEPT — "LAST LIGHT"
SUNBURN is one voxel coastal city, held at the final hour of a summer day. Skyline, palms,
police cruiser, the two leads and the sun itself are all cubes. The trailer is a single
unbroken golden hour, cut hard on the bar line, and the sun never sets: it becomes the title.

MUSIC — 128 BPM. 1 beat = 14.0625f. Hard cuts on beats 6, 12, 16, 22 (frames 84, 169, 225, 309).

STORYBOARD
SHOT 1 "GOLDEN COAST"  f0–84
  Aerial over the bay, gliding toward the shore into the sun. Water glitter in the foreground,
  palms raking the beach, the deco skyline filling the right of frame. The camera rises and
  pushes in. TEXT: ONE CITY. TWO DEBTS. — masked slam, one line per beat, cut at 84.

SHOT 2 "GETAWAY"  f84–169
  Low rear-3/4 chase cam, 18 units off the bumper, hard up the boulevard in the other
  direction. Buildings rip past, a police cruiser pacing in the far lane with strobing lights.

SHOT 3 "THE TWO"  f169–225
  Low front angle, tracking back ahead of them. Two leads walk out into the street toward the
  lens, sun-caught at the edges, the boulevard and burning skyline behind.

SHOT 4 "THE JUMP"  f225–309  — strongest moment
  The car leaves the road at 232 and soars. The camera rises with it, always keeping the sun
  directly behind the roof: one voxel car silhouetted against a giant sun, drifting through
  the sky above the coast.

SHOT 5 "SUNBURN"  f309–390
  Slow pull-back over the bay. Sun upper-left, skyline glowing below. Title slams at 314,
  COMING NOVEMBER at 328; both held, fully readable, to the last frame.
*/

import React, { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* voxel types + maths helpers                                        */
/* ------------------------------------------------------------------ */

type Vox = {
  x: number;
  y: number;
  z: number;
  c: number;
  sx?: number;
  sy?: number;
  sz?: number;
};

const BEAT = 14.0625;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* fixed golden-hour sun direction, ~12° above the horizon */
const SUN_DIR = new THREE.Vector3(-0.9, 0.21, -0.36).normalize();

/* warm, dusty palette for the city */
const WALLS = [
  0xf7e3c6, 0xf2c3a6, 0xe9a48f, 0xd9909e, 0xb79cc6, 0x9ec9c4, 0xf1d2a0, 0xe2ab7c, 0xabc9b9,
];
const WINDOW_C = 0xffd08a;

/* ---------------------------- buildings --------------------------- */

function addTower(
  solid: Vox[],
  blocks: Vox[],
  glow: Vox[],
  xFront: number,
  zFront: number,
  w: number,
  d: number,
  h: number,
  wall: number,
  seed: number,
  sc: number
) {
  const put = (arr: Vox[], ix: number, iy: number, iz: number, c: number) => {
    if (sc === 1) arr.push({ x: xFront + ix, y: iy, z: zFront - iz, c });
    else
      arr.push({
        x: xFront + ix * sc,
        y: iy * sc,
        z: zFront - iz * sc,
        c,
        sx: sc,
        sy: sc,
        sz: sc,
      });
  };

  const dep = Math.min(d, 4);
  for (let iy = 0; iy < h; iy++) {
    const base = iy < 2 ? 0x7b6a62 : wall;
    const winRow = iy > 1 && iy % 3 === 1 && iy < h - 2;

    for (let ix = 0; ix < w; ix++) {
      const lit = winRow && (ix * 5 + seed * 7 + iy * 3) % 11 > 2;
      put(lit ? glow : solid, ix, iy, 0, lit ? WINDOW_C : base);
    }
    for (let iz = 1; iz < dep; iz++) {
      for (let k = 0; k < 2; k++) {
        const ix = k === 0 ? 0 : w - 1;
        const lit = winRow && (iz * 7 + seed * 3 + iy * 5) % 13 > 4;
        put(lit ? glow : solid, ix, iy, iz, lit ? WINDOW_C : base);
      }
    }
  }

  // lit crown band on tall towers
  if (seed % 4 === 1) {
    for (let ix = 0; ix < w; ix++) put(glow, ix, h - 2, 0, 0xffb45e);
  }

  // rooftop antenna + beacon
  if (seed % 3 === 0) {
    const mx = Math.floor(w / 2);
    for (let k = 1; k <= 6; k++) put(solid, mx, h - 1 + k, 1, 0x6a6a74);
    put(glow, mx, h + 5, 1, 0xff5a4a);
  }

  // single scaled roof slab (cheap)
  blocks.push({
    x: xFront + ((w - 1) * sc) / 2,
    y: (h - 0.4) * sc,
    z: zFront - ((d - 1) * sc) / 2,
    c: 0xa08c7c,
    sx: w * sc,
    sy: sc * 0.8,
    sz: d * sc,
  });
}

/* ------------------------------ palms ----------------------------- */

function addPalm(solid: Vox[], x: number, z: number, h: number, seed: number) {
  for (let i = 0; i < h; i++) {
    const bend = Math.round(Math.sin((i / h) * 1.5) * 2.6);
    solid.push({ x: x + bend, y: i, z, c: i % 4 === 0 ? 0xa0744b : 0x7c5236 });
  }
  const tx = x + Math.round(Math.sin(1.5) * 2.6);
  const ty = h - 1;
  for (let a = 0; a < 7; a++) {
    const ang = (a / 7) * Math.PI * 2 + seed * 2.4;
    for (let t = 1; t <= 6; t++) {
      const fx = Math.round(Math.cos(ang) * t);
      const fz = Math.round(Math.sin(ang) * t);
      const fy = ty + Math.round(Math.sin((t / 6) * Math.PI) * 2) - Math.floor(t / 3);
      solid.push({ x: tx + fx, y: fy, z: z + fz, c: a % 2 === 0 ? 0x2e7d4f : 0x429e60 });
    }
  }
  for (let a = 0; a < 3; a++) {
    const ang = (a / 3) * Math.PI * 2;
    solid.push({
      x: tx + Math.round(Math.cos(ang) * 1.7),
      y: ty - 1,
      z: z + Math.round(Math.sin(ang) * 1.7),
      c: 0x5a3a22,
    });
  }
}

/* ------------------------------- cars ----------------------------- */

type CarModel = { solid: Vox[]; front: Vox[]; back: Vox[] };

/* nose points toward -x (the direction of travel) */
function buildCar(body: number): CarModel {
  const solid: Vox[] = [];
  const front: Vox[] = [];
  const back: Vox[] = [];

  for (let ix = -9; ix <= 8; ix++)
    for (let iy = 1; iy <= 2; iy++)
      for (let iz = -2; iz <= 2; iz++) solid.push({ x: ix, y: iy, z: iz, c: body });

  for (let ix = -4; ix <= 3; ix++)
    for (let iy = 3; iy <= 4; iy++)
      for (let iz = -2; iz <= 2; iz++)
        solid.push({ x: ix, y: iy, z: iz, c: iy === 4 ? body : 0x2a3040 });

  for (let iz = -2; iz <= 2; iz++) solid.push({ x: 8, y: 3, z: iz, c: 0x1b1b22 });

  for (const wx of [-7, 6])
    for (const wz of [-3, 3]) {
      solid.push({ x: wx, y: 0, z: wz, c: 0x14141a });
      solid.push({ x: wx + 1, y: 0, z: wz, c: 0x14141a });
      solid.push({ x: wx, y: 1, z: wz, c: 0x1c1c24 });
      solid.push({ x: wx + 1, y: 1, z: wz, c: 0x1c1c24 });
    }

  front.push({ x: -10, y: 2, z: -2, c: 0xfff6d8 });
  front.push({ x: -10, y: 2, z: 2, c: 0xfff6d8 });
  back.push({ x: 9, y: 2, z: -2, c: 0xff3b3b });
  back.push({ x: 9, y: 2, z: 2, c: 0xff3b3b });

  return { solid, front, back };
}

/* ----------------------------- people ----------------------------- */

type PersonParts = {
  torso: Vox[];
  head: Vox[];
  legL: Vox[];
  legR: Vox[];
  armL: Vox[];
  armR: Vox[];
  bag: Vox[];
};

function buildPerson(
  skin: number,
  shirt: number,
  pants: number,
  hair: number,
  withBag: boolean
): PersonParts {
  const torso: Vox[] = [];
  const head: Vox[] = [];
  const legL: Vox[] = [];
  const legR: Vox[] = [];
  const armL: Vox[] = [];
  const armR: Vox[] = [];
  const bag: Vox[] = [];

  for (let y = 4; y <= 7; y++)
    for (let x = -1; x <= 1; x++)
      for (let z = -1; z <= 1; z++)
        torso.push({ x, y, z, c: z === -1 && y === 7 ? 0xffffff : shirt });

  for (let y = 8; y <= 9; y++)
    for (let x = -1; x <= 1; x++)
      for (let z = -1; z <= 1; z++) {
        const shades = y === 9 && z === -1;
        const backHair = z === 1;
        head.push({ x, y, z, c: shades ? 0x101018 : backHair ? hair : skin });
      }
  for (let x = -1; x <= 1; x++)
    for (let z = -1; z <= 1; z++) head.push({ x, y: 10, z, c: hair });

  for (let y = 0; y <= 3; y++) {
    const c = y === 0 ? 0x18181e : pants;
    legL.push({ x: 0, y: y - 4, z: 0, c });
    legR.push({ x: 0, y: y - 4, z: 0, c });
  }
  legL.push({ x: 0, y: -4, z: -1, c: 0x18181e });
  legR.push({ x: 0, y: -4, z: -1, c: 0x18181e });

  for (let y = 5; y <= 7; y++) {
    armL.push({ x: 0, y: y - 7, z: 0, c: y === 7 ? shirt : skin });
    armR.push({ x: 0, y: y - 7, z: 0, c: y === 7 ? shirt : skin });
  }

  if (withBag) {
    for (let x = 2; x <= 4; x++)
      for (let y = 3; y <= 5; y++)
        for (let z = -1; z <= 1; z++) bag.push({ x, y, z, c: 0x3c4a3c });
    bag.push({ x: 1, y: 7, z: 0, c: 0x24241f });
    bag.push({ x: 2, y: 6, z: 0, c: 0x24241f });
  }

  return { torso, head, legL, legR, armL, armR, bag };
}

/* ------------------------------------------------------------------ */
/* the world                                                          */
/* ------------------------------------------------------------------ */

type World = { solid: Vox[]; glow: Vox[]; blocks: Vox[] };

function buildWorld(): World {
  const solid: Vox[] = [];
  const glow: Vox[] = [];
  const blocks: Vox[] = [];

  /* ---------------- ground, water, beach, road ---------------- */
  blocks.push({ x: 0, y: -2.2, z: -420, c: 0x907f72, sx: 7000, sy: 4, sz: 2400 });
  blocks.push({ x: -700, y: -1.15, z: 980, c: 0x2f7d92, sx: 8000, sy: 1.5, sz: 1900 });
  blocks.push({ x: 0, y: 0.04, z: 90, c: 0xe9cfa2, sx: 5200, sy: 0.3, sz: 62 });
  blocks.push({ x: 0, y: 0.13, z: 121, c: 0xfff0d8, sx: 5200, sy: 0.2, sz: 4 });
  blocks.push({ x: 0, y: 0.1, z: 6, c: 0xcbb79c, sx: 2600, sy: 0.22, sz: 12 });
  blocks.push({ x: 0, y: 0.14, z: 27, c: 0x57515e, sx: 2600, sy: 0.3, sz: 26 });
  blocks.push({ x: 0, y: 0.16, z: 13.2, c: 0xe0d2bc, sx: 2600, sy: 0.26, sz: 1.4 });
  blocks.push({ x: 0, y: 0.16, z: 40.8, c: 0xe0d2bc, sx: 2600, sy: 0.26, sz: 1.4 });
  blocks.push({ x: 0, y: 0.1, z: 51, c: 0xcbb79c, sx: 2600, sy: 0.22, sz: 20 });

  /* lane dashes */
  for (let x = -600; x <= 600; x += 16)
    blocks.push({ x, y: 0.32, z: 27, c: 0xf7ebcd, sx: 8, sy: 0.06, sz: 0.9 });
  /* crosswalk */
  for (let z = 15; z <= 39; z += 4)
    blocks.push({ x: -96, y: 0.32, z, c: 0xf7ebcd, sx: 9, sy: 0.06, sz: 1.9 });

  /* ---------------- ocean glitter ---------------- */
  for (let i = 0; i < 300; i++) {
    const r1 = random(i * 1.71 + 3.1);
    const r2 = random(i * 4.33 + 7.7);
    glow.push({
      x: -520 + (r1 - 0.5) * 1500,
      y: -0.3,
      z: 150 + r2 * 900,
      c: 0xffe3b4,
      sx: 6,
      sy: 0.1,
      sz: 12,
    });
  }

  /* ---------------- ROW A : boulevard frontage ---------------- */
  let x = -240;
  let s = 0;
  while (x < 240) {
    const r1 = random(s * 3.17 + 0.11);
    const r2 = random(s * 7.71 + 1.31);
    const r3 = random(s * 1.93 + 2.71);
    const w = 16 + Math.floor(r1 * 10);
    const d = 14 + Math.floor(r2 * 8);
    let h = 36 + Math.floor(r3 * 40);
    if (s % 5 === 2) h += 24;
    addTower(solid, blocks, glow, x, 0, w, d, h, WALLS[s % WALLS.length], s, 1);
    x += w + 8 + Math.floor(r1 * 10);
    s++;
  }

  /* ---------------- ROW B : mid skyline ---------------- */
  let x2 = -260;
  let s2 = 0;
  while (x2 < 260) {
    const r1 = random(s2 * 5.31 + 11.7);
    const r2 = random(s2 * 2.13 + 23.1);
    const w = 7 + Math.floor(r1 * 4);
    const d = 6 + Math.floor(r2 * 4);
    const h = 14 + Math.floor(r2 * 14);
    addTower(solid, blocks, glow, x2, -36, w, d, h, WALLS[(s2 + 3) % WALLS.length], s2, 2);
    x2 += (w + 3 + Math.floor(r1 * 3)) * 2;
    s2++;
  }

  /* ---------------- ROW C : far skyline ---------------- */
  let x3 = -340;
  let s3 = 0;
  while (x3 < 340) {
    const r1 = random(s3 * 6.11 + 31.3);
    const r2 = random(s3 * 1.37 + 41.9);
    const w = 4 + Math.floor(r1 * 3);
    const d = 4 + Math.floor(r2 * 3);
    const h = 9 + Math.floor(r2 * 9);
    addTower(solid, blocks, glow, x3, -116, w, d, h, WALLS[(s3 + 5) % WALLS.length], s3, 4);
    x3 += (w + 3) * 4;
    s3++;
  }

  /* ---------------- palms ---------------- */
  for (let i = 0; i < 20; i++) {
    const px = -220 + i * 23;
    addPalm(solid, px, 49, 24 + Math.floor(random(i * 2.7 + 0.9) * 10), random(i * 5.1 + 3.3));
  }
  for (let i = 0; i < 14; i++) {
    const px = -210 + i * 32;
    addPalm(solid, px, 74, 18 + Math.floor(random(i * 4.3 + 7.1) * 9), random(i * 1.7 + 9.9));
  }
  for (let i = 0; i < 10; i++) {
    const px = -170 + i * 38;
    addPalm(solid, px, 104, 16 + Math.floor(random(i * 6.3 + 2.1) * 8), random(i * 2.3 + 1.1));
  }

  /* ---------------- beach umbrellas ---------------- */
  for (let i = 0; i < 20; i++) {
    const r1 = random(i * 3.9 + 6.6);
    const r2 = random(i * 8.2 + 1.4);
    const ux = -340 + r1 * 680;
    const uz = 86 + r2 * 26;
    const col = i % 3 === 0 ? 0xff7a5c : i % 3 === 1 ? 0x4fd8d8 : 0xffd166;
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++)
        solid.push({ x: ux + dx, y: 9, z: uz + dz, c: col });
    for (let y = 6; y <= 8; y++) solid.push({ x: ux, y, z: uz, c: 0xd8d0c0 });
  }

  /* ---------------- street lamps ---------------- */
  for (let i = 0; i < 18; i++) {
    const lx = -230 + i * 27;
    for (let y = 0; y < 9; y++) solid.push({ x: lx, y, z: 45, c: 0x4a4a52 });
    solid.push({ x: lx, y: 9, z: 45, c: 0x4a4a52 });
    solid.push({ x: lx, y: 9, z: 44, c: 0x4a4a52 });
    glow.push({ x: lx, y: 9, z: 43.4, c: 0xffdca0 });
  }

  /* ---------------- parked cars along the curb ---------------- */
  const PARKED: Array<{ x: number; c: number }> = [
    { x: -196, c: 0x3b6ea5 },
    { x: -92, c: 0xe0a843 },
    { x: 30, c: 0x8f8f96 },
    { x: 140, c: 0x4f8f6f },
    { x: 246, c: 0xc2453e },
    { x: -280, c: 0x6a4a8f },
  ];
  for (const p of PARKED) {
    const car = buildCar(p.c);
    for (const v of car.solid) solid.push({ x: v.x + p.x, y: v.y, z: v.z + 44, c: v.c });
    for (const v of car.front) solid.push({ x: v.x + p.x, y: v.y, z: v.z + 44, c: 0xd9d2c0 });
  }

  return { solid, glow, blocks };
}

const WORLD = buildWorld();

/* ------------------------------ actors ---------------------------- */

const CAR = buildCar(0xf2402c);
const COP = buildCar(0x232c4a);

const POLICE_RED: Vox[] = [
  { x: -1, y: 5, z: 0, c: 0xff2b2b },
  { x: 0, y: 5, z: 0, c: 0xff8a8a },
];
const POLICE_BLUE: Vox[] = [
  { x: 1, y: 5, z: 0, c: 0x2b6bff },
  { x: 1, y: 5, z: -1, c: 0x4a9bff },
  { x: 1, y: 5, z: 1, c: 0x4a9bff },
];

const HEADLIGHT_POOL: Vox[] = [
  { x: -18, y: 0.36, z: -1, c: 0xffe6b0, sx: 16, sy: 0.05, sz: 4 },
  { x: -26, y: 0.36, z: 0, c: 0xffd79a, sx: 10, sy: 0.05, sz: 8 },
];

const LEAD_A = buildPerson(0xc98b62, 0xf3eee4, 0x2f3b52, 0x231a18, false);
const LEAD_B = buildPerson(0xa8703f, 0xff6f91, 0x1f2430, 0x140f0d, true);

/* ------------------------------ sky ------------------------------- */

const SKY_STOPS: Array<[number, number]> = [
  [0.0, 0xffb877],
  [0.28, 0xffc98e],
  [0.44, 0xffdcaa],
  [0.52, 0xffc494],
  [0.62, 0xf5a184],
  [0.74, 0xd98a94],
  [0.84, 0xad7aa2],
  [0.93, 0x75609a],
  [1.0, 0x4e3f7a],
];

const FOG_COLOR = "#ffc79a";

const SUN_VOX: Vox[] = (() => {
  const out: Vox[] = [];
  const S = 16;
  const R = 190;
  for (let i = -14; i <= 14; i++) {
    for (let j = -14; j <= 14; j++) {
      const px = i * S;
      const py = j * S;
      const r = Math.sqrt(px * px + py * py);
      if (r > R) continue;
      const t = r / R;
      const c = t < 0.42 ? 0xfffbe8 : t < 0.76 ? 0xffeeb8 : 0xffcf7e;
      out.push({ x: px, y: py, z: 0, c, sx: S, sy: S, sz: S });
    }
  }
  return out;
})();

const CLOUD_VOX: Vox[] = (() => {
  const out: Vox[] = [];
  const specs: Array<[number, number, number, number]> = [
    [-1250, 250, -880, 1.2],
    [-720, 195, -820, 0.9],
    [-240, 285, -900, 1.1],
    [420, 235, -840, 1.0],
    [1040, 280, -900, 1.2],
    [-1760, 215, -860, 0.9],
    [1620, 245, -880, 1.0],
  ];
  for (let i = 0; i < specs.length; i++) {
    const [cx, cy, cz, sc] = specs[i];
    for (let k = 0; k < 9; k++) {
      const r1 = random(i * 7.3 + k * 1.9);
      const r2 = random(i * 3.1 + k * 5.7);
      const r3 = random(i * 9.7 + k * 2.3);
      out.push({
        x: cx + (r1 - 0.5) * 260 * sc,
        y: cy + (r2 - 0.5) * 34,
        z: cz + (r3 - 0.5) * 90,
        c: k % 3 === 0 ? 0xffd9c4 : k % 3 === 1 ? 0xf9c2a4 : 0xffe8d2,
        sx: (50 + r2 * 120) * sc,
        sy: 12 + r1 * 14,
        sz: 46 + r3 * 30,
      });
    }
  }
  return out;
})();

/* ------------------------------------------------------------------ */
/* instanced voxel renderer                                           */
/* ------------------------------------------------------------------ */

const VoxelInstances: React.FC<{ data: Vox[]; basic?: boolean; noFog?: boolean }> = ({
  data,
  basic,
  noFog,
}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = data.length;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const col = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const d = data[i];
      m.makeScale(d.sx ?? 1, d.sy ?? 1, d.sz ?? 1);
      m.setPosition(d.x, d.y, d.z);
      mesh.setMatrixAt(i, m);
      col.setHex(d.c);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [data, count]);

  if (count === 0) return null;

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      {basic ? (
        <meshBasicMaterial fog={!noFog} toneMapped={false} />
      ) : (
        <meshLambertMaterial fog={!noFog} />
      )}
    </instancedMesh>
  );
};

/* ------------------------------------------------------------------ */
/* sky dome (smooth gradient, follows the camera)                     */
/* ------------------------------------------------------------------ */

const SkyDome: React.FC<{ pos: [number, number, number] }> = ({ pos }) => {
  const geom = useMemo(() => {
    const g = new THREE.SphereGeometry(5000, 40, 24);
    const attr = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(attr.count * 3);
    const tmp = new THREE.Vector3();
    const glowCol = new THREE.Color(0xffd9a0);

    for (let i = 0; i < attr.count; i++) {
      tmp.set(attr.getX(i), attr.getY(i), attr.getZ(i)).normalize();
      const t = clamp01((tmp.y + 1) / 2);

      const col = new THREE.Color(SKY_STOPS[0][1]);
      for (let k = 0; k < SKY_STOPS.length - 1; k++) {
        const a = SKY_STOPS[k];
        const b = SKY_STOPS[k + 1];
        if (t >= a[0] && t <= b[0]) {
          const f = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
          col.setHex(a[1]).lerp(new THREE.Color(b[1]), clamp01(f));
          break;
        }
      }

      const d = Math.max(0, tmp.dot(SUN_DIR));
      const glow = Math.pow(d, 6) * 0.5 + Math.pow(d, 42) * 0.85;
      col.lerp(glowCol, clamp01(glow));

      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);

  return (
    <mesh position={pos} geometry={geom} frustumCulled={false} renderOrder={-1000}>
      <meshBasicMaterial
        vertexColors
        side={THREE.BackSide}
        fog={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};

/* ------------------------------------------------------------------ */
/* camera                                                             */
/* ------------------------------------------------------------------ */

type Cam = { pos: [number, number, number]; look: [number, number, number]; fov: number };

const CAR_Z = 26;
const COP_Z = 21;
const LEAD_Z_A = 24.5;
const LEAD_Z_B = 28.5;

function carPos(f: number): [number, number, number] {
  if (f >= 84 && f < 169) return [150 - (f - 84) * 3.45, 0, CAR_Z];
  if (f >= 225 && f < 309) {
    const a = Math.max(0, f - 232);
    const y = Math.max(0, 3.2 * a - 0.028 * a * a);
    return [120 - (f - 225) * 3.6, y, CAR_Z];
  }
  return [0, -900, 0];
}

const LEAD_START = -22;
const LEAD_SPEED = 0.52;
const leadX = (f: number) => LEAD_START - (f - 169) * LEAD_SPEED;

function cameraFor(f: number): Cam {
  let pos: [number, number, number] = [0, 0, 0];
  let look: [number, number, number] = [0, 0, 0];
  let fov = 48;

  if (f < 84) {
    /* SHOT 1 — flight over the bay toward the coast */
    const t = ease(clamp01(f / 84));
    pos = [lerp(340, 196, t), lerp(52, 80, t), lerp(340, 244, t)];
    look = [lerp(40, 10, t), lerp(44, 50, t), lerp(0, -10, t)];
    fov = 48;
  } else if (f < 169) {
    /* SHOT 2 — rear three-quarter chase */
    const cx = 150 - (f - 84) * 3.45;
    const sway = Math.sin((f - 84) * 0.08) * 1.4;
    pos = [cx + 15 + sway, 4.0 + Math.sin((f - 84) * 0.05) * 0.25, 33.5];
    look = [cx - 3, 2.5, CAR_Z];
    fov = 50;
  } else if (f < 225) {
    /* SHOT 3 — low front angle, tracking back ahead of the leads */
    const lx = leadX(f);
    const t = ease(clamp01((f - 169) / 56));
    pos = [lx - lerp(34, 26, t), lerp(3.8, 4.6, t), lerp(34, 32.5, t)];
    look = [lx + 1, 6.4, LEAD_Z_A + 2];
    fov = 45;
  } else if (f < 309) {
    /* SHOT 4 — rise with the car, sun locked behind the roof */
    const car = carPos(f);
    const t = (f - 225) / 84;
    pos = [car[0] + 50, car[1] * 0.9 + 6, car[2] + 24 + Math.sin(t * 3.1) * 3];
    look = [car[0], car[1], car[2]];
    fov = 52;
  } else {
    /* SHOT 5 — pull back over the bay */
    const t = ease(clamp01((f - 309) / 81));
    pos = [lerp(330, 252, t), lerp(78, 100, t), lerp(300, 242, t)];
    look = [lerp(-30, -40, t), lerp(52, 56, t), lerp(0, -10, t)];
    fov = 47;
  }

  /* handheld drift + beat punctuation */
  const beatPhase = f % BEAT;
  const hit = Math.pow(clamp01(1 - beatPhase / 5), 2);
  const hand = Math.sin(f * 0.37) * 0.14 + Math.sin(f * 0.93) * 0.06;

  return {
    pos: [
      pos[0] + hand,
      pos[1] + Math.sin(f * 0.61) * 0.1 + hit * 0.35 * Math.sin(f * 7.3),
      pos[2] + hit * 0.3 * Math.cos(f * 9.1),
    ],
    look,
    fov: fov + hit * 1.4,
  };
}

const CameraRig: React.FC<{ cam: Cam }> = ({ cam }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(cam.pos[0], cam.pos[1], cam.pos[2]);
  camera.fov = cam.fov;
  camera.near = 0.6;
  camera.far = 12000;
  camera.updateProjectionMatrix();
  camera.lookAt(cam.look[0], cam.look[1], cam.look[2]);
  camera.updateMatrixWorld();
  return null;
};

const Setup: React.FC = () => {
  const gl = useThree((s) => s.gl);
  gl.toneMapping = THREE.NoToneMapping;
  return null;
};

/* ------------------------------------------------------------------ */
/* scene pieces                                                       */
/* ------------------------------------------------------------------ */

const Sun: React.FC<{ camPos: [number, number, number]; scale: number }> = ({
  camPos,
  scale,
}) => {
  const p: [number, number, number] = [
    camPos[0] + SUN_DIR.x * 3000,
    camPos[1] + SUN_DIR.y * 3000,
    camPos[2] + SUN_DIR.z * 3000,
  ];
  return (
    <group position={p} scale={[scale, scale, 1]}>
      <VoxelInstances data={SUN_VOX} basic noFog />
    </group>
  );
};

const PoliceCar: React.FC<{ pos: [number, number, number]; frame: number }> = ({ pos, frame }) => {
  const on = Math.floor(frame / 5) % 2 === 0;
  return (
    <group position={pos}>
      <VoxelInstances data={COP.solid} />
      <VoxelInstances data={COP.front} basic noFog />
      <VoxelInstances data={COP.back} basic noFog />
      <group visible={on}>
        <VoxelInstances data={POLICE_RED} basic noFog />
      </group>
      <group visible={!on}>
        <VoxelInstances data={POLICE_BLUE} basic noFog />
      </group>
    </group>
  );
};

const Person: React.FC<{ parts: PersonParts; phase: number }> = ({ parts, phase }) => {
  const swing = Math.sin(phase) * 0.55;
  const bob = Math.abs(Math.sin(phase)) * 0.16;
  return (
    <group position={[0, bob, 0]}>
      <VoxelInstances data={parts.torso} />
      <VoxelInstances data={parts.head} />
      <VoxelInstances data={parts.bag} />
      <group position={[-1, 4, 0]} rotation={[swing, 0, 0]}>
        <VoxelInstances data={parts.legL} />
      </group>
      <group position={[1, 4, 0]} rotation={[-swing, 0, 0]}>
        <VoxelInstances data={parts.legR} />
      </group>
      <group position={[-2, 7, 0]} rotation={[-swing, 0, 0]}>
        <VoxelInstances data={parts.armL} />
      </group>
      <group position={[2, 7, 0]} rotation={[swing, 0, 0]}>
        <VoxelInstances data={parts.armR} />
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* scene                                                              */
/* ------------------------------------------------------------------ */

const Scene: React.FC<{ frame: number }> = ({ frame }) => {
  const cam = cameraFor(frame);
  const car = carPos(frame);

  const showCar = (frame >= 84 && frame < 169) || (frame >= 225 && frame < 309);
  const showCop = frame >= 84 && frame < 169;
  const showLeads = frame >= 169 && frame < 225;

  const lx = leadX(frame);
  const phase = frame * 0.5;
  const bank = frame >= 225 ? Math.sin((frame - 225) * 0.06) * 0.28 : 0;

  const sunScale = frame >= 309 ? 1.35 : 1;

  return (
    <>
      <Setup />
      <CameraRig cam={cam} />
      <color attach="background" args={[FOG_COLOR]} />
      <fog attach="fog" args={[FOG_COLOR, 260, 1500]} />

      <SkyDome pos={cam.pos} />
      <Sun camPos={cam.pos} scale={sunScale} />
      <group position={[-frame * 0.22, 0, 0]}>
        <VoxelInstances data={CLOUD_VOX} basic noFog />
      </group>

      <ambientLight intensity={0.62} color="#ffe0c4" />
      <directionalLight
        position={[SUN_DIR.x * 900, SUN_DIR.y * 900, SUN_DIR.z * 900]}
        intensity={1.05}
        color="#ffbe80"
      />
      <directionalLight position={[-260, 160, 520]} intensity={0.38} color="#9db8e8" />

      <VoxelInstances data={WORLD.blocks} />
      <VoxelInstances data={WORLD.solid} />
      <VoxelInstances data={WORLD.glow} basic />

      {showCar && (
        <group position={[car[0], car[1], car[2]]} rotation={[0, 0, bank]}>
          <VoxelInstances data={CAR.solid} />
          <VoxelInstances data={CAR.front} basic noFog />
          <VoxelInstances data={CAR.back} basic noFog />
          <group position={[0, -car[1], 0]}>
            <VoxelInstances data={HEADLIGHT_POOL} basic noFog />
          </group>
        </group>
      )}

      {showCop && <PoliceCar pos={[car[0] + 4, 0, COP_Z]} frame={frame} />}

      {showLeads && (
        <>
          <group position={[lx, 0, LEAD_Z_A]}>
            <Person parts={LEAD_A} phase={phase} />
          </group>
          <group position={[lx + 1.2, 0, LEAD_Z_B]}>
            <Person parts={LEAD_B} phase={phase + 1.9} />
          </group>
        </>
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* html text                                                          */
/* ------------------------------------------------------------------ */

const Overlay: React.FC<{ frame: number }> = ({ frame }) => {
  const showTag = frame >= 20 && frame < 84;
  const e1 = ease(clamp01((frame - 20) / 9));
  const e2 = ease(clamp01((frame - 34) / 9));

  const showTitle = frame >= 314;
  const tA = ease(clamp01((frame - 314) / 11));
  const tB = ease(clamp01((frame - 328) / 12));

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* warm bloom */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle 620px at 26% 20%, rgba(255,196,120,0.34) 0%, rgba(255,150,80,0.10) 45%, rgba(255,150,80,0) 100%)",
          mixBlendMode: "screen",
        }}
      />
      {/* vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 78% 70% at 50% 46%, rgba(30,8,26,0) 44%, rgba(30,8,26,0.42) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(30,10,30,0.26) 0%, rgba(30,10,30,0) 22%, rgba(30,10,30,0) 58%, rgba(30,10,30,0.5) 100%)",
        }}
      />

      {/* scrim for the title card */}
      {showTitle && (
        <AbsoluteFill
          style={{
            background:
              "radial-gradient(ellipse 66% 44% at 50% 54%, rgba(34,7,26,0.66) 0%, rgba(34,7,26,0.36) 56%, rgba(34,7,26,0) 100%)",
          }}
        />
      )}

      {showTag && (
        <AbsoluteFill
          style={{
            padding: 80,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: "Archivo, sans-serif",
              fontWeight: 800,
              color: "#fff5e4",
              fontSize: 100,
              lineHeight: 1.06,
              letterSpacing: "0.005em",
              textAlign: "center",
              textShadow:
                "0 12px 46px rgba(58,10,30,0.85), 0 0 80px rgba(255,150,60,0.38)",
            }}
          >
            <div style={{ overflow: "hidden", paddingBottom: 4 }}>
              <div
                style={{
                  transform: `translateY(${(1 - e1) * 112}%) skewY(${(1 - e1) * 7}deg)`,
                }}
              >
                ONE CITY.
              </div>
            </div>
            <div style={{ overflow: "hidden", paddingBottom: 4 }}>
              <div
                style={{
                  transform: `translateY(${(1 - e2) * 112}%) skewY(${(1 - e2) * 7}deg)`,
                }}
              >
                TWO DEBTS.
              </div>
            </div>
          </div>
        </AbsoluteFill>
      )}

      {showTitle && (
        <AbsoluteFill
          style={{
            padding: 80,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ overflow: "hidden", paddingBottom: 14 }}>
            <div
              style={{
                fontFamily: "Archivo, sans-serif",
                fontWeight: 900,
                fontSize: 188,
                lineHeight: 1,
                letterSpacing: "0.018em",
                color: "#fff6e0",
                opacity: clamp01(tA * 1.8),
                transform: `translateY(${(1 - tA) * 40}px) scale(${1 + (1 - tA) * 0.36})`,
                textShadow:
                  "0 0 90px rgba(255,150,55,0.95), 0 0 30px rgba(255,200,130,0.65), 0 16px 60px rgba(56,8,30,0.95)",
              }}
            >
              SUNBURN
            </div>
          </div>
          <div
            style={{
              marginTop: 30,
              paddingLeft: "0.6em",
              fontFamily: "Archivo, sans-serif",
              fontWeight: 500,
              fontSize: 34,
              letterSpacing: `${lerp(1.0, 0.58, tB)}em`,
              color: "#ffeac8",
              opacity: tB,
              transform: `translateY(${(1 - tB) * 16}px)`,
              textShadow: "0 4px 26px rgba(50,8,26,0.95), 0 0 44px rgba(255,150,60,0.55)",
            }}
          >
            COMING NOVEMBER
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* composition                                                        */
/* ------------------------------------------------------------------ */

export const Trailer: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: FOG_COLOR }}>
      <ThreeCanvas width={1920} height={1080} gl={{ antialias: false }}>
        <Scene frame={frame} />
      </ThreeCanvas>
      <Overlay frame={frame} />
    </AbsoluteFill>
  );
};