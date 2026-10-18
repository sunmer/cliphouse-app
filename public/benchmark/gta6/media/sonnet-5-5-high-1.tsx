/*
 CONCEPT
 SUNBURN: a golden-hour, sun-drenched voxel coast city. Two leads in a hot-pink
 convertible run from the police after a bank job. A drone dive drops over the
 police pack into the chase, the heist follows, and the trailer ends on a
 bullet-time 360-degree orbit as the car jumps an open drawbridge toward the
 setting sun. The title slams on the landing while the car drives into the
 giant sun. Every object in the 3D world is built from instanced cubes,
 including the sun, the sea, the crowds and the clouds.

 STORYBOARD (30 fps, beat = 14.0625 f, 128 BPM)
 1.   0- 56 (beats 0-4)   DRONE DIVE. Starts just above the police pack and dives past the lamp posts
                          down to behind the hero car. "ONE CITY." slams in on beat 1 (f14),
                          "TWO DEBTS." on beat 3 (f42).
 2.  56-113 (beats 4-8)   CHASE ORBIT. A low orbit from behind the car through its side to a low front
                          hero angle on the two leads, with cop lights behind them.
 3. 113-169 (beats 8-12)  POLICE PRESSURE. A low camera in the right lane sweeps through the police
                          pack. Palms and lamp posts strobe past the lens, and it ends alongside the
                          hero car.
 4. 169-225 (beats 12-16) HEIST. Starts on a wide shot of the whole bank facade with its gold emblem and
                          flashing alarm beacons. The leads burst out with cash bags, glass shatters and
                          bills fly. The orbit pushes in tight on the leads.
 5. 225-281 (beats 16-20) WHIP PASS then CRANE. A road-level lens (f225-253) whips past the car and
                          cops on beat 17. A crane-up behind the chase (f253-281) reveals the helicopter
                          and its searchlight pool tracking the car.
 6. 281-390 (beats 20-28) THE JUMP. Chase cam to the ramp (f281-295). Take-off on beat 21 and a full
                          bullet-time orbit in mid-air (f295-338). Landing on beat 24 (f338) with the
                          SUNBURN slam and COMING NOVEMBER. Then a crane back as the car drives into
                          the giant sun, with both lines held to the end.
*/

import React, { useMemo } from "react";
import { AbsoluteFill, Easing, random, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

// ------------------------------------------------------------ utils
type V3 = [number, number, number];
interface S {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}
const BEAT = 14.0625;
const bf = (n: number) => Math.round(n * BEAT);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const c01 = (v: number) => clamp(v, 0, 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => {
  const x = c01(t);
  return x * x * (3 - 2 * x);
};
const seg = (f: number, a: number, b: number) => c01((f - a) / (b - a));
const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const E_IO = Easing.inOut(Easing.cubic);
const E_Q = Easing.inOut(Easing.quad);
const E_O = Easing.out(Easing.cubic);
const SH = [0, bf(4), bf(8), bf(12), bf(16), bf(20)];
const PS = 0.11;

function pulse(f: number, decay = 4): number {
  let n = Math.floor(f / BEAT);
  while (bf(n + 1) <= f) n++;
  while (n > 0 && bf(n) > f) n--;
  return Math.exp(-(f - bf(n)) / decay) * (n % 4 === 0 ? 1 : 0.5);
}

// ------------------------------------------------------------ voxel buffers
class Buf {
  p: number[] = [];
  c: number[] = [];
  m = new Map<number, number>();
  constructor(public s: number) {}
  add(x: number, y: number, z: number, col: number): void {
    x = Math.round(x);
    y = Math.round(y);
    z = Math.round(z);
    const k = ((x + 4096) * 8192 + (y + 4096)) * 8192 + (z + 4096);
    const i = this.m.get(k);
    if (i !== undefined) {
      this.c[i] = col;
      return;
    }
    this.m.set(k, this.c.length);
    this.p.push(x, y, z);
    this.c.push(col);
  }
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, col: number): void {
    for (let x = x0; x < x1; x++) for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++) this.add(x, y, z, col);
  }
}

const BOX = new THREE.BoxGeometry(1, 1, 1);
const LAMB = new THREE.MeshLambertMaterial({ color: 0xffffff });
const SUNMAT = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
const HALOMAT = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0.16, depthWrite: false });

function toMesh(b: Buf, jit = 0.08, salt = 1, mat: THREE.Material = LAMB): THREE.InstancedMesh | null {
  let n = 0;
  for (const c of b.c) if (c >= 0) n++;
  if (n === 0) return null;
  const mesh = new THREE.InstancedMesh(BOX, mat, n);
  const mt = new THREE.Matrix4();
  const col = new THREE.Color();
  let j = 0;
  for (let i = 0; i < b.c.length; i++) {
    if (b.c[i] < 0) continue;
    mt.makeScale(b.s, b.s, b.s);
    mt.setPosition((b.p[i * 3] + 0.5) * b.s, (b.p[i * 3 + 1] + 0.5) * b.s, (b.p[i * 3 + 2] + 0.5) * b.s);
    mesh.setMatrixAt(j, mt);
    col.setHex(b.c[i]);
    col.multiplyScalar(1 + (random(i * 1.37 + salt * 91.7) - 0.5) * 2 * jit);
    mesh.setColorAt(j, col);
    j++;
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}
function chunkOf(m: Map<number, Buf>, z: number, s: number): Buf {
  const k = Math.floor(z / 100);
  let b = m.get(k);
  if (!b) {
    b = new Buf(s);
    m.set(k, b);
  }
  return b;
}
function flush(g: THREE.Object3D, m: Map<number, Buf>, jit: number, salt: number, mat: THREE.Material = LAMB): void {
  m.forEach((b, k) => {
    const me = toMesh(b, jit, salt + k, mat);
    if (me) g.add(me);
  });
}
function slab(g: THREE.Group, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, col: number): void {
  const m = new THREE.Mesh(BOX, new THREE.MeshLambertMaterial({ color: col }));
  m.scale.set(x1 - x0, y1 - y0, z1 - z0);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  g.add(m);
}

// ------------------------------------------------------------ models
const carCache = new Map<string, Buf>();
function carBuf(kind: string, body: number, trim: number, stripe: boolean): Buf {
  const key = `${kind}${body}${trim}${stripe}`;
  const hit = carCache.get(key);
  if (hit) return hit;
  const b = new Buf(0.2);
  const TIRE = 0x15151b, HUB = 0xc9ccd4, GLS = 0x86c4dc, DARK = 0x1d1922;
  b.box(0, 2, 0, 9, 5, 22, body);
  b.box(0, 2, 0, 9, 3, 22, DARK);
  b.box(1, 2, 0, 8, 4, 1, trim);
  b.box(1, 2, 21, 8, 4, 22, trim);
  b.box(1, 5, 1, 8, 6, 9, body);
  b.box(1, 5, 17, 8, 6, 21, body);
  if (stripe) {
    b.box(3, 5, 1, 6, 6, 9, trim);
    b.box(3, 5, 17, 6, 6, 21, trim);
  }
  b.box(1, 3, 0, 3, 4, 1, 0xfff2b8);
  b.box(6, 3, 0, 8, 4, 1, 0xfff2b8);
  b.box(1, 3, 21, 3, 5, 22, 0xff2a3a);
  b.box(6, 3, 21, 8, 5, 22, 0xff2a3a);
  b.box(3, 3, 21, 6, 4, 22, 0xf1f1f1);
  if (kind === "conv") {
    b.box(1, 4, 9, 8, 5, 17, 0x2a1f2b);
    b.box(0, 5, 9, 1, 6, 17, body);
    b.box(8, 5, 9, 9, 6, 17, body);
    b.box(2, 5, 8, 7, 7, 9, GLS);
    b.box(1, 5, 8, 2, 7, 9, trim);
    b.box(7, 5, 8, 8, 7, 9, trim);
    b.box(1, 7, 8, 8, 8, 9, trim);
    b.box(1, 5, 15, 8, 9, 17, 0xf3e6d3);
  } else {
    for (let y = 5; y < 8; y++) {
      const k = y - 5, zs = 8 + k, ze = 18 - k;
      for (let x = 1; x < 8; x++)
        for (let z = zs; z < ze; z++) {
          const edge = x === 1 || x === 7 || z === zs || z === ze - 1;
          b.add(x, y, z, y === 5 ? body : edge ? GLS : DARK);
        }
    }
    b.box(1, 8, 10, 8, 9, 16, kind === "cop" ? 0x14141a : body);
    if (kind === "cop") {
      b.box(0, 3, 9, 1, 5, 17, 0xf2f2f2);
      b.box(8, 3, 9, 9, 5, 17, 0xf2f2f2);
    }
  }
  for (const wz of [3, 15])
    for (const wx of [0, 7]) {
      for (let dy = 0; dy < 4; dy++)
        for (let dz = 0; dz < 4; dz++) {
          if ((dy === 0 || dy === 3) && (dz === 0 || dz === 3)) continue;
          for (let dx = 0; dx < 2; dx++) b.add(wx + dx, dy, wz + dz, TIRE);
        }
      const hx = wx === 0 ? 0 : 8;
      b.box(hx, 1, wz + 1, hx + 1, 3, wz + 3, HUB);
    }
  carCache.set(key, b);
  return b;
}
function leadsBuf(): Buf {
  const b = new Buf(0.2);
  const seated = (x0: number, skin: number, hair: number, shirt: number, long: boolean, drive: boolean) => {
    b.box(x0, 5, 12, x0 + 3, 8, 15, shirt);
    b.box(x0, 8, 12, x0 + 3, 11, 15, skin);
    b.box(x0, 9, 12, x0 + 3, 10, 13, 0x0d0d12);
    b.add(x0 + 1, 8, 12, 0xa8503f);
    b.box(x0, 11, 12, x0 + 3, 12, 15, hair);
    b.box(x0, 10, 12, x0 + 3, 11, 13, hair);
    b.box(x0, 8, 14, x0 + 3, 11, 15, hair);
    if (long) b.box(x0, 5, 14, x0 + 3, 11, 15, hair);
    if (drive) {
      b.box(x0, 7, 10, x0 + 3, 8, 11, 0x1d1922);
      b.add(x0, 6, 11, skin);
      b.add(x0 + 2, 6, 11, skin);
    }
  };
  seated(1, 0xe0a67a, 0xe8c26a, 0x1fb5b0, false, false);
  seated(5, 0xc98c64, 0x2a1a24, 0xfaf3ea, true, true);
  return b;
}
function buildPerson(skin: number, hair: number, shirt: number, pants: number, long: boolean, bagSide: number, bag = true): Buf {
  const b = new Buf(PS);
  b.box(1, 0, 0, 3, 1, 3, 0xf4efe2);
  b.box(4, 0, 0, 6, 1, 3, 0xf4efe2);
  b.box(1, 1, 0, 3, 8, 3, pants);
  b.box(4, 1, 0, 6, 8, 3, pants);
  b.box(1, 7, 0, 6, 9, 3, pants);
  b.box(1, 9, 0, 6, 14, 3, shirt);
  for (const x of [0, 6]) {
    b.box(x, 11, 1, x + 1, 14, 3, shirt);
    b.box(x, 8, 1, x + 1, 11, 3, skin);
  }
  b.box(1, 14, 0, 6, 18, 3, skin);
  b.box(1, 18, 0, 6, 19, 3, hair);
  b.box(1, 14, 2, 6, 18, 3, hair);
  b.box(1, 17, 0, 6, 18, 3, hair);
  b.box(1, 16, 0, 6, 17, 1, 0x0d0d12);
  b.add(3, 14, 0, 0xa8503f);
  if (long) b.box(1, 9, 2, 6, 18, 3, hair);
  if (bag) {
    const bx = bagSide ? 7 : -3;
    b.box(bx, 3, 0, bx + 3, 8, 3, 0x1b1b22);
    b.box(bx, 8, 1, bx + 3, 9, 2, 0x7be08f);
    b.box(bx + 1, 5, 0, bx + 2, 6, 1, 0xffc65a);
  }
  return b;
}
function buildHeli(): Buf {
  const b = new Buf(0.35);
  for (let x = 0; x < 13; x++)
    for (let y = 0; y < 11; y++)
      for (let z = 0; z < 17; z++) {
        const dx = (x - 6) / 5.6, dy = (y - 5) / 4.4, dz = (z - 7.5) / 8.2;
        if (dx * dx + dy * dy + dz * dz > 1) continue;
        let col = 0x1f2a48;
        if (dz < -0.35 && dy > -0.1) col = 0x86d4ea;
        else if (y === 3) col = 0xff4b5c;
        else if (y < 3) col = 0x2b3a5e;
        b.add(x, y + 1, z, col);
      }
  b.box(5, 6, 15, 7, 8, 31, 0x1f2a48);
  b.box(6, 8, 29, 7, 13, 31, 0x1f2a48);
  b.box(6, 9, 30, 7, 12, 31, 0xff4b5c);
  b.box(2, 0, 3, 3, 1, 14, 0x2a2a30);
  b.box(10, 0, 3, 11, 1, 14, 0x2a2a30);
  for (const x of [3, 9]) for (const z of [5, 11]) b.box(x, 1, z, x + 1, 3, z + 1, 0x2a2a30);
  b.box(6, 10, 7, 7, 12, 8, 0x2a2a30);
  return b;
}

// ------------------------------------------------------------ world stamps
const PAL = [0xf6a3b8, 0xf7e3c4, 0x9fe0cf, 0xff8a73, 0x8fd3f0, 0xc4a6e8, 0xffe08a, 0xf2f0e6];
const ACC = [0xff3d6e, 0x14b8a6, 0xffb703, 0x4361ee];

function addBuilding(b: Buf, z0: number, w: number, d: number, h: number, i: number): void {
  const wall = PAL[Math.floor(random("bw" + i) * PAL.length)];
  const acc = ACC[Math.floor(random("ba" + i) * ACC.length)];
  const style = Math.floor(random("bs" + i) * 3);
  const roof = 0x6c5a6e;
  const x0 = -20 - d;
  for (let iy = 0; iy < h; iy++)
    for (let ix = 0; ix < d; ix++)
      for (let iz = 0; iz < w; iz++) {
        const front = ix === d - 1, side = iz === 0 || iz === w - 1, top = iy === h - 1;
        if (!(front || side || top)) continue;
        let col = top ? roof : wall;
        if (!top) {
          const fx = front ? iz : ix;
          const fmax = front ? w - 1 : d - 1;
          if (front && iy < 3 && iz % 5 !== 0 && iz > 0 && iz < w - 1) col = 0x2f5a78;
          else if (iy >= 3 && fx > 0 && fx < fmax) {
            let win = false;
            if (style === 0) win = iy % 2 === 1 && fx % 2 === 1;
            else if (style === 1) win = iy % 3 !== 0 && fx % 4 > 0 && fx % 4 < 3;
            else win = iy % 2 === 1 && fx % 3 !== 0;
            if (win) col = random(i * 977 + ix * 7.1 + iy * 3.3 + iz * 5.7) < 0.13 ? 0xffd27a : 0x2f5a78;
          }
        }
        b.add(x0 + ix, iy, z0 - iz, col);
      }
  for (let iz = 0; iz < w; iz++) b.add(x0 + d, 3, z0 - iz, iz % 2 ? acc : 0xfff4e2);
  for (let ix = 0; ix < d; ix++)
    for (let iz = 0; iz < w; iz++)
      if (ix === 0 || ix === d - 1 || iz === 0 || iz === w - 1) b.add(x0 + ix, h, z0 - iz, wall);
  b.box(x0 + 3, h, z0 - 6, x0 + 6, h + 2, z0 - 3, 0xb8b2bd);
  if (i % 2 === 0) {
    b.box(x0 + d - 6, h, z0 - w + 4, x0 + d - 2, h + 4, z0 - w + 8, 0x8a6a52);
    b.box(x0 + d - 7, h + 4, z0 - w + 3, x0 + d - 1, h + 5, z0 - w + 9, 0x5c4638);
  }
}

function stampPalm(b: Buf, wx: number, wz: number, dir: number, seed: number): void {
  const s = b.s;
  const gx = Math.round(wx / s), gz = Math.round(wz / s);
  const H = 19 + Math.floor(random(seed * 3.1) * 6);
  const lean = 2.5 + random(seed * 5.7) * 2.5;
  let tx = gx;
  for (let y = 0; y < H; y++) {
    tx = gx + Math.round(dir * lean * Math.pow(y / H, 2));
    const col = y % 2 ? 0x8a5d3b : 0x6e4529;
    b.add(tx, y, gz, col);
    if (y < 3) {
      b.add(tx + 1, y, gz, col);
      b.add(tx, y, gz + 1, col);
    }
  }
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI * 2) / 8 + random(seed + k) * 0.4;
    const L = 6 + Math.floor(random(seed * 2 + k) * 3);
    for (let r = 1; r <= L; r++) {
      const dx = Math.round(Math.cos(a) * r), dz = Math.round(Math.sin(a) * r);
      const dy = (r < 3 ? 1 : 0) - Math.floor((r * r) / (L * 1.3));
      const col = (r + k) % 3 === 0 ? 0x2fbf6b : r % 2 ? 0x23a455 : 0x178a47;
      b.add(tx + dx, H + dy, gz + dz, col);
      if (r >= 2 && r < L - 1) {
        b.add(tx + dx + Math.round(-Math.sin(a)), H + dy, gz + dz + Math.round(Math.cos(a)), col);
        b.add(tx + dx - Math.round(-Math.sin(a)), H + dy, gz + dz - Math.round(Math.cos(a)), col);
      }
    }
  }
  b.add(tx + 1, H - 1, gz, 0x5a3a22);
  b.add(tx - 1, H - 1, gz, 0x5a3a22);
}
function stampLamp(b: Buf, wx: number, wz: number, dir: number): void {
  const gx = Math.round(wx / b.s), gz = Math.round(wz / b.s);
  for (let y = 0; y < 18; y++) b.add(gx, y, gz, 0x3b3a46);
  for (let i = 1; i <= 9; i++) b.add(gx + dir * i, 17, gz, 0x3b3a46);
  for (let i = 7; i <= 9; i++) b.add(gx + dir * i, 16, gz, 0xfff0c0);
}
function stampUmbrella(b: Buf, wx: number, wz: number, c1: number, c2: number): void {
  const gx = Math.round(wx / b.s), gz = Math.round(wz / b.s);
  for (let y = 0; y < 10; y++) b.add(gx, y, gz, 0xf0f0f0);
  for (let dx = -5; dx <= 5; dx++)
    for (let dz = -5; dz <= 5; dz++) {
      const d2 = dx * dx + dz * dz;
      if (d2 > 26) continue;
      const sector = Math.floor((Math.atan2(dz, dx) + Math.PI) / (Math.PI / 4)) % 2;
      b.add(gx + dx, d2 > 16 ? 9 : 10, gz + dz, sector ? c1 : c2);
    }
  b.box(gx + 7, 0, gz - 3, gx + 14, 1, gz + 3, 0xff6f91);
}
let pedCache: Buf[] | null = null;
function stampPerson(b: Buf, wx: number, wz: number, i: number): void {
  if (!pedCache)
    pedCache = [
      buildPerson(0xe0a67a, 0x4a2e1c, 0xff6f91, 0x2b6cb0, false, 0, false),
      buildPerson(0xc98c64, 0x15121a, 0xffd23f, 0xf4efe2, true, 0, false),
      buildPerson(0x8d5a3c, 0x1a1a1a, 0x14b8a6, 0xe8553b, false, 0, false),
      buildPerson(0xf0c4a0, 0xd9a441, 0xf4f1de, 0x3b3a46, true, 0, false),
    ];
  const src = pedCache[i % 4];
  const gx = Math.round(wx / b.s), gz = Math.round(wz / b.s);
  const flip = i % 3 === 0;
  for (let k = 0; k < src.c.length; k++) b.add(gx + src.p[k * 3] - 3, src.p[k * 3 + 1], gz + (flip ? -src.p[k * 3 + 2] : src.p[k * 3 + 2]), src.c[k]);
}
function disc(r: number, size: number, col: (dx: number, dy: number) => number): Buf {
  const b = new Buf(size);
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r + r * 0.5) continue;
      const c = col(dx, dy);
      if (c >= 0) b.add(dx, dy, 0, c);
    }
  return b;
}

function buildWorld(): THREE.Group {
  const g = new THREE.Group();
  const ROAD = 0x3b3845;
  slab(g, -20, 62, -3, -0.5, -446, 260, 0xf7dca0);
  slab(g, -70, -20, -3, -0.5, -446, 260, 0xcdb08e);
  slab(g, -20, -12, -0.5, 0.15, -446, 260, 0xe6d3b5);
  slab(g, 12, 24, -0.5, 0.15, -446, 260, 0xf0dcc0);
  slab(g, -12, 12, -3, 0, -454, 260, ROAD);
  slab(g, -12, 12, -3, 0, -1000, -546, ROAD);
  slab(g, -14, -12, -3, 0.7, -1000, -546, 0xd9d2c3);
  slab(g, 12, 14, -3, 0.7, -1000, -546, 0xd9d2c3);
  const mk = new Map<number, Buf>();
  for (const [za, zb] of [[250, -452], [-548, -1000]])
    for (let z = za; z > zb; z -= 9) {
      const b = chunkOf(mk, z, 0.5);
      for (const lx of [-6, -0.8, 0.3, 6])
        for (let k = 0; k < 6; k++) b.add(Math.floor(lx / 0.5), 0, Math.floor((z - k * 0.5) / 0.5), lx === -0.8 || lx === 0.3 ? 0xffc93c : 0xf6f0e4);
    }
  const mkg = new THREE.Group();
  flush(mkg, mk, 0.03, 1);
  mkg.position.y = -0.35;
  g.add(mkg);
  const bm = new Map<number, Buf>();
  let z = 170;
  for (let i = 0; z > -440; i++) {
    const w = 16 + Math.floor(random("bw" + i) * 5), d = 11 + Math.floor(random("bd" + i) * 5);
    const h = 14 + Math.floor(random("bh" + i) * 24);
    if (!(z > -322 && z - w < -278)) addBuilding(chunkOf(bm, z, 1), z, w, d, h, i);
    z -= w + 2 + Math.floor(random("bg" + i) * 4);
  }
  flush(g, bm, 0.06, 20);
  const pb = new Map<number, Buf>();
  for (let zz = 240, i = 0; zz > -450; zz -= 17, i++) stampPalm(chunkOf(pb, zz, 0.4), 16.8, zz + random("pz" + i) * 4, -1, i);
  for (let zz = 235, i = 100; zz > -450; zz -= 34, i++) if (!(zz > -326 && zz < -274)) stampPalm(chunkOf(pb, zz, 0.4), -16.5, zz, 1, i);
  for (let zz = 228; zz > -450; zz -= 34) {
    stampLamp(chunkOf(pb, zz, 0.4), 13.2, zz, -1);
    stampLamp(chunkOf(pb, zz - 17, 0.4), -13.5, zz - 17, 1);
  }
  for (let zz = -560; zz > -1000; zz -= 28) {
    stampLamp(chunkOf(pb, zz, 0.4), 12.8, zz, -1);
    stampLamp(chunkOf(pb, zz - 14, 0.4), -12.8, zz - 14, 1);
  }
  flush(g, pb, 0.12, 40);
  const pp = new Map<number, Buf>();
  for (let i = 0; i < 28; i++) {
    const pz = 200 - random("pz2" + i) * 620;
    const east = i % 2 === 0;
    if (!east && pz > -326 && pz < -274) continue;
    const px = east ? 19 + random("px" + i) * 4 : -19 + random("pxw" + i) * 5;
    stampPerson(chunkOf(pp, pz, PS), px, pz, i);
  }
  flush(g, pp, 0.06, 80);
  const ub = new Map<number, Buf>();
  for (let i = 0; i < 16; i++) {
    const uz = 200 - random("uz" + i) * 630;
    stampUmbrella(chunkOf(ub, uz, 0.35), 30 + random("ux" + i) * 24, uz, ACC[i % 4], 0xfff4e2);
  }
  flush(g, ub, 0.06, 60);
  const rp = new Buf(0.5);
  for (let k = 0; k < 28; k++) {
    const hh = Math.ceil(((k + 1) / 28) * 6);
    for (let x = -24; x < 24; x++)
      for (let y = 0; y < hh; y++) {
        const lip = k >= 26 && y === hh - 1;
        rp.add(x, y, -881 - k, lip ? (x % 4 < 2 ? 0xffd23f : 0x2a2a30) : y === hh - 1 ? 0x4a4456 : 0x3a3544);
      }
  }
  const rm = toMesh(rp, 0.04, 7);
  if (rm) g.add(rm);
  const tw = new Buf(1);
  for (const tz of [-452, -548]) {
    for (const sx of [-15, 15])
      for (let y = 0; y < 34; y++) tw.box(sx - 1, y, tz - 1, sx + 2, y + 1, tz + 2, y % 6 === 5 ? 0xc7402c : 0xe8553b);
    tw.box(-15, 33, tz - 1, 16, 35, tz + 2, 0xe8553b);
  }
  const twm = toMesh(tw, 0.05, 8);
  if (twm) g.add(twm);
  const SEA = [0x2aa6c9, 0x1f8fb8, 0x35b9d1, 0x2792b5];
  const sm = new Map<number, Buf>();
  for (let ix = -36; ix < 36; ix++)
    for (let iz = -84; iz < 22; iz++) {
      const cx = ix * 12 + 6, cz = iz * 12 + 6;
      if (cz > -446 && cx > -72 && cx < 66) continue;
      chunkOf(sm, cz, 12).add(ix, -1, iz, SEA[Math.floor(random("sea" + ix + "_" + iz) * 4)]);
    }
  const sg = new THREE.Group();
  flush(sg, sm, 0.08, 70);
  sg.position.y = -1.2;
  g.add(sg);
  const fsm = new Map<number, Buf>();
  for (let ix = -30; ix < 30; ix++)
    for (let iz = -190; iz < -148; iz++) {
      const cx = ix * 3 + 1.5, cz = iz * 3 + 1.5;
      if (cz > -446 || (Math.abs(cx) < 14 && cz < -546)) continue;
      const r = random("fs" + ix + "_" + iz);
      chunkOf(fsm, cz, 3).add(ix, -1, iz, r > 0.93 ? 0xe8fbff : SEA[Math.floor(r * 4) % 4]);
    }
  const fsg = new THREE.Group();
  flush(fsg, fsm, 0.07, 75);
  fsg.position.y = -1.0;
  g.add(fsg);
  const sun = disc(10, 6, (dx, dy) => {
    if (dy < -1 && -dy % 3 === 0 && dy < -2) return -1;
    const t = (dy + 10) / 20;
    return t > 0.6 ? 0xfff3b0 : t > 0.3 ? 0xffb347 : 0xff5d7a;
  });
  const sunM = toMesh(sun, 0.02, 9, SUNMAT);
  if (sunM) {
    sunM.position.set(0, 46, -900);
    g.add(sunM);
  }
  const halo = toMesh(disc(22, 6, () => 0xffa060), 0, 10, HALOMAT);
  if (halo) {
    halo.position.set(0, 46, -910);
    g.add(halo);
  }
  const cl = new Buf(8);
  for (let k = 0; k < 10; k++) {
    const cx = Math.round((random("cx" + k) - 0.5) * 120), cy = 11 + Math.floor(random("cy" + k) * 9), cz = -90 - Math.floor(random("cz" + k) * 90);
    const len = 8 + Math.floor(random("cl" + k) * 10);
    for (let x = 0; x < len; x++)
      for (let z2 = 0; z2 < 3; z2++) {
        cl.add(cx + x, cy, cz + z2, 0xd9708f);
        if (x > 1 && x < len - 2) cl.add(cx + x, cy + 1, cz + z2, 0xffc6a0);
      }
  }
  const clm = toMesh(cl, 0.04, 11, new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
  if (clm) g.add(clm);
  return g;
}

function buildBank(): { body: THREE.Group; glass: THREE.Group } {
  const b = new Buf(0.5), gl = new Buf(0.5);
  const CR = 0xf3e6cf, SHD = 0xd9c4a0, GL = 0x4a7fa6, DK = 0x2a1a20, GD = 0xffc65a;
  const GX = -41, Z0 = -640, W = 80, H = 28;
  for (let y = 0; y < H; y++)
    for (let z = 0; z < W; z++) {
      const win = y >= 6 && y <= 18 && z >= 6 && z < W - 6 && (z - 6) % 10 >= 2 && (z - 6) % 10 <= 7;
      const door = z >= 35 && z <= 44 && y <= 14;
      const frame = door && (z === 35 || z === 44 || y === 14 || z === 39 || z === 40);
      if (win || (door && !frame)) {
        gl.add(GX, y, Z0 + z, GL);
        b.add(GX - 3, y, Z0 + z, DK);
      } else b.add(GX, y, Z0 + z, frame ? GD : y % 5 === 4 ? SHD : CR);
    }
  for (let x = GX - 12; x <= GX; x++) for (let z = 0; z < W; z++) b.add(x, H, Z0 + z, SHD);
  for (let k = 0; k < 8; k++) {
    const zc = Z0 + 6 + 10 * k;
    b.box(GX + 2, 0, zc, GX + 5, 22, zc + 2, CR);
    b.box(GX + 1, 0, zc - 1, GX + 6, 1, zc + 3, SHD);
  }
  b.box(GX + 1, 22, Z0 + 2, GX + 6, 24, Z0 + 78, SHD);
  b.box(GX + 6, 23, Z0 + 2, GX + 7, 24, Z0 + 78, GD);
  for (let r = 0; r < 5; r++) b.box(GX + 1, 24 + r, Z0 + 6 + r * 5, GX + 5, 25 + r, Z0 + 74 - r * 5, CR);
  b.box(GX + 6, 0, Z0, GX + 9, 1, Z0 + W, SHD);
  b.box(GX + 6, 1, Z0 + 20, GX + 8, 2, Z0 + 60, SHD);
  b.box(GX + 9, 0, Z0 + 34, GX + 12, 1, Z0 + 46, 0xc2255c);
  for (let dy = -4; dy <= 4; dy++)
    for (let dz = -4; dz <= 4; dz++) {
      const d2 = dy * dy + dz * dz;
      if (d2 <= 17) b.add(GX + 6, 27 + dy, Z0 + 40 + dz, d2 <= 5 ? 0xfff0b0 : GD);
    }
  const body = new THREE.Group(), glass = new THREE.Group();
  const bm = toMesh(b, 0.05, 12), gm = toMesh(gl, 0.05, 13);
  if (bm) body.add(bm);
  if (gm) glass.add(gm);
  return { body, glass };
}

function buildSkyGeo(): THREE.SphereGeometry {
  const g = new THREE.SphereGeometry(2500, 24, 32);
  const p = g.getAttribute("position");
  const arr = new Float32Array(p.count * 3);
  const stops: [number, number][] = [[0, 0xffb070], [0.1, 0xff8aa0], [0.4, 0x8a4fb8], [1, 0x1f2a6e]];
  const a = new THREE.Color(), b = new THREE.Color(), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = Math.max(0, p.getY(i) / 2500);
    let k = 0;
    while (k < stops.length - 2 && y > stops[k + 1][0]) k++;
    const t = c01((y - stops[k][0]) / (stops[k + 1][0] - stops[k][0]));
    a.setHex(stops[k][1]);
    b.setHex(stops[k + 1][1]);
    c.lerpColors(a, b, t);
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
}

// ------------------------------------------------------------ choreography
function hero(f: number): S {
  if (f < 169) {
    const ph = 0.08 * f;
    const vx = 3 * 0.08 * Math.cos(ph);
    return { x: 3 * Math.sin(ph), y: 0, z: 60 - 1.5 * f, yaw: -Math.atan2(vx, 1.5), pitch: 0 };
  }
  if (f < 225) return { x: 3, y: 0, z: -300, yaw: 0.35, pitch: 0 };
  const k = smooth(seg(f, 225, 240));
  if (f < 295) {
    const z = -300 - 2.2 * (f - 225);
    const ry = c01((-440 - z) / 14);
    return { x: lerp(3, 0, k), y: 3 * ry, z, yaw: lerp(0.35, 0, k), pitch: ry > 0 ? 0.2 : 0 };
  }
  if (f < 338) {
    const u = (f - 295) / 43;
    const w = u + (0.8 * Math.sin(2 * Math.PI * u)) / (2 * Math.PI);
    return { x: 0, y: 3 * (1 - w) + 56 * w * (1 - w), z: -454 - 95 * w, yaw: 0, pitch: 0.3 * (1 - 2 * w) };
  }
  const d = f - 338;
  return { x: 0, y: 0.6 * Math.exp(-d / 3) * Math.abs(Math.cos(d * 0.9)), z: -549 - 2.2 * d, yaw: 0, pitch: 0 };
}

const COPOFF = [14, 23, 33, 44, 55];
const COPX = [-3, 3.5, -2.5, 2.5, -4];
function cop(f: number, i: number): S & { show: boolean } {
  if (f < 169) {
    const ph = 0.07 * f + i * 2;
    const vx = 2 * 0.07 * Math.cos(ph);
    return { x: COPX[i] * 0.7 + 2 * Math.sin(ph), y: 0, z: 60 - 1.5 * f + COPOFF[i], yaw: -Math.atan2(vx, 1.5), pitch: 0, show: true };
  }
  if (f < 225) return { x: [-5, 8, -9, 0, 0][i], y: 0, z: -215 - 1.3 * (f - 169) + 14 * i, yaw: 0, pitch: 0, show: i < 3 };
  const dz = -300 - 2.2 * (f - 225) + COPOFF[i];
  const stop = -430 + 9 * i;
  const slid = c01((stop - dz) / 12);
  const ph = 0.07 * f + i * 2;
  return { x: COPX[i] * 0.7 + 2 * Math.sin(ph) * (1 - slid), y: 0, z: Math.max(dz, stop), yaw: slid * (i % 2 ? 0.5 : -0.5), pitch: 0, show: f < 338 };
}

const CIVC = [0xf2c14e, 0x3ec1d3, 0xf4f1de, 0xef476f, 0x7bd389, 0xb28dff, 0x2b6cb0];
const CIV = Array.from({ length: 18 }, (_, i) => {
  let z0 = -440 + random("cz" + i) * 570;
  if (z0 > -335 && z0 < -265) z0 += 80;
  return { kind: i % 3, z0, col: CIVC[i % CIVC.length] };
});
function civ(f: number, c: { kind: number; z0: number }): S & { show: boolean } {
  let z = c.z0, x = -10.6, yaw = 0;
  if (c.kind === 0) {
    z = c.z0 + 1.6 * f;
    x = 7;
    yaw = Math.PI;
  } else if (c.kind === 1) {
    z = c.z0 - 0.7 * f;
    x = -8;
  }
  return { x, y: 0, z, yaw, pitch: 0, show: f < 281 && z < 250 && !(z < -446 && z > -552) };
}

const leadX = (f: number) => -17 + 0.34 * (f - 169);

function cam(f: number): { pos: V3; look: V3; fov: number; roll: number } {
  const h = hero(f);
  const H: V3 = [h.x, h.y, h.z];
  const A = (o: V3): V3 => [H[0] + o[0], H[1] + o[1], H[2] + o[2]];
  let pos: V3, look: V3, fov = 42, roll = 0;
  if (f < SH[1]) {
    const e = E_IO(seg(f, 0, SH[1]));
    pos = lerp3([16, 22, 100], A([0, 2.7, 8.8]), e);
    look = lerp3([-1, 1, 30], A([0, 1.4, -3]), e);
    fov = lerp(58, 40, e);
    roll = 0.1 * (1 - e);
  } else if (f < SH[2]) {
    const e = E_Q(seg(f, SH[1], SH[2]));
    const th = Math.PI * 0.96 * e;
    const r = lerp(8.8, 5.4, e);
    pos = A([r * Math.sin(th), 1.1 + lerp(1.6, 0.2, e), r * Math.cos(th)]);
    look = A([0, 1.0, 0]);
    fov = lerp(40, 34, e);
    roll = 0.05 * Math.sin(th);
  } else if (f < SH[3]) {
    const t = seg(f, SH[2], SH[3]);
    const e = E_Q(t);
    pos = [lerp(11, 9.5, t), lerp(0.8, 1.7, e), H[2] + lerp(36, -7, e)];
    look = [h.x * 0.5, lerp(1.2, 1.4, e), H[2] + lerp(14, -3, e)];
    fov = lerp(40, 34, e);
    roll = lerp(0.08, -0.04, e);
  } else if (f < SH[4]) {
    const e = E_Q(seg(f, SH[3], SH[4]));
    const cx = leadX(f) - 0.5;
    const ph = lerp(-0.35, -1.0, e);
    const r = lerp(26, 4.6, e);
    pos = [cx + r * Math.cos(ph), lerp(3.2, 1.9, e), -300.6 + r * Math.sin(ph)];
    look = [cx - lerp(10, 0, e), lerp(7, 1.15, e), -300.6];
    fov = lerp(46, 32, e);
    roll = 0.05;
  } else if (f < SH[4] + 28) {
    pos = [3.2, 0.5, -330.8];
    look = A([0, 0.9, 0]);
    fov = 58;
  } else if (f < SH[5]) {
    const t = seg(f, SH[4] + 28, SH[5]);
    pos = A([lerp(3, -5, t), lerp(3.2, 19, E_O(t)), lerp(10, 17, t)]);
    look = A([0, lerp(2.5, 5, t), -8]);
    fov = lerp(46, 40, t);
    roll = lerp(0.1, 0, t);
  } else if (f < 295) {
    const t = seg(f, SH[5], 295);
    pos = A([lerp(-5, -3, t), 1.5, lerp(9, 7, t)]);
    look = A([0, 1, -2]);
    fov = lerp(44, 38, t);
  } else if (f < 338) {
    const u = (f - 295) / 43;
    const ph = 2 * Math.PI * E_Q(u) * 0.5 + Math.PI * u;
    const r = 8 - 2 * Math.sin(Math.PI * u);
    pos = A([r * Math.sin(ph), 1 + 1.6 + 2.2 * Math.sin(Math.PI * u), r * Math.cos(ph)]);
    look = A([0, 1, 0]);
    fov = 36 - 6 * Math.sin(Math.PI * u);
  } else {
    const t = seg(f, 338, 389);
    const e = E_O(t);
    pos = A([lerp(0, -4, e), lerp(2.2, 7, e), lerp(8, 30, e)]);
    look = lerp3(A([0, 1, -1]), A([0, 11, -70]), e);
    fov = 40;
  }
  return { pos, look, fov, roll };
}

// ------------------------------------------------------------ components
interface CarP {
  st: S;
  kind: string;
  body: number;
  trim: number;
  stripe?: boolean;
  leads?: boolean;
  bars?: number;
  show?: boolean;
}
const VCar: React.FC<CarP> = ({ st, kind, body, trim, stripe, leads, bars, show = true }) => {
  const mesh = useMemo(() => toMesh(carBuf(kind, body, trim, !!stripe), 0.07, body % 97), [kind, body, trim, stripe]);
  const lm = useMemo(() => (kind === "conv" ? toMesh(leadsBuf(), 0.04, 5) : null), [kind]);
  const rot = useMemo(() => new THREE.Euler(0, 0, 0, "YXZ"), []);
  rot.set(st.pitch, st.yaw, 0, "YXZ");
  const inGap = st.z < -454 && st.z > -546;
  return (
    <>
      <mesh visible={show && !inGap} position={[st.x, 0.08, st.z]} rotation={[0, st.yaw, 0]} scale={[2.1, 0.02, 4.9]} geometry={BOX}>
        <meshBasicMaterial color={0x000000} transparent opacity={0.35 / (1 + st.y * 0.6)} depthWrite={false} />
      </mesh>
      <group visible={show} position={[st.x, st.y, st.z]} rotation={rot}>
        <group position={[-0.9, 0, -2.2]}>
          {mesh && <primitive object={mesh} />}
          {leads && lm && <primitive object={lm} />}
        </group>
        {bars !== undefined && bars >= 0 && (
          <>
            <mesh position={[-0.38, 1.9, 0.4]} scale={[0.55, 0.22, 0.45]} geometry={BOX}>
              <meshBasicMaterial color={bars ? 0xff2030 : 0x2a6bff} />
            </mesh>
            <mesh position={[0.38, 1.9, 0.4]} scale={[0.55, 0.22, 0.45]} geometry={BOX}>
              <meshBasicMaterial color={bars ? 0x2a6bff : 0xff2030} />
            </mesh>
          </>
        )}
      </group>
    </>
  );
};

const LEADS = [
  { skin: 0xe0a67a, hair: 0xe8c26a, shirt: 0x1fb5b0, pants: 0x2a2f55, long: false, side: 1, dz: -299.4, lag: 0 },
  { skin: 0xc98c64, hair: 0x2a1a24, shirt: 0xfaf3ea, pants: 0xc7456b, long: true, side: 0, dz: -301.8, lag: 1.1 },
];
const Lead: React.FC<{ f: number; i: number }> = ({ f, i }) => {
  const L = LEADS[i];
  const mesh = useMemo(() => toMesh(buildPerson(L.skin, L.hair, L.shirt, L.pants, L.long, L.side), 0.05, 20 + i), [L, i]);
  const rot = useMemo(() => new THREE.Euler(0, 0, 0, "YXZ"), []);
  rot.set(-0.15, -Math.PI / 2, 0, "YXZ");
  const show = f >= 169 && f < 225;
  const bob = 0.12 * Math.abs(Math.sin(f * 0.9 + i));
  return (
    <group visible={show} position={[leadX(f) - L.lag, bob, L.dz]} rotation={rot}>
      <group position={[-3.5 * PS, 0, -1.5 * PS]}>{mesh && <primitive object={mesh} />}</group>
    </group>
  );
};

const SHM = [0x9ad7ee, 0xffffff, 0xcfeaf6].map((c) => new THREE.MeshBasicMaterial({ color: c }));
const BILLM = [0x7be08f, 0xa7f0a0].map((c) => new THREE.MeshBasicMaterial({ color: c }));
const BEACON = [new THREE.MeshBasicMaterial({ color: 0xff2030 }), new THREE.MeshBasicMaterial({ color: 0x2a6bff })];
const SHARDS = Array.from({ length: 60 }, (_, i) => ({
  vx: 0.25 + random("sx" + i) * 0.55,
  vy: 0.15 + random("sy" + i) * 0.5,
  vz: (random("sz" + i) - 0.5) * 0.5,
  y0: 1 + random("s0" + i) * 4.5,
  z0: -300 + (random("s1" + i) - 0.5) * 7,
  s: 0.12 + random("s2" + i) * 0.22,
}));
const BILLS = Array.from({ length: 46 }, (_, i) => ({
  vx: 0.1 + random("bx" + i) * 0.3,
  vy: 0.1 + random("by" + i) * 0.25,
  vz: (random("bz" + i) - 0.5) * 0.25,
  z0: -300 + (random("b1" + i) - 0.5) * 3,
}));
const Heist: React.FC<{ f: number }> = ({ f }) => {
  if (f < 169 || f >= 225) return null;
  const t = f - 169;
  const bi = Math.floor(f / 5) % 2;
  return (
    <>
      <mesh geometry={BOX} material={BEACON[bi]} position={[-19, 14.5, -308.5]} scale={[1, 1, 1]} />
      <mesh geometry={BOX} material={BEACON[1 - bi]} position={[-19, 14.5, -291.5]} scale={[1, 1, 1]} />
      {SHARDS.map((s, i) => {
        const y = Math.max(0.08, s.y0 + s.vy * t - 0.015 * t * t);
        return (
          <mesh key={"s" + i} geometry={BOX} material={SHM[i % 3]} position={[-20 + s.vx * 40 * (1 - Math.exp(-t / 40)), y, s.z0 + s.vz * t]} rotation={[t * 0.2 + i, t * 0.3, 0]} scale={[s.s, s.s * 0.5, s.s]} />
        );
      })}
      {BILLS.map((s, i) => {
        const tt = f - (169 + i * 0.8);
        if (tt < 0) return null;
        const y = Math.max(0.1, 2 + s.vy * tt - 0.004 * tt * tt + 0.15 * Math.sin(tt * 0.4 + i));
        return (
          <mesh key={"b" + i} geometry={BOX} material={BILLM[i % 2]} position={[-19 + s.vx * tt * 1.5, y, s.z0 + s.vz * tt + 0.8 * Math.sin(tt * 0.15 + i)]} rotation={[tt * 0.25, tt * 0.17 + i, tt * 0.3]} scale={[0.5, 0.05, 0.26]} />
        );
      })}
    </>
  );
};

const Heli: React.FC<{ f: number; hp: V3; target: V3 }> = ({ f, hp, target }) => {
  const mesh = useMemo(() => toMesh(buildHeli(), 0.05, 30), []);
  const show = f >= 225 && f < 338;
  const beam = f >= 225 && f < 295;
  const pool = f >= 225 && f < 281;
  const dir = new THREE.Vector3(hp[0] - target[0], hp[1] - target[1], hp[2] - target[2]);
  const len = dir.length();
  dir.normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  return (
    <>
      <group visible={show} position={hp} rotation={[0, 0, 0.08 * Math.sin(f * 0.12)]}>
        <group position={[-6.5 * 0.35, 0, -9 * 0.35]}>{mesh && <primitive object={mesh} />}</group>
        <mesh position={[0, 4.5, -0.5]} rotation={[0, f * 1.1, 0]} scale={[11, 0.06, 0.3]} geometry={BOX}>
          <meshBasicMaterial color={0x20202a} />
        </mesh>
        <mesh position={[0, 4.5, -0.5]} rotation={[0, f * 1.1 + Math.PI / 2, 0]} scale={[11, 0.06, 0.3]} geometry={BOX}>
          <meshBasicMaterial color={0x20202a} />
        </mesh>
      </group>
      <mesh visible={beam} position={[(hp[0] + target[0]) / 2, (hp[1] + target[1]) / 2, (hp[2] + target[2]) / 2]} quaternion={q}>
        <coneGeometry args={[2.4, len, 20, 1, true]} />
        <meshBasicMaterial color={0xfff0b8} transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} fog={false} />
      </mesh>
      <mesh visible={pool} position={[target[0], 0.14, target[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.5, 24]} />
        <meshBasicMaterial color={0xfff4c8} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
      </mesh>
    </>
  );
};

const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const { camera } = useThree();
  const world = useMemo(buildWorld, []);
  const bank = useMemo(buildBank, []);
  const skyGeo = useMemo(buildSkyGeo, []);
  const skyMat = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false }), []);
  const c = cam(f);
  const amp = 0.03 + 0.05 * pulse(f, 3) + (f >= 338 ? 0.6 * Math.exp(-(f - 338) / 4) : 0);
  const sx = (random("sx" + f) - 0.5) * amp, sy = (random("sy" + f) - 0.5) * amp;
  const pc = camera as THREE.PerspectiveCamera;
  pc.position.set(c.pos[0] + sx, c.pos[1] + sy, c.pos[2]);
  pc.lookAt(c.look[0], c.look[1], c.look[2]);
  pc.rotateZ(c.roll);
  pc.fov = c.fov - 2.5 * pulse(f, 3.5);
  pc.near = 0.1;
  pc.far = 4000;
  pc.updateProjectionMatrix();

  const h = hero(f);
  const heist = f >= 169 && f < 225;
  const hp: V3 = [h.x - 5 + 3 * Math.sin(f * 0.1), h.y + 7.5, h.z - 16];
  return (
    <>
      <color attach="background" args={["#ffb070"]} />
      <fog attach="fog" args={["#f7b58a", 90, 780]} />
      <ambientLight color={0xffd9b8} intensity={0.7} />
      <hemisphereLight args={[0xffc9a0, 0x8a5a7a, 1.1]} />
      <directionalLight position={[-30, 120, -300]} color={0xffb878} intensity={2.6} />
      <directionalLight position={[80, 60, 120]} color={0xa9a4ff} intensity={0.9} />
      {heist && <pointLight position={[-17, 6, -298]} color={Math.floor(f / 7) % 2 ? 0xff2244 : 0x2a6bff} intensity={500 + 400 * pulse(f, 4)} distance={45} />}
      <mesh geometry={skyGeo} material={skyMat} position={c.pos} renderOrder={-10} frustumCulled={false} />
      <primitive object={world} />
      <primitive object={bank.body} />
      {f < 169 && <primitive object={bank.glass} />}
      <VCar st={h} kind="conv" body={0xff4f9a} trim={0xfff1e0} stripe leads={!heist} />
      {[0, 1, 2, 3, 4].map((i) => {
        const s = cop(f, i);
        return <VCar key={"c" + i} st={s} kind="cop" body={0x1b1b24} trim={0xf2f2f2} bars={(Math.floor(f / 3) + i) % 2} show={s.show} />;
      })}
      {CIV.map((cv, i) => {
        const s = civ(f, cv);
        return <VCar key={"v" + i} st={s} kind="sedan" body={cv.col} trim={0xfff4e2} show={s.show} />;
      })}
      <Lead f={f} i={0} />
      <Lead f={f} i={1} />
      <Heist f={f} />
      <Heli f={f} hp={hp} target={[h.x, h.y + 0.8, h.z - 3]} />
    </>
  );
};

// ------------------------------------------------------------ text + overlays
const FONT = "Archivo, sans-serif";
const Line: React.FC<{ f: number; a: number; b: number; t: string; size: number; color: string }> = ({ f, a, b, t, size, color }) => {
  if (f < a || f > b + 9) return null;
  const p = E_O(seg(f, a, a + 9));
  const q = Easing.in(Easing.cubic)(seg(f, b, b + 8));
  return (
    <div style={{ overflow: "hidden", lineHeight: 1, padding: `${size * 0.04}px ${size * 0.06}px` }}>
      <div
        style={{
          transform: `translateY(${(1 - p) * 110 - q * 110}%) skewX(${-10 * (1 - p)}deg)`,
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: size,
          color,
          letterSpacing: -3,
          whiteSpace: "nowrap",
          textShadow: "0 6px 0 rgba(120,20,60,0.55), 0 0 40px rgba(0,0,0,0.35)",
        }}
      >
        {t}
      </div>
    </div>
  );
};

const FLASH = [SH[1], SH[2], SH[3], SH[4], SH[5], 295, 338];
export const Trailer: React.FC = () => {
  const f = useCurrentFrame();
  let flash = 0;
  for (const c of FLASH) if (f >= c) flash = Math.max(flash, (c === 338 ? 0.85 : 0.4) * Math.exp(-(f - c) / 2.5));
  const whip = f >= 236 && f < 248 ? Math.sin(((f - 236) / 12) * Math.PI) : 0;
  const tp = (i: number) => Easing.out(Easing.back(2))(seg(f, 338 + i * 0.4, 342 + i * 0.4));
  const cn = seg(f, 341, 345);
  const hit = f >= 345 ? 1 + 0.03 * pulse(f, 4) : 1;
  return (
    <AbsoluteFill style={{ background: "#ffb070" }}>
      <ThreeCanvas width={1920} height={1080} flat camera={{ fov: 42, near: 0.1, far: 4000, position: [0, 5, 10] }}>
        <Scene />
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(255,120,80,0.10), rgba(60,0,80,0.20))", pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(40,0,40,0.5) 100%)", pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: `rgba(255,190,120,${0.1 * pulse(f, 3)})`, mixBlendMode: "screen", pointerEvents: "none" }} />
      {whip > 0 && <AbsoluteFill style={{ backdropFilter: `blur(${whip * 7}px)`, background: `linear-gradient(90deg, transparent, rgba(255,255,255,${0.25 * whip}), transparent)` }} />}
      <AbsoluteFill style={{ background: `rgba(255,244,225,${flash})`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: 110, bottom: 130 }}>
        <Line f={f} a={14} b={98} t="ONE CITY." size={150} color="#fff5e1" />
        <Line f={f} a={42} b={98} t="TWO DEBTS." size={150} color="#ff6fa5" />
      </div>
      {f >= 338 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 250, textAlign: "center", transform: `scale(${hit})` }}>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 285, lineHeight: 0.95, color: "#fff5e1", letterSpacing: 6, whiteSpace: "nowrap" }}>
            {"SUNBURN".split("").map((ch, i) => {
              const p = tp(i);
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    opacity: Math.min(1, p * 4),
                    transform: `translateY(${(1 - p) * -140}px) scale(${1 + (1 - p) * 1.2})`,
                    textShadow: "0 10px 0 #c2255c, 0 0 70px rgba(255,100,50,0.8), 0 16px 40px rgba(40,0,40,0.6)",
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </div>
          <div style={{ marginTop: 26, display: "inline-block", clipPath: `inset(0 ${(1 - cn) * 100}% 0 0)` }}>
            <div
              style={{
                fontFamily: FONT,
                fontWeight: 800,
                fontSize: 76,
                letterSpacing: "0.4em",
                color: "#fff5e1",
                whiteSpace: "nowrap",
                paddingLeft: "0.4em",
                textShadow: "0 4px 0 #c2255c, 0 0 30px rgba(40,0,40,0.8), 0 0 8px rgba(40,0,40,0.6)",
              }}
            >
              COMING NOVEMBER
            </div>
            <div style={{ height: 8, marginTop: 14, background: "linear-gradient(90deg,#ffd23f,#ff4f9a)" }} />
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};