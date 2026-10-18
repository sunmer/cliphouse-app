/*
CONCEPT
SUNBURN: "ONE CITY. TWO DEBTS." A golden-hour coastal city built from voxels, shot like a
blockbuster game reveal. Two leads, a teal convertible, a bank job, a police net and one
impossible jump off an open bridge into the setting sun. Hot orange, pink and violet
against teal. The sun always sits ahead on the horizon (-Z), so the world is rim-lit and
the last shot is a silhouette. Every beat kicks the FOV, the key light and a pink pulse.

REVISION NOTES (review 2)
- The aerial dive now keeps the car in frame from frame 0.
- The heist camera starts further back so the whole bank facade reads, then tracks the
  leads as they run into a medium close-up.
- Water uses finer cells everywhere (no giant checkerboard), including the bridge jump
  and the title shot. The glint stripe runs under the sun.
- Title sun is bigger, more saturated and striped, with the horizon cutting it. The leads
  are slightly lifted so they read as colored silhouettes. COMING NOVEMBER is centered
  correctly. The cash storm is bigger.

STORYBOARD (30 fps, beat = 14.0625 f, bars at 0 / 56 / 113 / 169 / 225 / 281 / 338)
 1.   0-55   AERIAL DIVE. High over the coast boulevard, wide lens, slight roll, diving down
             to just behind the teal convertible threading traffic.
 2.  56-112  CHASE CAM. Low behind the convertible (two leads, hair streaming), swinging up
             and out to the right flank while oncoming traffic whips past.
             "ONE CITY." slams in at 56, "TWO DEBTS." at 70, both wipe out at 109-112.
 3. 113-168  POLICE PRESSURE. Low front cam looking back at the car, orbiting to the left
             flank while four cruisers close in with flashing sirens.
 4. 169-224  HEIST. The bank door blows out on the bar (flash, debris, smoke), a cash storm,
             the leads sprint out with duffels toward a low camera that tracks them.
 5. 225-337  BRIDGE. 225-280 low chase cam that sweeps to the side, cruisers behind.
             281 (bar): launch off the ramp over the open gap, slow-motion orbit around the
             airborne car. 323: landing slam with sparks and shake, camera drops to the road.
 6. 338-389  TITLE. Cliff overlook at sunset. The leads stand backlit at the rail against
             a huge striped voxel sun, car parked beside them, slow push-in.
             SUNBURN slams in on 338, COMING NOVEMBER wipes in by 345, both hold to 389.
*/
import React, {useMemo} from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';

// ───────────── helpers ─────────────
type V3 = [number, number, number];
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sm = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const eo = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
const hexLerp = (a: number, b: number, t: number) => {
  const ch = (s: number) => Math.round(lerp((a >> s) & 255, (b >> s) & 255, t));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};
const BEAT = 14.0625;
const BEATS = Array.from({length: 30}, (_, n) => Math.round(n * BEAT));
const BARS = [0, 56, 113, 169, 225, 281, 338];
function beat(f: number) {
  let last = 0;
  for (const b of BEATS) if (b <= f) last = b;
  const bar = BARS.indexOf(last) >= 0;
  return {last, bar, pulse: Math.exp(-(f - last) / 3.5) * (bar ? 1 : 0.55)};
}
const GLOW = 0x1000000;
const SEG = 48;
const NV = 5;
const FOGC = 0xff9f78;
const SUNDIR = new THREE.Vector3(0.22, 0.15, -1).normalize();

// ───────────── voxel buffer ─────────────
interface Inst {n: number; p: number[]; c: number[]}
interface Model {lit: Inst | null; glow: Inst | null}
const K = (x: number, y: number, z: number) => x + 256 + (y + 256) * 512 + (z + 256) * 262144;
class VB {
  m = new Map<number, number>();
  set(x: number, y: number, z: number, c: number) {
    this.m.set(K(x, y, z), c);
  }
  has(x: number, y: number, z: number) {
    return this.m.has(K(x, y, z));
  }
  box(x: number, y: number, z: number, w: number, h: number, d: number, c: number) {
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) for (let k = 0; k < d; k++) this.set(x + i, y + j, z + k, c);
  }
  clear(x: number, y: number, z: number, w: number, h: number, d: number) {
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) for (let k = 0; k < d; k++) this.m.delete(K(x + i, y + j, z + k));
  }
  bake(ax?: number, az?: number): Model {
    const ents: Array<[number, number, number, number]> = [];
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    this.m.forEach((c, k) => {
      const x = (k % 512) - 256, y = (Math.floor(k / 512) % 512) - 256, z = Math.floor(k / 262144) - 256;
      ents.push([x, y, z, c]);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
    });
    const cx = ax ?? (x0 + x1 + 1) / 2, cz = az ?? (z0 + z1 + 1) / 2;
    const L: Inst = {n: 0, p: [], c: []}, G: Inst = {n: 0, p: [], c: []};
    for (const [x, y, z, c] of ents) {
      if (this.has(x + 1, y, z) && this.has(x - 1, y, z) && this.has(x, y + 1, z) && this.has(x, y - 1, z) && this.has(x, y, z + 1) && this.has(x, y, z - 1)) continue;
      const T = c >= GLOW ? G : L;
      T.p.push(x + 0.5 - cx, y + 0.5, z + 0.5 - cz);
      T.c.push(c % GLOW);
      T.n++;
    }
    return {lit: L.n ? L : null, glow: G.n ? G : null};
  }
}

// ───────────── instanced renderers ─────────────
const BOX = new THREE.BoxGeometry(1, 1, 1);
const mkMat = (basic?: boolean, opacity?: number, fog = true) =>
  basic
    ? new THREE.MeshBasicMaterial({toneMapped: false, fog, transparent: opacity !== undefined, opacity: opacity ?? 1, depthWrite: opacity === undefined})
    : new THREE.MeshLambertMaterial();

function Boxes({d, basic, opacity, fog = true}: {d: Inst; basic?: boolean; opacity?: number; fog?: boolean}) {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(BOX, mkMat(basic, opacity, fog), d.n);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    for (let i = 0; i < d.n; i++) {
      o.position.set(d.p[i * 3], d.p[i * 3 + 1], d.p[i * 3 + 2]);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      c.setHex(d.c[i]);
      m.setColorAt(i, c);
    }
    m.frustumCulled = false;
    return m;
  }, [d, basic, opacity, fog]);
  return <primitive object={mesh} />;
}

function Vox({m, size = 1, pos = [0, 0, 0], rot = [0, 0, 0]}: {m: Model; size?: number; pos?: V3; rot?: V3}) {
  return (
    <group position={pos} rotation={rot} scale={size}>
      {m.lit && <Boxes d={m.lit} />}
      {m.glow && <Boxes d={m.glow} basic />}
    </group>
  );
}

type Fill = (i: number, o: THREE.Object3D, c: THREE.Color) => void;
function Dyn({n, fill, basic, opacity}: {n: number; fill: Fill; basic?: boolean; opacity?: number}) {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(BOX, mkMat(basic, opacity), n);
    const c = new THREE.Color(0xffffff);
    for (let i = 0; i < n; i++) m.setColorAt(i, c);
    m.frustumCulled = false;
    return m;
  }, [n, basic, opacity]);
  const o = new THREE.Object3D();
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    o.position.set(0, 0, 0);
    o.rotation.set(0, 0, 0);
    o.scale.set(1, 1, 1);
    c.setHex(0xffffff);
    fill(i, o, c);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    mesh.setColorAt(i, c);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return <primitive object={mesh} />;
}

function Slab({p, s, color, rx = 0}: {p: V3; s: V3; color: number; rx?: number}) {
  return (
    <mesh position={p} scale={s} rotation={[rx, 0, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

// ───────────── model builders ─────────────
const WIN = (r: number, r2: number) => (r < 0.3 ? GLOW | (r2 < 0.55 ? 0xffd27a : r2 < 0.8 ? 0xff8fc8 : 0x8ff0ff) : r > 0.85 ? 0x6d5fa0 : 0x27325c);

function tower(v: VB, x0: number, z0: number, w: number, d: number, h: number, col: number, trim: number, seed: number, shop: boolean) {
  v.box(x0, 0, z0, w, h, d, col);
  v.box(x0 + 2, h, z0 + 2, w - 4, 3, d - 4, trim);
  const mx = x0 + (w >> 1), mz = z0 + (d >> 1);
  v.box(mx, h + 3, mz, 1, 5, 1, 0xd0d0d8);
  v.set(mx, h + 8, mz, GLOW | 0xff3040);
  for (let y = shop ? 5 : 2; y < h - 1; y++) {
    if (y % 3 === 0) continue;
    for (let i = 1; i < Math.max(w, d) - 1; i++) {
      if (i % 3 === 0) continue;
      const cell = ((i / 3) | 0) * 31 + ((y / 3) | 0) * 7;
      const a = WIN(random(seed * 131 + cell), random(seed * 17 + cell + 5));
      const b = WIN(random(seed * 91 + cell), random(seed * 29 + cell + 3));
      if (i < d - 1) { v.set(x0 + w - 1, y, z0 + i, a); v.set(x0, y, z0 + i, b); }
      if (i < w - 1) { v.set(x0 + i, y, z0, b); v.set(x0 + i, y, z0 + d - 1, a); }
    }
  }
  if (shop) {
    const neon = random(seed + 3) < 0.5 ? 0xff4fa0 : 0x40e8ff;
    for (let z = z0 + 1; z < z0 + d - 1; z++) {
      v.set(x0 + w - 1, 4, z, GLOW | neon);
      v.set(x0 + w, 3, z, z % 2 ? 0xff4f8b : 0xfff3e0);
      if ((z - z0) % 5) {
        const on = random(seed * 7 + z) < 0.6;
        v.set(x0 + w - 1, 1, z, on ? GLOW | 0xffc98a : 0x20284a);
        v.set(x0 + w - 1, 2, z, on ? GLOW | 0xffd9a8 : 0x20284a);
      }
    }
  }
}
function umbrella(v: VB, x: number, z: number, c1: number) {
  v.box(x, 0, z, 1, 4, 1, 0xf4f0e8);
  for (let dx = -2; dx <= 2; dx++)
    for (let dz = -2; dz <= 2; dz++) {
      if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
      v.set(x + dx, 4, z + dz, (Math.abs(dx) + Math.abs(dz)) % 2 === 0 ? c1 : 0xffffff);
    }
  v.box(x + 3, 0, z - 1, 1, 1, 3, 0xffffff);
}
const PAL = [0xff9fb8, 0xffe0b8, 0x7fe0d6, 0xf6f0e6, 0xffb27a, 0xb7a6ff];
interface Seg {bldg: Model; beach: Model; sky: Model; palms: Array<{x: number; z: number; lean: number; rot: number}>}
const SEGC = new Map<number, Seg>();
function getSeg(i: number): Seg {
  const hit = SEGC.get(i);
  if (hit) return hit;
  const pick = (k: string) => PAL[Math.floor(random(`pal${i}${k}`) * PAL.length) % PAL.length];
  const b = new VB();
  tower(b, -27, -22, 12, 18, 18 + Math.floor(random(`hA${i}`) * 12), pick('a'), pick('t'), i * 100 + 1, true);
  tower(b, -26, -1, 11, 21, 9 + Math.floor(random(`hB${i}`) * 8), pick('b'), pick('u'), i * 100 + 2, true);
  const be = new VB();
  umbrella(be, 22, -16, 0xff4f8b);
  umbrella(be, 28, -6, 0x23c4b8);
  umbrella(be, 24, 8, 0xffb23a);
  umbrella(be, 30, 17, 0xff4f8b);
  const s = new VB();
  for (let k = 0; k < 3; k++) {
    const cols = [0x7a4a9c, 0xa5559f, 0x5b4aa0, 0xd0708f];
    tower(s, -30 + Math.floor(random(`sx${i}${k}`) * 14), -6 + k * 4, 4, 4, 10 + Math.floor(random(`sh${i}${k}`) * 18), cols[Math.floor(random(`sc${i}${k}`) * 4) % 4], 0x4a3a8a, i * 50 + k + 900, false);
  }
  const palms = [0, 1, 2].map((k) => ({x: 13.5, z: -16 + k * 16 + (random(`pz${i}${k}`) - 0.5) * 5, lean: -1, rot: random(`pr${i}${k}`) * 6}));
  const seg = {bldg: b.bake(0, 0), beach: be.bake(0, 0), sky: s.bake(0, 0), palms};
  SEGC.set(i, seg);
  return seg;
}
const PALMS = new Map<number, Model>();
function palm(lean: number): Model {
  const h = PALMS.get(lean);
  if (h) return h;
  const v = new VB();
  const H = 22;
  for (let y = 0; y < H; y++) v.box(Math.round(lean * (y / H) * (y / H) * 5), y, 0, 2, 1, 2, y % 3 === 0 ? 0x6b4a2b : 0x8a6238);
  const tx = Math.round(lean * 5);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4, dx = Math.cos(a), dz = Math.sin(a);
    for (let t = 1; t <= 11; t++) {
      const x = Math.round(tx + 0.5 + dx * t), z = Math.round(0.5 + dz * t);
      const y = H + Math.round(2.5 * Math.sin(t * 0.3) - 0.03 * t * t + 1.5);
      const col = (t + i) % 2 ? 0x23a455 : 0x1a8a46;
      v.set(x, y, z, col);
      if (t >= 3 && t <= 10) { v.set(x, y - 1, z + 1, col); v.set(x, y - 1, z - 1, col); }
    }
  }
  const m = v.bake(1, 1);
  PALMS.set(lean, m);
  return m;
}
const LAMP = (() => {
  const v = new VB();
  v.box(0, 0, 0, 1, 28, 1, 0x2b2b38);
  v.box(1, 27, 0, 5, 1, 1, 0x2b2b38);
  v.box(4, 26, 0, 3, 1, 1, GLOW | 0xffd9a0);
  return v.bake(0.5, 0.5);
})();
const RAIL = (() => {
  const v = new VB();
  for (let x = -100; x <= 100; x += 6) v.box(x, 0, 0, 1, 5, 1, 0x9aa0b4);
  v.box(-100, 4, 0, 201, 1, 1, 0xd8dce8);
  v.box(-100, 2, 0, 201, 1, 1, 0xd8dce8);
  return v.bake(0, 0);
})();

interface CS {body: number; roof: boolean; hood?: number; stripe?: number; side?: number; seat?: number}
const KINDS: Record<string, CS> = {
  hero: {body: 0x1fd1c1, roof: false, stripe: 0xfff1d0, seat: 0xd8344e},
  taxi: {body: 0xffc933, roof: true, side: 0x1a1a22},
  pink: {body: 0xff6fae, roof: true},
  white: {body: 0xf4f4f8, roof: true, side: 0x7a4bd6},
  purple: {body: 0x7a4bd6, roof: true},
  orange: {body: 0xff8a2a, roof: true, side: 0x1a1a22},
  police: {body: 0xf2f2f6, hood: 0x1a1a24, roof: true, side: 0x1b3fa8},
};
const CARC = new Map<string, Model>();
function getCar(kind: string): Model {
  const hit = CARC.get(kind);
  if (hit) return hit;
  const s = KINDS[kind];
  const v = new VB();
  const dark = 0x15151d, chrome = 0xdfe3ee, glass = 0x86d6ff, hood = s.hood ?? s.body;
  v.box(1, 1, 0, 8, 1, 22, dark);
  v.box(1, 2, 0, 8, 3, 22, s.body);
  if (s.side !== undefined) { v.box(1, 3, 4, 1, 1, 14, s.side); v.box(8, 3, 4, 1, 1, 14, s.side); }
  v.box(1, 5, 0, 8, 1, 9, hood);
  v.box(1, 5, 17, 8, 1, 5, hood);
  v.box(1, 5, 9, 1, 1, 8, s.body);
  v.box(8, 5, 9, 1, 1, 8, s.body);
  if (s.stripe !== undefined) { v.box(4, 5, 0, 2, 1, 9, s.stripe); v.box(4, 5, 17, 2, 1, 5, s.stripe); }
  v.box(1, 2, 0, 8, 1, 1, chrome);
  v.box(1, 2, 21, 8, 1, 1, chrome);
  v.box(3, 3, 0, 4, 2, 1, dark);
  v.box(1, 4, 0, 2, 1, 1, GLOW | 0xfff2c0);
  v.box(7, 4, 0, 2, 1, 1, GLOW | 0xfff2c0);
  v.box(1, 4, 21, 2, 1, 1, GLOW | 0xff2a3a);
  v.box(7, 4, 21, 2, 1, 1, GLOW | 0xff2a3a);
  if (!s.roof) {
    const seat = s.seat ?? 0x222230;
    v.box(2, 5, 9, 6, 1, 2, 0x1a1a22);
    v.box(2, 4, 11, 2, 1, 4, seat);
    v.box(6, 4, 11, 2, 1, 4, seat);
    v.box(2, 5, 14, 2, 3, 1, seat);
    v.box(6, 5, 14, 2, 3, 1, seat);
    for (let i = 0; i < 3; i++) { v.box(1, 6 + i, 9 + i, 8, 1, 1, glass); v.set(1, 6 + i, 9 + i, s.body); v.set(8, 6 + i, 9 + i, s.body); }
    v.box(3, 5, 16, 1, 3, 1, chrome);
    v.box(6, 5, 16, 1, 3, 1, chrome);
  } else {
    v.box(1, 5, 9, 8, 3, 8, glass);
    for (const [x, z] of [[1, 9], [8, 9], [1, 16], [8, 16]]) v.box(x, 5, z, 1, 3, 1, s.body);
    v.box(1, 8, 9, 8, 1, 8, s.body);
  }
  for (const z of [3, 15]) {
    v.box(0, 0, z, 2, 4, 4, dark);
    v.box(8, 0, z, 2, 4, 4, dark);
    v.box(0, 1, z + 1, 1, 2, 2, chrome);
    v.box(9, 1, z + 1, 1, 2, 2, chrome);
  }
  const m = v.bake();
  CARC.set(kind, m);
  return m;
}
const LBC = new Map<number, Model>();
function lightbar(st: number): Model {
  const hit = LBC.get(st);
  if (hit) return hit;
  const v = new VB();
  v.box(0, 0, 0, 3, 2, 2, st === 0 ? GLOW | 0xff3030 : 0x3a0f0f);
  v.box(3, 0, 0, 3, 2, 2, st === 0 ? 0x101a4a : GLOW | 0x2f6dff);
  const m = v.bake();
  LBC.set(st, m);
  return m;
}

interface PS {skin: number; hair: number; top: number; pants: number; long: boolean; crop: boolean}
const LEAD: Record<string, PS> = {
  A: {skin: 0xd9a37a, hair: 0x1c1410, top: 0xf6e9d7, pants: 0x2b2f4a, long: false, crop: false},
  B: {skin: 0xf0c4a0, hair: 0xffd36b, top: 0xff3f81, pants: 0x3f68c9, long: true, crop: true},
  C: {skin: 0x8d5a3b, hair: 0x2a1a10, top: 0x23c4b8, pants: 0xf6e9d7, long: false, crop: false},
  D: {skin: 0xf0c4a0, hair: 0x7a3b1a, top: 0xffc933, pants: 0x3f68c9, long: true, crop: true},
  E: {skin: 0xd9a37a, hair: 0x101010, top: 0xff6fae, pants: 0x2b2f4a, long: true, crop: false},
  F: {skin: 0xf0c4a0, hair: 0xe8e0d0, top: 0x7a4bd6, pants: 0xf6e9d7, long: false, crop: false},
};
const PERC = new Map<string, Model>();
function person(who: string, pose: number, seated: boolean, bag: boolean): Model {
  const key = `${who}${pose}${seated}${bag}`;
  const hit = PERC.get(key);
  if (hit) return hit;
  const s = LEAD[who];
  const v = new VB();
  const sw = pose * 2, ty = seated ? 0 : 9;
  if (!seated)
    for (let side = 0; side < 2; side++) {
      const x = side ? 5 : 2, dz = side ? sw : -sw, lift = dz < 0 ? 1 : 0;
      v.box(x, 1 + lift, 1 + dz, 3, 8 - lift, 3, s.pants);
      if (s.crop) v.box(x, 1 + lift, 1 + dz, 3, 4 - lift, 3, s.skin);
      v.box(x, lift, dz, 3, 1, 4, 0xf4f4f4);
    }
  v.box(2, ty, 1, 6, 7, 3, s.top);
  if (s.crop) v.box(2, ty, 1, 6, 3, 3, s.skin);
  for (let side = 0; side < 2; side++) {
    const x = side ? 8 : 0, dz = side ? -sw : sw;
    if (!seated) { v.box(x, ty + 4, 2 + dz, 2, 3, 2, s.top); v.box(x, ty, 2 + dz, 2, 4, 2, s.skin); }
    else { v.box(x, ty + 4, 2, 2, 3, 2, s.top); v.box(x, ty + 2, -3, 2, 2, 6, s.skin); }
  }
  v.box(3, ty + 7, 1, 4, 1, 3, s.skin);
  const hy = ty + 8;
  v.box(2, hy, 0, 6, 5, 5, s.skin);
  v.box(2, hy + 4, 0, 6, 1, 5, s.hair);
  v.box(2, hy, 4, 6, 4, 1, s.hair);
  v.box(2, hy + 3, 0, 1, 1, 5, s.hair);
  v.box(7, hy + 3, 0, 1, 1, 5, s.hair);
  if (s.long) {
    v.box(2, hy - 4, 4, 6, 5, 1, s.hair);
    if (seated) { v.box(3, hy + 2, 5, 2, 2, 6, s.hair); v.box(4, hy + 3, 11, 2, 1, 2, s.hair); }
    else v.box(3, hy - 1 + pose, 5, 2, 3, 2, s.hair);
  }
  v.box(2, hy + 2, 0, 6, 1, 1, 0x0e0e12);
  v.set(4, hy, 0, 0xb45a50);
  v.set(5, hy, 0, 0xb45a50);
  if (bag && !seated) { v.box(9, 3, 0, 3, 5, 5, 0x1b2230); v.box(9, 8, 1, 3, 1, 3, 0x6bd16b); }
  const m = v.bake(5, 2.5);
  PERC.set(key, m);
  return m;
}

const BANK = (() => {
  const v = new VB();
  const wall = 0xf3e6d0, trim = 0xe9c98a, white = 0xfaf3e3, mar = 0xe8dcd0;
  v.box(4, 0, 0, 48, 1, 3, mar);
  v.box(0, 0, 3, 56, 2, 17, mar);
  v.box(0, 2, 3, 56, 25, 17, wall);
  v.clear(24, 2, 3, 8, 13, 16);
  v.box(24, 2, 18, 8, 13, 1, GLOW | 0xffb15c);
  v.box(1, 27, 0, 54, 2, 20, trim);
  for (const x of [6, 12, 18, 37, 43, 49]) {
    v.box(x, 1, 0, 3, 26, 3, white);
    v.box(x - 1, 1, 0, 5, 1, 3, trim);
    v.box(x - 1, 25, 0, 5, 1, 3, trim);
  }
  for (let k = 0; k < 8; k++) v.box(14 + 2 * k, 29 + k, 0, 28 - 4 * k, 1, 3, trim);
  v.box(23, 2, 2, 1, 14, 1, trim);
  v.box(32, 2, 2, 1, 14, 1, trim);
  v.box(23, 16, 2, 10, 1, 1, trim);
  for (const x of [9, 15, 34, 40, 46]) { v.box(x, 6, 3, 3, 17, 1, GLOW | 0xff9fc0); v.box(x + 1, 6, 3, 1, 17, 1, white); }
  for (let dy = -4; dy <= 4; dy++) for (let dx = -(4 - Math.abs(dy)); dx <= 4 - Math.abs(dy); dx++) v.set(28 + dx, 22 + dy, 3, GLOW | 0xffc24a);
  return v.bake();
})();

// ───────────── sky / sun / lights / camera ─────────────
const STOPS: Array<[number, number]> = [[-1, 0xff9a72], [0, 0xffa070], [0.06, 0xff7f78], [0.2, 0xff5f94], [0.42, 0xc2509e], [0.7, 0x6a3a9c], [1, 0x23296e]];
function skyCol(y: number) {
  for (let i = 1; i < STOPS.length; i++)
    if (y <= STOPS[i][0]) return hexLerp(STOPS[i - 1][1], STOPS[i][1], (y - STOPS[i - 1][0]) / (STOPS[i][0] - STOPS[i - 1][0]));
  return STOPS[STOPS.length - 1][1];
}
function Sky({pos}: {pos: V3}) {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 24, 48);
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      c.setHex(skyCol(p.getY(i)));
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return g;
  }, []);
  return (
    <mesh geometry={geo} scale={2600} position={pos}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
function Sun({pos, sc}: {pos: V3; sc: number}) {
  const disc = useMemo<Inst>(() => {
    const p: number[] = [], c: number[] = [];
    const R = 34;
    for (let y = -R; y < R; y++)
      for (let x = -R; x < R; x++) {
        if ((x + 0.5) * (x + 0.5) + (y + 0.5) * (y + 0.5) > R * R) continue;
        const q = 4 - y;
        if (q > 1 && q % 5 < 1 + Math.floor(q / 7)) continue;
        p.push(x + 0.5, y + 0.5, 0);
        c.push(hexLerp(0xff2f78, 0xffc23f, (y + R) / (2 * R)));
      }
    return {n: c.length, p, c};
  }, []);
  return (
    <group position={pos} scale={sc}>
      <Boxes d={disc} basic fog={false} />
    </group>
  );
}
function Lights({pulse, fill, hemi, sp, sc, on}: {pulse: number; fill: number; hemi: number; sp: V3; sc: boolean; on: boolean}) {
  return (
    <>
      <hemisphereLight args={[0xff9ec4, 0x4a2d6e, hemi]} />
      <directionalLight position={[22, 15, -100]} color={0xffb070} intensity={3.2 + pulse * 1.2} />
      <directionalLight position={[-20, 35, 90]} color={0xffc7a0} intensity={fill} />
      <pointLight position={sp} color={0xff2a2a} intensity={on ? (sc ? 140 : 6) : 0} distance={45} decay={2} />
      <pointLight position={[sp[0] + 2, sp[1], sp[2]]} color={0x2a6aff} intensity={on ? (sc ? 6 : 140) : 0} distance={45} decay={2} />
    </>
  );
}
interface Pose {pos: V3; tgt: V3; fov: number; roll: number}
function Rig({p}: {p: Pose}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(p.pos[0], p.pos[1], p.pos[2]);
  camera.up.set(Math.sin(p.roll), Math.cos(p.roll), 0);
  camera.lookAt(p.tgt[0], p.tgt[1], p.tgt[2]);
  camera.fov = p.fov;
  camera.updateProjectionMatrix();
  return null;
}

// ───────────── dynamic world pieces ─────────────
const WC = new THREE.Color(0xff9a72);
function Waves({f, cx, cz, nx, nz, cell, top, gs, amp = 0.5}: {f: number; cx: number; cz: number; nx: number; nz: number; cell: number; top: number; gs: number; amp?: number}) {
  const fill: Fill = (i, o, c) => {
    const x = cx + ((i % nx) - nx / 2) * cell, z = cz + (Math.floor(i / nx) - nz / 2) * cell;
    const h = 0.5 * (Math.sin(z * 0.09 + x * 0.05 + f * 0.2) + Math.sin(x * 0.11 - z * 0.04 + f * 0.13 + 1.7));
    o.position.set(x, top + h * amp, z);
    o.scale.set(cell * 0.99, 1.5, cell * 0.99);
    const t = clamp((h + 1) / 2);
    const gw = Math.exp(-(x * x) / (gs * gs));
    c.setHex(0x1f2f78);
    c.lerp(WC, clamp(t * t * gw + t * 0.1));
  };
  return <Dyn n={nx * nz} fill={fill} />;
}
function Dashes({cz, x, w, color, g0 = -1e9, g1 = -1e9}: {cz: number; x: number; w: number; color: number; g0?: number; g1?: number}) {
  const b = Math.floor(cz / 6) * 6;
  const fill: Fill = (i, o, c) => {
    const z = b - 120 + i * 6;
    o.position.set(x, 0.03, z);
    if (z < g0 && z > g1) o.scale.set(0, 0, 0);
    else o.scale.set(w, 0.05, 3);
    c.setHex(color);
  };
  return <Dyn n={34} fill={fill} />;
}
function Burst({f, start, life, n, seed, org, speed, grav, size, cols, basic}: {f: number; start: number; life: number; n: number; seed: string; org: V3; speed: number; grav: number; size: number; cols: number[]; basic?: boolean}) {
  const data = useMemo(
    () =>
      Array.from({length: n}, (_, i) => {
        const r = (k: string) => random(`${seed}${k}${i}`);
        const th = r('a') * Math.PI * 2, ph = r('b') * 1.2 + 0.1, s = speed * (0.35 + 0.65 * r('c'));
        return {vx: Math.cos(th) * Math.cos(ph) * s, vy: Math.sin(ph) * s, vz: Math.sin(th) * Math.cos(ph) * s, sz: 0.5 + r('d'), col: cols[Math.floor(r('e') * cols.length) % cols.length], sp: r('f') * 0.5};
      }),
    [n, seed, speed, cols]
  );
  const fill: Fill = (i, o, c) => {
    const t = f - start;
    if (t < 0 || t > life) { o.scale.set(0, 0, 0); return; }
    const d = data[i];
    o.position.set(org[0] + d.vx * t, Math.max(0.05, org[1] + d.vy * t - 0.5 * grav * t * t), org[2] + d.vz * t);
    const s = d.sz * size * (1 - Math.pow(t / life, 3));
    o.scale.set(s, s, s);
    o.rotation.set(t * d.sp, t * d.sp * 1.3, t * d.sp * 0.7);
    c.setHex(d.col);
  };
  return <Dyn n={n} fill={fill} basic={basic} />;
}
const CASH = [0x6dbf6b, 0x4fa85c, 0x9be39a, 0xffd84a];
function Cash({f, from, n}: {f: number; from: number; n: number}) {
  const d = useMemo(() => Array.from({length: n}, (_, i) => [1, 2, 3, 4, 5, 6].map((k) => random(`cash${k}-${i}`))), [n]);
  const fill: Fill = (i, o, c) => {
    if (f < from) { o.scale.set(0, 0, 0); return; }
    const r = d[i];
    const y = 16 - (((f - from) * 0.35 * (0.6 + r[4] * 0.6) + r[2] * 16) % 16);
    o.position.set(-12 + r[0] * 24 + Math.sin(f * 0.07 + r[3] * 6) * 0.6, y, -2 + r[1] * 32);
    o.rotation.set(f * 0.2 * r[5] + r[3] * 3, f * 0.13 * r[4], f * 0.17 * r[0]);
    o.scale.set(0.5, 0.04, 0.3);
    c.setHex(CASH[Math.floor(r[5] * 4) % 4]);
  };
  return <Dyn n={n} fill={fill} />;
}
const DEBRIS = [0xf3e6d0, 0xe9c98a, 0xc9b49a, 0xfaf3e3];
const FIRE = [0xffe27a, 0xffa23a, 0xff5a2a];
const SMOKE = [0xa8929a, 0xc2a8a8, 0x8a7a86];
const SPARK = [0xffe27a, 0xffb23a, 0xffffff];

// ───────────── actors ─────────────
function Car({kind, pos, yaw = 0}: {kind: string; pos: V3; yaw?: number}) {
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <Vox m={getCar(kind)} size={0.2} />
    </group>
  );
}
function Police({pos, yaw = 0, st}: {pos: V3; yaw?: number; st: number}) {
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <Vox m={getCar('police')} size={0.2} />
      <Vox m={lightbar(st)} size={0.2} pos={[0, 1.8, 0.3]} />
    </group>
  );
}
function Person({who, pose = 0, seated = false, bag = false, pos, rot, size = 0.085}: {who: string; pose?: number; seated?: boolean; bag?: boolean; pos: V3; rot?: V3; size?: number}) {
  return <Vox m={person(who, pose, seated, bag)} size={size} pos={pos} rot={rot} />;
}
function Hero({x, y = 0, z, yaw = 0, pitch = 0, roll = 0, riders = true}: {x: number; y?: number; z: number; yaw?: number; pitch?: number; roll?: number; riders?: boolean}) {
  return (
    <group position={[x, y, z]} rotation={new THREE.Euler(pitch, yaw, roll, 'YXZ')}>
      <Vox m={getCar('hero')} size={0.2} />
      {riders && <Person who="A" seated pos={[-0.42, 1.0, 0.35]} />}
      {riders && <Person who="B" seated pos={[0.42, 1.0, 0.35]} />}
    </group>
  );
}
function SegGroup({j, full}: {j: number; full: boolean}) {
  const sg = getSeg(Math.floor(random(`seg${j}`) * NV) % NV);
  return (
    <group position={[0, 0, -j * SEG]}>
      <Vox m={sg.bldg} />
      <Vox m={sg.sky} size={4} />
      {full && (
        <>
          <Vox m={sg.beach} />
          {sg.palms.map((p, i) => <Vox key={i} m={palm(p.lean)} size={0.35} pos={[p.x, 0, p.z]} rot={[0, p.rot, 0]} />)}
          <Vox m={LAMP} size={0.25} pos={[-10.5, 0, -12]} />
          <Vox m={LAMP} size={0.25} pos={[-10.5, 0, 12]} />
          <Vox m={LAMP} size={0.25} pos={[10.5, 0, -12]} rot={[0, Math.PI, 0]} />
          <Vox m={LAMP} size={0.25} pos={[10.5, 0, 12]} rot={[0, Math.PI, 0]} />
          {Array.from({length: 5}, (_, k) => {
            const r = (s: string) => random(`ped${j}${k}${s}`);
            const side = k % 2 ? 1 : -1;
            return <Person key={k} who={'CDEFC'[k]} pos={[side * (11.2 + r('x') * 3.4), 0.15, -20 + r('z') * 40]} rot={[0, r('y') * 6.28, 0]} />;
          })}
        </>
      )}
    </group>
  );
}
function Skyline({cz, y, n = 8}: {cz: number; y: number; n?: number}) {
  return (
    <>
      {Array.from({length: n}, (_, i) => (
        <Vox key={i} m={getSeg(i % NV).sky} size={4} pos={[(i % 2 ? 1 : -1) * (60 + random(`sk${i}`) * 90), y, cz - 60 - i * 45]} />
      ))}
    </>
  );
}

// ───────────── kinematics ─────────────
function heroCity(f: number) {
  return {x: 3 + 1.4 * Math.sin(f * 0.2), z: -1.4 * f, yaw: -Math.atan(0.2 * Math.cos(f * 0.2)), roll: 0.03 * Math.cos(f * 0.2)};
}
const POL: Array<[number, number]> = [[-2.8, 7], [2.8, 9.5], [-0.4, 14], [-3.6, 19]];
function polPos(f: number, i: number): V3 {
  const h = heroCity(f), u = eo((f - 113) / 55);
  return [h.x + POL[i][0] * (0.7 + 0.3 * u), 0, h.z + POL[i][1] + 10 * (1 - u)];
}
const G0 = 480, G1 = 516;
function heroBridge(f: number) {
  let s: number, y = 0, pitch = 0;
  if (f < 281) {
    s = G0 - 1.8 * (281 - f);
    const r = clamp((s - (G0 - 8)) / 8);
    y = 1.5 * r;
    pitch = r > 0 ? 0.185 : 0;
  } else if (f < 323) {
    const u = (f - 281) / 42;
    s = G0 + 36 * u;
    y = 1.5 * (1 - u) + 28 * u * (1 - u);
    pitch = Math.atan((-1.5 + 28 * (1 - 2 * u)) / 36);
  } else {
    const q = f - 323;
    s = G1 + 1.5 * q;
    y = 0.5 * Math.exp(-q / 3) * Math.abs(Math.sin(q * 0.55));
    pitch = -0.2 * Math.exp(-q / 2.5) * Math.cos(q * 0.5);
  }
  const x = 1.5 * Math.sin(f * 0.07) * (1 - sm(262, 281, f));
  const roll = f < 281 ? 0.03 * Math.cos(f * 0.07) : f < 323 ? 0.12 * Math.sin((f - 281) * 0.15) : 0;
  return {s, y, pitch, x, roll};
}
const shake = (f: number, a: number): V3 => [Math.sin(f * 7.1) * a, Math.sin(f * 9.7 + 1) * a, Math.sin(f * 5.3 + 2) * a * 0.5];

function camPose(f: number, shot: number, pulse: number): Pose {
  let pos: V3 = [0, 2, 8], tgt: V3 = [0, 1, 0], fov = 50, roll = 0, sh = 0.015;
  if (shot === 0) {
    const u = f / 55, e = 1 - (1 - u) * (1 - u), h = heroCity(f);
    pos = [lerp(14, h.x - 1.2, e), lerp(50, 3.4, e), h.z + lerp(38, 8, e)];
    tgt = [h.x * 0.7, 1.4, h.z - lerp(40, 3, e)];
    fov = lerp(64, 66, u);
    roll = 0.07 * (1 - u) * Math.sin(f * 0.1 + 1);
  } else if (shot === 1) {
    const lf = f - 56, a = sm(14, 56, lf), h = heroCity(f);
    pos = [h.x + lerp(-1.2, 5.5, a), lerp(0.55, 2.2, a), h.z + lerp(6.8, 5.2, a)];
    tgt = [h.x * 0.9, 1.0, h.z - 3];
    fov = lerp(50, 40, a);
    roll = lerp(0.05, -0.02, a);
    sh = 0.03;
  } else if (shot === 2) {
    const u = (f - 113) / 55, h = heroCity(f);
    const th = lerp(Math.PI * 0.97, Math.PI * 1.46, eo(u)), r = lerp(8.5, 6.8, u);
    pos = [h.x + r * Math.sin(th), lerp(0.65, 1.5, u), h.z + r * Math.cos(th)];
    tgt = [h.x, 1.1, h.z + 3];
    fov = lerp(48, 42, u);
    roll = 0.04 * Math.sin(f * 0.09);
    sh = 0.03;
  } else if (shot === 3) {
    const t = f - 169, u = t / 55;
    pos = [lerp(-3, 0, u), lerp(0.9, 1.6, u), 20 + 0.3 * t];
    tgt = [0, lerp(4.2, 1.4, sm(0, 45, t)), 5 + 0.4 * t];
    fov = lerp(58, 46, u);
    roll = 0.03 * Math.sin(f * 0.15);
    sh = 0.02 + 0.2 * Math.exp(-t / 5);
  } else if (shot === 4) {
    const b = heroBridge(f), cz = -b.s, cy = b.y + 0.9;
    if (f < 281) {
      const a = sm(250, 280, f);
      pos = [b.x + lerp(0, 9, a), lerp(1.3, 2.2, a), cz + lerp(7.5, 3, a)];
      tgt = [b.x, 1.0, cz - lerp(2, 0, a)];
      fov = lerp(56, 42, a);
      roll = lerp(0.04, -0.03, a);
    } else if (f < 323) {
      const u = (f - 281) / 42, th = lerp(1.25, 4.6, sm(0, 1, u) * 0.6 + u * 0.4);
      pos = [b.x + 9 * Math.sin(th), cy + lerp(1.2, 2.8, u), cz + 9 * Math.cos(th)];
      tgt = [b.x, cy, cz];
      fov = 44;
      roll = 0.05 * Math.sin(u * 6);
    } else {
      const q = f - 323;
      pos = [3.5, 0.6, -G1 + 8];
      tgt = [b.x, 1.0, cz];
      fov = lerp(60, 40, eo(q / 14));
      sh = 0.02 + 0.5 * Math.exp(-q / 3);
    }
  } else {
    const u = (f - 338) / 51;
    pos = [0.3 * Math.sin(u * 2), 2.3, lerp(3, -1.2, eo(u))];
    tgt = [0, 3.5, -400];
    fov = lerp(42, 38, u);
    sh = 0.003;
  }
  const k = shake(f, sh + pulse * 0.03);
  return {pos: [pos[0] + k[0], pos[1] + k[1], pos[2] + k[2]], tgt, fov: fov + pulse * (shot === 5 ? 0.4 : 3.5), roll};
}

// ───────────── shots ─────────────
const TRAFFIC = Array.from({length: 14}, (_, i) => ({
  kind: ['taxi', 'pink', 'white', 'purple', 'orange', 'taxi'][i % 6],
  onc: i < 9,
  x: i < 9 ? (i % 2 ? -7 : -3.5) : 7.5,
  z0: i < 9 ? -70 - i * 32 + random(`tz${i}`) * 10 : -50 - (i - 9) * 60,
  v: i < 9 ? 1.0 : -0.8,
}));
function CityShot({f, shot}: {f: number; shot: number}) {
  const h = heroCity(f);
  const base = Math.round(-h.z / SEG);
  const segs: React.ReactNode[] = [];
  for (let j = base - 1; j <= base + (shot === 0 ? 3 : 2); j++) segs.push(<SegGroup key={j} j={j} full />);
  const st = Math.floor(f / 5) % 2;
  return (
    <>
      <Slab p={[0, -0.5, -1000]} s={[20, 1, 4000]} color={0x2b2a3d} />
      <Slab p={[-13, -0.2, -1000]} s={[6, 0.7, 4000]} color={0xb8a9b8} />
      <Slab p={[13, -0.2, -1000]} s={[6, 0.7, 4000]} color={0xb8a9b8} />
      <Slab p={[-208, -0.5, -1000]} s={[384, 1, 4000]} color={0x40304f} />
      <Slab p={[29, -0.6, -1000]} s={[26, 1, 4000]} color={0xf0c58a} />
      <Slab p={[1021, -2.2, -1000]} s={[1958, 2, 4000]} color={0x23367f} />
      <Waves f={f} cx={110} cz={Math.round((h.z - 60) / 5) * 5} nx={30} nz={40} cell={5} top={-1} gs={140} amp={0.35} />
      <Dashes cz={h.z} x={-0.2} w={0.12} color={0xffc83a} />
      <Dashes cz={h.z} x={0.2} w={0.12} color={0xffc83a} />
      <Dashes cz={h.z} x={-5} w={0.18} color={0xf4f0ff} />
      <Dashes cz={h.z} x={5} w={0.18} color={0xf4f0ff} />
      {segs}
      {TRAFFIC.map((t, i) => {
        if (!t.onc && shot >= 2) return null;
        const z = t.z0 + t.v * f;
        if (Math.abs(z - h.z) > 170) return null;
        return <Car key={i} kind={t.kind} pos={[t.x, 0, z]} yaw={t.onc ? Math.PI : 0} />;
      })}
      <Hero x={h.x} z={h.z} yaw={h.yaw} roll={h.roll} />
      {shot === 2 && POL.map((_, i) => <Police key={i} pos={polPos(f, i)} yaw={0.03 * i} st={(st + i) % 2} />)}
    </>
  );
}

function HeistShot({f}: {f: number}) {
  const t = f - 169;
  const run = (who: string, x: number, d: number) => {
    const tt = Math.max(0, t - d);
    return <Person key={who} who={who} bag size={0.1} pose={Math.floor(f / 3) % 2 ? 1 : -1} pos={[x, 1 - sm(2, 14, tt), 4 + 0.42 * tt]} rot={[0, Math.PI, 0]} />;
  };
  return (
    <>
      <Slab p={[0, -0.5, 0]} s={[400, 1, 400]} color={0xd9b5b0} />
      <Slab p={[0, -0.45, 20]} s={[16, 1, 60]} color={0x8a6f7e} />
      <group position={[-8, 0, 0]}>{[-1, 0, 1].map((j) => <SegGroup key={j} j={j} full={false} />)}</group>
      <group position={[8, 0, 0]} rotation={[0, Math.PI, 0]}>{[-1, 0, 1].map((j) => <SegGroup key={j} j={j} full={false} />)}</group>
      <Vox m={BANK} size={0.5} rot={[0, Math.PI, 0]} />
      <Vox m={palm(-1)} size={0.4} pos={[-11, 0, 12]} />
      <Vox m={palm(1)} size={0.4} pos={[11, 0, 14]} rot={[0, 2, 0]} />
      <Hero x={7} z={14} yaw={0.35} riders={false} />
      {run('A', -1.2, 0)}
      {run('B', 1.2, 3)}
      <Burst f={f} start={169} life={44} n={70} seed="deb" org={[0, 3, 5]} speed={0.9} grav={0.03} size={0.45} cols={DEBRIS} />
      <Burst f={f} start={169} life={16} n={40} seed="fire" org={[0, 3, 5]} speed={1.2} grav={0} size={0.8} cols={FIRE} basic />
      <Burst f={f} start={170} life={70} n={60} seed="smoke" org={[0, 3, 5]} speed={0.3} grav={-0.002} size={0.9} cols={SMOKE} />
      <Cash f={f} from={173} n={120} />
    </>
  );
}

function bridgeTile(): Model {
  const v = new VB();
  for (const x of [-16, 16]) {
    for (let z = 0; z < 80; z += 8) v.box(x, 0, z, 1, 5, 1, 0x9aa0b4);
    v.box(x, 4, 0, 1, 1, 80, 0xd8dce8);
    v.box(x, 2, 0, 1, 1, 80, GLOW | 0xff9a5a);
    v.box(x === -16 ? -17 : 17, 0, 0, 1, 40, 3, 0xff5a3a);
  }
  v.box(-17, 40, 0, 35, 3, 3, 0xff5a3a);
  v.box(-17, 36, 0, 35, 1, 1, GLOW | 0xffd27a);
  return v.bake(0, 0);
}
function BridgeShot({f}: {f: number}) {
  const b = heroBridge(f);
  const cz = -b.s;
  const k0 = Math.floor(b.s / 40);
  const tiles: React.ReactNode[] = [];
  const tm = useMemo(() => bridgeTile(), []);
  for (let k = k0 - 3; k <= k0 + 5; k++) {
    if (k === 12) continue;
    tiles.push(<Vox key={k} m={tm} size={0.5} pos={[0, 0, -40 * (k + 1)]} />);
  }
  const st = Math.floor(f / 5) % 2;
  return (
    <>
      <Slab p={[0, -15, -300]} s={[4000, 2, 4000]} color={0x23367f} />
      <Waves f={f} cx={0} cz={Math.round(cz / 5) * 5} nx={60} nz={50} cell={5} top={-13.5} gs={60} />
      <Slab p={[0, -0.5, (300 - G0) / 2]} s={[16, 1, 300 + G0]} color={0x2b2a3d} />
      <Slab p={[0, -0.5, -G1 - 350]} s={[16, 1, 700]} color={0x2b2a3d} />
      <Slab p={[0, -0.75, -G0 + 4]} s={[16, 0.5, 8.2]} color={0x4a4560} rx={0.185} />
      <Dashes cz={cz} x={0} w={0.15} color={0xffc83a} g0={-G0} g1={-G1} />
      <Dashes cz={cz} x={-4} w={0.15} color={0xf4f0ff} g0={-G0} g1={-G1} />
      <Dashes cz={cz} x={4} w={0.15} color={0xf4f0ff} g0={-G0} g1={-G1} />
      {tiles}
      <Skyline cz={cz} y={-14} n={10} />
      <Hero x={b.x} y={b.y} z={cz} pitch={b.pitch} roll={b.roll} />
      {[0, 1, 2].map((i) => {
        const sp = Math.min(b.s - 12 - 6 * i, G0 - 5 - 6 * i);
        return <Police key={i} pos={[(i - 1) * 3, 0, -sp]} st={(st + i) % 2} />;
      })}
      <Burst f={f} start={281} life={24} n={50} seed="l1" org={[b.x, 0.3, -G0]} speed={0.7} grav={0.03} size={0.25} cols={SPARK} basic />
      <Burst f={f} start={323} life={30} n={80} seed="l2" org={[0, 0.3, -G1]} speed={1.0} grav={0.04} size={0.25} cols={SPARK} basic />
      <Burst f={f} start={323} life={40} n={30} seed="l3" org={[0, 0.3, -G1]} speed={0.5} grav={-0.002} size={1.0} cols={SMOKE} />
    </>
  );
}

function CliffShot({f}: {f: number}) {
  return (
    <>
      <Slab p={[0, -0.5, 18]} s={[90, 1, 64]} color={0x5a3f4a} />
      <Slab p={[0, -12.5, -14.5]} s={[90, 24, 2]} color={0x6d4a58} />
      <Slab p={[0, -23, -1000]} s={[4000, 2, 2100]} color={0x23367f} />
      <Waves f={f} cx={0} cz={-230} nx={56} nz={44} cell={10} top={-21.5} gs={70} amp={0.4} />
      <Skyline cz={-250} y={-22} n={10} />
      <Vox m={RAIL} size={0.25} pos={[0, 0, -12]} />
      <Person who="A" size={0.09} pos={[-0.7, 0, -9]} />
      <Person who="B" size={0.09} pos={[0.7, 0, -9]} />
      <Car kind="hero" pos={[6, 0, -6]} yaw={0.5} />
      <Vox m={palm(-1)} size={0.5} pos={[-9, 0, 2]} rot={[0, 1, 0]} />
      <Vox m={palm(1)} size={0.5} pos={[10, 0, 0]} rot={[0, 3, 0]} />
      <Burst f={f} start={338} life={60} n={20} seed="ash" org={[0, 0.5, -8]} speed={0.08} grav={-0.0005} size={0.15} cols={SPARK} basic />
    </>
  );
}

// ───────────── text ─────────────
const TXT: React.CSSProperties = {fontFamily: 'Archivo, sans-serif', fontWeight: 900, color: '#fff3e0', position: 'absolute', whiteSpace: 'nowrap', lineHeight: 1};
const EXT = '0 6px 0 #c2185b, 0 12px 0 #3a1050, 0 0 50px rgba(255,80,120,0.65)';
function Line({f, a, b, style, children}: {f: number; a: number; b: number; style: React.CSSProperties; children: React.ReactNode}) {
  if (f < a || f > b) return null;
  const p = eo((f - a) / 6), x = sm(b - 3, b, f);
  return (
    <div style={{...TXT, ...style, clipPath: `inset(-60px ${(1 - p) * 100}% -60px ${x * 100}%)`, transform: `translateX(${lerp(-60, 0, p)}px) scale(${lerp(1.5, 1, p)}) skewX(${lerp(-16, 0, p)}deg)`, transformOrigin: '0% 50%'}}>
      {children}
    </div>
  );
}
function Title({f, pulse}: {f: number; pulse: number}) {
  const t = f - 338;
  if (t < 0) return null;
  return (
    <div style={{...TXT, left: 0, right: 0, top: 165, textAlign: 'center', fontSize: 260, letterSpacing: '0.02em', textShadow: EXT, WebkitTextStroke: '6px #3a1050', paintOrder: 'stroke fill', transform: `scale(${1 + pulse * 0.03})`}}>
      {'SUNBURN'.split('').map((ch, i) => {
        const p = eo((t - i * 0.5) / 4);
        return <span key={i} style={{display: 'inline-block', opacity: p, transform: `translateY(${lerp(-140, 0, p)}px) scale(${lerp(2.2, 1, p)})`}}>{ch}</span>;
      })}
    </div>
  );
}

// ───────────── composition ─────────────
export const Trailer: React.FC = () => {
  const f = useCurrentFrame();
  const shot = f < 56 ? 0 : f < 113 ? 1 : f < 169 ? 2 : f < 225 ? 3 : f < 338 ? 4 : 5;
  const {last, bar, pulse} = beat(f);
  const pose = camPose(f, shot, pulse);
  let scene: React.ReactNode;
  if (shot < 3) scene = <CityShot f={f} shot={shot} />;
  else if (shot === 3) scene = <HeistShot f={f} />;
  else if (shot === 4) scene = <BridgeShot f={f} />;
  else scene = <CliffShot f={f} />;

  let sp: V3 = [0, 2, 20], on = false;
  if (shot === 2) { const p = polPos(f, 0); sp = [p[0], 1.6, p[2]]; on = true; }
  else if (shot === 3) { sp = [-6, 2, 26]; on = true; }
  else if (shot === 4) { sp = [0, 1.6, -(heroBridge(f).s - 14)]; on = f < 330; }
  const sunPos: V3 = shot === 5 ? [0, 12, -420] : [pose.pos[0] + SUNDIR.x * 1500, pose.pos[1] + SUNDIR.y * 1500, pose.pos[2] + SUNDIR.z * 1500];
  const flashMax = last === 169 ? 0.9 : last === 0 ? 0.12 : 0.3;
  const flash = bar ? Math.exp(-(f - last) / (last === 169 ? 4 : 2.5)) * flashMax : 0;

  return (
    <AbsoluteFill style={{background: '#ff9f78'}}>
      <ThreeCanvas width={1920} height={1080} camera={{fov: 50, near: 0.1, far: 6000, position: [0, 2, 8]}}>
        <color attach="background" args={[FOGC]} />
        <fog attach="fog" args={[FOGC, 80, 560]} />
        <Rig p={pose} />
        <Sky pos={pose.pos} />
        <Sun pos={sunPos} sc={shot === 5 ? 2.6 : 7.5} />
        <Lights pulse={pulse} fill={shot === 5 ? 0.25 : 1.4} hemi={shot === 5 ? 1.1 : 1.9} sp={sp} sc={Math.floor(f / 5) % 2 === 0} on={on} />
        {scene}
      </ThreeCanvas>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(30,10,50,0.5) 100%)', pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: `rgba(255,70,130,${pulse * 0.1})`, mixBlendMode: 'screen', pointerEvents: 'none'}} />
      <Line f={f} a={56} b={112} style={{left: 120, top: 110, fontSize: 165, textShadow: EXT}}>ONE CITY.</Line>
      <Line f={f} a={70} b={112} style={{left: 120, top: 295, fontSize: 165, color: '#ffd23f', textShadow: '0 6px 0 #c2185b, 0 12px 0 #3a1050, 0 0 50px rgba(255,160,40,0.6)'}}>TWO DEBTS.</Line>
      <Title f={f} pulse={pulse} />
      <Line f={f} a={339} b={999} style={{left: 0, right: 0, top: 468, textAlign: 'center', paddingLeft: '0.4em', fontSize: 72, fontWeight: 800, letterSpacing: '0.4em', textShadow: '0 4px 0 #3a1050, 0 0 30px rgba(255,80,120,0.7)', WebkitTextStroke: '3px #3a1050', paintOrder: 'stroke fill', transformOrigin: '50% 50%'}}>COMING NOVEMBER</Line>
      <AbsoluteFill style={{background: `rgba(255,240,220,${flash})`, pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};