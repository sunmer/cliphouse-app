/*
=====================================================================
SUNBURN — teaser trailer (all-voxel world)
CONCEPT: "Golden hour is a getaway window."
A pastel coastal city burns orange and pink at sunset. Two leads, a
red-haired driver and a hustler in a loud shirt, owe the same city, and
both debts come due tonight. They grab a duffel of cash and run a teal
convertible down the palm boulevard with three cruisers on their tail.
At the drawbridge they do not stop. They jump the rising leaf and sail
across a giant striped voxel sun.

STORYBOARD (30 fps, 128 BPM, beat n = round(n * 14.0625))
S1   0-56   (b0-4)   DRONE FLY-THROUGH. Snaps open from black, low over the
                     surf. The camera rises and pushes over the beach
                     boulevard as the convertible tears north with the
                     cruisers behind it. Neon and sea glitter pulse and the
                     FOV kicks on every beat.
S2  56-113  (b4-8)   LOW-ANGLE ORBIT AND PUSH-IN on the two leads, framed
                     right of center so the type has room, backlit by the
                     sun, with a duffel at their feet and cash raining. Words
                     slam in through masks on the beats: ONE (70) / CITY. (84)
                     / TWO (98) / DEBTS. (113, on the cut).
S3 113-169  (b8-12)  CHASE CAM behind the car, which stays right of frame.
                     Lane swings land on beats 9, 10 and 11 while siren glow
                     builds at the frame edges. The line holds until 183,
                     then wipes out word by word.
S4 169-225  (b12-16) ROADSIDE WHIP PAN from a low camera on the grass verge,
                     a safe distance from the traffic. The car rips past,
                     and the camera whips back on beat 14 to the cruisers.
                     The drawbridge leaf starts rising at 192.
S5 225-338  (b16-24) THE JUMP (strongest moment).
                     225-253: low tracking cam behind the car as it climbs
                       the raised leaf.
                     253 (b18): cut on launch into slow motion. The camera
                       orbits behind the airborne car, sinking from above
                       the leaf to road level, so the car is silhouetted
                       against the striped sun dead ahead. Apex on bar beat
                       20, with cash spilling.
                     309 (b22): slam landing on a head-on low camera with
                       flash, sparks and shake. The car rips toward the
                       lens while the cops skid at the edge.
S6 338-390  (b24-27) WIDE OVER THE SEA, with the sun sinking and the skyline
                     on the right. Slow push-in. SUNBURN slams on bar beat 24
                     and COMING NOVEMBER mask-wipes in. Both are readable from
                     345. Light sweeps cross the logo on beats 25, 26 and 27.
=====================================================================
*/
import React, { useMemo } from 'react';
import { AbsoluteFill, random, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

type V3 = [number, number, number];
type Vox = { x: number; y: number; z: number; s: number; c: string };
type ColFn = (x: number, y: number, z: number) => string | null;
interface Pose { p: V3; pitch: number; yaw: number; roll: number }
interface Cam { pos: V3; target: V3; fov: number; roll: number }

// ------------------------------------------------------------ helpers
const BEAT = 14.0625;
const B = (n: number): number => Math.round(n * BEAT);
const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const prog = (f: number, a: number, b: number): number => clamp((f - a) / (b - a));
const smooth = (t: number): number => t * t * (3 - 2 * t);
const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number): number => t * t * t;
const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const backOut = (t: number): number => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const beatAt = (f: number): { n: number; age: number } => {
  let n = Math.max(0, Math.floor(f / BEAT));
  while (B(n + 1) <= f) n++;
  while (n > 0 && B(n) > f) n--;
  return { n, age: f - B(n) };
};
const pulse = (f: number): number => {
  const { n, age } = beatAt(f);
  return Math.exp(-age / 3.5) * (n % 4 === 0 ? 1 : 0.6);
};
const shk = (f: number, a: number): V3 => [
  (Math.sin(f * 1.37) + 0.5 * Math.sin(f * 2.91 + 1.3)) * a,
  (Math.sin(f * 1.83 + 0.7) + 0.4 * Math.sin(f * 3.37)) * a * 0.7,
  Math.sin(f * 1.11 + 2.1) * a * 0.5,
];
const mix = (a: string, b: string, t: number): string =>
  '#' + new THREE.Color(a).lerp(new THREE.Color(b), clamp(t)).getHexString();
const pick = (arr: string[], key: string): string => arr[Math.floor(random(key) * arr.length) % arr.length];

// ------------------------------------------------------------ timeline / world constants
const S2 = B(4);
const S3 = B(8);
const S4 = B(12);
const S5 = B(16);
const S6 = B(24);
const T_LAUNCH = B(18);
const T_LAND = B(22);
const CH_S = -380;
const CH_N = -444;
const DECK_N = -420;
const LEAF = 40;
const ANG = 0.42;
const TIP_Z = CH_S - LEAF * Math.cos(ANG);
const TIP_Y = LEAF * Math.sin(ANG);
const SPEED = 2.6;
const T_HINGE = T_LAUNCH - LEAF / SPEED;
const LAND_Z = -490;
const APEX = 14;
const Z_MIN = -760;
const Z_MAX = 440;
const SUN_X = -150;
const SUN_Z = -1400;
const LEADS: V3 = [-40, -0.8, 0];
const sunY = (f: number): number => 72 - f * 0.08;
const leafAngle = (f: number): number => ANG * smooth(prog(f, 192, 236));
const shotOf = (f: number): number => (f < S2 ? 0 : f < S3 ? 1 : f < S4 ? 2 : f < S5 ? 3 : f < S6 ? 4 : 5);
const gapZ = (z: number): boolean => z > DECK_N && z < CH_S;
const inChan = (z: number): boolean => z > CH_N && z < CH_S;

const SKIN_A = '#dba07c';
const SKIN_B = '#a5704e';
const HAWAII = ['#ff7a3a', '#ffd166', '#1f9c8e', '#ff7a3a'];
const SEA = ['#23809b', '#2789a3', '#217a95', '#2a8ea6'];
const SAND = ['#f3d6a4', '#efcf9a', '#f6ddb0', '#ead09f'];
const ASPH = ['#3a3742', '#36333e', '#3e3b46', '#34313b'];
const PASTELS = ['#f6a8bf', '#9fe4cd', '#ffc99a', '#c8b4ff', '#fff0c4', '#a4daff'];
const ACCENTS = ['#d9668a', '#46b894', '#ee8748', '#8a6fdc', '#e2bd5c', '#4f9fdc'];
const NEONS = ['#ff3fa8', '#3ff0ff', '#ffe14d', '#ff6a3f', '#b45cff'];
const BILL_C = ['#7fd38a', '#5fb36a', '#efe7cc', '#9be0a3'];
const SPARK_C = ['#fff3b0', '#ffc24a', '#ff7a2a'];

// ------------------------------------------------------------ motion
function flightU(t: number): number {
  return t + (0.82 * Math.sin(2 * Math.PI * t)) / (2 * Math.PI);
}
function hero(f: number): Pose {
  const damp = clamp((234 - f) / 24);
  const wx = 5 * Math.sin(f * 0.045) * damp;
  const yaw = -Math.atan((0.225 * Math.cos(f * 0.045) * damp) / SPEED);
  if (f < T_HINGE) return { p: [wx, 0, CH_S + (T_HINGE - f) * SPEED], pitch: 0, yaw, roll: 0 };
  if (f < T_LAUNCH) {
    const s = (f - T_HINGE) * SPEED;
    return { p: [0, s * Math.sin(ANG), CH_S - s * Math.cos(ANG)], pitch: ANG, yaw: 0, roll: 0 };
  }
  if (f < T_LAND) {
    const t = (f - T_LAUNCH) / (T_LAND - T_LAUNCH);
    const u = flightU(t);
    return {
      p: [0, TIP_Y * (1 - u) + 4 * APEX * u * (1 - u), lerp(TIP_Z, LAND_Z, u)],
      pitch: lerp(ANG, -0.14, u),
      yaw: 0.06 * Math.sin(t * Math.PI),
      roll: 0.12 * Math.sin(t * Math.PI),
    };
  }
  const d = f - T_LAND;
  return {
    p: [0, 1.6 * Math.abs(Math.sin(d * 0.45)) * Math.exp(-d * 0.18), LAND_Z - d * SPEED],
    pitch: -0.1 * Math.exp(-d * 0.2) * Math.cos(d * 0.5),
    yaw: 0,
    roll: 0.05 * Math.exp(-d * 0.15) * Math.sin(d * 0.7),
  };
}
const FLIGHT_W = (TIP_Z - LAND_Z) / SPEED;
const warp = (f: number): number =>
  f < T_LAUNCH
    ? f
    : f < T_LAND
      ? T_LAUNCH + flightU((f - T_LAUNCH) / (T_LAND - T_LAUNCH)) * FLIGHT_W
      : T_LAUNCH + FLIGHT_W + (f - T_LAND);

const COPS = [
  { lag: 24, x: -6 },
  { lag: 34, x: 6 },
  { lag: 44, x: 0 },
];
function cop(f: number, i: number): Pose {
  const c = COPS[i];
  const raw = CH_S + (T_HINGE + c.lag - f) * SPEED;
  const stop = CH_S + 22 + i * 30;
  const d = raw - stop;
  const z = stop + 14 * Math.log(1 + Math.exp(d / 14));
  const brake = clamp(-d / 50);
  return {
    p: [c.x + 3 * Math.sin(f * 0.05 + i * 2) * (1 - brake), 0, z],
    pitch: 0,
    yaw: brake * 0.55 * (i % 2 ? 1 : -1),
    roll: 0,
  };
}

// ------------------------------------------------------------ voxel builders
class Model {
  private m = new Map<string, Vox>();
  set(x: number, y: number, z: number, c: string | null): void {
    const k = `${x},${y},${z}`;
    if (c === null) this.m.delete(k);
    else this.m.set(k, { x, y, z, s: 1, c });
  }
  fill(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: string | ColFn): void {
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        for (let z = z0; z <= z1; z++) this.set(x, y, z, typeof c === 'string' ? c : c(x, y, z));
  }
  list(): Vox[] {
    return Array.from(this.m.values());
  }
}
const addModel = (out: Vox[], vox: Vox[], ox: number, oy: number, oz: number): void => {
  for (const v of vox) out.push({ x: v.x + ox, y: v.y + oy, z: v.z + oz, s: v.s, c: v.c });
};
const slab = (
  out: Vox[], x0: number, x1: number, z0: number, z1: number, s: number, top: number,
  col: (x: number, z: number) => string | null,
): void => {
  for (let x = x0 + s / 2; x < x1; x += s)
    for (let z = z0 + s / 2; z < z1; z += s) {
      const c = col(x, z);
      if (c) out.push({ x, y: top - s / 2, z, s, c });
    }
};

// ------------------------------------------------------------ models
function carModel(police: boolean): Vox[] {
  const M = new Model();
  const paint = police ? '#16171d' : '#17c3bd';
  const dark = police ? '#0b0c10' : '#0d8f8b';
  const W = '#f3f1ea';
  const door = (z: number): boolean => police && z >= -6 && z <= 5;
  M.fill(-4, 0, -12, 4, 0, 11, '#141418');
  M.fill(-5, 1, -14, 5, 3, 13, (_x, y, z) => (door(z) && y >= 2 ? W : y === 1 ? dark : paint));
  M.fill(-5, 4, -13, 5, 4, 12, (_x, _y, z) => (door(z) ? W : paint));
  for (const sx of [-5, 5]) {
    M.set(sx, 4, -13, null);
    M.set(sx, 4, 12, null);
    M.set(sx, 3, -14, null);
    M.set(sx, 3, 13, null);
  }
  M.fill(-2, 1, -14, 2, 2, -14, '#1d1d22');
  for (const sx of [-4, -3, 3, 4]) {
    M.set(sx, 3, -14, '#fff3c4');
    M.set(sx, 3, 13, '#ff2636');
  }
  for (const wz of [-9, 8])
    for (const sx of [-5, 5]) {
      M.fill(sx, 0, wz - 2, sx, 3, wz + 2, (_x, y, z) => (Math.abs(z - wz) === 2 && (y === 0 || y === 3) ? null : '#0f0f12'));
      M.fill(sx, 1, wz - 1, sx, 2, wz + 1, '#c3c7d0');
    }
  if (police) {
    M.fill(-4, 5, -4, 4, 6, 6, (x, _y, z) =>
      Math.abs(x) === 4 || z === -4 || z === 6 ? (Math.abs(x) === 4 && (z === -4 || z === 6 || z === 1) ? W : '#22344c') : null,
    );
    M.fill(-4, 7, -3, 4, 7, 5, W);
    M.fill(-1, 8, 0, 1, 8, 0, W);
    M.fill(-3, 1, -15, 3, 2, -15, '#2a2a30');
    return M.list();
  }
  const seat = '#efe0c0';
  M.fill(-4, 4, -4, 4, 4, 8, '#3b2428');
  for (const sx of [-1, 1]) {
    M.fill(sx, 4, -13, sx, 4, -5, W);
    M.fill(sx, 4, 9, sx, 4, 12, W);
  }
  M.fill(-4, 5, -5, 4, 7, -5, (x, y) => (Math.abs(x) === 4 || y === 7 ? '#26262e' : '#a9e4f5'));
  M.fill(-3, 5, 0, -1, 5, 1, seat);
  M.fill(1, 5, 0, 3, 5, 1, seat);
  M.fill(-3, 5, 2, -1, 7, 2, seat);
  M.fill(1, 5, 2, 3, 7, 2, seat);
  M.fill(-3, 5, 6, 3, 6, 7, seat);
  M.fill(-3, 6, -3, -1, 7, -3, '#1a1a1e');
  M.fill(-3, 6, 1, -1, 7, 1, '#f6efe4');
  M.fill(-3, 8, 0, -1, 10, 1, SKIN_A);
  M.fill(-3, 10, 0, -1, 10, 1, '#9e2430');
  M.fill(-3, 8, 2, -1, 10, 3, '#9e2430');
  M.fill(-3, 9, -1, -1, 9, -1, '#0d0d10');
  M.fill(-3, 6, -2, -3, 6, 0, SKIN_A);
  M.fill(-1, 6, -2, -1, 6, 0, SKIN_A);
  M.fill(1, 6, 1, 3, 7, 1, (x, y, z) => HAWAII[(x * 7 + y * 3 + z * 5) & 3]);
  M.fill(1, 8, 0, 3, 10, 1, SKIN_B);
  M.fill(1, 10, 0, 3, 10, 1, '#141414');
  M.fill(1, 9, 2, 3, 10, 2, '#141414');
  M.fill(1, 9, -1, 3, 9, -1, '#0d0d10');
  M.fill(4, 6, 1, 4, 10, 1, SKIN_B);
  M.fill(4, 11, 0, 5, 11, 1, '#5fb36a');
  return M.list();
}

interface PersonOpts {
  skin: string; hair: string; long: boolean; top: ColFn; legs: string; shoes: string;
  extra?: (M: Model) => void;
}
function personModel(o: PersonOpts): Vox[] {
  const M = new Model();
  for (const lx of [-2, 1]) M.fill(lx, 0, -1, lx + 1, 6, 1, (_x, y) => (y === 0 ? o.shoes : o.legs));
  M.fill(-2, 7, -1, 2, 11, 1, o.top);
  for (const ax of [-3, 3]) M.fill(ax, 6, -1, ax, 11, 0, (x, y, z) => (y >= 10 ? o.top(x, y, z) : o.skin));
  M.fill(-1, 12, -1, 1, 15, 1, o.skin);
  M.fill(-1, 15, -1, 1, 16, 1, o.hair);
  M.fill(-1, 13, -1, 1, 14, -1, o.hair);
  if (o.long) {
    M.fill(-1, 8, -2, 1, 16, -2, o.hair);
    M.fill(-2, 11, -1, -2, 16, 0, o.hair);
    M.fill(2, 11, -1, 2, 16, 0, o.hair);
  }
  M.fill(-1, 14, 2, 1, 14, 2, '#0c0c10');
  if (o.extra) o.extra(M);
  return M.list();
}

function duffelModel(): Vox[] {
  const M = new Model();
  M.fill(-4, 0, -2, 4, 3, 2, (x, y, z) =>
    y === 3 && Math.abs(x) <= 3 && Math.abs(z) <= 1 ? null : Math.abs(x) === 4 ? '#1e2822' : '#2c3b31',
  );
  M.fill(-3, 2, -1, 3, 3, 1, (x, y) => (y === 3 ? (x % 3 === 0 ? '#efe7cc' : '#5fb36a') : '#4c9a57'));
  M.fill(-2, 4, 0, 2, 5, 0, (x, y) => (Math.abs(x) === 2 || y === 5 ? '#151515' : null));
  M.fill(6, 0, 1, 7, 0, 2, '#5fb36a');
  M.fill(-7, 0, -1, -6, 0, 0, '#5fb36a');
  return M.list();
}

function leafModel(): Vox[] {
  const M = new Model();
  for (let k = 0; k < LEAF; k++)
    for (let x = -14; x <= 14; x++) {
      let c: string;
      if (k >= LEAF - 2) c = ((x + 14) >> 1) % 2 ? '#f2c230' : '#1d1d22';
      else if (Math.abs(x) >= 12) c = k % 2 ? '#d3c6b8' : '#c8baab';
      else if (x === 0 && k % 6 < 3) c = '#f2c230';
      else c = k % 3 === 0 ? '#3e3e48' : '#393942';
      M.set(x, -1, -k, c);
      if (x % 7 === 0) M.set(x, -2, -k, '#5d5d66');
    }
  for (let k = 0; k < LEAF; k++)
    for (const x of [-14, 14]) {
      M.set(x, 0, -k, '#d94a3c');
      if (k % 4 === 0) M.set(x, 1, -k, '#e8e0d4');
    }
  return M.list();
}

function palmModel(seed: number, lean: number): Vox[] {
  const M = new Model();
  const h = 24 + Math.floor(random(`ph${seed}`) * 8);
  const la = 1.5 + random(`pl${seed}`) * 3;
  let tx = 0;
  for (let y = 0; y <= h; y++) {
    tx = Math.round(lean * la * (y / h) * (y / h));
    M.fill(tx, y, 0, tx + 1, y, 1, y % 3 === 0 ? '#6e4c30' : '#86603e');
  }
  M.fill(tx, h + 1, 0, tx + 1, h + 1, 1, '#3c8a3a');
  M.set(tx - 1, h - 1, 0, '#5b3a1c');
  M.set(tx + 2, h - 1, 1, '#5b3a1c');
  const cx = tx + 1;
  const cy = h + 1;
  const cz = 1;
  const rot = random(`pr${seed}`) * Math.PI * 2;
  for (let k = 0; k < 6; k++) {
    const a = rot + (k / 6) * Math.PI * 2;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const len = 10 + Math.floor(random(`pf${seed}-${k}`) * 3);
    for (let t = 1; t <= len; t++) {
      const y = Math.round(cy + 0.9 * t - 0.1 * t * t);
      const px = cx + dx * t;
      const pz = cz + dz * t;
      M.set(Math.floor(px), y, Math.floor(pz), t < 4 ? '#2e7d36' : t < len - 2 ? '#3d9e45' : '#79bf4e');
      if (t >= 3 && t < len && t % 2 === 1) {
        M.set(Math.floor(px - dz * 1.4), y - 1, Math.floor(pz + dx * 1.4), '#2a7a35');
        M.set(Math.floor(px + dz * 1.4), y - 1, Math.floor(pz - dx * 1.4), '#2a7a35');
      }
    }
  }
  return M.list();
}

function umbrellaModel(seed: number): Vox[] {
  const M = new Model();
  const c1 = ['#ff4f7b', '#2fc4c0', '#ffb43d', '#7a5cff'][seed % 4];
  M.fill(0, 0, 0, 0, 8, 0, '#f2efe8');
  for (let dx = -4; dx <= 4; dx++)
    for (let dz = -4; dz <= 4; dz++) {
      const r2 = dx * dx + dz * dz;
      const sector = Math.floor((Math.atan2(dz, dx) + Math.PI) / (Math.PI / 4)) % 2;
      const c = sector ? c1 : '#fff4e2';
      if (r2 <= 17) M.set(dx, 8, dz, c);
      if (r2 <= 6) M.set(dx, 9, dz, c);
    }
  M.fill(3, 0, -2, 5, 0, 3, (_x, _y, z) => (z & 1 ? c1 : '#fff4e2'));
  return M.list();
}

const bar = (x0: number, c: string): Vox[] => {
  const o: Vox[] = [];
  for (let x = x0; x < x0 + 3; x++) for (let z = -1; z <= 1; z++) o.push({ x, y: 8, z, s: 1, c });
  return o;
};
const BAR_R = bar(-4, '#ff2a3a');
const BAR_B = bar(2, '#2a6bff');

interface Models { hero: Vox[]; cop: Vox[]; her: Vox[]; him: Vox[]; duffel: Vox[]; leaf: Vox[] }
function buildModels(): Models {
  return {
    hero: carModel(false),
    cop: carModel(true),
    her: personModel({
      skin: SKIN_A, hair: '#9e2430', long: true, shoes: '#f4f1ea', legs: '#4a78bd',
      top: (_x, y) => (y === 7 ? '#4a78bd' : y === 8 ? SKIN_A : '#f7f0e4'),
      extra: (M) => {
        M.set(-2, 13, 1, '#ecc65a');
        M.set(2, 13, 1, '#ecc65a');
        M.fill(-3, 5, 0, -3, 5, 2, '#16161a');
        M.set(-3, 4, 0, '#16161a');
      },
    }),
    him: personModel({
      skin: SKIN_B, hair: '#141414', long: false, shoes: '#5a3a22', legs: '#2b2b35',
      top: (x, y, z) => (x === 0 && y >= 10 && z === 1 ? SKIN_B : HAWAII[(x * 7 + y * 3 + z * 5) & 3]),
      extra: (M) => {
        M.fill(-1, 12, 2, 1, 12, 2, '#2a1d16');
        M.fill(-1, 11, 2, 1, 11, 2, '#e2b84a');
        M.fill(3, 4, -1, 4, 6, 1, '#2c3b31');
      },
    }),
    duffel: duffelModel(),
    leaf: leafModel(),
  };
}

// ------------------------------------------------------------ world
function addHotel(solid: Vox[], neon: Vox[], zc: number, w: number, idx: number): void {
  const s = 4;
  const x0 = 50;
  const d = 7;
  const h = 10 + Math.floor(random(`hh${idx}`) * 9);
  const pal = PASTELS[idx % 6];
  const acc = ACCENTS[idx % 6];
  const z0 = zc - (w * s) / 2;
  for (let i = 0; i < d; i++)
    for (let j = 0; j < h; j++)
      for (let k = 0; k < w; k++) {
        const front = i === 0;
        const side = k === 0 || k === w - 1;
        const roof = j === h - 1;
        if (!front && !side && !roof) continue;
        const along = front ? k : i;
        const span = front ? w : d;
        let c = pal;
        if (roof && !front && !side) c = '#e6dbcd';
        else if (along === 0 || along === span - 1) c = acc;
        else if (roof) c = '#fff4e6';
        else if (j === 0) c = along % 3 === 1 ? '#22364b' : acc;
        else if (j % 3 === 0) c = '#fff4e6';
        else if (along % 2 === 1) {
          const r = random(`win${idx}-${i}-${j}-${k}`);
          c = r > 0.82 ? '#ffd68a' : r > 0.65 ? '#e9a08f' : '#2e5677';
        }
        solid.push({ x: x0 + i * s + s / 2, y: j * s + s / 2, z: z0 + k * s + s / 2, s, c });
      }
  const kc = Math.floor(w / 2);
  [2, 1, 1, 0].forEach((half, jj) => {
    for (let k = kc - half; k <= kc + half; k++)
      solid.push({ x: x0 + s / 2, y: (h + jj) * s + s / 2, z: z0 + k * s + s / 2, s, c: jj === 3 ? '#fff4e6' : acc });
  });
  const n1 = NEONS[idx % 5];
  const n2 = NEONS[(idx + 2) % 5];
  for (let z = z0 + 0.5; z < z0 + w * s; z += 1) neon.push({ x: x0 - 0.6, y: h * s - 6, z, s: 1, c: n1 });
  const zs = z0 + kc * s + s / 2;
  for (let y = s + 2; y < h * s - 8; y += 1) neon.push({ x: x0 - 0.6, y: y + 0.5, z: zs, s: 1, c: n2 });
}

function addTower(solid: Vox[], x0: number, zc: number, h: number, idx: number): void {
  const s = 8;
  const n = 5;
  const z0 = zc - (n * s) / 2;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < h; j++)
      for (let k = 0; k < n; k++) {
        const front = i === 0;
        const sideS = k === n - 1;
        const sideN = k === 0;
        const roof = j === h - 1;
        if (!front && !sideS && !sideN && !roof) continue;
        const along = front ? k : i;
        let c: string;
        if (roof) c = '#cfc8d6';
        else if (along === 0 || along === n - 1 || j % 5 === 0) c = '#d7d3df';
        else {
          const r = random(`tw${idx}-${i}-${j}-${k}`);
          c = r > 0.9 ? '#ffd27e' : mix('#2b4c70', '#f4a76f', smooth(clamp((j / h) * 1.2 - 0.1)) * (sideS ? 0.6 : 1));
        }
        solid.push({ x: x0 + i * s + s / 2, y: j * s + s / 2, z: z0 + k * s + s / 2, s, c });
      }
  for (let a = 0; a < 6; a++)
    solid.push({ x: x0 + (n * s) / 2, y: h * s + 1 + a * 2, z: zc, s: 2, c: a === 5 ? '#ff3344' : '#9a9aa6' });
}

interface World { solid: Vox[]; sea: Vox[]; neon: Vox[]; glitter: Vox[]; sun: Vox[]; clouds: Vox[] }
function buildWorld(): World {
  const solid: Vox[] = [];
  const sea: Vox[] = [];
  const neon: Vox[] = [];
  const glitter: Vox[] = [];
  const sun: Vox[] = [];
  const clouds: Vox[] = [];
  slab(solid, -12, 12, Z_MIN, Z_MAX, 4, -0.5, (x, z) => (gapZ(z) ? null : pick(ASPH, `r${x},${z}`)));
  for (let z = Z_MIN + 3; z < Z_MAX; z += 12)
    if (!gapZ(z) && !gapZ(z + 2))
      solid.push({ x: 0, y: -1.4, z, s: 2, c: '#f4cf3a' }, { x: 0, y: -1.4, z: z + 2, s: 2, c: '#f4cf3a' });
  const walk = (x: number, z: number): string | null =>
    gapZ(z) ? null : Math.abs(x) < 15 ? '#d6cbbd' : Math.floor(z / 4) & 1 ? '#f1dcc6' : '#e8c9b4';
  slab(solid, -20, -12, Z_MIN, Z_MAX, 4, 0, walk);
  slab(solid, 12, 20, Z_MIN, Z_MAX, 4, 0, walk);
  slab(solid, -64, -20, Z_MIN, Z_MAX, 4, -0.8, (x, z) => (inChan(z) ? null : x < -56 ? '#d9b98c' : pick(SAND, `s${x},${z}`)));
  for (let z = Z_MIN + 2; z < Z_MAX; z += 4)
    if (!inChan(z)) solid.push({ x: -65 + (random(`fo${z}`) > 0.5 ? 1 : 0), y: -2.2, z, s: 2, c: '#f4fbff' });
  slab(solid, 20, 48, Z_MIN, Z_MAX, 4, 0, (x, z) =>
    inChan(z) ? null : x < 28 ? (Math.floor(z / 8) & 1 ? '#6fa452' : '#7db35c') : pick(['#f4c6c0', '#efd6c8', '#f7e0d0'], `p${x},${z}`),
  );
  slab(solid, 48, 248, Z_MIN, Z_MAX, 10, 0, (x, z) => (inChan(z) ? null : pick(['#cdb8a8', '#d6c2b2', '#c4ae9e'], `e${x},${z}`)));
  const seaBlk = (x0: number, x1: number, z0: number, z1: number, s: number): void =>
    slab(sea, x0, x1, z0, z1, s, -2.5, (x, z) => pick(SEA, `w${x},${z}`));
  seaBlk(-704, -64, Z_MIN, Z_MAX, 16);
  seaBlk(-1704, 1016, -1704, Z_MIN, 40);
  seaBlk(-64, 248, CH_N, CH_S, 8);
  sea.forEach((v, i) => {
    v.y += (random(`j${i}`) - 0.5) * 0.6;
  });
  for (let i = 0; i < 380; i++) {
    const z = lerp(-1500, -150, Math.pow(random(`gz${i}`), 0.7));
    const xc = lerp(-160, SUN_X, (60 - z) / (60 - SUN_Z));
    const x = xc + (random(`gx${i}`) - 0.5) * (16 + (60 - z) * 0.07);
    if (x > -66 && z > Z_MIN) continue;
    const s = 2 + random(`gs${i}`) * 4;
    glitter.push({ x, y: -1.55 - s / 2, z, s, c: random(`gc${i}`) > 0.5 ? '#ffe3a3' : '#ffb36b' });
  }
  let idx = 0;
  for (const [zs, ze] of [
    [Z_MAX - 20, CH_S + 24],
    [CH_N - 24, Z_MIN + 20],
  ] as [number, number][]) {
    let z = zs;
    for (;;) {
      const w = 9 + Math.floor(random(`hw${idx}`) * 3);
      if (z - w * 4 < ze) break;
      addHotel(solid, neon, z - w * 2, w, idx);
      z -= w * 4 + 10;
      idx++;
    }
  }
  let ti = 0;
  for (let z = Z_MAX - 60; z > Z_MIN + 30; z -= 92) {
    if (z < CH_S + 40 && z > CH_N - 40) continue;
    addTower(solid, 104 + random(`tx${ti}`) * 70, z, 12 + Math.floor(random(`th${ti}`) * 14), ti);
    ti++;
  }
  // palms (keep the east-curb camera positions clear)
  let pi = 0;
  for (const sx of [-16, 16])
    for (let z = Z_MAX - 12; z > Z_MIN + 8; z -= 46) {
      pi++;
      if (z < CH_S + 12 && z > CH_N - 12) continue;
      if (sx > 0 && ((z < -195 && z > CH_S) || (z < -520 && z > -660))) continue;
      addModel(solid, palmModel(pi, sx < 0 ? 1 : -1), sx, 0, z + Math.round((random(`pz${pi}`) - 0.5) * 10));
    }
  for (let u = 0; u < 12; u++) {
    const z = Math.round(lerp(Z_MIN + 40, Z_MAX - 20, random(`uz${u}`)));
    if (Math.abs(z - LEADS[2]) < 70 || (z < CH_S + 20 && z > CH_N - 20)) continue;
    addModel(solid, umbrellaModel(u), Math.round(-30 - random(`ux${u}`) * 24), -1, z);
  }
  for (const bx of [-30, 28])
    for (let i = 0; i < 3; i++)
      for (let k = 0; k < 3; k++)
        for (let j = 0; j < 9; j++) {
          const c = j >= 7 ? '#d94a3c' : j >= 5 && (i === 1 || k === 1) ? '#9ad8e8' : '#f4f1ea';
          solid.push({ x: bx + i * 2, y: j * 2 + 1, z: CH_S + 8 + k * 2, s: 2, c });
        }
  const R = 13;
  for (let i = -R; i <= R; i++)
    for (let j = -R; j <= R; j++) {
      if (i * i + j * j > (R + 0.4) * (R + 0.4)) continue;
      if (j < 0 && -j % 3 === 0) continue;
      if (j < -6 && -j % 3 === 1) continue;
      sun.push({ x: i * 10, y: j * 10, z: 0, s: 10, c: mix('#ff3f6e', '#fff3a0', (j + R) / (2 * R)) });
    }
  const CL: [number, number, number, number][] = [
    [-420, 150, 9, -1250], [-40, 230, 12, -1270], [260, 130, 8, -1240],
    [-260, 290, 10, -1290], [140, 320, 7, -1300], [-130, 6, 13, -1330],
  ];
  CL.forEach(([cx, cy, w, cz]) => {
    for (let j = 0; j < 3; j++) {
      const half = w - j * 3;
      for (let i = -half; i <= half; i++)
        clouds.push({ x: cx + i * 14 + (j % 2) * 7, y: cy + j * 12, z: cz, s: 14, c: j === 0 ? '#f78aa0' : j === 1 ? '#ffb0a0' : '#ffd6b0' });
    }
  });
  return { solid, sea, neon, glitter, sun, clouds };
}

// ------------------------------------------------------------ instanced rendering
const BOX = new THREE.BoxGeometry(1, 1, 1);
function makeMesh(vox: Vox[], basic: boolean, fog = true): THREE.InstancedMesh {
  const mat = basic
    ? new THREE.MeshBasicMaterial({ toneMapped: false, fog })
    : new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.05 });
  const mesh = new THREE.InstancedMesh(BOX, mat, Math.max(1, vox.length));
  const o = new THREE.Object3D();
  const col = new THREE.Color();
  vox.forEach((v, i) => {
    o.position.set(v.x, v.y, v.z);
    o.scale.setScalar(v.s);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    mesh.setColorAt(i, col.set(v.c));
  });
  mesh.count = vox.length;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

const VoxMesh: React.FC<{ vox: Vox[]; basic?: boolean; fog?: boolean; glow?: number }> = ({ vox, basic = false, fog = true, glow }) => {
  const mesh = useMemo(() => makeMesh(vox, basic, fog), [vox, basic, fog]);
  if (glow !== undefined) (mesh.material as THREE.MeshBasicMaterial).color.setScalar(glow);
  return <primitive object={mesh} />;
};

type PFn = (i: number) => { p: V3; s: number; r: number } | null;
const Particles: React.FC<{ n: number; colors: string[]; fn: PFn }> = ({ n, colors, fn }) => {
  const mesh = useMemo(
    () => makeMesh(Array.from({ length: n }, (_, i) => ({ x: 0, y: 0, z: 0, s: 0, c: colors[i % colors.length] })), true),
    [n, colors],
  );
  const o = useMemo(() => new THREE.Object3D(), []);
  for (let i = 0; i < n; i++) {
    const q = fn(i);
    if (q) {
      o.position.set(q.p[0], q.p[1], q.p[2]);
      o.rotation.set(q.r, q.r * 1.7, q.r * 0.6);
      o.scale.setScalar(q.s);
    } else o.scale.setScalar(0);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};

const PoseGroup: React.FC<{ pose: Pose; children: React.ReactNode }> = ({ pose, children }) => (
  <group position={pose.p} rotation={new THREE.Euler(pose.pitch, pose.yaw, pose.roll, 'YXZ')}>
    {children}
  </group>
);

const SKY_VS = `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_FS = `uniform vec3 uSun; varying vec3 vDir;
void main(){ vec3 d = normalize(vDir); float h = d.y;
 vec3 hor = vec3(1.0,0.76,0.5); vec3 mid = vec3(0.98,0.45,0.45); vec3 top = vec3(0.2,0.16,0.42);
 vec3 c = mix(hor, mid, smoothstep(0.0, 0.16, h)); c = mix(c, top, smoothstep(0.16, 0.62, h));
 float g = max(dot(d, normalize(uSun)), 0.0);
 c += vec3(1.0,0.62,0.3) * (pow(g, 40.0) * 0.7 + pow(g, 6.0) * 0.18);
 if (h < 0.0) c = hor * 0.85;
 gl_FragColor = vec4(c, 1.0); }`;

const Sky: React.FC<{ pos: V3; sun: V3 }> = ({ pos, sun }) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uSun: { value: new THREE.Vector3(0, 0, -1) } },
        vertexShader: SKY_VS,
        fragmentShader: SKY_FS,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [],
  );
  (mat.uniforms.uSun.value as THREE.Vector3).set(sun[0] - pos[0], sun[1] - pos[1], sun[2] - pos[2]).normalize();
  return (
    <mesh position={pos} material={mat} renderOrder={-1}>
      <sphereGeometry args={[4000, 32, 16]} />
    </mesh>
  );
};

// ------------------------------------------------------------ camera
function camFor(f: number): Cam {
  let c: Cam;
  if (f < S2) {
    const t = easeInOut(f / S2);
    c = { pos: lerp3([-140, 6, 400], [-62, 78, 250], t), target: lerp3([-40, 14, 220], [8, 0, 70], t), fov: lerp(58, 46, t), roll: lerp(-0.1, 0.03, t) };
  } else if (f < S3) {
    // low orbit + push-in, leads framed right of center for the type
    const t = prog(f, S2, S3);
    const th = lerp(-0.35, 0.3, easeInOut(t));
    const r = lerp(40, 24, easeOut(t));
    c = {
      pos: [LEADS[0] + r * Math.sin(th), lerp(0.6, 2.6, t), LEADS[2] + r * Math.cos(th)],
      target: [LEADS[0] - 6 * Math.cos(th), 7.4, LEADS[2] + 6 * Math.sin(th)],
      fov: 38,
      roll: lerp(0.05, -0.02, t),
    };
  } else if (f < S4) {
    // chase cam: car right of frame, lane swings on beats 9/10/11
    const h = hero(f).p;
    const { n, age } = beatAt(f);
    const OFF = [-4, -10, -3, -9];
    const k = clamp(n - 8, 0, 3);
    const prev = OFF[Math.max(0, k - 1)];
    const cur = OFF[k];
    const sw = k === 0 ? 1 : easeOut(clamp(age / 8));
    const ox = lerp(prev, cur, sw);
    const px = h[0] * 0.5 + ox;
    c = { pos: [px, 8, h[2] + 30], target: [px - 20, 4, h[2] - 60], fov: 62, roll: -ox * 0.004 - (cur - prev) * 0.01 * (1 - sw) };
    c.pos = add3(c.pos, shk(f, 0.18));
  } else if (f < S5) {
    // low verge cam, safe distance from the lanes, whip from hero to cops
    const ht = add3(hero(f).p, [0, 3, 0]);
    const ct = add3(cop(f, 0).p, [0, 3, 0]);
    c = { pos: [27, 3.2, -226 - (f - S4) * 0.5], target: lerp3(ht, ct, smooth(prog(f, 192, 199))), fov: 50, roll: 0.04 };
  } else if (f < T_LAUNCH) {
    const h = hero(f).p;
    c = { pos: [h[0] + 8, 3.5 + h[1] * 0.5, h[2] + 26], target: [h[0] * 0.5, 8 + h[1] * 0.7, h[2] - 50], fov: 54, roll: -0.03 };
  } else if (f < T_LAND) {
    // slow-mo orbit behind the airborne car, sinking so it rises over the sun
    const t = prog(f, T_LAUNCH, T_LAND);
    const h = hero(f).p;
    const th = lerp(0.5, -0.32, easeInOut(t));
    const r = lerp(30, 24, t);
    c = {
      pos: [h[0] + r * Math.sin(th), Math.max(3, h[1] - lerp(2, 8, t)), h[2] + r * Math.cos(th)],
      target: [h[0] - 8, h[1] + 1.5, h[2] - 60],
      fov: lerp(48, 42, t),
      roll: lerp(0.08, -0.06, t),
    };
  } else if (f < S6) {
    const h = hero(f).p;
    c = { pos: [10, 3.5, -598 + (f - T_LAND) * 0.6], target: [h[0] * 0.5, 4 + h[1] * 0.5, h[2]], fov: 48, roll: 0.02 };
    const a = 2.4 * Math.exp(-(f - T_LAND) / 6);
    c.pos = add3(c.pos, shk(f, a));
    c.roll += Math.sin(f * 2.3) * 0.015 * a;
  } else {
    const t = easeOut(prog(f, S6, 390));
    c = { pos: lerp3([-172, 26, 70], [-150, 36, 10], t), target: [-112, 44, -900], fov: lerp(40, 34, t), roll: 0 };
  }
  c.fov -= 3 * pulse(f);
  return c;
}

// ------------------------------------------------------------ scene
const Scene: React.FC<{ f: number }> = ({ f }) => {
  const world = useMemo(buildWorld, []);
  const md = useMemo(buildModels, []);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const cam = camFor(f);
  camera.position.set(cam.pos[0], cam.pos[1], cam.pos[2]);
  camera.up.set(0, 1, 0);
  camera.lookAt(cam.target[0], cam.target[1], cam.target[2]);
  camera.rotateZ(cam.roll);
  camera.fov = cam.fov;
  camera.near = 0.5;
  camera.far = 6000;
  camera.updateProjectionMatrix();

  const p = pulse(f);
  const shot = shotOf(f);
  const sy = sunY(f);

  const billRain: PFn = (i) => {
    const fall = (f * 0.34 + random(`br3${i}`) * 48) % 48;
    return {
      p: [LEADS[0] + (random(`br1${i}`) - 0.5) * 46 + Math.sin(f * 0.05 + i) * 2, 40 - fall, LEADS[2] + (random(`br2${i}`) - 0.5) * 34],
      s: 0.85,
      r: f * 0.11 + i,
    };
  };
  const flyBills: PFn = (i) => {
    const ts = T_LAUNCH - 4 + i * 0.6;
    if (f < ts) return null;
    const dt = warp(f) - warp(ts);
    if (dt > 60) return null;
    const hp = hero(ts).p;
    return {
      p: [hp[0] + 3 + (random(`fx${i}`) - 0.3) * dt * 0.5, hp[1] + 10 + random(`fy${i}`) * 0.6 * dt - 0.01 * dt * dt, hp[2] + 2 + dt * random(`fz${i}`) * 0.8],
      s: 0.9,
      r: f * 0.08 + i,
    };
  };
  const sparks: PFn = (i) => {
    const te = (i % 20) * 0.7;
    const t = f - T_LAND - te;
    if (t < 0 || t > 16) return null;
    const hp = hero(T_LAND + te).p;
    return {
      p: [hp[0] + (random(`sx${i}`) - 0.5) * 10, Math.max(0.2, 0.3 + (0.5 + random(`sy${i}`)) * t * 0.6 - 0.05 * t * t), hp[2] + 12 + t * (0.8 + random(`sz${i}`) * 1.6)],
      s: 0.9 * (1 - t / 16) + 0.15,
      r: i,
    };
  };

  return (
    <>
      <Sky pos={cam.pos} sun={[SUN_X, sy, SUN_Z]} />
      <fog attach="fog" args={['#f9b98a', 260, 1600]} />
      <hemisphereLight args={['#ffd9bd', '#4a3050', 1.15]} />
      <directionalLight position={[-150, 160, -900]} intensity={2.6} color="#ffb070" />
      <directionalLight position={[260, 300, 500]} intensity={0.95} color="#a8b8ff" />
      <ambientLight intensity={0.25} />

      <VoxMesh vox={world.solid} />
      <VoxMesh vox={world.sea} />
      <VoxMesh vox={world.neon} basic glow={0.8 + 1.6 * p} />
      <VoxMesh vox={world.glitter} basic glow={0.6 + 1.2 * p + 0.25 * Math.sin(f * 0.9)} />
      <group position={[SUN_X, sy, SUN_Z]}>
        <VoxMesh vox={world.sun} basic fog={false} />
      </group>
      <group position={[f * 0.25, 0, 0]}>
        <VoxMesh vox={world.clouds} basic fog={false} />
      </group>

      <group position={[0, 0, CH_S]} rotation={[leafAngle(f), 0, 0]}>
        <VoxMesh vox={md.leaf} />
      </group>

      <PoseGroup pose={hero(f)}>
        <VoxMesh vox={md.hero} />
      </PoseGroup>
      {[0, 1, 2].map((i) => {
        const on = Math.floor(f / 2.5 + i) % 2 === 0;
        return (
          <PoseGroup key={i} pose={cop(f, i)}>
            <VoxMesh vox={md.cop} />
            <VoxMesh vox={BAR_R} basic glow={on ? 2.6 : 0.2} />
            <VoxMesh vox={BAR_B} basic glow={on ? 0.2 : 2.6} />
          </PoseGroup>
        );
      })}

      {shot === 1 && (
        <>
          <group position={[LEADS[0] - 4.5, LEADS[1] + 0.35, LEADS[2]]} rotation={[0, 0.18, 0]} scale={0.7}>
            <VoxMesh vox={md.her} />
          </group>
          <group position={[LEADS[0] + 4.5, LEADS[1] + 0.35 + 0.25 * p, LEADS[2]]} rotation={[0, -0.18, 0]} scale={0.7}>
            <VoxMesh vox={md.him} />
          </group>
          <group position={[LEADS[0] + 0.5, LEADS[1] + 0.35, LEADS[2] + 2.5]} rotation={[0, 0.3, 0]} scale={0.6}>
            <VoxMesh vox={md.duffel} />
          </group>
          <Particles n={150} colors={BILL_C} fn={billRain} />
        </>
      )}
      {shot === 4 && (
        <>
          <Particles n={90} colors={BILL_C} fn={flyBills} />
          <Particles n={100} colors={SPARK_C} fn={sparks} />
        </>
      )}
    </>
  );
};

// ------------------------------------------------------------ overlay
const HITS: [number, number, number][] = [
  [S2, 0.45, 8], [S3, 0.5, 8], [S4, 0.4, 8], [S5, 0.45, 8],
  [T_LAUNCH, 0.35, 8], [B(20), 0.25, 8], [T_LAND, 0.95, 14], [S6, 0.75, 7],
];
const flashAt = (f: number): number => {
  let a = 0;
  for (const [t, amp, len] of HITS) if (f >= t && f < t + len) a = Math.max(a, amp * (1 - (f - t) / len));
  return a;
};
const sirenAmt = (f: number): number =>
  f < S3 ? 0 : f < S4 ? 0.12 + 0.25 * prog(f, S3, S4) : f < T_LAND ? 0.4 : f < S6 ? 0.4 * (1 - prog(f, T_LAND, S6)) : 0;

const OUT = B(13);
const WORDS = [
  { t: 'ONE', at: B(5), row: 0 },
  { t: 'CITY.', at: B(6), row: 0 },
  { t: 'TWO', at: B(7), row: 1 },
  { t: 'DEBTS.', at: B(8), row: 1, hot: true },
];

const Word: React.FC<{ text: string; at: number; out: number; f: number; hot?: boolean }> = ({ text, at, out, f, hot }) => {
  const a = prog(f, at, at + 6);
  const o = easeIn(prog(f, out, out + 9));
  const y = (1 - backOut(a)) * 110 - o * 115;
  const punch = clamp(1 - (f - at) / 7);
  const fill: React.CSSProperties = hot
    ? {
        backgroundImage: 'linear-gradient(180deg,#ffe27a 0%,#ff7a3a 55%,#ff3f7f 100%)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        filter: 'drop-shadow(0 6px 24px rgba(60,0,40,0.6))',
      }
    : { color: '#fff8ee', textShadow: '0 6px 30px rgba(60,0,40,0.55)' };
  return (
    <div style={{ overflow: 'hidden', height: 150, padding: '0 16px', margin: '0 -16px' }}>
      <div
        style={{
          ...fill,
          fontSize: 140,
          lineHeight: '150px',
          fontWeight: 900,
          letterSpacing: '-0.01em',
          transform: `translateY(${y}%) skewX(-8deg) scale(${1 + 0.1 * punch})`,
          transformOrigin: 'left bottom',
        }}
      >
        {text}
      </div>
    </div>
  );
};

const Tagline: React.FC<{ f: number }> = ({ f }) => {
  if (f < B(5) - 1 || f > OUT + 20) return null;
  const barH = 280 * easeOut(prog(f, B(5), B(5) + 8)) * (1 - easeIn(prog(f, OUT + 6, OUT + 16)));
  return (
    <div style={{ position: 'absolute', left: 130, bottom: 140 }}>
      <div style={{ position: 'absolute', left: -32, bottom: 10, width: 12, height: barH, background: 'linear-gradient(180deg,#ffd25e,#ff3f7f)' }} />
      {[0, 1].map((row) => (
        <div key={row} style={{ display: 'flex', gap: 40 }}>
          {WORDS.filter((w) => w.row === row).map((w, i) => (
            <Word key={w.t} text={w.t} at={w.at} out={OUT + (row * 2 + i) * 2} f={f} hot={w.hot} />
          ))}
        </div>
      ))}
    </div>
  );
};

const Title: React.FC<{ f: number }> = ({ f }) => {
  if (f < S6) return null;
  const a = prog(f, S6, S6 + 7);
  const e = easeOut(a);
  const scale = lerp(2.2, 1, e) * (1 + 0.02 * pulse(f) * (f > S6 + 10 ? 1 : 0));
  const blur = (1 - e) * 14;
  const ls = lerp(0.5, 0.04, e);
  let sp = -1;
  for (const n of [25, 26, 27]) if (f >= B(n) && f < B(n) + 12) sp = prog(f, B(n), B(n) + 12);
  const sub = easeOut(prog(f, S6 + 2, S6 + 7));
  const text: React.CSSProperties = {
    fontSize: 240,
    fontWeight: 900,
    lineHeight: 1.05,
    letterSpacing: `${ls}em`,
    paddingLeft: `${ls}em`,
    color: 'transparent',
  };
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <div
        style={{
          position: 'relative',
          transform: `scale(${scale})`,
          opacity: clamp(a * 3),
          filter: `blur(${blur}px) drop-shadow(0 8px 0 #4a0f3a) drop-shadow(0 20px 40px rgba(30,0,30,0.6))`,
        }}
      >
        <div
          style={{
            ...text,
            backgroundImage: 'linear-gradient(180deg,#fff7d6 0%,#ffd25e 38%,#ff8a3d 62%,#ff3f7f 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
          }}
        >
          SUNBURN
        </div>
        {sp >= 0 && (
          <div
            style={{
              ...text,
              position: 'absolute',
              inset: 0,
              backgroundImage: 'linear-gradient(105deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0) 60%)',
              backgroundSize: '300% 100%',
              backgroundPosition: `${lerp(100, 0, sp)}% 0`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
            }}
          >
            SUNBURN
          </div>
        )}
      </div>
      <div
        style={{
          marginTop: 26,
          clipPath: `inset(0 ${100 - sub * 100}% 0 0)`,
          transform: `translateY(${(1 - sub) * 20}px)`,
          fontSize: 52,
          fontWeight: 700,
          letterSpacing: '0.42em',
          paddingLeft: '0.42em',
          color: '#fff8ee',
          textShadow: '0 4px 18px rgba(40,0,30,0.9)',
        }}
      >
        COMING NOVEMBER
      </div>
    </AbsoluteFill>
  );
};

const Overlay: React.FC<{ f: number }> = ({ f }) => {
  const siren = sirenAmt(f);
  const red = Math.floor(f / (BEAT / 2)) % 2 === 0;
  const lb = 54 + 46 * smooth(prog(f, T_LAUNCH, T_LAUNCH + 8)) * (1 - smooth(prog(f, T_LAND, T_LAND + 6)));
  return (
    <>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(255,120,60,0.10), rgba(0,0,0,0) 40%, rgba(60,0,60,0.18))' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(20,0,20,0.55) 100%)' }} />
      {f >= S6 && (
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 60% 40% at center, rgba(40,0,30,${0.35 * prog(f, S6, S6 + 6)}), rgba(0,0,0,0))` }} />
      )}
      {siren > 0 && (
        <AbsoluteFill
          style={{
            background: `linear-gradient(90deg, rgba(255,30,50,${red ? siren : siren * 0.2}) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 78%, rgba(40,90,255,${red ? siren * 0.2 : siren}) 100%)`,
            mixBlendMode: 'screen',
          }}
        />
      )}
      <AbsoluteFill style={{ backgroundColor: '#fff6e0', opacity: flashAt(f) }} />
      <AbsoluteFill style={{ backgroundColor: '#000', opacity: 0.85 * (1 - easeOut(prog(f, 0, 6))) }} />
      <Tagline f={f} />
      <Title f={f} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: lb, background: '#000' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: lb, background: '#000' }} />
    </>
  );
};

// ------------------------------------------------------------ root
export const Trailer: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: '#000', fontFamily: 'Archivo, sans-serif' }}>
      <ThreeCanvas width={1920} height={1080} camera={{ fov: 50, near: 0.5, far: 6000, position: [0, 10, 100] }}>
        <Scene f={f} />
      </ThreeCanvas>
      <Overlay f={f} />
    </AbsoluteFill>
  );
};