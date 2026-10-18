/*
 SUNBURN: "THE DEBTS COME DUE AT SUNSET"
 Concept: golden hour over a voxel coastal city. The city lights come on beat by beat.
 Rosa and Dex owe the wrong people. They take the cash and run in a hot-pink convertible,
 and they jump an opening drawbridge in front of a giant striped sun while the cops brake
 at the edge.
 Grid: 14.0625 frames per beat. Bar starts: 0, 56, 113, 169, 225, 281, 338. Every cut lands
 on a bar start. Every beat adds a FOV punch plus a shot-specific change.

 SHOT 1  f0-112    FLY-IN: a low skim over the stepped voxel waves. The camera chases a speedboat
                   and flies over it (about f40), then rises toward the skyline. One window
                   group lights up on each beat. Neon wakes at beat 2.
                   "ONE CITY." words rise through masks at f56.
 SHOT 2  f113-168  THE LEADS: low-angle orbit plus push-in on Rosa (pink shades, pistol) and
                   Dex (cash duffel). They stand in front of the parked convertible, with the
                   beach and the sun behind. Hazards blink on every beat.
                   "TWO DEBTS." slams in at f113. The line wipes out at f200-208.
 SHOT 3  f169-224  CHASE CAM: low behind the convertible on the coast road. Palms whip past.
                   The car swerves around traffic. Cash bursts on every beat. Red and blue
                   siren light washes the car.
 SHOT 4  f225-280  POLICE PRESSURE: a curb-level camera on the sidewalk with a slow dolly.
                   The convertible charges toward the lens with the cruisers behind it, and
                   blasts past at about f253. The camera whip-pans forward to the drawbridge
                   rising, and the cruisers roar through frame. Gate lights flash on beats.
 SHOT 5  f281-337  THE SUN JUMP (strongest moment): a long-lens dolly from the city side,
                   lined up with the giant setting sun. It pushes from wide to very tight.
                   The car climbs the leaf at f292, takes off at f300, and hangs in slow
                   motion inside the sun disc with cash pouring out. It slams down at f323
                   (beat 23) with a flash and camera shake.
 SHOT 6  f338-389  TITLE: a high crane over the canal toward the sun, descending and pushing in.
                   "SUNBURN" letters slam in from f338 and are settled by f345.
                   "COMING NOVEMBER" wipes in by f345. Sun stripes shift on every beat.
*/
import React, {useMemo} from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';

// ------------------------------------------------------------ timing
const BEAT = 14.0625;
const bf = (n: number): number => Math.round(n * BEAT);
const beatIndex = (f: number): number => {
  let n = Math.floor(f / BEAT);
  while (bf(n + 1) <= f) n++;
  while (n > 0 && bf(n) > f) n--;
  return n;
};
const cl = (v: number): number => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const sm = (f: number, a: number, b: number): number => {
  const t = cl((f - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const eo = (t: number): number => 1 - Math.pow(1 - cl(t), 3);

// ------------------------------------------------------------ shared resources
const SUN_DIR = new THREE.Vector3(0.05, 0.07, 1).normalize();
const SUN_H = new THREE.Vector3(SUN_DIR.x, 0, SUN_DIR.z).normalize();
const SUN_BEAR = SUN_DIR.x / SUN_DIR.z;
const FOG = '#f2907c';
const BOX = new THREE.BoxGeometry(1, 1, 1);
const SOLID = new THREE.MeshLambertMaterial({color: 0xffffff});
const glowMat = (fog = true): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({color: 0xffffff, toneMapped: false, fog});
const GLOW = glowMat();
const WIN: THREE.MeshBasicMaterial[] = [0, 1, 2, 3, 4, 5].map(() => glowMat());
const NEON = glowMat();
const SIR_R = glowMat();
const SIR_B = glowMat();
const TAIL = glowMat();
const GATE = glowMat();
const SUNM = glowMat(false);
const BILLM = new THREE.MeshLambertMaterial({color: 0xffffff});
const SEA_FAR = new THREE.MeshLambertMaterial({color: 0x177a8e});
const WORLD_MATS: Record<string, THREE.Material> = {gN: NEON, gW: GATE};
WIN.forEach((m, i) => {
  WORLD_MATS[`w${i}`] = m;
});
const COP_MATS: Record<string, THREE.Material> = {gR: SIR_R, gB: SIR_B};
const HERO_MATS: Record<string, THREE.Material> = {gT: TAIL};
const SUN_MATS: Record<string, THREE.Material> = {g: SUNM};
const LEAF_MATS: Record<string, THREE.Material> = {gW: GATE};

const SKY_GEO = (() => {
  const g = new THREE.SphereGeometry(4500, 40, 20);
  const pos = g.getAttribute('position');
  const stops: [number, number][] = [
    [-1, 0xf2907c], [0, 0xf2907c], [0.04, 0xff9a7a], [0.12, 0xf0648e],
    [0.3, 0x8a3f98], [0.6, 0x2e2468], [1.01, 0x15123a],
  ];
  const cols: number[] = [];
  const v = new THREE.Vector3();
  const a = new THREE.Color();
  const b = new THREE.Color();
  const glow = new THREE.Color(0xffe2a0);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let j = 0;
    while (j < stops.length - 2 && v.y > stops[j + 1][0]) j++;
    a.setHex(stops[j][1]);
    b.setHex(stops[j + 1][1]);
    a.lerp(b, cl((v.y - stops[j][0]) / (stops[j + 1][0] - stops[j][0])));
    a.lerp(glow, Math.pow(Math.max(0, v.dot(SUN_DIR)), 10) * 0.8);
    cols.push(a.r, a.g, a.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  return g;
})();
const SKY_MAT = new THREE.MeshBasicMaterial({
  vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false,
});

// ------------------------------------------------------------ voxel builders
type Model = Record<string, number[]>;
type Cell = [string, number] | null;
const put = (m: Model, ch: string, x: number, y: number, z: number, s: number, c: number): void => {
  if (!m[ch]) m[ch] = [];
  m[ch].push(x, y, z, s, c);
};

// Voxel model as a function of grid (x, y, z). Fully hidden interior voxels are culled.
function grid(
  m: Model, nx: number, ny: number, nz: number,
  fn: (x: number, y: number, z: number) => Cell,
  ox: number, oy: number, oz: number, s: number,
): void {
  const cells: Cell[] = [];
  const id = (x: number, y: number, z: number): number => x + nx * (y + ny * z);
  for (let z = 0; z < nz; z++)
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) cells[id(x, y, z)] = fn(x, y, z);
  const has = (x: number, y: number, z: number): boolean =>
    x >= 0 && y >= 0 && z >= 0 && x < nx && y < ny && z < nz && cells[id(x, y, z)] !== null;
  for (let z = 0; z < nz; z++)
    for (let y = 0; y < ny; y++)
      for (let x = 0; x < nx; x++) {
        const c = cells[id(x, y, z)];
        if (!c) continue;
        if (has(x + 1, y, z) && has(x - 1, y, z) && has(x, y + 1, z) && has(x, y - 1, z) && has(x, y, z + 1) && has(x, y, z - 1))
          continue;
        put(m, c[0], ox + (x + 0.5) * s, oy + (y + 0.5) * s, oz + (z + 0.5) * s, s, c[1]);
      }
}

// ------------------------------------------------------------ cars
const CS = 0.38;
type Kind = 'hero' | 'cop' | 'civ';
function buildCar(kind: Kind, body: number, riders = true): Model {
  const m: Model = {};
  const L = 32;
  const glass = 0x1d2a3a;
  grid(m, L, 12, 14, (x, y, z) => {
    const xc = x + 0.5;
    const yc = y + 0.5;
    for (const w of [7, 25]) {
      const d = Math.hypot(xc - w, yc - 2.6);
      if ((z <= 2 || z >= 11) && d <= 2.6) return ['s', (z === 0 || z === 13) && d < 1.3 ? 0xd8dbe2 : 0x121216];
      if ((z <= 3 || z >= 10) && d <= 3.2) return null;
    }
    if (z === 0 || z === 13 || y < 2) return null;
    if (x === L - 1 && y === 4 && (z <= 3 || z >= 10)) return ['gL', 0xfff2cc];
    if (x === 0 && y >= 4 && y <= 5 && (z <= 3 || z >= 10)) return ['gT', 0xff2a45];
    if (y <= 5) {
      if (y === 2) return ['s', 0x18181e];
      if (kind === 'cop') return ['s', x >= 10 && x <= 22 ? 0xf2f2f4 : 0x101014];
      if (kind === 'hero' && (z === 5 || z === 8) && y === 5) return ['s', 0xfff3e6];
      return ['s', body];
    }
    if (kind === 'hero') {
      if (x === 21 && y <= 8) return ['s', y === 8 || z === 1 || z === 12 ? 0x18181e : 0x9fd3ee];
      if (y === 6 && (z === 1 || z === 12) && x <= 24) return ['s', body];
      if (((z >= 2 && z <= 5) || (z >= 8 && z <= 11)) && x >= 9 && x <= 10 && y <= 8) return ['s', 0xf1dcc0];
      const drv = z >= 3 && z <= 5;
      const pas = z >= 8 && z <= 10;
      if (riders && (drv || pas) && x >= 12 && x <= 14) {
        if (y <= 8) return ['s', drv ? 0xff4f6d : 0x16a89e];
        if (y === 11) return ['s', drv ? 0x3a1c14 : 0x141414];
        if (x === 14 && y === 10) return ['s', drv ? 0xff3f8e : 0x101014];
        return ['s', drv ? 0xc98b62 : 0x8a5a3c];
      }
      return null;
    }
    if (kind === 'cop' && y === 10 && x >= 14 && x <= 16) {
      if (z >= 2 && z <= 5) return ['gR', 0xff1e3c];
      if (z >= 8 && z <= 11) return ['gB', 0x2f6bff];
      return ['s', 0x16161c];
    }
    if (x < 9 || x > 23 || y > 9) return null;
    const lim = x === 23 ? 6 : x === 22 ? 7 : x === 9 ? 7 : x === 10 ? 8 : 9;
    if (y > lim) return null;
    const roof = kind === 'cop' ? 0xf2f2f4 : body;
    if (y === lim) return ['s', roof];
    if (x >= 21 || x <= 10) return ['s', glass];
    if (z === 1 || z === 12) return ['s', y <= 8 && x !== 15 ? glass : roof];
    return ['s', roof];
  }, (-L * CS) / 2, 0, (-14 * CS) / 2, CS);
  return m;
}

// ------------------------------------------------------------ speedboat (bow faces local -x)
function buildBoat(): Model {
  const m: Model = {};
  const S = 0.55;
  const L = 30;
  grid(m, L, 9, 11, (x, y, z) => {
    const zc = Math.abs(z - 5);
    const taper = x < 9 ? Math.floor((9 - x) * 0.55) : 0;
    if (y <= 3) {
      const wmax = (y === 0 ? 3 : 5) - taper;
      if (zc > wmax) return null;
      if (y === 3 && zc < wmax && x > 1 && x < L - 1) return ['s', x < 10 ? 0xf4f0ea : 0xc9935e];
      if (y === 0) return ['s', 0x1a7a8a];
      if (y === 1) return ['s', 0xff3f8e];
      return ['s', 0xf4f0ea];
    }
    if (x === 11 && y <= 5 && zc <= 4) return ['s', y === 5 ? 0x18181e : 0x9fd3ee];
    if (x >= 27 && x <= 29 && y <= 5 && zc <= 1) return ['s', y === 5 ? 0xff3f8e : 0x222228];
    for (const [pz, shirt, skin] of [[3, 0xff4f6d, 0xc98b62], [7, 0x16a89e, 0x8a5a3c]] as [number, number, number][]) {
      if (z === pz && x >= 15 && x <= 16) {
        if (y <= 5) return ['s', shirt];
        if (y <= 7) return ['s', skin];
        if (y === 8) return ['s', 0x1a1210];
      }
    }
    return null;
  }, 0, 0, -5.5 * S, S);
  for (let i = 0; i < 60; i++) {
    const d = random(`wk${i}`) * 26;
    const side = random(`ws${i}`) < 0.5 ? -1 : 1;
    const zz = side * (1.5 + d * 0.32 + random(`wz${i}`) * 1.2);
    const s = 0.5 + random(`wq${i}`) * 0.5;
    put(m, 's', L * S + d, 0.3, zz, s, random(`wc${i}`) < 0.5 ? 0xffffff : 0xd8f4f0);
    if (i % 2 === 0) put(m, 's', L * S + d * 0.8, 0.3, (random(`wm${i}`) - 0.5) * 2.4, 0.6, 0xeafaf6);
  }
  return m;
}

// ------------------------------------------------------------ people (front faces -z)
const PS = 0.2;
function buildPerson(rosa: boolean): Model {
  const m: Model = {};
  const skin = rosa ? 0xc98b62 : 0x8a5a3c;
  const hair = rosa ? 0x3a1c14 : 0x141414;
  grid(m, 13, 25, 5, (x, y, z) => {
    const legs = (x >= 2 && x <= 3) || (x >= 5 && x <= 6);
    if (y <= 1 && legs && z <= 3) return ['s', y === 0 ? 0x222222 : 0xffffff];
    if (y >= 2 && y <= 10 && legs && z >= 1 && z <= 2) return ['s', rosa ? (y >= 8 ? 0x5b93c9 : skin) : 0xe0d2b8];
    if (y >= 11 && y <= 17 && x >= 1 && x <= 7 && z >= 1 && z <= 3) {
      if (rosa) return ['s', y <= 12 ? 0x5b93c9 : y === 13 ? skin : 0xff4f6d];
      if (z === 1 && y === 16 && x >= 3 && x <= 5) return ['s', 0xffcf40];
      return ['s', random(`dx${x}_${y}_${z}`) < 0.25 ? 0xff7fb0 : 0x16a89e];
    }
    if ((x === 0 || x === 8) && y >= 10 && y <= 17 && z >= 1 && z <= 2) return ['s', !rosa && y >= 15 ? 0x16a89e : skin];
    if (rosa && x === 0 && ((y === 9 && z <= 2) || (y === 8 && z === 2))) return ['s', 0x1c1c22];
    if (y === 18 && x >= 3 && x <= 5 && z >= 1 && z <= 3) return ['s', skin];
    if (rosa && (x === 1 || x === 7) && y === 20 && z === 2) return ['s', 0xffcf40];
    if (y >= 19 && y <= 24 && x >= 2 && x <= 6 && z <= 4) {
      if (y === 24 || z === 4) return ['s', hair];
      if (z === 0 && y === 21) {
        if (rosa) return ['s', x === 4 ? 0x1a0a14 : x === 2 || x === 6 ? hair : 0xff3f8e];
        return ['s', 0x101014];
      }
      if (rosa && (x === 2 || x === 6) && y >= 20) return ['s', hair];
      if (rosa && z === 0 && y === 23) return ['s', hair];
      if (z === 0 && y === 19 && x === 4) return ['s', rosa ? 0xc0303f : 0x3a2418];
      return ['s', skin];
    }
    if (rosa && z === 4 && x >= 2 && x <= 6 && y >= 13 && y < 19) return ['s', hair];
    if (!rosa && x >= 9 && x <= 12 && y >= 5 && y <= 9 && z >= 1 && z <= 3) return ['s', y === 9 ? 0x6fd05a : 0x46553a];
    return null;
  }, -4.5 * PS, 0, -0.5 * PS, PS);
  return m;
}

// ------------------------------------------------------------ palms
const PALM_S = 0.5;
function addPalm(m: Model, seed: number, ox: number, oz: number): void {
  const used = new Set<string>();
  const p = (x: number, y: number, z: number, c: number): void => {
    const k = `${x},${y},${z}`;
    if (used.has(k)) return;
    used.add(k);
    put(m, 's', ox + x * PALM_S, 0.4 + (y + 0.5) * PALM_S, oz + z * PALM_S, PALM_S, c);
  };
  const H = 30 + Math.floor(random(`ph${seed}`) * 10);
  const lx = (random(`plx${seed}`) - 0.5) * 10;
  const lz = (random(`plz${seed}`) - 0.5) * 8;
  let tx = 0;
  let tz = 0;
  for (let y = 0; y < H; y++) {
    const k = (y / H) * (y / H);
    tx = Math.round(lx * k);
    tz = Math.round(lz * k);
    const c = y % 3 === 0 ? 0x6b4428 : 0x8a5a36;
    p(tx, y, tz, c); p(tx + 1, y, tz, c); p(tx, y, tz + 1, c); p(tx + 1, y, tz + 1, c);
  }
  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * Math.PI * 2 + random(`pa${seed}_${k}`) * 0.5;
    const len = 10 + Math.floor(random(`pl${seed}_${k}`) * 4);
    for (let i = 1; i <= len; i++) {
      const fx = tx + 0.5 + Math.cos(ang) * i;
      const fz = tz + 0.5 + Math.sin(ang) * i;
      const fy = H + Math.round(1 + 0.5 * i - 0.06 * i * i);
      const g = i / len;
      p(Math.floor(fx), fy, Math.floor(fz), g < 0.35 ? 0x2c7a3e : g < 0.75 ? 0x3d9a4c : 0x5cbf5e);
      if (i > 2 && i < len - 1) p(Math.floor(fx - Math.sin(ang)), fy - 1, Math.floor(fz + Math.cos(ang)), 0x2f8a45);
    }
  }
  p(tx, H, tz, 0x5a3a1e);
  p(tx + 1, H, tz + 1, 0x5a3a1e);
}

// ------------------------------------------------------------ towers
type Tw = {x: number; z: number; w: number; d: number; h: number; col: number; deco: boolean; seed: number; neon: number};
const TOWERS: Tw[] = [];
{
  const rows = [
    {z: -30, a: 7, b: 13, step: 46, deco: true},
    {z: -100, a: 14, b: 26, step: 76, deco: false},
    {z: -180, a: 22, b: 36, step: 96, deco: false},
  ];
  const decoC = [0xf7d9c4, 0xf4a9bd, 0x9fdcd2, 0xf3ede2, 0xffd59e, 0xb9c8f0];
  const glassC = [0x6e7fa8, 0x8a97b8, 0xd8d2cc, 0x5d6a8c, 0xc7b6c9];
  let n = 0;
  for (const r of rows)
    for (let x = -540; x < 780; x += r.step) {
      n++;
      const w = 5 + Math.floor(random(`tw${n}`) * 3);
      const d = 5 + Math.floor(random(`td${n}`) * 3);
      const tx = x + Math.round((random(`tx${n}`) - 0.5) * 3) * 4;
      if (tx + w * 4 > 196 && tx < 470) continue;
      const pal = r.deco ? decoC : glassC;
      TOWERS.push({
        x: tx, z: r.z - Math.floor(random(`tz${n}`) * 3) * 4, w, d,
        h: r.a + Math.floor(random(`th${n}`) * (r.b - r.a)),
        col: pal[Math.floor(random(`tc${n}`) * pal.length)],
        deco: r.deco, seed: n, neon: random(`tn${n}`) < 0.5 ? 0xff3fa4 : 0x3ff2ff,
      });
    }
}
const LIT = [0xffd27a, 0xffe6b0, 0x8ff3ff, 0xff9ad5, 0xffc36b];
function addTower(m: Model, t: Tw): void {
  const S = 4;
  const X = (i: number): number => t.x + (i + 0.5) * S;
  const Z = (k: number): number => t.z - (k + 0.5) * S;
  const Y = (j: number): number => (j + 0.5) * S;
  for (let j = 0; j < t.h; j++)
    for (let i = 0; i < t.w; i++)
      for (let k = 0; k < t.d; k++) {
        const ex = i === 0 || i === t.w - 1;
        const ez = k === 0 || k === t.d - 1;
        if (!ex && !ez) continue;
        const u = ex ? k : i;
        const corner = ex && ez;
        const win = t.deco ? !corner && j >= 1 && j % 2 === 1 && u % 2 === 1 : !corner && j >= 1 && j % 4 !== 0;
        if (!win) {
          put(m, 's', X(i), Y(j), Z(k), S, t.deco && j % 2 === 0 && j > 0 ? 0xfdf6ec : t.col);
          continue;
        }
        const r = random(`w${t.seed}_${i}_${j}_${k}`);
        if (r < 0.3) put(m, 's', X(i), Y(j), Z(k), S, r < 0.15 ? 0x2c3656 : 0x4b4a7a);
        else put(m, `w${Math.floor(random(`wg${t.seed}_${i}_${j}_${k}`) * 6)}`, X(i), Y(j), Z(k), S, LIT[Math.floor(r * 97) % 5]);
      }
  for (let i = 0; i < t.w; i++)
    for (let k = 0; k < t.d; k++) {
      const rim = i === 0 || k === 0 || i === t.w - 1 || k === t.d - 1;
      put(m, rim && t.seed % 3 !== 0 ? 'gN' : 's', X(i), Y(t.h), Z(k), S, rim ? t.neon : 0xcfc4bb);
    }
  if (t.deco) {
    for (let j = 2; j < Math.min(t.h, 10); j++) put(m, 'gN', X(1), Y(j), t.z + 1, 2, t.neon);
    for (let i = 0; i < t.w; i++) {
      put(m, 's', X(i) - 1, 4.4, t.z + 1.2, 2, 0xffffff);
      put(m, 's', X(i) + 1, 4.4, t.z + 1.2, 2, 0xff5c8a);
    }
  }
}

// ------------------------------------------------------------ world
const inCanal = (x0: number, x1: number): boolean => x1 > 300 && x0 < 380;
function buildWorld(): Model {
  const m: Model = {};
  for (let x = -600; x < 800; x += 20)
    for (let z = -300; z < -20; z += 20) {
      if (inCanal(x, x + 20)) continue;
      const r = random(`g${x}_${z}`);
      put(m, 's', x + 10, -10, z + 10, 20, r < 0.2 ? 0x3f7a4c : r < 0.6 ? 0x4a4152 : 0x5a5064);
    }
  for (let x = -800; x < 1000; x += 40)
    for (let z = -700; z < -300; z += 40) put(m, 's', x + 20, -20, z + 20, 40, random(`fg${x}_${z}`) < 0.5 ? 0x4a4152 : 0x3f6a4c);
  for (let x = -600; x < 800; x += 4) {
    if (inCanal(x, x + 4)) continue;
    const alt = Math.abs(x / 4) % 2 === 0;
    for (const z of [-22, -18]) put(m, 's', x + 2, -1.6, z + 2, 4, alt ? 0xcfa894 : 0xc49c88);
    for (const z of [6, 10]) put(m, 's', x + 2, -1.6, z + 2, 4, (Math.abs(x / 4) + (z === 6 ? 0 : 1)) % 2 === 0 ? 0xf3c2b0 : 0xe8a99a);
  }
  for (let x = -600; x < 800; x += 5)
    for (let z = -14; z < 6; z += 5) {
      if (inCanal(x, x + 5)) continue;
      put(m, 's', x + 2.5, -2.5, z + 2.5, 5, random(`r${x}_${z}`) < 0.5 ? 0x2c2834 : 0x302b38);
    }
  for (let x = -600; x < 800; x += 2) {
    if (inCanal(x, x + 2) || ((x + 600) / 2) % 6 >= 2) continue;
    put(m, 's', x + 1, -0.9, -7, 2, 0xece6da);
    put(m, 's', x + 1, -0.9, -1, 2, 0xf2c14e);
  }
  for (let x = -600; x < 800; x += 10)
    for (let row = 0; row < 4; row++) {
      if (inCanal(x, x + 10)) continue;
      const r = random(`s${x}_${row}`);
      put(m, 's', x + 5, 0.2 - row * 0.7 - 5, 14 + row * 10 + 5, 10, r < 0.33 ? 0xf3cf9a : r < 0.66 ? 0xeec08a : 0xf7dbab);
    }
  for (let z = -300; z < 14; z += 4)
    for (const x of [298, 382]) {
      put(m, 's', x, -2, z + 2, 4, 0xb8aca0);
      put(m, 's', x, -6, z + 2, 4, 0x9a8f86);
    }
  for (const gx of [292, 388])
    for (const gz of [-17, 8]) {
      for (let j = 0; j < 7; j++) put(m, 's', gx, (j + 0.5) * 0.8, gz, 0.8, j % 2 === 0 ? 0xffffff : 0xe23a3a);
      put(m, 'gW', gx, 6.4, gz, 1.4, 0xff2a2a);
    }
  for (let u = 0; u < 8; u++) {
    const ux = -500 + u * 150 + Math.floor(random(`ux${u}`) * 40);
    if (ux > 240 && ux < 440) continue;
    const uz = 22 + Math.floor(random(`uz${u}`) * 14);
    const base = 0.2 - Math.floor((uz - 14) / 10) * 0.7;
    for (let j = 0; j < 10; j++) put(m, 's', ux, base + (j + 0.5) * 0.5, uz, 0.5, 0xf4efe6);
    const cols = u % 2 === 0 ? [0xff4f7a, 0xfff3e6] : [0x2ec4b6, 0xfff3e6];
    for (let a = -5; a <= 5; a++)
      for (let b = -5; b <= 5; b++) {
        const d = Math.hypot(a, b);
        if (d > 5.3) continue;
        const st = Math.floor(((Math.atan2(b, a) + Math.PI) / (Math.PI * 2)) * 8) % 2;
        put(m, 's', ux + a * 0.5, base + (10.5 - Math.floor(d / 2)) * 0.5, uz + b * 0.5, 0.5, cols[st]);
      }
  }
  let pid = 0;
  for (let x = -560; x <= 780; x += 52) {
    pid++;
    if (x > 250 && x < 430) continue;
    addPalm(m, pid, x, 9);
  }
  for (const t of TOWERS) addTower(m, t);
  return m;
}

function buildLeaf(): Model {
  const m: Model = {};
  for (let i = 0; i < 20; i++)
    for (let k = 0; k < 10; k++) {
      let c = random(`lf${i}_${k}`) < 0.5 ? 0x2f2a38 : 0x34303e;
      if ((k === 3 || k === 6) && i % 2 === 0) c = 0xece6da;
      if (i === 19) c = k % 2 === 0 ? 0xe23a3a : 0xf2f2f2;
      put(m, 's', i * 2 + 1, -1, -14 + k * 2 + 1, 2, c);
      if (k % 3 === 0) put(m, 's', i * 2 + 1, -3, -14 + k * 2 + 1, 2, 0x5d6372);
    }
  for (let i = 0; i < 20; i++) for (const z of [-15, 7]) put(m, 's', i * 2 + 1, 1, z, 2, i % 2 ? 0x9aa0ad : 0xe8ddd0);
  put(m, 'gW', 39, 3, -15, 2, 0xff2a2a);
  put(m, 'gW', 39, 3, 7, 2, 0xff2a2a);
  return m;
}

function buildSun(shift: number): Model {
  const m: Model = {};
  const top = new THREE.Color(0xfff2a8);
  const mid = new THREE.Color(0xffa94d);
  const bot = new THREE.Color(0xff3f78);
  const c = new THREE.Color();
  for (let gy = -14; gy <= 14; gy++)
    for (let gx = -14; gx <= 14; gx++) {
      if (Math.hypot(gx, gy) > 13.2) continue;
      if (gy < 0 && (gy + 40 + shift) % 4 === 0) continue;
      const t = (gy + 13) / 26;
      if (t > 0.5) c.lerpColors(mid, top, (t - 0.5) * 2);
      else c.lerpColors(bot, mid, Math.max(0, t) * 2);
      put(m, 'g', gx * 20, gy * 20, 0, 20, c.getHex());
    }
  return m;
}

// ------------------------------------------------------------ instanced renderer
type IMesh = THREE.InstancedMesh<THREE.BufferGeometry, THREE.Material>;
const VoxMesh: React.FC<{model: Model; mats?: Record<string, THREE.Material>}> = ({model, mats}) => {
  const meshes = useMemo(
    () =>
      Object.keys(model).map((ch) => {
        const d = model[ch];
        const n = d.length / 5;
        const baseMat: THREE.Material = ch[0] === 'g' ? GLOW : SOLID;
        const mesh: IMesh = new THREE.InstancedMesh<THREE.BufferGeometry, THREE.Material>(BOX, baseMat, n);
        const mt = new THREE.Matrix4();
        const c = new THREE.Color();
        for (let i = 0; i < n; i++) {
          const s = d[i * 5 + 3];
          mt.makeScale(s, s, s);
          mt.setPosition(d[i * 5], d[i * 5 + 1], d[i * 5 + 2]);
          mesh.setMatrixAt(i, mt);
          mesh.setColorAt(i, c.setHex(d[i * 5 + 4]));
        }
        mesh.computeBoundingSphere();
        return {ch, mesh};
      }),
    [model],
  );
  for (const {ch, mesh} of meshes) {
    const fallback: THREE.Material = ch[0] === 'g' ? GLOW : SOLID;
    mesh.material = (mats && mats[ch]) || fallback;
  }
  return (
    <>
      {meshes.map(({ch, mesh}) => (
        <primitive key={ch} object={mesh} />
      ))}
    </>
  );
};

// ------------------------------------------------------------ ocean
type Tile = {x: number; z: number; s: number; base: number; shore: boolean};
const TILES: Tile[] = [];
for (let x = -560; x < 800; x += 10)
  for (let z = 54; z < 530; z += 10) TILES.push({x: x + 5, z: z + 5, s: 10, base: -2.4, shore: z < 64});
for (let x = 300; x < 380; x += 10)
  for (let z = -300; z < 54; z += 10) TILES.push({x: x + 5, z: z + 5, s: 10, base: -6, shore: false});
const SEA = [0x0d5f78, 0x11788c, 0x1a929c, 0x3fb5b0, 0x9fe0d2];

const Ocean: React.FC<{f: number; cx: number; cz: number}> = ({f, cx, cz}) => {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(BOX, SOLID, TILES.length);
    m.frustumCulled = false;
    m.setColorAt(0, new THREE.Color());
    return m;
  }, []);
  const mt = new THREE.Matrix4();
  const col = new THREE.Color();
  const bi = beatIndex(f);
  TILES.forEach((t, i) => {
    const w = Math.sin(t.x * 0.045 + f * 0.09) + 0.7 * Math.sin(t.z * 0.06 + t.x * 0.015 - f * 0.07);
    const lv = Math.max(-2, Math.min(2, Math.round(w)));
    mt.makeScale(t.s, t.s, t.s);
    mt.setPosition(t.x, t.base + lv * 0.6 - t.s / 2, t.z);
    mesh.setMatrixAt(i, mt);
    const dx = t.x - cx;
    const dz = t.z - cz;
    const along = dx * SUN_H.x + dz * SUN_H.z;
    const lat = Math.abs(dx * SUN_H.z - dz * SUN_H.x);
    let hex = SEA[lv + 2];
    if (along > 0 && lat < 8 + along * 0.12 && lv >= 0) hex = lv >= 1 ? 0xffe2a6 : 0xffb066;
    else if (lv >= 1 && random(`sp${i}_${bi}`) < 0.06) hex = 0xe8fff6;
    if (t.shore && lv >= 1) hex = 0xfdf3e3;
    mesh.setColorAt(i, col.setHex(hex));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return <primitive object={mesh} />;
};

// ------------------------------------------------------------ cash
type Bill = {x: number; y: number; z: number; a: number; b: number; c: number; col: number};
const BILL_COLS = [0x86d86f, 0x5fb85a, 0xc4efa8];
const Bills: React.FC<{items: Bill[]}> = ({items}) => {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(BOX, BILLM, 300);
    m.frustumCulled = false;
    m.setColorAt(0, new THREE.Color());
    return m;
  }, []);
  const n = Math.min(300, items.length);
  mesh.count = n;
  const mt = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const sc = new THREE.Vector3(1.2, 0.06, 0.55);
  const col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const it = items[i];
    q.setFromEuler(e.set(it.a, it.b, it.c));
    mesh.setMatrixAt(i, mt.compose(p.set(it.x, it.y, it.z), q, sc));
    mesh.setColorAt(i, col.setHex(it.col));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return <primitive object={mesh} />;
};

// ------------------------------------------------------------ choreography
type Pose = {x: number; y: number; z: number; ry: number; rz: number};
const V = 5;
const X0 = -315;
const hx = (f: number): number => X0 + V * (f - 169);
const lane = (f: number): number => -4 + 6 * sm(f, 183, 191) - 6 * sm(f, 203, 211);
const LEAF_A = (22 * Math.PI) / 180;
const LEAF_L = 40;
const PIVOT_F = 169 + (300 - X0) / V;
const TAKEOFF_F = PIVOT_F + LEAF_L / V;
const TIP_X = 300 + LEAF_L * Math.cos(LEAF_A);
const TIP_Y = LEAF_L * Math.sin(LEAF_A);
const LAND_X = 420;
const LAND_F = 323;
const SL = Math.tan(LEAF_A);
const DD = LAND_X - TIP_X;
const KP = -(TIP_Y + SL * DD) / (DD * DD);
const LX = -222;
const LZ = -2;

function heroPose(f: number): Pose {
  if (f < 113) return {x: -300 + 4 * f, y: 0, z: -4, ry: 0, rz: 0};
  if (f < 169) return {x: LX + 1, y: 0, z: 3.5, ry: 0, rz: 0};
  if (f < PIVOT_F) {
    const dz = lane(f + 1) - lane(f - 1);
    return {x: hx(f), y: 0, z: lane(f), ry: -Math.atan2(dz / 2, V), rz: 0};
  }
  if (f < TAKEOFF_F) {
    const d = (f - PIVOT_F) * V;
    return {x: 300 + d * Math.cos(LEAF_A), y: d * Math.sin(LEAF_A), z: -4, ry: 0, rz: LEAF_A};
  }
  if (f < LAND_F) {
    const p = (f - TAKEOFF_F) / (LAND_F - TAKEOFF_F);
    const q = p + Math.sin(2 * Math.PI * p) / (4 * Math.PI);
    const dx = DD * q;
    return {
      x: TIP_X + dx, y: TIP_Y + SL * dx + KP * dx * dx, z: -4,
      ry: 0.05 * Math.sin(Math.PI * p), rz: Math.atan(SL + 2 * KP * dx) * (1 - 0.45 * p),
    };
  }
  const t = f - LAND_F;
  return {
    x: LAND_X + V * t, y: 0.8 * Math.abs(Math.sin(t * 0.6)) * Math.exp(-t / 4), z: -4,
    ry: 0, rz: -0.12 * Math.exp(-t / 3) * Math.cos(t * 0.9),
  };
}

const COPS = [
  {gap: 60, lane: -4, stop: 290},
  {gap: 88, lane: 2, stop: 282},
  {gap: 116, lane: -4, stop: 272},
];
function copPose(i: number, f: number): Pose {
  const c = COPS[i];
  const D = 40;
  const free = hx(f) - c.gap;
  if (free <= c.stop - D) return {x: free, y: 0, z: c.lane, ry: 0, rz: 0};
  const fb = 169 + (c.stop - D + c.gap - X0) / V;
  const t = cl((f - fb) / ((2 * D) / V));
  const sk = (i % 2 ? -1 : 1) * 0.45 * t * t * (3 - 2 * t);
  return {x: c.stop - D * (1 - t) * (1 - t), y: 0, z: c.lane + sk * 2, ry: sk, rz: 0};
}

function civPose(f: number): Pose {
  const te = f <= 206 ? f : 206 + 10 * (1 - Math.pow(1 - cl((f - 206) / 20), 2));
  return {
    x: -175 + 2 * (te - 197), y: 0, z: -4 - 6 * sm(f, 206, 214),
    ry: 0.15 * Math.sin(Math.PI * sm(f, 206, 214)), rz: 0,
  };
}

function burst(seed: string, n: number, ox: number, oy: number, oz: number, age: number, vx0: number, spread: number): Bill[] {
  const out: Bill[] = [];
  for (let i = 0; i < n; i++) {
    const r1 = random(`${seed}a${i}`);
    const r2 = random(`${seed}b${i}`);
    const r3 = random(`${seed}c${i}`);
    const r4 = random(`${seed}d${i}`);
    const x = ox + (vx0 + (r1 - 0.5) * spread) * age;
    const floor = x > 300 && x < 380 ? -5.5 : 0.2;
    out.push({
      x,
      y: Math.max(floor, oy + (0.4 + r2 * 1.0) * age - 0.03 * age * age),
      z: oz + (r3 - 0.5) * (2 + spread * age) + Math.sin(age * 0.4 + r4 * 6) * 0.7,
      a: r1 * 6 + age * (0.2 + r2 * 0.3), b: r2 * 6 + age * 0.18, c: r3 * 6 + age * 0.25 * r4,
      col: BILL_COLS[i % 3],
    });
  }
  return out;
}

function billsFor(f: number): Bill[] {
  let out: Bill[] = [];
  if (f >= 169 && f < 225) {
    for (let b = 12; b <= 15; b++) {
      const s = bf(b) + 1;
      if (f < s || f - s > 40) continue;
      const h = heroPose(s);
      out = out.concat(burst(`b3_${b}`, 16, h.x - 3, h.y + 3.4, h.z, f - s, V * 0.45, 1.8));
    }
  }
  if (f >= 300 && f < 338) {
    for (const s of [300, 309]) {
      if (f < s) continue;
      const h = heroPose(s);
      const age = f <= LAND_F ? (f - s) * 0.42 : (LAND_F - s) * 0.42 + (f - LAND_F);
      out = out.concat(burst(`b5_${s}`, s === 300 ? 70 : 50, h.x - 2, h.y + 2.5, h.z, age, 1.6, 2.6));
    }
  }
  return out;
}

const Car: React.FC<{model: Model; pose: Pose; mats?: Record<string, THREE.Material>}> = ({model, pose, mats}) => (
  <group position={[pose.x, pose.y, pose.z]} rotation={new THREE.Euler(0, pose.ry, pose.rz, 'YZX')}>
    <VoxMesh model={model} mats={mats} />
  </group>
);

// ------------------------------------------------------------ 3D scene
const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const {camera, gl} = useThree();
  gl.toneMapping = THREE.NoToneMapping;
  const cam = camera as THREE.PerspectiveCamera;
  const world = useMemo(() => buildWorld(), []);
  const M = useMemo(
    () => ({
      hero: buildCar('hero', 0xff3f8e),
      heroEmpty: buildCar('hero', 0xff3f8e, false),
      cop: buildCar('cop', 0),
      civ: buildCar('civ', 0x2ec4b6),
      boat: buildBoat(),
      rosa: buildPerson(true),
      dex: buildPerson(false),
      leaf: buildLeaf(),
      suns: [0, 1, 2, 3].map((s) => buildSun(s)),
    }),
    [],
  );

  const bi = beatIndex(f);
  const sb = f - bf(bi);
  const pulse = Math.exp(-sb / 4);
  const barHit = bi % 4 === 0 ? pulse : 0;
  const shot = f < 113 ? 1 : f < 169 ? 2 : f < 225 ? 3 : f < 281 ? 4 : f < 338 ? 5 : 6;
  const sirenRed = Math.floor(f / (BEAT / 2)) % 2 === 0;

  WIN.forEach((mt, g) => mt.color.setHex(shot > 1 || bi >= g ? 0xffffff : 0x2a2440));
  if (shot === 1 && bi < 2) NEON.color.setHex(0x2a1a2a);
  else NEON.color.setScalar(0.75 + 0.25 * pulse);
  SIR_R.color.setHex(sirenRed ? 0xffffff : 0x331014);
  SIR_B.color.setHex(sirenRed ? 0x101433 : 0xffffff);
  TAIL.color.setHex(shot === 2 && sb >= 7 ? 0x3a0a10 : 0xffffff);
  GATE.color.setHex(f >= 225 && sb < 7 ? 0xffffff : 0x401010);

  const hero = heroPose(f);
  const cops = [0, 1, 2].map((i) => copPose(i, f));
  const leafA = LEAF_A * sm(f, 246, 280);

  let cx = 0, cy = 10, cz = 0, lx = 0, ly = 0, lz = 0, fov = 50, roll = 0;
  let pl: [number, number, number] = [0, -500, 0];
  let plCol = '#ff3fa4';
  let plI = 0;

  if (shot === 1) {
    const e = sm(f, -20, 130);
    cx = lerp(-80, 20, e); cy = lerp(8, 62, Math.pow(e, 1.4)); cz = lerp(430, 70, e);
    lx = lerp(-40, 40, e); ly = lerp(30, 50, e); lz = -160;
    roll = -0.05 * Math.sin((f / 112) * Math.PI); fov = 52;
  } else if (shot === 2) {
    const t = (f - 113) / 55;
    const th = lerp(-0.5, 0.35, eo(t) * 0.5 + t * 0.5);
    const R = lerp(15, 9.5, t);
    cx = LX + Math.sin(th) * R; cz = LZ - Math.cos(th) * R; cy = lerp(1.0, 1.8, t);
    lx = LX + lerp(3.2, 2.4, t); ly = lerp(3.4, 3.1, t); lz = LZ + 2; fov = 38;
    pl = [cx, 6, cz + 3]; plCol = '#ff5fb0'; plI = 1.2 + 0.8 * pulse;
  } else if (shot === 3) {
    const back = lerp(15, 19, eo((f - 169) / 56));
    cx = hero.x - back; cy = 4.2 + Math.sin(f * 1.3) * 0.08; cz = lane(f - 5) * 0.85 - 0.8;
    lx = hero.x + 22; ly = 2.4; lz = lane(f) * 0.75;
    roll = -(lane(f + 2) - lane(f - 2)) * 0.03; fov = 56;
    pl = [hero.x - 10, 5, lane(f)]; plCol = sirenRed ? '#ff2040' : '#3060ff'; plI = 1.6;
  } else if (shot === 4) {
    const t = (f - 225) / 56;
    const w = sm(f, 249, 264);
    cx = lerp(92, 112, t); cy = 1.4 + 0.12 * pulse; cz = -16.5;
    lx = lerp(hero.x, 330, w); ly = lerp(2.4, 7, w); lz = lerp(-4, -2, w);
    fov = lerp(44, 38, w); roll = 0.07 * Math.sin(w * Math.PI);
    pl = [cops[0].x + 4, 5, cops[0].z]; plCol = sirenRed ? '#ff2040' : '#3060ff'; plI = 2.5;
  } else if (shot === 5) {
    const t = (f - 281) / 57;
    const lag = 42 * (1 - sm(f, 281, 302));
    cz = lerp(-178, -138, eo(t));
    cy = lerp(5.5, 8.5, t);
    const landX = heroPose(LAND_F).x;
    const track = f < LAND_F ? hero.x : landX + (hero.x - landX) * 0.55;
    cx = track - SUN_BEAR * (-4 - cz) - lag;
    lx = track - lag * 0.5; ly = 3 + hero.y * 0.8; lz = -4;
    fov = lerp(34, 18, sm(f, 284, 304)) + (f >= LAND_F ? 8 * sm(f, LAND_F, LAND_F + 10) : 0);
    pl = [cops[0].x, 5, cops[0].z]; plCol = sirenRed ? '#ff2040' : '#3060ff'; plI = 2;
    if (f >= LAND_F) {
      const a = 1.3 * Math.exp(-(f - LAND_F) / 5);
      cx += (random(`sx${f}`) - 0.5) * a; cy += (random(`sy${f}`) - 0.5) * a;
      lx += (random(`slx${f}`) - 0.5) * a * 2; ly += (random(`sly${f}`) - 0.5) * a * 2;
    }
  } else {
    const t = (f - 338) / 51;
    const e = eo(t) * 0.6 + t * 0.4;
    cx = 340 + 10 * Math.sin(t * 1.5); cy = lerp(150, 115, e); cz = lerp(-340, -265, e);
    lx = 340; ly = lerp(50, 45, e); lz = 300; fov = 46;
  }

  cam.position.set(cx, cy, cz);
  cam.lookAt(lx, ly, lz);
  cam.rotateZ(roll);
  cam.fov = fov * (1 - 0.035 * pulse - 0.03 * barHit);
  cam.near = 0.5;
  cam.far = 6000;
  cam.updateProjectionMatrix();

  const boatX = -66 + 0.6 * f;
  const boatZ = 380 - 1.8 * f;

  return (
    <>
      <fog attach="fog" args={[FOG, 160, 1500]} />
      <hemisphereLight args={['#ffc8a8', '#553a6e', 0.7]} />
      <directionalLight position={[25, 160, 500]} color="#ffb47a" intensity={1.1} />
      <pointLight position={pl} color={plCol} intensity={plI} distance={50} decay={0} />
      <mesh geometry={SKY_GEO} material={SKY_MAT} position={[cx, cy, cz]} renderOrder={-1} frustumCulled={false} />
      <mesh geometry={BOX} material={SEA_FAR} position={[cx, -4, 2760]} scale={[12000, 2, 4480]} />
      <group position={[cx + SUN_DIR.x * 3000, 160, cz + SUN_DIR.z * 3000]}>
        <VoxMesh model={M.suns[bi % 4]} mats={SUN_MATS} />
      </group>
      <VoxMesh model={world} mats={WORLD_MATS} />
      <group position={[300, 0, 0]} rotation={[0, 0, leafA]}>
        <VoxMesh model={M.leaf} mats={LEAF_MATS} />
      </group>
      <Ocean f={f} cx={cx} cz={cz} />
      {shot === 1 && f < 70 && (
        <group
          position={[boatX, -2.3 + 0.25 * Math.sin(f * 0.55), boatZ]}
          rotation={new THREE.Euler(0.05 * Math.sin(f * 0.4), -Math.PI / 2 + 0.3, 0.06 + 0.03 * Math.sin(f * 0.55), 'YXZ')}
        >
          <VoxMesh model={M.boat} />
        </group>
      )}
      <Car model={shot === 2 ? M.heroEmpty : M.hero} pose={hero} mats={HERO_MATS} />
      {f >= 169 && cops.map((p, i) => <Car key={i} model={M.cop} pose={p} mats={COP_MATS} />)}
      {f >= 169 && <Car model={M.civ} pose={civPose(f)} />}
      {shot === 2 && (
        <>
          <group position={[LX - 1.6, 0.04 * pulse, LZ]} rotation={[0, 0.2 + 0.06 * Math.sin(f * 0.12), 0]}>
            <VoxMesh model={M.rosa} />
          </group>
          <group position={[LX + 1.8, 0, LZ]} rotation={[0, -0.2 + 0.05 * Math.sin(f * 0.1 + 1), 0]}>
            <VoxMesh model={M.dex} />
          </group>
        </>
      )}
      <Bills items={billsFor(f)} />
    </>
  );
};

// ------------------------------------------------------------ HTML overlay
const FONT = 'Archivo, sans-serif';
const GRAD = 'linear-gradient(180deg,#fff4b0 0%,#ffb347 45%,#ff3f8e 100%)';

const Overlay: React.FC = () => {
  const f = useCurrentFrame();
  const bi = beatIndex(f);
  const pulse = Math.exp(-(f - bf(bi)) / 4);
  const bar = bi % 4 === 0 ? pulse : 0;
  const flash = Math.max(
    bar * 0.22,
    f >= LAND_F ? 0.75 * Math.exp(-(f - LAND_F) / 3) : 0,
    f >= 338 ? 0.9 * Math.exp(-(f - 338) / 4) : 0,
  );
  const word = (txt: string, s: number): React.ReactNode => (
    <span style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', marginRight: 28}}>
      <span style={{display: 'inline-block', transform: `translateY(${(1 - eo((f - s) / 7)) * 110}%)`}}>{txt}</span>
    </span>
  );
  const e2 = eo((f - 113) / 6);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(30,0,40,0.55) 100%)'}} />
      {f >= 56 && f < 210 && (
        <div
          style={{
            position: 'absolute', left: 110, bottom: 160, padding: 10,
            clipPath: `inset(0 0 0 ${sm(f, 200, 208) * 100}%)`,
            fontFamily: FONT, fontWeight: 900, fontSize: 118, lineHeight: 1.05,
            filter: 'drop-shadow(0 6px 0 rgba(70,0,60,0.6)) drop-shadow(0 0 20px rgba(40,0,40,0.55))',
          }}
        >
          <div style={{color: '#fff4e6'}}>
            {word('ONE', 56)}
            {word('CITY.', 60)}
          </div>
          <div
            style={{
              opacity: f >= 113 ? cl((f - 113) / 2) : 0,
              transformOrigin: 'left center',
              transform: `scale(${lerp(1.5, 1, e2) * (1 + (f >= 113 ? 0.02 * pulse : 0))})`,
              background: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              display: 'inline-block',
            }}
          >
            TWO DEBTS.
          </div>
        </div>
      )}
      {f >= 338 && (
        <>
          <AbsoluteFill
            style={{
              background: 'radial-gradient(ellipse 60% 32% at 50% 72%, rgba(40,0,40,0.6) 0%, rgba(40,0,40,0) 100%)',
              opacity: cl((f - 338) / 4),
            }}
          />
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', paddingTop: 300}}>
            <div style={{display: 'flex', filter: 'drop-shadow(0 10px 0 rgba(90,10,70,0.6))'}}>
              {'SUNBURN'.split('').map((ch, i) => {
                const s = 338 + i * 0.5;
                const e = eo((f - s) / 4);
                return (
                  <span
                    key={i}
                    style={{
                      fontFamily: FONT, fontWeight: 900, fontSize: 240, lineHeight: 1, display: 'inline-block',
                      opacity: cl((f - s) / 1.5),
                      transform: `translateY(${(1 - e) * -40}px) scale(${lerp(1.6, 1, e) * (1 + 0.015 * pulse)})`,
                      background: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                    }}
                  >
                    {ch}
                  </span>
                );
              })}
            </div>
            <div
              style={{
                clipPath: `inset(0 ${(1 - eo((f - 340) / 5)) * 100}% 0 0)`,
                fontFamily: FONT, fontWeight: 800, fontSize: 54, letterSpacing: '0.38em', paddingLeft: '0.38em',
                color: '#fff6ea', marginTop: 18,
                textShadow: '0 3px 0 rgba(90,10,70,0.85), 0 4px 22px rgba(40,0,40,0.95)',
              }}
            >
              COMING NOVEMBER
            </div>
          </AbsoluteFill>
        </>
      )}
      <AbsoluteFill style={{backgroundColor: '#fff6e8', opacity: flash}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 64, background: '#000'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 64, background: '#000'}} />
    </AbsoluteFill>
  );
};

export const Trailer: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#000'}}>
    <ThreeCanvas width={1920} height={1080} camera={{fov: 50, near: 0.5, far: 6000, position: [0, 10, 100]}}>
      <Scene />
    </ThreeCanvas>
    <Overlay />
  </AbsoluteFill>
);