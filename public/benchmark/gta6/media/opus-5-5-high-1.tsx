/*
CONCEPT: "SUNBURN"
A voxel coastal city at golden hour. Two leads walk out of a neon pastel beach hotel carrying duffel
bags of cash. They take a red convertible and run the length of the ocean boulevard toward a striped
sun, with the police right behind them. The peak is a slow-motion ramp jump over a police roadblock:
the camera cranes up so the car flies dead across the sun while cash pours out behind it. Then the
title slams in over the sun as the car races to the horizon.
Palette: orange-pink sky, teal sea, pastel deco hotels, red and blue sirens.

MUSIC GRID: 128 BPM. Beat n = round(n * 14.0625). Bars start on frames 0, 56, 113, 169, 225, 281, 338.
On every beat: camera FOV punch (bigger on bars), neon pulse, sun pulse, and a red/blue siren swap.
Footsteps land on the beat in S2.

STORYBOARD
S1  0-55    AERIAL FLY-IN. Fly high over the surf along the coastline toward the sun, descending and
            leveling out of a bank. The city fills the left half of the frame. The getaway car and the
            police are on the boulevard.
S2  56-112  THE LEADS. Low-angle push-in. The two leads walk out from a neon hotel toward camera,
            carrying duffels, framed on the right half. "ONE CITY." slams in at 70 and "TWO DEBTS."
            mask-rises at 84 on the left. The text holds, then wipes out at 141-148.
S3  113-168 THE PASS. Curb-height camera between palms. The car blasts past on beat 10 (141) with a
            whip-pan follow. Police pass at about 158 and 165.
S4  169-280 THE CHASE. One crane move: it starts high behind the police convoy, surges past the police
            on beat 16 (225), and swings low alongside the car by beat 20.
S5  281-337 THE JUMP (strongest moment). Flash on 281. The car hits the ramp, with slow motion from 290
            to 325. Low orbit from the front side to behind, then a crane up until the airborne car is
            silhouetted dead across the sun while a cloud of cash streams out. Landing slam at about 334.
S6  338-389 TITLE. A chase cam rises behind the car as it pulls toward the horizon. "SUNBURN" letter-slams
            from 338 to 345 and "COMING NOVEMBER" mask-rises from 339 to 345. Both hold to 389.
*/
import React, { useMemo } from 'react';
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

type V3 = [number, number, number];
type Cell = [number, number, number, number];
interface Vox { x: number; y: number; z: number; s: number; c: number }

// ---------- timing ----------
const BEAT = 14.0625;
const bf = (n: number) => Math.round(n * BEAT);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ss = (t: number) => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };
const vl = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const mod = (a: number, n: number) => ((a % n) + n) % n;
function beatInfo(f: number) {
  let n = Math.floor(f / BEAT);
  while (bf(n + 1) <= f) n++;
  while (n > 0 && bf(n) > f) n--;
  const df = f - bf(n);
  return { n, pulse: Math.exp(-df / 3.2) };
}
function spline(keys: V3[], t: number): V3 {
  const n = keys.length - 1;
  const x = clamp(t, 0, 1) * n;
  const i = Math.min(n - 1, Math.floor(x));
  const u = x - i;
  const k = (j: number) => keys[clamp(j, 0, n)];
  const cr = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
  return [0, 1, 2].map((a) => cr(k(i - 1)[a], k(i)[a], k(i + 1)[a], k(i + 2)[a])) as V3;
}

// ---------- voxel builders ----------
const LIT = 0x1000000;
const NEON = 0x2000000;
const RED = 0x4000000;
const BLU = 0x8000000;

function grid(w: number, h: number, d: number, fn: (x: number, y: number, z: number) => number | null, cull = true): Cell[] {
  const g = new Int32Array(w * h * d).fill(-1);
  const id = (x: number, y: number, z: number) => (y * d + z) * w + x;
  for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) {
    const c = fn(x, y, z);
    if (c !== null) g[id(x, y, z)] = c;
  }
  const full = (x: number, y: number, z: number) =>
    x >= 0 && y >= 0 && z >= 0 && x < w && y < h && z < d && g[id(x, y, z)] >= 0;
  const out: Cell[] = [];
  for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) {
    const c = g[id(x, y, z)];
    if (c < 0) continue;
    if (cull && full(x - 1, y, z) && full(x + 1, y, z) && full(x, y - 1, z) && full(x, y + 1, z) && full(x, y, z - 1) && full(x, y, z + 1)) continue;
    out.push([x, y, z, c]);
  }
  return out;
}
interface Bk { l: Vox[]; b: Vox[]; n: Vox[]; r: Vox[]; u: Vox[] }
const nb = (): Bk => ({ l: [], b: [], n: [], r: [], u: [] });
function place(cells: Cell[], s: number, o: V3, t: V3, bk: Bk) {
  for (const [x, y, z, c] of cells) {
    const v: Vox = { x: (x + 0.5 + o[0]) * s + t[0], y: (y + 0.5 + o[1]) * s + t[1], z: (z + 0.5 + o[2]) * s + t[2], s, c: c & 0xffffff };
    const tag = c & 0xf000000;
    if (tag === NEON) bk.n.push(v);
    else if (tag === LIT) bk.b.push(v);
    else if (tag === RED) bk.r.push(v);
    else if (tag === BLU) bk.u.push(v);
    else bk.l.push(v);
  }
}
const shade = (c: number, k: number) => new THREE.Color(c).multiplyScalar(k).getHex();
const vary = (c: number, seed: string, amt: number) => shade(c, 1 + (random(seed) - 0.5) * amt);

// ---------- shared three objects ----------
const BOX = new THREE.BoxGeometry(1, 1, 1);
const LAMB = new THREE.MeshLambertMaterial({ color: 0xffffff });
const BASIC = new THREE.MeshBasicMaterial({ color: 0xffffff });
const NEON_MAT = new THREE.MeshBasicMaterial({ color: 0xffffff });
const SIREN_R = new THREE.MeshBasicMaterial({ color: 0xff2030 });
const SIREN_B = new THREE.MeshBasicMaterial({ color: 0x2050ff });
const SUN_MAT = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
const OCEAN_MAT = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 70, specular: new THREE.Color(0xffc890) });
const SEA_MAT = new THREE.MeshPhongMaterial({ color: 0x0c5878, shininess: 60, specular: new THREE.Color(0xffb070) });
const LAND_MAT = new THREE.MeshLambertMaterial({ color: 0xbfae9a });

function makeMesh(vox: Vox[], mat: THREE.Material) {
  const mesh = new THREE.InstancedMesh(BOX, mat, Math.max(1, vox.length));
  const m = new THREE.Matrix4();
  const col = new THREE.Color();
  vox.forEach((v, i) => {
    m.makeScale(v.s, v.s, v.s);
    m.setPosition(v.x, v.y, v.z);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, col.setHex(v.c));
  });
  mesh.count = vox.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}
const VoxMesh: React.FC<{ vox: Vox[]; mat?: THREE.Material }> = ({ vox, mat = LAMB }) => {
  const mesh = useMemo(() => makeMesh(vox, mat), [vox, mat]);
  return <primitive object={mesh} />;
};

// ---------- sky & sun ----------
const SUN_DIR = new THREE.Vector3(-0.8, 0.15, -0.6).normalize();
const SUN_EL = Math.asin(SUN_DIR.y);
const LIGHT_DIR = new THREE.Vector3(-0.8, 0.55, -0.6).normalize();
const SUN_Q = new THREE.Quaternion().setFromRotationMatrix(
  new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), SUN_DIR, new THREE.Vector3(0, 1, 0))
);
const SKY_STOPS: [number, number][] = [
  [-1, 0xf4a27a], [-0.02, 0xf4a27a], [0.02, 0xffb06e], [0.1, 0xff8c6e],
  [0.22, 0xdc5f8a], [0.4, 0x70409a], [0.7, 0x2f2668], [1, 0x16153d],
];
const SKY_GEO = (() => {
  const g = new THREE.SphereGeometry(1, 48, 32);
  const pos = g.attributes.position;
  const cols: number[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let k = 0;
    while (k < SKY_STOPS.length - 2 && v.y > SKY_STOPS[k + 1][0]) k++;
    const t = clamp((v.y - SKY_STOPS[k][0]) / (SKY_STOPS[k + 1][0] - SKY_STOPS[k][0]), 0, 1);
    const c = new THREE.Color(SKY_STOPS[k][1]).lerp(new THREE.Color(SKY_STOPS[k + 1][1]), t);
    const s = Math.max(0, v.dot(SUN_DIR));
    c.lerp(new THREE.Color(0xffdc8f), Math.min(1, Math.pow(s, 7) * 0.8 + Math.pow(s, 60) * 0.5));
    cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  return g;
})();
const SKY_MAT = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
const SUN_VOX: Vox[] = (() => {
  const out: Vox[] = [];
  const R = 18;
  const S = 8;
  const top = new THREE.Color(0xfff6c0);
  const mid = new THREE.Color(0xffb23e);
  const bot = new THREE.Color(0xff4a6e);
  for (let i = -21; i <= 21; i++) for (let j = -21; j <= 21; j++) {
    const r = Math.hypot(i, j);
    if (r <= R + 0.3) {
      if (j < -1 && mod(j, 4) === 0) continue;
      if (j < -9 && mod(j, 4) === 1) continue;
      const t = (j + R) / (2 * R);
      const c = t > 0.5 ? mid.clone().lerp(top, (t - 0.5) * 2) : bot.clone().lerp(mid, t * 2);
      out.push({ x: i * S, y: j * S, z: 0, s: S, c: c.getHex() });
    } else if (r <= R + 2.6 && mod(i + j, 2) === 0) {
      out.push({ x: i * S, y: j * S, z: -2, s: S, c: 0xffb27a });
    }
  }
  return out;
})();

// ---------- models ----------
interface CarModel { body: Vox[]; lamps: Vox[]; red: Vox[]; blue: Vox[] }
function buildCar(police: boolean): CarModel {
  const L = 36;
  const W = 16;
  const BODY = police ? 0x17181f : 0xff3a2c;
  const WH = 0xf3f1ec;
  const cells = grid(L, 12, W, (x, y, z) => {
    for (const wx of [7.5, 28.5]) {
      const dx = x + 0.5 - wx;
      const dy = y + 0.5 - 3;
      const r2 = dx * dx + dy * dy;
      const side = z <= 2 || z >= 13;
      if (side && r2 <= 9) return r2 < 1.7 && (z === 0 || z === W - 1) ? 0xd8d8d8 : 0x151515;
      if (side && r2 <= 14.5 && y <= 5) return null;
    }
    if (!police) {
      if (x === 26 && y >= 7 && y <= 8 && z >= 2 && z <= 13) return z === 2 || z === 13 || y === 8 ? 0xe2e2e2 : 0x9fdcef;
      if (x === 23 && y >= 5 && y <= 7 && (z === 4 || z === 5)) return 0x1e1e1e;
    } else {
      if (x >= 11 && x <= 25 && z >= 2 && z <= 13 && y >= 7 && y <= 10) {
        if (y === 10 || x === 11 || x === 18 || x === 25) return WH;
        return 0x223140;
      }
      if (y === 11 && x >= 17 && x <= 19 && z >= 3 && z <= 12) return (z <= 7 ? RED : BLU) | 0xffffff;
    }
    if (y < 2 || y > 6 || z < 1 || z > 14) return null;
    const endX = x === 0 || x === L - 1;
    if (endX && (z === 1 || z === 14)) return null;
    if ((x >= L - 2 || x <= 1) && y === 6) return null;
    const lampZ = z === 2 || z === 3 || z === 12 || z === 13;
    if (x === L - 1 && y === 5 && lampZ) return LIT | 0xfff0c0;
    if (x === 0 && y === 5 && lampZ) return LIT | 0xff2626;
    if (y === 2) return endX ? 0xd0d0d0 : 0x202024;
    if (x === L - 1 && y >= 3 && y <= 4 && z >= 5 && z <= 10) return 0x1a1a1e;
    if (!police) {
      const cockpit = x >= 11 && x <= 25 && z >= 2 && z <= 13;
      if (cockpit && y >= 5) return x <= 12 && z !== 7 && z !== 8 ? 0x6b3a22 : null;
      if (cockpit && y === 4) return 0x2b1d17;
      if (y === 6 && (z === 7 || z === 8)) return WH;
      if (y === 4 && (z === 1 || z === 14)) return WH;
      return BODY;
    }
    if (y >= 5 && x >= 9 && x <= 27) return WH;
    if (y === 4 && (z === 1 || z === 14) && x >= 9 && x <= 27) return 0x2a5bd7;
    return BODY;
  });
  const bk = nb();
  place(cells, 0.5, [-L / 2, 0, -W / 2], [0, 0, 0], bk);
  return { body: bk.l, lamps: bk.b, red: bk.r, blue: bk.u };
}
const CAR_HERO = buildCar(false);
const CAR_POLICE = buildCar(true);

interface Look { skin: number; hair: number; top: number; top2: number; pants: number; shoes: number; shades: number; long: boolean; man: boolean }
interface PersonModel { head: Vox[]; torso: Vox[]; hair: Vox[]; arm: Vox[]; leg: Vox[]; bag: Vox[] }
function buildPerson(L: Look, id: string): PersonModel {
  const head = grid(5, 5, 5, (x, y, z) => {
    if (y === 4 || z === 0) return L.hair;
    if (z === 4 && y === 2) return x === 1 || x === 3 ? shade(L.shades, 1.6) : L.shades;
    if (L.long && z === 4 && y === 3 && x <= 2) return L.hair;
    if ((x === 0 || x === 4) && (y >= 3 || (L.long && z <= 2))) return L.hair;
    if (z === 4 && y === 0) {
      if (!L.long && x >= 1 && x <= 3) return 0x2a1a10;
      if (L.long && x === 2) return 0xc0394f;
    }
    if (z === 4 && y === 1 && x === 2) return shade(L.skin, 0.8);
    return L.skin;
  });
  const torso = grid(5, 5, 3, (x, y, z) => {
    if (y === 0) return L.man ? 0x3a2618 : L.pants;
    if (L.man) return z === 2 && x === 2 && y >= 3 ? L.skin : random(`${id}${x}_${y}_${z}`) < 0.25 ? L.top2 : L.top;
    return y === 1 ? L.skin : L.top;
  });
  const hair = L.long ? grid(5, 4, 1, () => L.hair) : [];
  const arm = grid(2, 5, 2, (_x, y) => (L.man ? (y >= 3 ? L.top : L.skin) : y === 1 ? 0xf0c14b : L.skin));
  const leg = grid(2, 6, 3, (_x, y) => (y === 0 ? L.shoes : L.pants));
  // duffel: navy body, white side stripe, cash bulging out of the open top
  const bag = grid(3, 4, 6, (x, y, z) => {
    if (y === 3) return x === 1 && z >= 1 && z <= 4 ? (mod(z, 2) === 0 ? 0x6fd36a : 0x4fb04c) : null;
    if (y === 1 && (x === 0 || x === 2) && z >= 1 && z <= 4) return 0xf2f2f2;
    return 0x23304a;
  });
  const tv = (c: Cell[], o: V3) => { const b = nb(); place(c, 0.5, o, [0, 0, 0], b); return b.l; };
  return {
    head: tv(head, [-2.5, 0, -2.5]),
    torso: tv(torso, [-2.5, 0, -1.5]),
    hair: tv(hair, [-2.5, 1, -2.5]),
    arm: tv(arm, [-1, -5, -1]),
    leg: tv(leg, [-1, -6, -1.5]),
    bag: tv(bag, [-1.5, -3, -3]),
  };
}
const MAN_M = buildPerson({ skin: 0xb97a52, hair: 0x22160f, top: 0x22b5a5, top2: 0xff6fa1, pants: 0x2b2d42, shoes: 0xf2f2f2, shades: 0x0d0d10, long: false, man: true }, 'man');
const WOMAN_M = buildPerson({ skin: 0xe2a982, hair: 0x2a120c, top: 0xff4f78, top2: 0xff4f78, pants: 0xf4ece0, shoes: 0xffffff, shades: 0x2a1a08, long: true, man: false }, 'woman');

function palmCells(seed: string): Cell[] {
  const m = new Map<string, Cell>();
  const add = (x: number, y: number, z: number, c: number) => { m.set(`${x},${y},${z}`, [x, y, z, c]); };
  const H = 22 + Math.floor(random(seed + 'h') * 10);
  const bx = (random(seed + 'bx') - 0.5) * 10;
  const bz = (random(seed + 'bz') - 0.5) * 6;
  let tx = 0;
  let tz = 0;
  for (let y = 0; y < H; y++) {
    const t = y / H;
    tx = Math.round(bx * t * t);
    tz = Math.round(bz * t * t);
    const c = y % 3 === 0 ? 0x6e5136 : 0x93714c;
    for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) add(tx + a, y, tz + b, c);
  }
  for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) add(tx + a, H, tz + b, 0x2f7d34);
  add(tx - 1, H - 2, tz, 0x5a3a1c);
  add(tx + 2, H - 2, tz + 1, 0x5a3a1c);
  const rot = random(seed + 'r') * 6.28;
  for (let i = 0; i < 7; i++) {
    const a = rot + (i / 7) * Math.PI * 2 + (random(seed + 'a' + i) - 0.5) * 0.4;
    const len = 9 + random(seed + 'l' + i) * 4;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    for (let s = 1; s <= len; s++) {
      const fx = tx + 1 + ca * s;
      const fz = tz + 1 + sa * s;
      const fy = Math.round(H + 1 + s * 0.55 - s * s * 0.085);
      add(Math.floor(fx), fy, Math.floor(fz), s > len - 2 ? 0x6cc24f : s % 2 ? 0x3f9c3d : 0x358a36);
      if (s >= 2 && s <= len - 2) {
        add(Math.floor(fx - sa), fy - 1, Math.floor(fz + ca), 0x2b7330);
        add(Math.floor(fx + sa), fy - 1, Math.floor(fz - ca), 0x2b7330);
      }
    }
  }
  return Array.from(m.values());
}

const PASTELS = [0xffc4d6, 0x9fe6dc, 0xfff0c8, 0xcdb8ff, 0xffd0a6, 0xf7f7f2, 0xa9d8ff];
const NEONS = [0xff3fa4, 0x3fe8ff, 0xffb02e, 0xb44bff];
function hotelCells(seed: string): Cell[] {
  const w = 14;
  const d = 9;
  const h = 7 + Math.floor(random(seed + 'h') * 6);
  const wall = PASTELS[Math.floor(random(seed + 'c') * PASTELS.length)];
  const trim = random(seed + 't') > 0.5 ? 0xffffff : shade(wall, 0.8);
  const neon = NEONS[Math.floor(random(seed + 'n') * NEONS.length)];
  return grid(w, h + 2, d, (x, y, z) => {
    if (y >= h) return z >= 1 && z <= 2 && x >= 5 && x <= 8 && y < h + (x === 5 || x === 8 ? 1 : 2) ? trim : null;
    if (z === 0) {
      if (x === 1 && y >= 2 && y <= h - 2) return NEON | neon;
      if (y === 1 && x >= 3 && x <= 10) return NEON | neon;
      if (y % 3 === 2 && y < h - 1) return trim;
      return null;
    }
    if (!(z === 1 || x === 0 || x === w - 1 || y === h - 1)) return null;
    if (y === h - 1) return trim;
    const along = z === 1 ? x : z;
    const amax = z === 1 ? w - 1 : d - 1;
    if (along === 0 || along === amax) return wall;
    if (y === 0) return z === 1 && x >= 5 && x <= 8 ? LIT | 0xffd9a0 : shade(wall, 0.85);
    if (y % 3 !== 2 && along % 2 === 1) return random(`${seed}w${x}_${y}_${z}`) < 0.25 ? LIT | 0xffcf8a : 0x2f5f7c;
    return wall;
  }, false);
}
const TOWER_WALLS = [0xf2ece4, 0xe8d6c8, 0xd6e6ee, 0xf3d9df, 0xe0dcef];
function towerCells(seed: string) {
  const w = 6 + Math.floor(random(seed + 'w') * 3);
  const d = 6;
  const h = 9 + Math.floor(Math.pow(random(seed + 'h'), 1.3) * 22);
  const wall = TOWER_WALLS[Math.floor(random(seed + 'c') * TOWER_WALLS.length)];
  const glass = random(seed + 'g') > 0.5 ? 0x3f6b8c : 0x58779a;
  const style = random(seed + 's') > 0.55 ? 1 : 0;
  const cells = grid(w, h + 3, d, (x, y, z) => {
    if (y >= h) {
      if (style === 1 && y === h && x >= 1 && x <= w - 2 && z >= 1 && z <= d - 2) return wall;
      if (h > 20 && x === Math.floor(w / 2) && z === 2 && y <= h + 2) return y === h + 2 ? LIT | 0xff3b3b : 0x9a9a9a;
      return null;
    }
    if (!(x === 0 || x === w - 1 || z === 0 || y === h - 1)) return null;
    if (y === h - 1) return shade(wall, 0.85);
    const along = z === 0 ? x : z;
    if (along === 0 || along === (z === 0 ? w - 1 : d - 1)) return wall;
    const lit = random(`${seed}${x}_${y}_${z}`) < 0.14;
    if (style === 0) return y % 2 === 1 ? (lit ? LIT | 0xffd29a : glass) : wall;
    return y % 4 === 0 ? wall : lit ? LIT | 0xffc98a : glass;
  }, false);
  return { cells, w };
}
function umbrellaCells(seed: string): Cell[] {
  const c1 = random(seed) < 0.5 ? 0xff5f8f : 0x2ec4c4;
  return grid(5, 9, 5, (x, y, z) => {
    if (y < 7) return x === 2 && z === 2 ? 0xf5f5f5 : null;
    if (y === 7) return mod(x + z, 2) === 0 ? c1 : 0xfafafa;
    return x >= 1 && x <= 3 && z >= 1 && z <= 3 ? c1 : null;
  }, false);
}

// ---------- world ----------
const XMIN = -1100;
const XMAX = 700;
const J = -480; // roadblock x
const sandTop = (z: number) => (z > -28 ? -0.5 : z > -36 ? -1 : z > -44 ? -1.5 : -2);
function chunkify(v: Vox[], size = 200): Vox[][] {
  const m = new Map<number, Vox[]>();
  for (const a of v) {
    const k = Math.floor(a.x / size);
    const arr = m.get(k) ?? [];
    arr.push(a);
    m.set(k, arr);
  }
  return Array.from(m.values());
}
const WORLD = (() => {
  const W = nb();
  const P = (arr: Vox[], x: number, y: number, z: number, s: number, c: number) => { arr.push({ x, y, z, s, c }); };
  for (let x = XMIN; x < XMAX; x += 8) {
    for (const zc of [-8, 0, 8]) P(W.l, x + 4, -4, zc, 8, vary(0x3e3c4b, `rd${x}_${zc}`, 0.16));
    [-24, -32, -40, -48].forEach((zc, r) => P(W.l, x + 4, -4.5 - r * 0.5, zc, 8, vary(r === 3 ? 0xd8b27a : 0xf2d39d, `sd${x}_${zc}`, 0.1)));
    for (let zc = 24; zc <= 56; zc += 8) P(W.l, x + 4, -4, zc, 8, vary(0xd2c6b6, `pz${x}_${zc}`, 0.1));
  }
  for (let x = XMIN; x < XMAX; x += 16) for (let zc = 68; zc <= 164; zc += 16)
    P(W.l, x + 8, -8, zc, 16, random(`g${x}_${zc}`) < 0.4 ? vary(0x7cae5e, `gc${x}_${zc}`, 0.15) : vary(0xbdb1a3, `gp${x}_${zc}`, 0.1));
  for (let x = XMIN; x < XMAX; x += 4)
    [-18, -14, 14, 18].forEach((zc, i) => P(W.l, x + 2, -1.5, zc, 4, mod(x / 4 + i, 2) === 0 ? 0xe4d8c6 : 0xd2c4ae));
  for (let x = XMIN; x < XMAX; x += 12) for (let k = 0; k < 6; k++) P(W.l, x + k + 0.5, -0.4, 0, 1, 0xffd447);
  const palms = Array.from({ length: 8 }, (_, i) => palmCells(`palm${i}`));
  for (let x = -1090; x < XMAX; x += 40) place(palms[Math.floor(random(`pv${x}`) * 8)], 1, [-1, 0, -1], [x, 0, -15], W);
  for (let i = 0; i < 12; i++) {
    const x = XMIN + random(`bpx${i}`) * 1800;
    const z = -28 - random(`bpz${i}`) * 14;
    place(palms[i % 8], 1, [-1, 0, -1], [x, sandTop(z) - 0.5, z], W);
  }
  for (let i = 0; i < 44; i++) {
    const x = XMIN + random(`ux${i}`) * 1800;
    const z = -24 - random(`uz${i}`) * 20;
    place(umbrellaCells(`um${i}`), 1, [-2.5, 0, -2.5], [x, sandTop(z), z], W);
  }
  for (let x = -1090; x < XMAX; x += 36) {
    if (Math.abs(x + 150) < 14) continue;
    for (let y = 0; y < 14; y++) P(W.l, x + 0.5, y + 0.5, 13.5, 1, 0x2e2f3a);
    for (const zz of [12.5, 11.5, 10.5]) P(W.l, x + 0.5, 13.5, zz, 1, 0x2e2f3a);
    P(W.b, x + 0.5, 12.5, 10.5, 1, 0xfff0c8);
  }
  for (let k = -16; k <= 13; k++) place(hotelCells(`h${k}`), 2, [-7, 0, 0], [-150 + 60 * k, 0, 21], W);
  [{ z: 80, off: 0, step: 80 }, { z: 140, off: 40, step: 110 }].forEach((row, r) => {
    for (let x = XMIN + 40 + row.off; x < XMAX; x += row.step) {
      const T = towerCells(`t${r}_${x}`);
      place(T.cells, 4, [-T.w / 2, 0, 0], [x + (random(`tj${r}_${x}`) - 0.5) * 16, 0, row.z], W);
    }
  });
  const ramp = grid(24, 10, 20, (x, y, z) => {
    const hgt = Math.ceil(((24 - x) * 10) / 24);
    if (y >= hgt) return null;
    if (y === hgt - 1 && z > 0 && z < 19) return mod(Math.floor((x + z) / 3), 2) === 0 ? 0xff8a1e : 0xf6f1e8;
    return 0x4b505a;
  });
  place(ramp, 0.5, [0, 0, -10], [J + 22, 0, -6], W);
  for (const cz of [-17, 6, 11, 15]) {
    P(W.l, J + 12, 0.6, cz, 1.2, 0xff7a1a);
    P(W.l, J + 12, 1.6, cz, 0.8, 0xf6f6f6);
    P(W.l, J + 12, 2.3, cz, 0.6, 0xff7a1a);
  }
  return { l: chunkify(W.l), b: chunkify(W.b), n: chunkify(W.n) };
})();
const World: React.FC = () => (
  <>
    {WORLD.l.map((c, i) => <VoxMesh key={`l${i}`} vox={c} mat={LAMB} />)}
    {WORLD.b.map((c, i) => <VoxMesh key={`b${i}`} vox={c} mat={BASIC} />)}
    {WORLD.n.map((c, i) => <VoxMesh key={`n${i}`} vox={c} mat={NEON_MAT} />)}
    <mesh geometry={BOX} material={LAND_MAT} position={[0, -2.6, 1450]} scale={[8000, 1, 3000]} dispose={null} />
    <mesh geometry={BOX} material={SEA_MAT} position={[0, -3.5, -3052]} scale={[8000, 1, 6000]} dispose={null} />
  </>
);

// ---------- ocean ----------
const OCEAN = (() => {
  const out: { x: number; z: number; c: number }[] = [];
  const deep = new THREE.Color(0x0c5878);
  const sh = new THREE.Color(0x21a3b0);
  for (let x = XMIN; x < XMAX; x += 12) for (let k = 0; k < 22; k++) {
    let c = k === 0 ? 0x86e6d8 : k === 1 ? 0x3cc2bf : sh.clone().lerp(deep, Math.min(1, (k - 2) / 9)).getHex();
    if (k >= 3 && random(`gl${x}_${k}`) < 0.06) c = 0xffd7a0;
    out.push({ x, z: -58 - 12 * k, c: vary(c, `oc${x}_${k}`, 0.12) });
  }
  return out;
})();
const TMP = new THREE.Matrix4();
const Ocean: React.FC<{ f: number }> = ({ f }) => {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(BOX, OCEAN_MAT, OCEAN.length);
    const col = new THREE.Color();
    OCEAN.forEach((t, i) => m.setColorAt(i, col.setHex(t.c)));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.frustumCulled = false;
    return m;
  }, []);
  OCEAN.forEach((t, i) => {
    const w = 0.9 * Math.sin(t.x * 0.045 + f * 0.08) + 0.7 * Math.sin(t.z * 0.06 + t.x * 0.015 - f * 0.055);
    TMP.makeScale(12, 12, 12);
    TMP.setPosition(t.x + 6, -2.2 + Math.round(w * 2) / 2 - 6, t.z);
    mesh.setMatrixAt(i, TMP);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};

// ---------- jump (story time u) ----------
function uOf(d: number) {
  if (d < 9) return d;
  if (d < 44) return 9 + (d - 9) * 0.22;
  return 16.7 + (d - 44);
}
function jumpCar(u: number) {
  const x = J + 40 - 5 * u;
  let y = 0;
  let pitch = 0;
  let roll = 0;
  if (u >= 1.2 && u < 3.6) {
    y = (5 * (u - 1.2)) / 2.4;
    pitch = 0.39;
  } else if (u >= 3.6) {
    const t = u - 3.6;
    if (t < 22.2) {
      y = 5 + 2 * t - 0.1 * t * t;
      pitch = 0.39 - 0.03 * t;
      roll = 0.06 * Math.sin(t * 0.3);
    } else {
      const tl = t - 22.2;
      y = 1.4 * Math.abs(Math.sin(tl * 1.1)) * Math.exp(-tl * 0.9);
      pitch = -0.28 * Math.exp(-tl * 2);
    }
  }
  return { x, y: Math.max(0, y), pitch, roll };
}

// ---------- money ----------
const BILL_N = 220;
const BILLS = Array.from({ length: BILL_N }, (_, i) => ({
  d: random(`bd${i}`) * 8,
  vx: -2.4 + (random(`bvx${i}`) - 0.5) * 5.5,
  vy: 0.8 + random(`bvy${i}`) * 3,
  vz: (random(`bvz${i}`) - 0.5) * 7,
  oz: (random(`boz${i}`) - 0.5) * 3,
  w: [0.5 + random(`bw1${i}`), 0.5 + random(`bw2${i}`), 0.5 + random(`bw3${i}`)],
  ph: random(`bph${i}`) * 6.28,
  c: random(`bc${i}`) > 0.5 ? 0x5cbf5a : 0x9fe89a,
}));
const Bills: React.FC<{ u: number }> = ({ u }) => {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(BOX, LAMB, BILL_N * 2);
    const col = new THREE.Color();
    BILLS.forEach((b, i) => {
      m.setColorAt(i * 2, col.setHex(b.c));
      m.setColorAt(i * 2 + 1, col.setHex(shade(b.c, 0.85)));
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.frustumCulled = false;
    return m;
  }, []);
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const off = new THREE.Vector3();
  const sc = new THREE.Vector3(0.8, 0.8, 0.8);
  const zero = new THREE.Vector3(0, 0, 0);
  const mat = new THREE.Matrix4();
  BILLS.forEach((b, i) => {
    const tt = u - 3.6 - b.d;
    if (u < 0 || tt < 0) {
      mat.compose(off.set(0, -500, 0), q.identity(), zero);
      mesh.setMatrixAt(i * 2, mat);
      mesh.setMatrixAt(i * 2 + 1, mat);
      return;
    }
    const o = jumpCar(3.6 + b.d);
    const fac = (1 - Math.exp(-0.22 * tt)) / 0.22;
    const px = o.x + b.vx * fac + Math.sin(tt * 0.7 + b.ph) * 0.8;
    const py = Math.max(0.4, o.y + 3.5 + b.vy * fac - 0.035 * tt * tt);
    const pz = -6 + b.oz + b.vz * fac + Math.cos(tt * 0.5 + b.ph) * 0.6;
    q.setFromEuler(e.set(tt * 0.35 * b.w[0] + b.ph, tt * 0.25 * b.w[1], tt * 0.45 * b.w[2]));
    [-1, 1].forEach((s, k) => {
      off.set(0.4 * s, 0, 0).applyQuaternion(q);
      off.x += px;
      off.y += py;
      off.z += pz;
      mat.compose(off, q, sc);
      mesh.setMatrixAt(i * 2 + k, mat);
    });
  });
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} visible={u >= 0} />;
};

// ---------- actors ----------
interface Xf { p: V3; yaw: number; pitch: number; roll: number; vis: boolean }
const hidden = (): Xf => ({ p: [0, -200, 0], yaw: 0, pitch: 0, roll: 0, vis: false });
const car = (x: number, y: number, z: number, yaw = Math.PI, pitch = 0, roll = 0): Xf => ({ p: [x, y, z], yaw, pitch, roll, vis: true });

const Car: React.FC<{ model: CarModel; xf: Xf; children?: React.ReactNode }> = ({ model, xf, children }) => (
  <group position={xf.p} rotation={[xf.roll, xf.yaw, xf.pitch]} visible={xf.vis}>
    <VoxMesh vox={model.body} mat={LAMB} />
    <VoxMesh vox={model.lamps} mat={BASIC} />
    {model.red.length > 0 && <VoxMesh vox={model.red} mat={SIREN_R} />}
    {model.blue.length > 0 && <VoxMesh vox={model.blue} mat={SIREN_B} />}
    {children}
  </group>
);

interface PersonProps {
  m: PersonModel; p: V3; ry: number; phase: number; seated: boolean; vis: boolean;
  bag: 0 | 1 | 2; armL?: number; armR?: number; headYaw?: number; scale?: number;
}
const Person: React.FC<PersonProps> = ({ m, p, ry, phase, seated, vis, bag, armL, armR, headYaw = 0, scale = 1 }) => {
  const sw = seated ? 0 : Math.cos(phase);
  const bob = seated ? 0 : 0.16 * (1 - Math.abs(sw));
  const aL = armL ?? -sw * (bag === 1 ? 0.15 : 0.45);
  const aR = armR ?? sw * (bag === 2 ? 0.15 : 0.45);
  return (
    <group position={p} rotation={[0, ry, 0]} scale={scale} visible={vis}>
      <group position={[0, bob, 0]}>
        <group position={[-0.75, 3, 0]} rotation={[sw * 0.5, 0, 0]} visible={!seated}><VoxMesh vox={m.leg} /></group>
        <group position={[0.75, 3, 0]} rotation={[-sw * 0.5, 0, 0]} visible={!seated}><VoxMesh vox={m.leg} /></group>
        <group position={[0, 3, 0]}>
          <VoxMesh vox={m.torso} />
          {m.hair.length > 0 && <VoxMesh vox={m.hair} />}
        </group>
        <group position={[0, 5.5, 0]} rotation={[0, headYaw, 0]}><VoxMesh vox={m.head} /></group>
        <group position={[-1.75, 5.5, 0]} rotation={[aL, 0, 0]}>
          <VoxMesh vox={m.arm} />
          {bag === 1 && <group position={[-0.35, -2.3, 0]} rotation={[-aL, 0, 0]}><VoxMesh vox={m.bag} /></group>}
        </group>
        <group position={[1.75, 5.5, 0]} rotation={[aR, 0, 0]}>
          <VoxMesh vox={m.arm} />
          {bag === 2 && <group position={[0.35, -2.3, 0]} rotation={[-aR, 0, 0]}><VoxMesh vox={m.bag} /></group>}
        </group>
      </group>
    </group>
  );
};

// ---------- shot logic (follows storyboard) ----------
interface State {
  cam: { pos: V3; look: V3; fov: number; roll: number };
  hero: Xf; armUp: boolean; police: Xf[];
  walk: { vis: boolean; z: number; phase: number; glance: number };
  siren: { p: V3; i: number };
  billsU: number;
}
function computeState(f: number): State {
  const { pulse, n } = beatInfo(f);
  const kick = pulse * (n % 4 === 0 ? 1 : 0.6);
  const police: Xf[] = [0, 1, 2, 3, 4].map(() => hidden());
  let hero = hidden();
  let armUp = false;
  const walk = { vis: false, z: 20.5, phase: 0, glance: 0 };
  let siren: { p: V3; i: number } = { p: [0, -60, 0], i: 0 };
  let billsU = -1;
  let pos: V3;
  let look: V3;
  let fov = 50;
  let roll = 0;
  let shake = 0;

  if (f < 56) {
    // S1 aerial fly-in: the city fills the left half
    const e = 0.55 * (f / 56) + 0.45 * ss(f / 56);
    pos = vl([250, 140, -160], [30, 40, -95], e);
    look = vl([-520, 55, -230], [-520, 18, -160], e);
    roll = lerp(-0.07, 0, e);
    const hx = -40 - 4.6 * f;
    hero = car(hx, 0.1 * kick, -6);
    police[0] = car(hx + 38, 0, 0);
    police[1] = car(hx + 60, 0, -6);
    siren = { p: [hx + 38, 7, 0], i: 300 };
  } else if (f < 113) {
    // S2 the leads: low push-in, full bodies on the right half (text lives on the left)
    const d = f - 56;
    const e = 0.5 * ss(d / 57) + 0.5 * (d / 57);
    walk.vis = true;
    walk.z = 20.5 - (d / BEAT) * 2;
    walk.phase = (f / BEAT) * Math.PI;
    walk.glance = -0.45 * ss((f - 98) / 6);
    const D = lerp(20, 14.5, e);
    pos = [lerp(-144, -145.5, e), 1.5, walk.z - D];
    look = [lerp(-144, -145, e), 5, walk.z];
    fov = lerp(40, 38, e);
    siren = { p: [-138, 5, 8], i: 320 };
  } else if (f < 169) {
    // S3 curb pass + whip pan
    const camX = -30;
    const cx = camX + 5 * (141 - f);
    hero = car(cx, 0.12 * kick, -6, Math.PI, 0, 0.02 * Math.sin(f * 0.5));
    police[0] = car(cx + 85, 0, -6);
    police[1] = car(cx + 118, 0, 0, Math.PI + 0.04 * Math.sin(f * 0.3));
    const phi = lerp(0.1, Math.PI - 0.1, ss((f - 134) / 16));
    pos = [camX, 1.4, -13.5];
    look = [camX + Math.cos(phi) * 30, 2.6, -13.5 + Math.sin(phi) * 30];
    fov = 52;
    shake = 0.35 * Math.exp(-Math.abs(f - 141) / 4) + 0.25 * Math.exp(-Math.abs(f - 158) / 3) + 0.2 * Math.exp(-Math.abs(f - 165) / 3);
    siren = { p: [cx + 85, 7, -6], i: 450 };
  } else if (f < 281) {
    // S4 chase crane
    const d = f - 169;
    const cx = 250 - 4.6 * d;
    const cz = -6 + 2.5 * Math.sin(d / 17);
    const dz = (2.5 / 17) * Math.cos(d / 17);
    hero = car(cx, 0.12 * kick, cz, Math.PI + Math.atan2(dz, 4.6), 0.01 * kick, -0.05 * Math.cos(d / 17));
    const gain = 8 * ss((d - 50) / 60);
    police[0] = car(cx + 30 - gain, 0, -6 + 3 * Math.sin(d / 13 + 1), Math.PI + 0.06 * Math.cos(d / 13 + 1));
    police[1] = car(cx + 50 - gain * 0.5, 0, 3 + 1.5 * Math.sin(d / 15));
    police[2] = car(cx + 72, 0, -4 + 2 * Math.sin(d / 11 + 2));
    const rp = spline([[95, 13, 6], [72, 9, 11], [38, 4.5, 15], [6, 3.2, 16], [-26, 3.6, 7]], d / 112);
    const rl = spline([[-30, 3, -4], [-20, 3, -3], [-6, 3, -1], [-4, 3.5, -1], [3, 4, -1]], d / 112);
    pos = [cx + rp[0], rp[1], -6 + rp[2]];
    look = [cx + rl[0], rl[1], -6 + rl[2]];
    fov = lerp(44, 54, ss((d - 40) / 60));
    shake = 0.12;
    siren = { p: [police[0].p[0], 7, police[0].p[2]], i: 600 };
    armUp = d >= 84;
  } else if (f < 338) {
    // S5 the jump: orbit, then crane so the airborne car crosses the sun
    const d = f - 281;
    const u = uOf(d);
    const jc = jumpCar(u);
    hero = car(jc.x, jc.y, -6, Math.PI, jc.pitch, jc.roll);
    const u0 = Math.min(u, 16.7);
    const u1 = Math.min(u, 15.6);
    police[0] = car(J + 85 - 5 * u0 + 0.15 * u0 * u0, 0, -6, Math.PI + 0.7 * ss((u - 5) / 10));
    police[1] = car(J + 110 - 5 * u1 + 0.16 * u1 * u1, 0, 4, Math.PI - 0.5 * ss((u - 6) / 9));
    police[3] = car(J + 2, 0, -10, Math.PI / 2);
    police[4] = car(J - 12, 0, 0, -Math.PI / 2);
    const camY = (dd: number, cy: number, R: number) => {
      const base = 2.2 + 0.08 * cy;
      const align = cy + 2.5 - R * Math.tan(SUN_EL);
      return lerp(base, Math.max(base, align), ss((dd - 16) / 16));
    };
    const camAt = (dd: number): V3 => {
      const c = jumpCar(uOf(dd));
      const th = lerp(2.15, 0.66, ss((dd - 4) / 36));
      const R = lerp(22, 32, ss((dd - 22) / 18));
      return [c.x + R * Math.cos(th), camY(dd, c.y, R), -6 + R * Math.sin(th)];
    };
    if (d < 40) pos = camAt(d);
    else {
      const p0 = camAt(40);
      pos = [p0[0] + 0.85 * (jc.x - jumpCar(uOf(40)).x), camY(d, jc.y, 32), p0[2]];
    }
    look = [jc.x, jc.y + 2.5, -6];
    fov = lerp(60, 48, ss(d / 40));
    shake = 0.5 * Math.exp(-d / 3) + (d >= 52 ? 0.6 * Math.exp(-(d - 52) / 3) : 0);
    siren = { p: [J - 4, 8, -3], i: 900 };
    billsU = u;
    armUp = true;
  } else {
    // S6 title: chase cam rises behind the car as it pulls away
    const d = f - 338;
    const carX = J - 108.5 - 5 * d;
    hero = car(carX, 0.1 * kick, -6);
    police[0] = car(J + 43, 0, -6, Math.PI + 0.7);
    police[1] = car(J + 71, 0, 4, Math.PI - 0.5);
    const e = 0.2 * (d / 52) + 0.8 * ss(d / 52);
    pos = [J - 94.5 - 3.4 * d, lerp(5, 9, e), -6 + lerp(1.5, 3, e)];
    const dy = lerp(-0.05, -0.035, e);
    look = [pos[0] - 50, pos[1] + dy * 50, pos[2] - 0.3 * 50];
    fov = lerp(48, 45, e);
    armUp = true;
  }
  pos = [pos[0] + shake * Math.sin(f * 2.31), pos[1] + shake * Math.sin(f * 3.07 + 1), pos[2] + shake * Math.sin(f * 1.73 + 2)];
  fov -= 2.4 * kick;
  return { cam: { pos, look, fov, roll }, hero, armUp, police, walk, siren, billsU };
}

// ---------- scene ----------
const CameraRig: React.FC<{ cam: State['cam'] }> = ({ cam }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(cam.pos[0], cam.pos[1], cam.pos[2]);
  camera.up.set(0, 1, 0);
  camera.lookAt(cam.look[0], cam.look[1], cam.look[2]);
  if (cam.roll !== 0) camera.rotateZ(cam.roll);
  camera.fov = cam.fov;
  camera.near = 0.3;
  camera.far = 6000;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return null;
};

const Scene: React.FC<{ f: number }> = ({ f }) => {
  const st = computeState(f);
  const { pulse, n } = beatInfo(f);
  const redPhase = n % 2 === 0;
  const strobe = Math.floor(f / 2) % 2 === 0 ? 1 : 0.45;
  NEON_MAT.color.setScalar(0.3 + 0.7 * pulse);
  SIREN_R.color.setRGB(redPhase ? strobe : 0.12, redPhase ? 0.05 * strobe : 0.01, redPhase ? 0.08 * strobe : 0.02);
  SIREN_B.color.setRGB(redPhase ? 0.01 : 0.08 * strobe, redPhase ? 0.03 : 0.25 * strobe, redPhase ? 0.15 : strobe);
  const c = st.cam.pos;
  const sunP: V3 = [c[0] + SUN_DIR.x * 1500, c[1] + SUN_DIR.y * 1500, c[2] + SUN_DIR.z * 1500];
  const w = st.walk;
  return (
    <>
      <CameraRig cam={st.cam} />
      <fog attach="fog" args={['#f4a27a', 140, 1100]} />
      <hemisphereLight args={['#b9b4ff', '#9a6050', 1.5]} />
      <directionalLight position={[LIGHT_DIR.x * 400, LIGHT_DIR.y * 400, LIGHT_DIR.z * 400]} intensity={2.3} color="#ffd2a0" />
      <pointLight position={st.siren.p} color={redPhase ? '#ff2035' : '#2a5cff'} intensity={st.siren.i * (0.5 + 0.5 * strobe)} distance={0} decay={2} />
      <mesh geometry={SKY_GEO} material={SKY_MAT} position={c} scale={3000} renderOrder={-1} frustumCulled={false} dispose={null} />
      <group position={sunP} quaternion={SUN_Q} scale={1 + 0.035 * pulse}>
        <VoxMesh vox={SUN_VOX} mat={SUN_MAT} />
      </group>
      <World />
      <Ocean f={f} />
      <Car model={CAR_HERO} xf={st.hero}>
        <Person m={MAN_M} p={[0, 0.25, -1.6]} ry={Math.PI / 2} phase={0} seated vis bag={0} armL={-1.2} armR={-1.2} scale={0.75} />
        <Person m={WOMAN_M} p={[0, 0.25, 1.6]} ry={Math.PI / 2} phase={0} seated vis bag={0}
          armL={st.armUp ? -2.75 - 0.25 * pulse : -0.3} armR={-0.3} headYaw={st.armUp ? 0.3 : 0} scale={0.75} />
      </Car>
      {st.police.map((p, i) => <Car key={i} model={CAR_POLICE} xf={p} />)}
      <Person m={MAN_M} p={[-152.4, w.z < 20 ? 0.5 : 0, w.z]} ry={Math.PI} phase={w.phase} seated={false} vis={w.vis} bag={2} />
      <Person m={WOMAN_M} p={[-147.6, w.z + 0.6 < 20 ? 0.5 : 0, w.z + 0.6]} ry={Math.PI} phase={w.phase + Math.PI}
        seated={false} vis={w.vis} bag={1} headYaw={w.glance} />
      <Bills u={st.billsU} />
    </>
  );
};

// ---------- overlay type ----------
const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const FONT = 'Archivo, sans-serif';
const GRAD = 'linear-gradient(180deg, #fff3b0 0%, #ffb347 42%, #ff5a5f 72%, #ff3f8e 100%)';
const GRAD_H = 'linear-gradient(90deg, #ffd36a, #ff5a5f, #ff3f8e)';
const INK = 'rgba(43,10,38,0.9)';

const Overlay: React.FC<{ f: number }> = ({ f }) => {
  const { pulse, n } = beatInfo(f);
  const s1 = interpolate(f, [70, 76], [3, 1], { ...CL, easing: Easing.out(Easing.cubic) });
  const o1 = interpolate(f, [70, 72], [0, 1], CL);
  const jitter = f >= 70 && f < 82 ? 8 * Math.exp(-(f - 70) / 2.5) * Math.sin(f * 3.1) : 0;
  const rise = interpolate(f, [84, 91], [115, 0], { ...CL, easing: Easing.out(Easing.exp) });
  const wipe = interpolate(f, [141, 148], [0, 101], { ...CL, easing: Easing.in(Easing.cubic) });
  const tagOn = f >= 70 && f < 149;
  const cuts = [56, 113, 169, 225].filter((b) => f >= b && f < b + 8);
  const flash = Math.max(
    f >= 281 ? 0.9 * Math.exp(-(f - 281) / 4) : 0,
    f >= 334 && f < 338 ? 0.35 * Math.exp(-(f - 334) / 2) : 0,
    f >= 338 ? 0.7 * Math.exp(-(f - 338) / 4) : 0,
    cuts.length ? 0.3 * Math.exp(-(f - cuts[0]) / 2.5) : 0,
    f < 4 ? 1 - f / 4 : 0
  );
  const flashColor = f < 4 ? '#000' : '#fff';
  const sub = interpolate(f, [339, 345], [120, 0], { ...CL, easing: Easing.out(Easing.exp) });
  const barW = interpolate(f, [341, 350], [0, 560], { ...CL, easing: Easing.out(Easing.cubic) });
  const scrim = clamp((f - 338) / 4, 0, 1);
  const titlePulse = 1 + 0.012 * pulse * (f >= 346 ? 1 : 0);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(40,8,30,0.45) 100%)' }} />
      <AbsoluteFill style={{ backgroundColor: '#ff7a3c', opacity: 0.06 * pulse * (n % 4 === 0 ? 1.6 : 1), mixBlendMode: 'screen' }} />
      {tagOn && (
        <div style={{ position: 'absolute', left: 130, bottom: 170, fontFamily: FONT, fontWeight: 900, fontSize: 112, lineHeight: 1.0, clipPath: `inset(0 0 0 ${wipe}%)` }}>
          <div style={{ color: '#fff', opacity: o1, transform: `translate(${jitter}px, ${-jitter * 0.5}px) scale(${s1})`, transformOrigin: 'left center', textShadow: `0 6px 0 ${INK}` }}>
            ONE CITY.
          </div>
          {f >= 84 && (
            <div style={{ overflow: 'hidden', paddingBottom: 10 }}>
              <div style={{ transform: `translateY(${rise}%)`, backgroundImage: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextStroke: '2px #2b0a26', filter: `drop-shadow(0 6px 0 ${INK})` }}>
                TWO DEBTS.
              </div>
            </div>
          )}
        </div>
      )}
      {f >= 338 && (
        <>
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 190, height: 500, opacity: scrim,
            background: 'linear-gradient(180deg, rgba(30,6,34,0) 0%, rgba(30,6,34,0.6) 30%, rgba(30,6,34,0.6) 72%, rgba(30,6,34,0) 100%)',
          }} />
          <div style={{ position: 'absolute', left: 80, right: 80, top: 250, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', fontFamily: FONT, fontWeight: 900, fontSize: 240, lineHeight: 1, letterSpacing: '0.02em', transform: `scale(${titlePulse})` }}>
              {'SUNBURN'.split('').map((ch, i) => {
                const st0 = 338 + i * 0.5;
                const e = Easing.out(Easing.cubic)(clamp((f - st0) / 3.5, 0, 1));
                return (
                  <span key={i} style={{
                    display: 'inline-block', opacity: clamp((f - st0) / 1.5, 0, 1),
                    transform: `translateY(${lerp(-70, 0, e)}px) scale(${lerp(2.6, 1, e)})`,
                    backgroundImage: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                    WebkitTextStroke: '4px #2b0a26',
                    filter: `drop-shadow(0 10px 0 ${INK})`,
                  }}>
                    {ch}
                  </span>
                );
              })}
            </div>
            <div style={{ height: 7, width: barW, backgroundImage: GRAD_H, marginTop: 16, boxShadow: `0 3px 0 ${INK}` }} />
            <div style={{ overflow: 'hidden', marginTop: 14, paddingBottom: 6 }}>
              <div style={{ transform: `translateY(${sub}%)`, fontFamily: FONT, fontWeight: 800, fontSize: 56, letterSpacing: '0.4em', paddingLeft: '0.4em', color: '#fff', textShadow: `0 4px 0 ${INK}` }}>
                COMING NOVEMBER
              </div>
            </div>
          </div>
        </>
      )}
      <AbsoluteFill style={{ backgroundColor: flashColor, opacity: flash }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 96, backgroundColor: '#000' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 96, backgroundColor: '#000' }} />
    </AbsoluteFill>
  );
};

export const Trailer: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <ThreeCanvas width={1920} height={1080} flat camera={{ fov: 50, near: 0.3, far: 6000 }}>
        <Scene f={f} />
      </ThreeCanvas>
      <Overlay f={f} />
    </AbsoluteFill>
  );
};