/*
 SUNBURN: 13-second teaser. Everything in the 3D world is voxels.

 CONCEPT
 A sun-soaked Gulf-coast city burns from golden hour to purple dusk. Two leads
 in a teal convertible carry a duffel of stolen cash while police close in.
 They launch a raised drawbridge, the cash bursts into the sky, and the car
 drives on into the setting sun beneath the title. Sky, fog and light drift
 from gold to dusk over the 13 seconds. Every beat kicks the FOV, the sun, the
 car suspension and a warm colour leak. Bar starts hit harder.

 STORYBOARD (30 fps, beat n = round(n*14.0625))
 1.   0-55    OCEAN SKIM. Low fly-in over glittering waves, past the pier and
               Ferris wheel toward the skyline and sun. Camera rises, yaw
               swings right, Dutch roll levels out.
 2.  56-112   AVENUE DIVE. High aerial behind the convertible dropping into
               the avenue. Dutch roll straightens. Hard cut on beat 4.
 3. 113-224   CHASE ORBIT. Low rear 3/4 chase orbiting to the front quarter.
               "ONE CITY." slams in on beat 9 (127), "TWO DEBTS." on beat 11
               (155). Three police cars appear on beat 12 (169) and close in
               with red/blue spill on the frame.
 4. 225-280   LEADS + PRESSURE. Low front-quarter push-in on the two leads,
               police flashing close behind. Camera swings across, Dutch tilt
               flips.
 5. 281-337   THE JUMP (strongest moment). 281 low chase to the smooth bascule
               ramp, 295 (beat 21) orbit cut on the car leaving the ramp,
               309 (beat 22) cash bursts as the camera whips low, 323
               (beat 23) hard landing with shake.
 6. 338-389   TITLE. Chase cam behind the car, crane up, driving straight into
               the huge dusk sun on the horizon. SUNBURN slams in on beat 24
               (338), COMING NOVEMBER wipes in. Both readable from 345.
*/

import React, {useMemo} from "react";
import {AbsoluteFill, random, useCurrentFrame} from "remotion";
import {ThreeCanvas} from "@remotion/three";
import * as THREE from "three";
import {useThree} from "@react-three/fiber";

/* ------------------------------- helpers ------------------------------- */
type V3 = [number, number, number];
const BEAT = 14.0625;
const bf = (n: number) => Math.round(n * BEAT);
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sm = (t: number) => {
  const c = clamp(t);
  return c * c * (3 - 2 * c);
};
const eo = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
const seg = (f: number, a: number, b: number) => clamp((f - a) / (b - a));
const mod = (a: number, n: number) => ((a % n) + n) % n;
const mix = (a: number, b: number, t: number) => {
  const k = clamp(t);
  const ch = (s: number) => Math.round(lerp((a >> s) & 255, (b >> s) & 255, k));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};
function beat(f: number) {
  let k = Math.max(0, Math.floor(f / BEAT) - 1);
  while (bf(k + 1) <= f) k++;
  return {k, p: Math.exp(-(f - bf(k)) / 4.5) * (k % 4 === 0 ? 1 : 0.55)};
}
function pal(f: number) {
  const q = sm(f / 390);
  return {hor: mix(0xffc880, 0xff6a62, q), mid: mix(0xff9a8a, 0xb0478e, q), top: mix(0x58a8ec, 0x2a1a68, q), q};
}
type Pal = ReturnType<typeof pal>;
function skyAt(y: number, p: Pal) {
  if (y <= 0) return p.hor;
  if (y < 0.28) return mix(p.hor, p.mid, sm(y / 0.28));
  return mix(p.mid, p.top, sm((y - 0.28) / 0.72));
}

/* ----------------------------- voxel engine ----------------------------- */
type VL = number[]; // x,y,z,size,color (color >= EM => unlit/emissive)
const EM = 0x1000000;
class G {
  m = new Map<number, number>();
  constructor(public s: number, public ox: number, public oy: number, public oz: number) {}
  k(x: number, y: number, z: number) {
    return ((x + 64) * 256 + (y + 64)) * 256 + (z + 64);
  }
  set(x: number, y: number, z: number, c: number) {
    this.m.set(this.k(x, y, z), c);
  }
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: number) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.set(x, y, z, c);
  }
  out(): VL {
    const r: VL = [];
    this.m.forEach((c, key) => {
      const z = (key % 256) - 64;
      const y = (Math.floor(key / 256) % 256) - 64;
      const x = Math.floor(key / 65536) - 64;
      const h = (a: number, b: number, d: number) => this.m.has(this.k(x + a, y + b, z + d));
      if (h(1, 0, 0) && h(-1, 0, 0) && h(0, 1, 0) && h(0, -1, 0) && h(0, 0, 1) && h(0, 0, -1)) return;
      r.push((x + 0.5) * this.s + this.ox, (y + 0.5) * this.s + this.oy, (z + 0.5) * this.s + this.oz, this.s, c);
    });
    return r;
  }
}
const BOX = new THREE.BoxGeometry(1, 1, 1);
const LITM = new THREE.MeshLambertMaterial();
const EMM = new THREE.MeshBasicMaterial();
const EMNF = new THREE.MeshBasicMaterial({fog: false});
const _o = new THREE.Object3D();
const _c = new THREE.Color();
function buildMeshes(list: VL, nofog: boolean): THREE.InstancedMesh[] {
  const out: THREE.InstancedMesh[] = [];
  for (const em of [false, true]) {
    const idx: number[] = [];
    for (let i = 0; i < list.length; i += 5) if (list[i + 4] >= EM === em) idx.push(i);
    if (!idx.length) continue;
    const m = new THREE.InstancedMesh(BOX, em ? (nofog ? EMNF : EMM) : LITM, idx.length);
    idx.forEach((i, n) => {
      _o.position.set(list[i], list[i + 1], list[i + 2]);
      _o.rotation.set(0, 0, 0);
      _o.scale.setScalar(list[i + 3]);
      _o.updateMatrix();
      m.setMatrixAt(n, _o.matrix);
      m.setColorAt(n, _c.setHex(list[i + 4] & 0xffffff));
    });
    m.frustumCulled = false;
    out.push(m);
  }
  return out;
}
const Voxels: React.FC<{list: VL; nofog?: boolean}> = ({list, nofog}) => {
  const ms = useMemo(() => buildMeshes(list, !!nofog), [list, nofog]);
  return (
    <>
      {ms.map((m, i) => (
        <primitive key={i} object={m} dispose={null} />
      ))}
    </>
  );
};

/* -------------------------------- models -------------------------------- */
type Kind = "hero" | "police" | "civ";
function makeCar(kind: Kind, body: number, trim: number): VL {
  const g = new G(0.25, -1.125, 0, -2.5);
  const W = 9;
  const L = 20;
  const tire = 0x111115;
  const chrome = 0xe2e6ea;
  const glass = 0x8fd8ee;
  g.box(1, 1, 1, 7, 1, 18, 0x18181e);
  for (let z = 0; z < L; z++)
    for (let x = 0; x < W; x++) {
      if ((z === 0 || z === L - 1) && (x === 0 || x === W - 1)) continue;
      const side = x === 0 || x === W - 1;
      const bc = kind === "police" && side && z >= 8 && z <= 14 ? 0xf4f4f4 : body;
      g.set(x, 2, z, bc);
      g.set(x, 3, z, bc);
      let c = bc;
      if (kind === "hero") {
        if (z >= 9 && z <= 14) c = side ? body : 0x3a2b28;
        else if (x === 4 && (z <= 6 || z >= 15)) c = trim;
      }
      g.set(x, 4, z, c);
    }
  for (const zc of [2, 14])
    for (const xs of [0, 7])
      for (let dx = 0; dx < 2; dx++)
        for (let y = 0; y < 4; y++)
          for (let dz = 0; dz < 4; dz++) {
            if ((y === 0 || y === 3) && (dz === 0 || dz === 3)) continue;
            const outer = xs === 0 ? dx === 0 : dx === 1;
            g.set(xs + dx, y, zc + dz, outer && (y === 1 || y === 2) && (dz === 1 || dz === 2) ? chrome : tire);
          }
  for (const x of [1, 2, 6, 7]) {
    g.set(x, 3, 0, EM | 0xfff0b8);
    g.set(x, 3, L - 1, EM | 0xff2638);
  }
  g.box(3, 3, L - 1, 5, 3, L - 1, EM | 0xc0101e);
  g.box(1, 2, 0, 7, 2, 0, chrome);
  g.box(1, 2, L - 1, 7, 2, L - 1, chrome);
  if (kind === "hero") {
    for (let x = 1; x <= 7; x++) {
      g.set(x, 5, 7, glass);
      g.set(x, 6, 7, glass);
      g.set(x, 5, 6, glass);
    }
    for (const x of [0, 8]) {
      g.set(x, 5, 7, trim);
      g.set(x, 6, 7, trim);
      g.box(x, 6, 14, x, 7, 14, chrome);
    }
    g.box(0, 5, 8, 8, 5, 8, body);
    g.box(1, 5, 9, 7, 5, 9, 0x2a2024);
    g.box(1, 5, 13, 3, 7, 13, 0xf2ead8);
    g.box(5, 5, 13, 7, 7, 13, 0xf2ead8);
    g.box(2, 5, 16, 6, 6, 17, 0x1b1b21);
    g.box(3, 7, 16, 5, 7, 17, 0x58d970);
    g.set(3, 7, 16, 0xffd54a);
    g.set(5, 7, 17, 0xffd54a);
    g.box(3, 5, 18, 5, 5, 18, 0xff4f8b);
    const person = (cx: number, skin: number, hair: number, sa: number, sb: number, long: boolean) => {
      for (let x = cx - 1; x <= cx + 1; x++) {
        for (let y = 5; y <= 7; y++) for (let z = 11; z <= 12; z++) g.set(x, y, z, (x + y + z) & 1 ? sa : sb);
        for (let y = 8; y <= 10; y++) for (let z = 10; z <= 12; z++) g.set(x, y, z, skin);
        for (let z = 10; z <= 12; z++) g.set(x, 10, z, hair);
        for (let y = 8; y <= 9; y++) g.set(x, y, 12, hair);
        g.set(x, 9, 10, 0x0c0c12);
        if (long) for (let z = 13; z <= 16; z++) for (let y = 8; y <= 9; y++) g.set(x, y, z, hair);
      }
    };
    person(2, 0xc98d63, 0x1a120e, 0x12c2c9, 0xff6f91, false);
    person(6, 0xf0b894, 0xffd35a, 0xe8222e, 0xff4a55, true);
    g.box(1, 6, 9, 3, 6, 9, 0x15151a);
  } else {
    for (let x = 0; x <= 8; x++)
      for (let z = 7; z <= 15; z++)
        for (let y = 5; y <= 7; y++) {
          const edge = x === 0 || x === 8 || z === 7 || z === 15;
          if (y === 7) g.set(x, y, z, kind === "police" ? 0x15161d : trim);
          else if (edge) g.set(x, y, z, z === 7 || z === 15 ? glass : z === 11 || (x !== 0 && x !== 8) ? body : glass);
        }
  }
  return g.out();
}
function makePerson(shirt: number, pants: number, skin: number, hair: number): VL {
  const g = new G(0.14, -0.35, 0, -0.21);
  for (let y = 0; y <= 5; y++) for (const x of [0, 1, 3, 4]) for (let z = 0; z < 3; z++) g.set(x, y, z, y === 0 ? 0x222222 : pants);
  for (let y = 6; y <= 10; y++) for (let x = 0; x <= 4; x++) for (let z = 0; z < 3; z++) g.set(x, y, z, shirt);
  for (let y = 6; y <= 9; y++) {
    g.set(-1, y, 1, y >= 8 ? shirt : skin);
    g.set(5, y, 1, y >= 8 ? shirt : skin);
  }
  for (let y = 11; y <= 13; y++) for (let x = 1; x <= 3; x++) for (let z = 0; z < 3; z++) g.set(x, y, z, y === 13 ? hair : skin);
  g.set(1, 12, 0, 0x111111);
  g.set(3, 12, 0, 0x111111);
  return g.out();
}
const HERO = makeCar("hero", 0x12c9b8, 0xfff4d6);
const POLICE = makeCar("police", 0x15161d, 0xf4f4f4);
const CIVC = [0xf4f0e6, 0xffd23f, 0xff6f91, 0x7a5cff, 0xff8a3d, 0xe8e8f0];
const CIV = CIVC.map((c) => makeCar("civ", c, mix(c, 0xffffff, 0.35)));
const SHADOW: VL = (() => {
  const r: VL = [];
  for (let x = 0; x < 9; x++) for (let z = 0; z < 20; z++) r.push((x + 0.5) * 0.25 - 1.125, 0, (z + 0.5) * 0.25 - 2.5, 0.25, 0x1d1626);
  return r;
})();
const SHIRTS = [0xff4f8b, 0xffd23f, 0x2ec4b6, 0xffffff, 0x7a5cff, 0xff7a2f];
const PANTS = [0x2b3a67, 0xf2e6d0, 0x1b1b1f, 0x3a6ea5];
const SKINS = [0xf1c27d, 0xc68642, 0x8d5524, 0xffdbac];
const HAIRS = [0x111111, 0x4a2f1b, 0xffd35a, 0xb5472b];
const PERSONS = [0, 1, 2, 3, 4, 5].map((i) => makePerson(SHIRTS[i], PANTS[i % 4], SKINS[(i * 3) % 4], HAIRS[(i * 5) % 4]));

/* --------------------------------- world -------------------------------- */
const ZT = 60;
const ZB = -345;
const WORLD: VL = (() => {
  const W: VL = [];
  const put = (x: number, y: number, z: number, s: number, c: number) => {
    W.push(x, y, z, s, c);
  };
  const canal = (z: number) => z < -189 && z > -231;
  const ramp = (z: number) => z < -169 && z > -234;
  // ground
  for (let z = ZT - 1; z > ZB; z -= 2) {
    if (canal(z)) continue;
    for (let x = -40; x <= 34; x += 2) {
      const r = random(`g${x}_${z}`);
      let c: number;
      if (x <= -40) c = 0xd8bb82;
      else if (x <= -14) c = r < 0.5 ? 0xf4ddaa : 0xecca92;
      else if (x <= -10) c = ((x + z) / 2) & 1 ? 0xeab8b0 : 0xf3d0c2;
      else if (x <= 8) c = r < 0.33 ? 0x353540 : r < 0.66 ? 0x3b3b47 : 0x32323d;
      else if (x <= 12) c = r < 0.5 ? 0xdccbb8 : 0xd2bfab;
      else c = r < 0.5 ? 0xc9b39c : 0xbfa890;
      put(x, -1, z, 2, c);
    }
  }
  // canal water
  for (let z = -191; z > -232; z -= 2)
    for (let x = -40; x <= 34; x += 2) put(x, -1.4, z, 2, random(`cw${x}_${z}`) < 0.5 ? 0x2fb6c4 : 0x3fc6d0);
  // road markings
  for (let z = ZT - 0.25; z > ZB; z -= 0.5) {
    if (ramp(z)) continue;
    put(-0.5, -0.2, z, 0.5, 0xf6c945);
    put(0.5, -0.2, z, 0.5, 0xf6c945);
  }
  for (let z = ZT; z > ZB; z -= 7)
    for (let d = 0; d < 6; d++) {
      const zz = z - 0.25 - d * 0.5;
      if (ramp(zz)) continue;
      put(-4.5, -0.2, zz, 0.5, 0xf5f5f5);
      put(4.5, -0.2, zz, 0.5, 0xf5f5f5);
    }
  for (const cz of [30, -120])
    for (let x = -7; x <= 7; x += 2) for (let k = 0; k < 3; k++) put(x, -0.45, cz - k, 1, 0xf5f5f5);
  // street lamps
  for (let z = 50; z > ZB + 10; z -= 26) {
    if (z < -160 && z > -240) continue;
    for (const x of [-10.5, 10.5]) {
      const d = x < 0 ? 1 : -1;
      for (let t = 0; t < 12; t++) put(x, 0.25 + t * 0.5, z, 0.5, 0x3b3b48);
      for (let a = 1; a <= 3; a++) put(x + d * 0.5 * a, 5.75, z, 0.5, 0x3b3b48);
      put(x + d * 2, 5.5, z, 0.5, EM | 0xfff0c0);
      put(x + d * 2, 5.5, z + 0.5, 0.5, EM | 0xfff0c0);
    }
  }
  // palms
  const palm = (x: number, z: number, sd: number) => {
    const r = (k: string) => random(`p${sd}${k}`);
    const lean = (r("l") - 0.5) * 3;
    const a0 = r("a") * 6.28;
    const H = 14 + Math.floor(r("h") * 6);
    let tx = x;
    let tz = z;
    for (let j = 0; j < H; j++) {
      const t = j / H;
      tx = x + Math.round((Math.cos(a0) * lean * t * t) / 0.5) * 0.5;
      tz = z + Math.round((Math.sin(a0) * lean * t * t) / 0.5) * 0.5;
      put(tx, (j + 0.5) * 0.5, tz, 0.5, j % 2 ? 0x8a6a4a : 0x765a3e);
    }
    const top = H * 0.5;
    for (let fr = 0; fr < 7; fr++) {
      const a = a0 + fr * 0.8976 + r("f" + fr) * 0.3;
      for (let t = 1; t <= 9; t++) {
        const d = t * 0.5;
        const fx = tx + Math.round((Math.cos(a) * d) / 0.5) * 0.5;
        const fz = tz + Math.round((Math.sin(a) * d) / 0.5) * 0.5;
        const fy = top + 0.25 + Math.round((1.3 * Math.sin(t * 0.33) - 0.09 * t) / 0.5) * 0.5;
        const c = mix(0x2f9e44, 0x86e05a, t / 9);
        put(fx, fy, fz, 0.5, c);
        if (t % 2 === 1 && t > 1) {
          const sx = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? 0 : 0.5;
          put(fx + sx, fy, fz + 0.5 - sx, 0.5, mix(c, 0x1f7a34, 0.4));
          put(fx - sx, fy, fz - 0.5 + sx, 0.5, mix(c, 0x1f7a34, 0.4));
        }
      }
    }
    put(tx + 0.5, top - 0.25, tz, 0.5, 0x5a3a22);
    put(tx - 0.5, top - 0.25, tz, 0.5, 0x5a3a22);
    put(tx, top - 0.25, tz + 0.5, 0.5, 0x5a3a22);
  };
  {
    let n = 0;
    for (let z = 54; z > ZB + 10; z -= 18) {
      if (z < -172 && z > -238) continue;
      palm(-13.5, z, n++);
    }
  }
  // umbrellas
  const umbrella = (x: number, z: number, c1: number, c2: number) => {
    for (let t = 0; t < 8; t++) put(x, 0.25 + t * 0.5, z, 0.5, 0xe8e0d0);
    for (let i = -3; i <= 3; i++)
      for (let k = -3; k <= 3; k++) {
        const d = Math.hypot(i, k);
        if (d > 3.2) continue;
        const a = Math.floor((Math.atan2(k, i) + Math.PI) / (Math.PI / 4));
        put(x + i * 0.5, d > 2 ? 4.25 : 4.75, z + k * 0.5, 0.5, a % 2 ? c1 : c2);
      }
    for (let i = 2; i <= 4; i++) for (let k = -2; k <= 3; k++) put(x + i * 0.5 + 1, 0.25, z + k * 0.5, 0.5, (i + k) & 1 ? 0xff6f91 : 0xffffff);
  };
  [[-24, 50], [-30, 38], [-26, 10], [-33, -14], [-22, -70], [-30, -100], [-25, -130], [-32, -160], [-24, -250], [-30, -290]].forEach((p, i) =>
    umbrella(p[0], p[1], [0xff4d6d, 0x19b5a5, 0xffb703][i % 3], 0xfff2e6)
  );
  // pier
  for (let i = 0; i < 60; i++)
    for (let k = 0; k < 5; k++) put(-42.5 - i, 1.5, -47 + k, 1, i & 1 ? 0xb98a5a : 0xa87b4d);
  for (let i = 0; i < 60; i += 4)
    for (const zz of [-47, -43]) for (const y of [0.5, -0.5, -1.5]) put(-42.5 - i, y, zz, 1, 0x6b5240);
  for (let i = 0; i < 120; i++)
    for (const zz of [-47.75, -42.25]) put(-42.25 - i * 0.5, 2.25, zz, 0.5, 0xf2eadc);
  for (let i = 4; i < 60; i += 8)
    for (const zz of [-47.75, -42.25]) {
      put(-42.5 - i, 2.75, zz, 0.5, 0x3b3b48);
      put(-42.5 - i, 3.25, zz, 0.5, EM | 0xfff0c0);
    }
  // ferris wheel legs
  for (const sg of [-1, 1])
    for (const zz of [-46, -44])
      for (let t = 0; t <= 1; t += 1 / 26) {
        const x = -92 + Math.round((sg * 9 * t) / 0.5) * 0.5;
        const y = 15 - Math.round((12.5 * t) / 0.5) * 0.5;
        put(x, y, zz, 0.5, 0x8a9bb5);
        put(x + 0.5, y, zz, 0.5, 0x8a9bb5);
      }
  // low-rise buildings (right side)
  const PASTEL = [0xff9fb8, 0x86e3d4, 0xfff0c9, 0xffb98a, 0x95cdfd, 0xf7e98e, 0xd4a5ff];
  {
    let zc = ZT - 4;
    let n = 0;
    while (zc > -330) {
      const id = n++;
      const r = (k: number) => random(`lr${id}-${k}`);
      const nx = 9 + Math.floor(r(1) * 4);
      const nz = 11 + Math.floor(r(2) * 4);
      const ny = 8 + Math.floor(r(3) * 9);
      const z0 = zc - nz;
      const wall = PASTEL[Math.floor(r(4) * 7)];
      const awn = [0xff4d6d, 0x19b5a5, 0xffb703][Math.floor(r(5) * 3)];
      const neon = r(6) < 0.5 ? 0xff3fd0 : 0x35f0ff;
      if (!(zc > -236 && z0 < -186)) {
        const win = (j: number, a: number, b: number) => (random(`w${id}-${j}-${a}-${b}`) < 0.22 ? EM | 0xffd08a : 0x27384f);
        for (let j = 0; j < ny - 1; j++)
          for (let k = 0; k < nz; k++) {
            let c: number;
            if (j <= 1) c = k % 3 === 1 ? EM | 0xffd9a0 : 0x22303f;
            else if (j === 2) c = k % 2 ? awn : 0xfff2e6;
            else if (j === 4 && k > 0 && k < nz - 1) c = EM | neon;
            else if (j % 3 === 0 && k % 2 === 1) c = win(j, 0, k);
            else c = k % 4 === 0 ? 0xfff4e0 : wall;
            put(13.5, j + 0.5, z0 + k + 0.5, 1, c);
            if (j === 2) put(12.5, 2.5, z0 + k + 0.5, 1, k % 2 ? awn : 0xfff2e6);
          }
        for (let i = 1; i < nx; i++)
          for (let j = 0; j < ny - 1; j++)
            for (const k of [0, nz - 1]) put(13.5 + i, j + 0.5, z0 + k + 0.5, 1, j >= 3 && j % 3 === 0 && i % 2 === 1 ? win(j, i, k) : wall);
        for (let i = 0; i < nx; i++)
          for (let k = 0; k < nz; k++) put(13.5 + i, ny - 0.5, z0 + k + 0.5, 1, i === 0 || k === 0 || k === nz - 1 ? 0xfff4e0 : 0x7d7480);
        for (let a = 0; a < 3; a++) {
          const rx = 14 + 1 + Math.floor(r(10 + a) * (nx - 4));
          const rz = z0 + 1 + Math.floor(r(20 + a) * (nz - 4));
          for (let i = 0; i < 2; i++) for (let k = 0; k < 2; k++) put(rx + i + 0.5, ny + 0.5, rz + k + 0.5, 1, 0x9a97a6);
        }
        for (let t = 0; t < 5; t++) put(13.5 + nx / 2, ny + 0.5 + t, z0 + nz / 2, 1, t === 4 ? EM | 0xff2a2a : 0x555560);
      }
      zc = z0 - 2 - Math.floor(r(9) * 3);
    }
  }
  // glass towers behind
  {
    let zc = ZT - 8;
    let n = 0;
    while (zc > -330) {
      const id = n++;
      const r = (k: number) => random(`tw${id}-${k}`);
      const s = 2;
      const nx = 7 + Math.floor(r(1) * 3);
      const nz = 7 + Math.floor(r(2) * 3);
      const ny = 14 + Math.floor(r(3) * 14);
      const x0 = 36 + r(7) * 10;
      const z0 = zc - nz * s;
      const tint = [0x7fd0ee, 0xa6b8ff, 0xffa89a, 0x8ee8c8][Math.floor(r(4) * 4)];
      if (!(zc > -236 && z0 < -186)) {
        const col = (i: number, j: number, k: number) => {
          if (j % 4 === 0) return 0xece4d8;
          if ((i === 0 ? k : i) % 3 === 0) return 0xd9d0c6;
          if (random(`tl${id}-${i}-${j}-${k}`) < 0.2) return EM | 0xffe0a4;
          return mix(tint, 0xff9f70, (j / ny) * 0.9);
        };
        for (let j = 0; j < ny - 1; j++) {
          for (let k = 0; k < nz; k++) put(x0 + 1, (j + 0.5) * s, z0 + (k + 0.5) * s, s, col(0, j, k));
          for (let i = 1; i < nx; i++) for (const k of [0, nz - 1]) put(x0 + (i + 0.5) * s, (j + 0.5) * s, z0 + (k + 0.5) * s, s, col(i, j, k));
        }
        for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) put(x0 + (i + 0.5) * s, (ny - 0.5) * s, z0 + (k + 0.5) * s, s, 0xe8dfd2);
        for (let t = 0; t < 7; t++) put(x0 + nx, ny * s + t + 0.5, z0 + nz, 1, t > 5 ? EM | 0xff3050 : 0xffffff);
      }
      zc = z0 - 14 - Math.floor(r(8) * 10);
    }
  }
  // bascule ramp (z -170 .. -190, rises smoothly to 4.5), fine 0.25 voxels
  {
    const RS = 0.25;
    const NZ = 80;
    for (let zi = 0; zi < NZ; zi++) {
      const z = -170 - (zi + 0.5) * RS;
      const top = Math.round((((zi + 0.5) / NZ) * 4.5) / RS) * RS;
      for (let xi = 0; xi < 64; xi++) {
        const x = -8 + (xi + 0.5) * RS;
        const edge = xi < 4 || xi > 59;
        const line = xi === 29 || xi === 30 || xi === 33 || xi === 34;
        const c = edge
          ? Math.floor(zi / 4) & 1
            ? 0xf6c945
            : 0x25252d
          : line
          ? 0xf6c945
          : zi % 28 < 2
          ? 0xf5f5f5
          : (xi + zi) % 7 === 0
          ? 0x3b3b47
          : 0x34343f;
        put(x, top - RS / 2, z, RS, c);
        put(x, top - RS * 1.5, z, RS, 0x2a2a33);
        if ((xi === 0 || xi === 63) && zi % 10 === 0) put(x, top + RS / 2, z, RS, EM | 0xffb020);
        if ((xi === 1 || xi === 62) && zi % 8 === 0) for (let y = top - RS * 2.5; y > 0; y -= RS) put(x, y, z, RS, 0x6b6b78);
      }
    }
  }
  for (const x of [-11, 11]) {
    for (let i = 0; i < 3; i++)
      for (let k = 0; k < 3; k++)
        for (let j = 0; j < 18; j++) if (!(i === 1 && k === 1)) put(x + i - 1, j + 0.5, -186 + k - 1, 1, j % 4 === 3 ? 0xf6c945 : 0xd9d4cc);
    put(x, 18.5, -186, 1, EM | 0xff2a2a);
  }
  return W;
})();

const SUN: VL = (() => {
  const r: VL = [];
  for (let i = -14; i <= 14; i++)
    for (let j = -14; j <= 14; j++) {
      const d = Math.hypot(i, j);
      if (d <= 11.5) {
        if (j < -1 && (j + 14) % 4 === 0) continue;
        r.push(i * 4, j * 4, 0, 4, EM | mix(0xfff2a0, 0xff5a4a, (11.5 - j) / 23));
      } else if (d < 20 && random(`sh${i}_${j}`) < (1 - (d - 11.5) / 8.5) * 0.5) r.push(i * 4, j * 4, 0, 4, EM | 0xffc27a);
    }
  return r;
})();
const CLOUDS: VL = (() => {
  const r: VL = [];
  for (let n = 0; n < 22; n++) {
    const q = (k: string) => random(`cl${n}${k}`);
    const cx = -400 + q("x") * 800;
    const cz = -300 - q("z") * 400;
    const cy = 60 + q("y") * 50;
    for (let i = -4; i <= 4; i++)
      for (let k = -2; k <= 2; k++)
        for (let j = 0; j <= 1; j++) {
          if (random(`cc${n}_${i}_${k}_${j}`) > 1.15 - Math.hypot(i / 4, k / 2)) continue;
          r.push(cx + i * 9, cy + j * 6, cz + k * 9, 9, EM | (j === 0 ? 0xe98fa8 : 0xffc2b0));
        }
  }
  return r;
})();
const WHEEL: VL = (() => {
  const r: VL = [];
  const seen = new Set<string>();
  const add = (x: number, y: number, z: number, c: number, s = 0.5) => {
    const k = `${x}_${y}_${z}`;
    if (seen.has(k)) return;
    seen.add(k);
    r.push(x, y, z, s, c);
  };
  for (let a = 0; a < 360; a++) {
    const th = (a * Math.PI) / 180;
    const x = Math.round((12 * Math.cos(th)) / 0.5) * 0.5;
    const y = Math.round((12 * Math.sin(th)) / 0.5) * 0.5;
    for (const z of [-0.25, 0.25]) add(x, y, z, a % 24 === 0 ? EM | 0xffe27a : 0xf3efe6);
  }
  for (let k = 0; k < 12; k++) {
    const th = (k * Math.PI) / 6;
    for (let q = 0.5; q < 11.6; q += 0.5) add(Math.round((q * Math.cos(th)) / 0.5) * 0.5, Math.round((q * Math.sin(th)) / 0.5) * 0.5, 0, 0xd8d2c8);
    const gc = [0xff3d86, 0x35f0ff, 0xffd23f, 0x7a5cff][k % 4];
    r.push(12.4 * Math.cos(th), 12.4 * Math.sin(th), 0, 1.4, EM | gc);
  }
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) add(i * 0.5, j * 0.5, k * 0.5, 0xff4f8b);
  return r;
})();

/* ------------------------------ water + sky ------------------------------ */
const NWX = 42;
const NWZ = 96;
const NW = NWX * NWZ;
const Water: React.FC<{f: number}> = ({f}) => {
  const m = useMemo(() => {
    const mm = new THREE.InstancedMesh(BOX, LITM, NW);
    for (let i = 0; i < NW; i++) mm.setColorAt(i, _c.setHex(mix(0x3fd6c9, 0x14659e, (i % NWX) / 22)));
    mm.frustumCulled = false;
    return mm;
  }, []);
  const a = m.instanceMatrix.array as Float32Array;
  for (let i = 0; i < NW; i++) {
    const x = -43 - 4 * (i % NWX);
    const z = 58 - 4 * Math.floor(i / NWX);
    const w = (Math.sin(x * 0.11 + z * 0.15 - f * 0.24) + Math.sin(x * 0.19 - z * 0.07 + f * 0.17)) * 0.5;
    const o = i * 16;
    a[o] = 4;
    a[o + 5] = 4;
    a[o + 10] = 4;
    a[o + 12] = x;
    a[o + 13] = -2.4 + w * 0.18;
    a[o + 14] = z;
    a[o + 15] = 1;
  }
  m.instanceMatrix.needsUpdate = true;
  return <primitive object={m} dispose={null} />;
};
const GN = 150;
const Glitter: React.FC<{f: number}> = ({f}) => {
  const m = useMemo(() => {
    const mm = new THREE.InstancedMesh(BOX, EMNF, GN);
    for (let i = 0; i < GN; i++) mm.setColorAt(i, _c.setHex(i % 3 ? 0xfff0c0 : 0xffffff));
    mm.frustumCulled = false;
    return mm;
  }, []);
  const fl = Math.floor(f / 2);
  const cz = 70 - 2.7 * f;
  for (let i = 0; i < GN; i++) {
    const sc = 0.3 + 0.8 * random(`gs${i}_${f}`);
    _o.position.set(-46 - random(`gx${i}_${fl}`) * 55, -0.15, cz - 6 - random(`gz${i}_${fl}`) * 110);
    _o.rotation.set(0, 0, 0);
    _o.scale.set(sc * 1.8, 0.08, sc * 0.6);
    _o.updateMatrix();
    m.setMatrixAt(i, _o.matrix);
  }
  m.instanceMatrix.needsUpdate = true;
  return <primitive object={m} dispose={null} />;
};
const SkyDome: React.FC<{pos: V3; P: Pal}> = ({pos, P}) => {
  const g = useMemo(() => {
    const s = new THREE.SphereGeometry(1500, 24, 16);
    s.setAttribute("color", new THREE.BufferAttribute(new Float32Array(s.attributes.position.count * 3), 3));
    return s;
  }, []);
  const pa = g.attributes.position;
  const ca = g.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < pa.count; i++) {
    const y = pa.getY(i) / 1500;
    const z = pa.getZ(i) / 1500;
    const glow = Math.pow(Math.max(0, -z), 2) * Math.max(0, 1 - Math.abs(y) * 5);
    _c.setHex(mix(skyAt(y, P), 0xffd9a0, glow * 0.7));
    ca.setXYZ(i, _c.r, _c.g, _c.b);
  }
  ca.needsUpdate = true;
  return (
    <mesh geometry={g} position={pos} renderOrder={-1}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} depthWrite={false} fog={false} />
    </mesh>
  );
};
const Slab: React.FC<{p: V3; s: V3; c: number}> = ({p, s, c}) => (
  <mesh position={p} scale={s}>
    <boxGeometry args={[1, 1, 1]} />
    <meshBasicMaterial color={c} />
  </mesh>
);

/* ------------------------------ vehicles etc ----------------------------- */
const REDON = new THREE.MeshBasicMaterial({color: 0xff2030});
const REDOFF = new THREE.MeshBasicMaterial({color: 0x3a0c14});
const BLUON = new THREE.MeshBasicMaterial({color: 0x2a6bff});
const BLUOFF = new THREE.MeshBasicMaterial({color: 0x0c1438});
const HALR = new THREE.MeshBasicMaterial({color: 0xff2030, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, fog: false});
const HALB = new THREE.MeshBasicMaterial({color: 0x2a6bff, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, fog: false});
type CarP = {list: VL; x: number; y?: number; z: number; yaw?: number; rx?: number; rz?: number; sy?: number; bar?: number};
const Car: React.FC<CarP> = ({list, x, y = 0, z, yaw = 0, rx = 0, rz = 0, sy = 1, bar}) => (
  <group position={[x, y, z]} rotation={[rx, yaw, rz, "YXZ"]} scale={[1, sy, 1]}>
    <Voxels list={list} />
    {bar !== undefined && (
      <>
        <mesh geometry={BOX} material={bar ? REDON : REDOFF} position={[-0.38, 2.15, 0.1]} scale={[0.7, 0.35, 0.5]} />
        <mesh geometry={BOX} material={bar ? BLUOFF : BLUON} position={[0.38, 2.15, 0.1]} scale={[0.7, 0.35, 0.5]} />
        <mesh geometry={BOX} material={bar ? HALR : HALB} position={[bar ? -0.38 : 0.38, 2.3, 0.1]} scale={[1.9, 1.3, 1.5]} />
      </>
    )}
  </group>
);

/* ------------------------------ animation state -------------------------- */
function heroZ(f: number) {
  if (f < 113) return 20 - 1.7 * (f - 56);
  if (f < 225) return 40 - 1.5 * (f - 113);
  if (f < 281) return -1.7 * (f - 225);
  if (f < 338) return -190 - 2 * (f - 295);
  return -276 - 0.9 * (f - 338);
}
function heroX(f: number) {
  if (f < 113) return -3;
  if (f < 225) return -2 + 2.2 * Math.sin(f * 0.08);
  if (f < 281) return -3 + Math.sin(f * 0.1);
  if (f < 338) return 0;
  return -1.5 + 0.9 * Math.sin((f - 338) * 0.07);
}
function hero(f: number) {
  const z = heroZ(f);
  const x = heroX(f);
  const yaw = -Math.atan2(heroX(f + 1) - x, 1.6);
  let y = 0;
  let rx = 0;
  let rz = 0;
  if (f < 295) {
    if (z < -170 && f >= 281) {
      const u = clamp((-170 - z) / 20);
      y = u * 4.5;
      rx = 0.22 * clamp(u * 6);
    }
  } else if (f < 323) {
    const t = f - 295;
    y = Math.max(0, 4.5 + 0.96 * t - 0.04 * t * t);
    rx = Math.atan2(0.96 - 0.08 * t, 2) * 0.85 * (1 - sm(seg(t, 20, 28)));
    rz = 0.2 * Math.sin(t * 0.25) * (1 - sm(seg(t, 18, 28)));
  } else if (f < 345) {
    const d = f - 323;
    y = 0.4 * Math.exp(-d / 2.5) * Math.abs(Math.sin(d * 0.8));
    rx = 0.1 * Math.exp(-d / 3) * Math.sin(d * 0.9);
  }
  return {x, y, z, rx, rz, yaw};
}
function police(f: number): {x: number; z: number}[] {
  const hz = heroZ(f);
  if (f >= 169 && f < 225) {
    const u = eo(seg(f, 169, 224));
    return [
      {x: -3 + Math.sin(f * 0.12) * 1.5, z: hz + lerp(80, 18, u)},
      {x: 2.5, z: hz + lerp(105, 30, u)},
      {x: -0.5, z: hz + lerp(130, 45, u)},
    ];
  }
  if (f >= 225 && f < 281) return [{x: -7, z: hz + 8}, {x: 1.5, z: hz + 11}, {x: -3, z: hz + 22}];
  if (f >= 281 && f < 338) {
    const off = [12, 17, 23];
    const xs = [-3, 2, -6];
    return off.map((o, i) => ({x: xs[i], z: Math.max(hz + o, -168 + i * 6)}));
  }
  return [];
}
function cam(f: number, p: number): {p: V3; t: V3; roll: number; fov: number} {
  const h = hero(f);
  let pos: V3;
  let tg: V3;
  let roll = 0;
  let fov = 50;
  if (f < 56) {
    const u = f / 55;
    pos = [lerp(-64, -44, sm(u)), lerp(2.2, 6.5, u * u), 70 - 2.7 * f];
    tg = [lerp(-52, -4, sm(u)), lerp(7, 10, u), pos[2] - 110];
    roll = lerp(0.1, 0, u);
    fov = lerp(60, 52, u);
  } else if (f < 113) {
    const u = seg(f, 56, 112);
    const e = eo(u);
    pos = [lerp(8, 0, e), lerp(30, 3.6, e), h.z + lerp(34, 10, e)];
    tg = [h.x, lerp(0, 1.2, u), h.z - 4];
    roll = lerp(0.22, 0, e);
    fov = lerp(48, 56, u);
  } else if (f < 225) {
    const u = seg(f, 113, 224);
    const th = lerp(0.45, 3.0, sm(u));
    const R = lerp(7.5, 6.5, u);
    pos = [h.x + Math.sin(th) * R, lerp(1.3, 1.9, u), h.z + Math.cos(th) * R];
    tg = [h.x, 1.1, h.z - 2];
    roll = 0.06 * Math.sin(u * Math.PI);
    fov = 52;
  } else if (f < 281) {
    const u = seg(f, 225, 280);
    pos = [h.x + lerp(5.5, -4, sm(u)), lerp(1.0, 2.2, u), h.z + lerp(-8, -5.5, u)];
    tg = [h.x, 1.8, h.z + 4];
    roll = lerp(-0.14, 0.14, sm(u));
    fov = lerp(58, 44, u);
  } else if (f < 295) {
    const u = seg(f, 281, 294);
    pos = [h.x + lerp(3.5, 2, u), lerp(1.2, 2.0, u) + h.y * 0.5, h.z + lerp(9, 7.5, u)];
    tg = [h.x, 1.6 + h.y * 0.6, h.z - 8];
    roll = lerp(0.08, 0, u);
    fov = lerp(60, 66, u);
  } else if (f < 338) {
    const th = f < 309 ? lerp(0.25, 1.7, sm((f - 295) / 14)) : f < 323 ? lerp(1.7, 2.9, sm((f - 309) / 14)) : lerp(2.9, 3.4, seg(f, 323, 337));
    const R = f < 309 ? 9 : f < 323 ? lerp(9, 7, sm(seg(f, 309, 323))) : lerp(7, 8.5, seg(f, 323, 337));
    const hh = f < 323 ? lerp(1.8, 0.7, sm(seg(f, 295, 315))) : lerp(0.7, 1.5, seg(f, 323, 337));
    pos = [h.x + Math.sin(th) * R, Math.max(0.9, h.y * 0.65 + hh), h.z + Math.cos(th) * R];
    tg = [h.x, h.y + 1.0, h.z];
    fov = 52 + (f >= 309 ? 10 * Math.exp(-(f - 309) / 5) : 0);
    roll = 0.12 * Math.sin(clamp((f - 295) / 28) * Math.PI);
  } else {
    const u = seg(f, 338, 389);
    pos = [h.x * 0.5 + lerp(-2.5, 0, sm(u)), lerp(3.2, 6.5, sm(u)), h.z + lerp(18, 26, u)];
    const pitch = lerp(0.1, 0.12, sm(u));
    tg = [pos[0] - 1.5, pos[1] + 100 * Math.tan(pitch), pos[2] - 100];
    fov = lerp(52, 48, u);
  }
  const land = f >= 323 && f < 335 ? Math.exp(-(f - 323) / 3) : 0;
  pos = [
    pos[0] + (random(`sx${f}`) - 0.5) * (0.6 * land + 0.06 * p),
    pos[1] + Math.sin(f * 2.1) * 0.05 * p + (random(`sy${f}`) - 0.5) * 0.6 * land,
    pos[2],
  ];
  return {p: pos, t: tg, roll, fov: fov - 3.5 * p - 4 * land};
}

/* -------------------------------- confetti ------------------------------- */
const CN = 170;
const CF = Array.from({length: CN}, (_, i) => ({
  vx: (random(`cvx${i}`) - 0.5) * 0.9,
  vy: 0.1 + random(`cvy${i}`) * 0.45,
  vz: (random(`cvz${i}`) - 0.5) * 0.6,
  rx: (random(`crx${i}`) - 0.5) * 0.5,
  ry: (random(`cry${i}`) - 0.5) * 0.5,
  ph: random(`cph${i}`) * 6,
}));
const Confetti: React.FC<{f: number}> = ({f}) => {
  const m = useMemo(() => {
    const mm = new THREE.InstancedMesh(BOX, new THREE.MeshBasicMaterial({fog: false}), CN);
    for (let i = 0; i < CN; i++) mm.setColorAt(i, _c.setHex(i % 4 === 0 ? 0xffd54a : i % 4 === 1 ? 0xffffff : 0x58d970));
    mm.frustumCulled = false;
    return mm;
  }, []);
  const t = f - 309;
  m.visible = t >= 0 && t < 50;
  if (m.visible) {
    const P0 = hero(309);
    const D = (1 - Math.exp(-0.06 * t)) / 0.06;
    for (let i = 0; i < CN; i++) {
      const c = CF[i];
      _o.position.set(
        P0.x + c.vx * D * 1.6 + Math.sin(t * 0.4 + c.ph) * 0.3,
        Math.max(0.1, P0.y + 1.8 + c.vy * D * 1.4 - 0.006 * t * t),
        P0.z + 1.5 + (-2.2 + c.vz) * D
      );
      _o.rotation.set(t * c.rx + c.ph, t * c.ry, 0);
      _o.scale.set(0.7, 0.07, 0.4);
      _o.updateMatrix();
      m.setMatrixAt(i, _o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }
  return <primitive object={m} dispose={null} />;
};

/* --------------------------------- scene -------------------------------- */
const PEDS = Array.from({length: 12}, (_, i) => ({x: i % 2 ? 11.5 : -11, z: 50 - 24 * i, k: i % 6})).filter((p) => !(p.z < -165 && p.z > -240));
const Scene: React.FC<{f: number}> = ({f}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const P = pal(f);
  const b = beat(f);
  const c = cam(f, b.p);
  camera.position.set(c.p[0], c.p[1], c.p[2]);
  camera.fov = c.fov;
  camera.near = 0.1;
  camera.far = 3000;
  camera.updateProjectionMatrix();
  camera.lookAt(c.t[0], c.t[1], c.t[2]);
  camera.rotateZ(c.roll);
  const h = hero(f);
  const q = P.q;
  const title = f >= 338;
  return (
    <>
      <color attach="background" args={[P.hor]} />
      <fog attach="fog" args={[P.hor, 30, 560]} />
      <ambientLight color={mix(0xffe6d0, 0xb8a0e0, q)} intensity={1.5 - 0.35 * q + 0.3 * b.p} />
      <directionalLight color={mix(0xffdcaa, 0xff9a7a, q)} intensity={3.0 - 1.0 * q + 0.7 * b.p} position={[-40, 35, -60]} />
      <directionalLight color={mix(0xa8c0ff, 0x8070ff, q)} intensity={1.0} position={[10, 30, 80]} />
      <SkyDome pos={c.p} P={P} />
      <group position={[-10, title ? 18 : 30, -480]} scale={(title ? 0.55 : 1) * (1 + 0.035 * b.p)}>
        <Voxels list={SUN} nofog />
      </group>
      <Voxels list={CLOUDS} nofog />
      <Slab p={[-855, -2.8, -150]} s={[1290, 1, 2000]} c={mix(0x1c6fa0, 0x2a3a7a, q)} />
      <Slab p={[766, -1.5, -150]} s={[1466, 3, 2000]} c={mix(0xc7ad98, 0x7a5a78, q)} />
      <Slab p={[0, -1, -700]} s={[18, 2, 710]} c={mix(0x3b3b47, 0x30283c, q)} />
      <Slab p={[-26, -1, -700]} s={[34, 2, 710]} c={mix(0xe8cfa0, 0x9a7a88, q)} />
      <Voxels list={WORLD} />
      <Water f={f} />
      {f < 60 && <Glitter f={f} />}
      <group position={[-92, 15, -45]} rotation={[0, 0, f * 0.015]}>
        <Voxels list={WHEEL} />
      </group>
      {PEDS.map((p, i) => (
        <group key={i} position={[p.x, 0.35 * Math.max(0, b.p) * (i % 2), p.z]} rotation={[0, p.x > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
          <Voxels list={PERSONS[p.k]} />
        </group>
      ))}
      {Array.from({length: 8}, (_, i) => {
        const z = -340 + mod(random(`cz${i}`) * 400 + 1.2 * f, 400);
        if (z < -160 && z > -240) return null;
        return <Car key={i} list={CIV[i % 6]} x={i % 2 ? 3.5 : 6.5} z={z} yaw={Math.PI} />;
      })}
      {police(f).map((p, i) => (
        <Car key={`p${i}`} list={POLICE} x={p.x} z={p.z} bar={Math.floor((f + i * 2) / 3) % 2} />
      ))}
      {f >= 56 && (
        <>
          {h.y < 0.05 && (
            <group position={[h.x, 0.03, h.z]} rotation={[0, h.yaw, 0]}>
              <Voxels list={SHADOW} />
            </group>
          )}
          <Car list={HERO} x={h.x} y={h.y} z={h.z} yaw={h.yaw} rx={h.rx} rz={h.rz} sy={1 - 0.06 * b.p} />
        </>
      )}
      <Confetti f={f} />
    </>
  );
};

/* -------------------------------- overlay -------------------------------- */
const FONT = "Archivo, sans-serif";
const Overlay: React.FC<{f: number; p: number}> = ({f, p}) => {
  const cuts = [56, 113, 169, 225, 281, 295, 309, 323, 338];
  let fl = 0;
  for (const c of cuts) if (f >= c) fl = Math.max(fl, Math.exp(-(f - c) / 2.5) * (c === 295 || c === 309 || c === 169 ? 0.25 : 0.5));
  const line = (txt: string, start: number, color: string, top: number) => {
    if (f < start || f > 222) return null;
    const inn = eo(seg(f, start, start + 6));
    const out = eo(seg(f, 216, 222));
    return (
      <div key={txt} style={{position: "absolute", left: 100, top, height: 150, overflow: "hidden"}}>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 140,
            lineHeight: "150px",
            whiteSpace: "nowrap",
            color,
            transform: `translateY(${(1 - inn) * 105 - out * 105}%) skewX(-8deg)`,
            textShadow: "0 6px 0 rgba(40,8,60,0.8), 0 0 24px rgba(40,8,60,0.6)",
          }}
        >
          {txt}
        </div>
      </div>
    );
  };
  const pr = eo(seg(f, 339, 345));
  const jit = f >= 338 && f < 345 ? (random(`tj${f}`) - 0.5) * 14 * (1 - seg(f, 338, 345)) : 0;
  const pf = f >= 169 && f < 300 ? Math.floor(f / 3) % 2 : -1;
  const lowText = f >= 127 && f <= 222;
  return (
    <AbsoluteFill style={{pointerEvents: "none"}}>
      <AbsoluteFill style={{background: "radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 55%, rgba(20,0,30,0.55) 100%)"}} />
      <AbsoluteFill
        style={{
          mixBlendMode: "screen",
          opacity: 0.18 * p,
          background: "radial-gradient(ellipse at 30% 40%, #ff8a50 0%, rgba(255,60,120,0.4) 50%, rgba(0,0,0,0) 80%)",
        }}
      />
      {pf >= 0 && (
        <AbsoluteFill
          style={{
            background:
              pf === 1
                ? "linear-gradient(90deg, rgba(255,30,50,0.30) 0%, rgba(0,0,0,0) 45%)"
                : "linear-gradient(270deg, rgba(40,100,255,0.32) 0%, rgba(0,0,0,0) 45%)",
          }}
        />
      )}
      {lowText && (
        <AbsoluteFill style={{background: "linear-gradient(0deg, rgba(25,5,45,0.55) 0%, rgba(25,5,45,0.25) 25%, rgba(0,0,0,0) 40%)"}} />
      )}
      {f >= 338 && (
        <AbsoluteFill
          style={{
            opacity: eo(seg(f, 338, 345)),
            background: "linear-gradient(180deg, rgba(30,5,60,0.6) 0%, rgba(30,5,60,0.32) 32%, rgba(30,5,60,0) 55%)",
          }}
        />
      )}
      {line("ONE CITY.", 127, "#fff4e0", 690)}
      {line("TWO DEBTS.", 155, "#ff5a8e", 835)}
      {f >= 338 && (
        <div style={{position: "absolute", left: 0, right: 0, top: 110, textAlign: "center", transform: `translate(${jit}px, ${jit * 0.6}px)`}}>
          <div
            style={{
              filter:
                "drop-shadow(4px 0 0 #2a0a45) drop-shadow(-4px 0 0 #2a0a45) drop-shadow(0 4px 0 #2a0a45) drop-shadow(0 -4px 0 #2a0a45) drop-shadow(0 10px 0 #2a0a45) drop-shadow(0 0 50px rgba(255,120,60,0.7))",
              height: 290,
              lineHeight: "290px",
            }}
          >
            {"SUNBURN".split("").map((ch, i) => {
              const pp = eo(seg(f, 338 + i * 0.5, 341 + i * 0.5));
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    fontFamily: FONT,
                    fontWeight: 900,
                    fontSize: 280,
                    letterSpacing: "0.02em",
                    opacity: f >= 338 + i * 0.5 ? 1 : 0,
                    transform: `translateY(${(1 - pp) * -340}px) scale(${1 + (1 - pp) * 0.6})`,
                    background: "linear-gradient(180deg,#fff6c0 0%,#ffb347 50%,#ff3d78 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </div>
          <div
            style={{
              marginTop: 20,
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 64,
              letterSpacing: "0.4em",
              paddingLeft: "0.4em",
              color: "#fff4e0",
              textShadow: "0 3px 0 #2a0a45, 0 0 12px #2a0a45, 0 0 28px rgba(42,10,69,0.9)",
              clipPath: `inset(0 ${(1 - pr) * 100}% 0 0)`,
            }}
          >
            COMING NOVEMBER
          </div>
        </div>
      )}
      <AbsoluteFill style={{background: "#fff", opacity: fl}} />
    </AbsoluteFill>
  );
};

/* -------------------------------- trailer -------------------------------- */
export const Trailer: React.FC = () => {
  const f = useCurrentFrame();
  const b = beat(f);
  return (
    <AbsoluteFill style={{backgroundColor: "#000"}}>
      <ThreeCanvas width={1920} height={1080} camera={{fov: 50, near: 0.1, far: 3000, position: [0, 5, 10]}}>
        <Scene f={f} />
      </ThreeCanvas>
      <Overlay f={f} p={b.p} />
    </AbsoluteFill>
  );
};