/**
 * SUNBURN — "ONE CITY. TWO DEBTS."
 *
 * CONCEPT: a golden-hour voxel crime saga. Every brick of this coastal city is a
 * cube: the beachfront towers, the palms, the red coupe, the vault, the cruisers,
 * the chopper, the two leads. The camera never stops moving and every cut lands
 * on the 128 BPM grid.
 *
 * SHOT 1  0–56     THE CITY      — aerial dive off the bay onto the promenade.
 *                                  Line slam. Buildings rise up at us.
 * SHOT 2  56–113   THE GETAWAY   — chase cam behind the red coupe on the coast
 *                                  road, palms whipping past, sun dead ahead.
 * SHOT 3  113–169  THE SCORE     — dolly push through the open vault door
 *                                  toward the gold table. Two crew, clear reads.
 * SHOT 4  169–225  THE PRESSURE  — street-level low angle over the roadblock
 *                                  cruisers, craning up to the searchlight.
 * SHOT 5  225–281  THE TWO       — half-orbit around the two leads, rim-lit
 *                                  against the setting sun over the city.
 * SHOT 6  281–338  THE JUMP      — chase cam rocketing off the pier after the
 *                                  coupe as it arcs into the sun. Strongest beat.
 * SHOT 7  338–390  THE TITLE     — push-in on the sun going down over the bay.
 */

import React, { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, random } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

/* ---------------------------------------------------------------- utilities */

const BEAT = 14.0625;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ease = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const rnd = (seed: number): number => (random(seed) as number) ?? 0.5;

type V = { p: [number, number, number]; s: [number, number, number]; c: number };

class VB {
  private m = new Map<string, V>();
  v(x: number, y: number, z: number, c: number) {
    this.m.set(`v${x}|${y}|${z}`, { p: [x, y, z], s: [1, 1, 1], c });
  }
  b(x: number, y: number, z: number, c: number, sx: number, sy: number, sz: number) {
    this.m.set(`b${x}|${y}|${z}`, { p: [x, y, z], s: [sx, sy, sz], c });
  }
  out(): V[] {
    return Array.from(this.m.values());
  }
}

/* ------------------------------------------------------------------ palette */

const C = {
  water: 0x2f8398,
  waterDeep: 0x1c5c74,
  sunPath: 0xffc078,
  sand: 0xe8cda2,
  sandDark: 0xd8bb90,
  road: 0x3a3733,
  roadLine: 0xe6d6a4,
  walk: 0xc4bcae,
  glass: 0x9fd3e0,
  win: 0x264456,
  winLit: 0xffcf8f,
  winLit2: 0xffb26a,
  roofTrim: 0xb3a696,
  roofTile: 0x9c9084,
  ground: 0x9c8f7a,
  silh: 0x3a2740,
  steel: 0x9aa4aa,
  steelDark: 0x6b7378,
  concrete: 0x8a827a,
  concreteDark: 0x6a6360,
  trunk: 0x8d5d35,
  trunkDark: 0x6d4626,
  leaf: 0x2f8d52,
  leafDark: 0x216b3c,
  tire: 0x1c1c20,
  chrome: 0xf7f2e0,
  red: 0xd83a2c,
  redDark: 0xa42a20,
  tail: 0xff4a30,
  white: 0xf4efe2,
  cream: 0xf6e3c2,
  pink: 0xefa2ae,
  teal: 0x8ad4d2,
  lilac: 0xc7a6d6,
  gold: 0xf0c33c,
  goldDark: 0xc99a1e,
  cash: 0x4fa96f,
  cashDark: 0x377c50,
  navy: 0x2a4a8a,
  navyDark: 0x162a52,
  hair: 0x2a1c14,
  skinA: 0xc98a5e,
  skinB: 0x8a5a3b,
  skinC: 0xe0a878,
  jacket: 0xe4552f,
  denim: 0x2f4a72,
  dark: 0x24242a,
  glassShop: 0x6fb9c9,
};

/* -------------------------------------------------------------- architecture */

function addTower(
  b: VB,
  cx: number,
  cz: number,
  w: number,
  h: number,
  d: number,
  base: number,
  trim: number,
  seed: number,
) {
  const floors = Math.max(3, Math.round(h / 3.6));
  const fh = h / floors;
  for (let f = 0; f < floors; f++) {
    const y = f * fh;
    const shrink = f > floors * 0.72 ? 0.86 : 1;
    b.b(cx, y + fh / 2, cz, base, w * shrink, fh * 1.004, d * shrink);
  }
  const nz = Math.max(2, Math.floor(w / 3.4));
  const nx = Math.max(2, Math.floor(d / 3.4));
  for (let f = 1; f < floors; f++) {
    const y = f * fh + fh * 0.52;
    const shrink = f > floors * 0.72 ? 0.86 : 1;
    for (let i = 0; i < nz; i++) {
      const x = cx - (w * shrink) / 2 + 1.4 + (i * (w * shrink - 2.8)) / Math.max(1, nz - 1);
      const s = rnd(seed + f * 7.7 + i * 3.3);
      const col = s > 0.42 ? (s > 0.78 ? C.winLit2 : C.winLit) : C.win;
      b.b(x, y, cz + (d * shrink) / 2 + 0.4, col, 1.8, fh * 0.46, 0.6);
      b.b(x, y, cz - (d * shrink) / 2 - 0.4, col, 1.8, fh * 0.46, 0.6);
    }
    for (let i = 0; i < nx; i++) {
      const z = cz - (d * shrink) / 2 + 1.4 + (i * (d * shrink - 2.8)) / Math.max(1, nx - 1);
      const s = rnd(seed + f * 11.1 + i * 5.9);
      const col = s > 0.55 ? C.winLit : C.win;
      b.b(cx + (w * shrink) / 2 + 0.4, y, z, col, 0.6, fh * 0.46, 1.8);
      b.b(cx - (w * shrink) / 2 - 0.4, y, z, col, 0.6, fh * 0.46, 1.8);
    }
  }
  b.b(cx, h + 0.7, cz, trim, w * 0.94, 1.4, d * 0.94);
  const roofN = 1 + Math.floor(rnd(seed * 1.7) * 3);
  for (let i = 0; i < roofN; i++) {
    const tx = cx + (rnd(seed + i * 2.3) - 0.5) * w * 0.55;
    const tz = cz + (rnd(seed + i * 4.1) - 0.5) * d * 0.55;
    b.b(tx, h + 3.2, tz, C.steelDark, 2.6, 3.4, 2.6);
  }
  b.b(cx, 2.0, cz + d / 2 + 0.7, C.glassShop, w * 0.86, 3.6, 0.7);
  b.b(cx, 4.1, cz + d / 2 + 1.5, trim, w * 0.9, 0.5, 2.2);
}

function addPalm(b: VB, x: number, y: number, z: number, h: number, seed: number) {
  let tx = x;
  for (let i = 0; i < h; i++) {
    tx = x + Math.round(Math.sin(i * 0.32 + seed) * (i / h) * 2.4);
    b.b(tx, y + i, z, i % 5 === 4 ? C.trunkDark : C.trunk, 1.25, 1.05, 1.25);
  }
  const ty = y + h;
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2 + seed * 0.8;
    const len = 4 + Math.floor(rnd(seed + a * 1.7) * 4);
    for (let r = 1; r <= len; r++) {
      const px = tx + Math.round(Math.cos(ang) * r);
      const pz = z + Math.round(Math.sin(ang) * r);
      const py = ty + Math.max(-1.2, 1.8 - r * 0.6);
      b.b(px, py, pz, (a + r) % 2 ? C.leaf : C.leafDark, 1.05, 0.62, 1.05);
    }
  }
  b.b(tx, ty - 0.8, z, C.trunkDark, 1.9, 1.1, 1.9);
}

function addPerson(
  b: VB,
  x: number,
  y: number,
  z: number,
  shirt: number,
  pants: number,
  skin: number,
  hair: number,
  s = 1,
) {
  b.b(x - 0.95 * s, y + 3.6 * s, z, pants, 1.7 * s, 7.2 * s, 1.9 * s);
  b.b(x + 0.95 * s, y + 3.6 * s, z, pants, 1.7 * s, 7.2 * s, 1.9 * s);
  b.b(x - 0.95 * s, y + 0.45 * s, z + 0.25 * s, C.dark, 1.8 * s, 0.9 * s, 2.4 * s);
  b.b(x + 0.95 * s, y + 0.45 * s, z + 0.25 * s, C.dark, 1.8 * s, 0.9 * s, 2.4 * s);
  b.b(x, y + 10.4 * s, z, shirt, 4.3 * s, 6.0 * s, 2.3 * s);
  b.b(x, y + 10.4 * s, z + 1.3 * s, shirt, 3.0 * s, 5.2 * s, 0.6 * s);
  b.b(x - 2.75 * s, y + 10.0 * s, z, shirt, 1.5 * s, 5.6 * s, 1.9 * s);
  b.b(x + 2.75 * s, y + 10.0 * s, z, shirt, 1.5 * s, 5.6 * s, 1.9 * s);
  b.b(x, y + 13.9 * s, z, skin, 2.7 * s, 2.6 * s, 2.5 * s);
  b.b(x, y + 15.4 * s, z - 0.1 * s, hair, 3.0 * s, 1.3 * s, 2.8 * s);
}

function carVoxels(body: number, bodyDark: number): V[] {
  const b = new VB();
  b.b(0, 1.9, 0, bodyDark, 6.4, 0.7, 12.4);
  b.b(0, 2.9, 0, body, 6.2, 1.7, 12.4);
  b.b(0, 4.1, 3.3, body, 5.6, 1.2, 5.0);
  b.b(0, 4.1, -4.0, body, 5.6, 1.2, 3.6);
  b.b(0, 5.5, -0.5, C.glass, 5.2, 1.9, 5.6);
  b.b(0, 6.6, -0.5, body, 5.0, 0.9, 4.8);
  for (const wx of [-3.4, 3.4]) {
    for (const wz of [-4.0, 3.6]) {
      b.b(wx, 1.4, wz, C.tire, 1.4, 2.8, 3.0);
      b.b(wx * 1.03, 1.4, wz, C.steel, 0.5, 1.3, 1.4);
    }
  }
  b.b(-2.0, 3.4, 6.3, C.chrome, 1.9, 1.0, 0.5);
  b.b(2.0, 3.4, 6.3, C.chrome, 1.9, 1.0, 0.5);
  b.b(-2.0, 3.6, -6.3, C.tail, 1.9, 0.9, 0.5);
  b.b(2.0, 3.6, -6.3, C.tail, 1.9, 0.9, 0.5);
  b.b(0, 4.0, -6.4, C.chrome, 4.6, 0.5, 0.4);
  b.b(0, 3.7, 6.4, C.chrome, 5.4, 0.7, 0.4);
  for (let z = -5; z <= 5; z++) {
    b.b(-3.3, 3.6, z, z % 2 ? body : bodyDark, 0.5, 1.0, 0.9);
    b.b(3.3, 3.6, z, z % 2 ? body : bodyDark, 0.5, 1.0, 0.9);
  }
  return b.out();
}

function helicopterVoxels(): V[] {
  const b = new VB();
  b.b(0, 0, 0, C.navy, 6.4, 5.4, 11);
  b.b(0, 1.6, 5.2, C.glass, 5.2, 3.0, 1.6);
  b.b(0, 1.6, -4.2, C.glass, 4.2, 2.2, 0.9);
  b.b(-3.4, -0.4, 0.5, C.navy, 1.4, 3.2, 8);
  b.b(3.4, -0.4, 0.5, C.navy, 1.4, 3.2, 8);
  b.b(0, 0.2, -8.5, C.navy, 2.2, 2.2, 8);
  b.b(0, 1.6, -12.6, C.navyDark, 1.4, 3.6, 1.4);
  b.b(0, 3.4, 0, C.steelDark, 2.2, 1.6, 2.2);
  for (const sx of [-1, 1]) {
    b.b(sx * 3.2, -3.6, 0.4, C.steelDark, 0.9, 0.9, 9.5);
    b.b(sx * 3.2, -2.4, 4.0, C.steelDark, 0.9, 2.6, 0.9);
    b.b(sx * 3.2, -2.4, -3.4, C.steelDark, 0.9, 2.6, 0.9);
  }
  b.b(0, -2.6, -12.8, C.tail, 0.8, 0.8, 1.2);
  return b.out();
}

/* --------------------------------------------------------------- the worlds */

function buildCoastCity(): V[] {
  const b = new VB();
  b.b(-820, -3, 0, C.water, 1500, 1, 3200);
  b.b(-44, -1.2, 0, C.sand, 72, 1, 2400);
  b.b(-34, -1.0, 0, C.sandDark, 18, 1, 2400);
  b.b(-4, -0.7, 0, C.walk, 14, 1, 2400);
  b.b(11, -0.8, 0, C.road, 18, 1, 2400);
  b.b(26, -0.7, 0, C.walk, 12, 1, 2400);
  for (let z = -1100; z <= 1100; z += 22) {
    b.b(2, -0.42, z, C.roadLine, 1.2, 0.26, 9);
    b.b(20, -0.42, z, C.roadLine, 1.0, 0.26, 9);
  }
  for (let z = -1100; z <= 1100; z += 15) {
    addPalm(b, -4, 0, z, 11 + Math.floor(rnd(z * 0.31) * 5), rnd(z * 0.17) * 6);
  }
  for (let i = 0; i < 22; i++) {
    const z = -1000 + i * 88 + Math.floor(rnd(i * 1.7) * 18);
    const x = -46 + Math.floor(rnd(i * 2.3) * 20);
    const c1 = rnd(i * 5.1) > 0.5 ? C.pink : C.teal;
    b.b(x, 0.2, z, c1, 9, 0.6, 9);
    b.b(x, 1.1, z, C.white, 0.6, 1.2, 0.6);
    b.b(x, 5.8, z, rnd(i * 3.1) > 0.5 ? C.cream : C.white, 9, 1.0, 9);
    b.b(x, 4.6, z, c1, 0.5, 1.2, 0.5);
  }
  for (let i = 0; i < 12; i++) {
    const z = -900 + i * 160 + Math.floor(rnd(i * 4.3) * 40);
    const x = -26 + Math.floor(rnd(i * 3.7) * 12);
    b.b(x, 4.5, z, rnd(i) > 0.5 ? C.pink : C.teal, 6, 0.8, 6);
    b.b(x, 2.6, z, C.white, 0.35, 3.6, 0.35);
  }
  const carColors = [C.red, C.white, C.navy, C.gold, C.teal, C.lilac];
  for (let i = 0; i < 6; i++) {
    const cz = -700 + i * 250 + Math.floor(rnd(i * 2.1) * 40);
    const cx = 5 + Math.floor(rnd(i * 3.3) * 12);
    const cc = carColors[i % carColors.length];
    b.b(cx, 1.8, cz, cc, 4.2, 2.6, 8.6);
    b.b(cx, 3.4, cz - 0.7, cc, 3.6, 1.6, 4.0);
    b.b(cx, 3.2, cz - 0.7, C.glass, 3.5, 1.4, 3.6);
    for (const wx of [-2.2, 2.2])
      for (const wz of [-3.5, 2.4]) b.b(cx + wx, 1.0, cz + wz, C.tire, 0.9, 1.8, 1.8);
  }
  const bases = [C.cream, C.pink, C.teal, C.lilac, C.white, 0xf2c9a0, 0xe8b9a0, 0xf7d9b8];
  const trims = [C.roofTrim, C.white, C.cream, C.concrete];
  for (let zz = -1000; zz <= 1000; zz += 74) {
    for (let row = 0; row < 3; row++) {
      const s = rnd(zz * 0.37 + row * 13.7);
      if (s < 0.18) continue;
      const w = 18 + Math.floor(rnd(zz + row * 3.1) * 16);
      const d = 18 + Math.floor(rnd(zz * 1.7 + row * 5.5) * 16);
      const h = 26 + Math.floor(rnd(zz * 2.3 + row * 7.7) * (row === 0 ? 40 : 76));
      const cx = 52 + row * 58 + Math.floor(rnd(zz + row * 2.2) * 18);
      const cz = zz + Math.floor((rnd(zz * 3.9 + row * 2.2) - 0.5) * 26);
      const base = bases[Math.floor(rnd(zz * 5.1 + row * 9.9) * bases.length)];
      const trim = trims[Math.floor(rnd(zz * 6.3 + row * 4.4) * trims.length)];
      addTower(b, cx, cz, w, h, d, base, trim, zz + row * 101);
    }
  }
  return b.out();
}

function buildStrip(): V[] {
  const b = new VB();
  b.b(-500, -3, 0, C.water, 900, 1, 1600);
  b.b(-32, -1.2, 0, C.sand, 44, 1, 1600);
  b.b(-9, -1.0, 0, C.walk, 12, 1, 1600);
  b.b(1, -0.8, 0, C.road, 22, 1, 1600);
  b.b(18, -1.0, 0, C.walk, 10, 1, 1600);
  for (let z = -700; z <= 700; z += 20) {
    b.b(1, -0.42, z, C.roadLine, 1.2, 0.26, 9);
    b.b(-9.6, -0.42, z, C.roadLine, 1.2, 0.26, 9);
  }
  for (let z = -700; z <= 700; z += 16) {
    addPalm(b, -18, 0, z, 11 + Math.floor(rnd(z * 0.23) * 5), rnd(z * 0.41) * 6);
  }
  for (let z = -700; z <= 700; z += 26) {
    b.b(24, 4.2, z, C.steelDark, 0.7, 8.4, 0.7);
    b.b(24, 8.4, z + 2.0, C.steelDark, 0.6, 0.6, 5);
  }
  for (let i = 0; i < 14; i++) {
    const z = -700 + i * 100;
    b.b(-12, 3, z, C.pink, 4, 0.6, 4);
    b.b(-12, 1.5, z, C.white, 0.3, 3, 0.3);
  }
  const bases = [C.cream, C.pink, C.teal, C.white, C.lilac, 0xf2c9a0];
  for (let i = 0; i < 12; i++) {
    const zz = -680 + i * 118;
    if (rnd(i * 7.1) < 0.15) continue;
    const w = 22 + Math.floor(rnd(i * 2.3) * 14);
    const d = 22 + Math.floor(rnd(i * 3.7) * 14);
    const h = 26 + Math.floor(rnd(i * 5.9) * 44);
    addTower(b, 62 + Math.floor(rnd(i * 9.1) * 22), zz, w, h, d, bases[i % bases.length], C.roofTrim, i * 37);
  }
  return b.out();
}

function buildVault(): V[] {
  const b = new VB();
  for (let x = -40; x <= 40; x += 4) {
    for (let z = -40; z <= 34; z += 4) {
      const alt = (Math.floor(x / 4) + Math.floor(z / 4)) % 2 === 0;
      b.b(x, -0.6, z, alt ? 0x5a5450 : 0x4e4844, 3.96, 1.2, 3.96);
    }
  }
  b.b(0, 19, -42, 0x8a8088, 90, 40, 2);
  b.b(-44, 19, -4, 0x7a7078, 2, 40, 90);
  b.b(44, 19, -4, 0x7a7078, 2, 40, 90);
  b.b(0, 38.5, -4, 0x6a6068, 90, 2, 90);
  for (let x = -40; x <= 40; x += 10) b.b(x, 19, -41, 0x585058, 1.4, 40, 0.9);

  const RAD = 13;
  for (let x = -RAD; x <= RAD; x++) {
    for (let y = -RAD; y <= RAD; y++) {
      const d = Math.sqrt(x * x + y * y);
      if (d > RAD + 0.3) continue;
      const c = d > RAD - 2 ? C.steelDark : Math.abs(x) < 1.4 || Math.abs(y) < 1.4 ? C.steelDark : C.steel;
      b.v(x, 19 + y, -40, c);
    }
  }
  for (let i = -3; i <= 3; i++) {
    b.v(i, 19, -38.6, C.gold);
    b.v(0, 19 + i, -38.6, C.gold);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.v(Math.round(Math.cos(a) * (RAD - 2.6)), 19 + Math.round(Math.sin(a) * (RAD - 2.6)), -39.4, C.steelDark);
  }

  const piles: [number, number, number, number, number][] = [
    [-28, -18, 7, 5, 6], [-18, -26, 6, 5, 7], [16, -24, 7, 5, 5], [28, -16, 6, 4, 6],
    [0, -14, 8, 5, 4], [-32, 4, 6, 5, 5], [32, 2, 6, 5, 7], [-20, 16, 6, 4, 4], [22, 18, 6, 4, 5],
  ];
  for (const [x, z, w, d, layers] of piles) {
    for (let l = 0; l < layers; l++) {
      b.b(x, l * 1.0, z, l % 2 === 0 ? C.cash : C.cashDark, w, 0.95, d);
      b.b(x, l * 1.0 + 0.42, z + d / 2 + 0.06, C.white, w * 0.4, 0.3, 0.14);
    }
  }
  // central gold table
  b.b(0, 1.1, 4, C.steelDark, 16, 2.2, 9);
  b.b(0, 2.3, 4, C.steel, 16.4, 0.4, 9.4);
  for (let i = -2; i <= 2; i++) {
    for (let j = -1; j <= 1; j++) {
      b.b(i * 2.8, 3.4, 4 + j * 2.8, C.gold, 2.4, 1.1, 2.4);
      b.b(i * 2.8, 4.5, 4 + j * 2.8, C.goldDark, 2.4, 1.1, 2.4);
    }
  }
  for (const lx of [-6, 6]) for (const lz of [0.5, 7.5]) b.b(lx, 0.3, lz, C.steelDark, 1.2, 2.4, 1.2);

  // two crew, bright jumpsuits so they read
  addPerson(b, -13, 0, 4, C.white, 0xd8d0bc, C.skinB, 0x1c120c);
  addPerson(b, 14, 0, 3, 0x2a8a5a, 0x1d6a44, C.skinA, 0x3a2820);

  for (let i = 0; i < 9; i++) {
    b.b(-34 + i * 1.4, 0.45, 22, C.gold, 2.2, 0.9, 3.4);
  }
  return b.out();
}

function buildRoadblock(): V[] {
  const b = new VB();
  b.b(0, -0.8, 0, C.road, 60, 1, 700);
  b.b(-40, -0.6, 0, C.walk, 22, 1, 700);
  b.b(40, -0.6, 0, C.walk, 22, 1, 700);
  b.b(-120, -1.2, 0, C.ground, 140, 1, 700);
  b.b(120, -1.2, 0, C.ground, 140, 1, 700);
  for (let z = -320; z <= 320; z += 20) {
    b.b(0, -0.44, z, C.roadLine, 1.4, 0.26, 9);
    b.b(-20, -0.44, z, C.roadLine, 1.2, 0.26, 9);
    b.b(20, -0.44, z, C.roadLine, 1.2, 0.26, 9);
  }
  for (let z = -320; z <= 320; z += 32) {
    addPalm(b, -46, 0, z, 13 + Math.floor(rnd(z * 0.29) * 4), rnd(z * 1.3) * 6);
    addPalm(b, 46, 0, z + 16, 13 + Math.floor(rnd(z * 0.51) * 4), rnd(z * 2.7) * 6);
  }
  for (let i = 0; i < 8; i++) {
    const x = (i - 3.5) * 14;
    b.b(x, 0.9, -22, C.concrete, 11, 3.4, 3);
    b.b(x, 3.0, -22, C.roadLine, 11.4, 0.7, 0.6);
    b.b(x - 3.9, 0.6, -22, C.concreteDark, 1.4, 0.9, 3.2);
    b.b(x + 3.9, 0.6, -22, C.concreteDark, 1.4, 0.9, 3.2);
  }
  addPerson(b, -22, 0, 6, C.navy, 0x1a2a3a, C.skinA, C.hair);
  addPerson(b, 6, 0, 8, C.navy, 0x1a2a3a, C.skinB, C.hair);
  addPerson(b, 24, 0, 4, C.navy, 0x1a2a3a, C.skinC, C.hair);
  addPerson(b, -32, 0, -2, C.navy, 0x1a2a3a, C.skinB, C.hair);
  for (let i = 0; i < 22; i++) {
    const x = -900 + rnd(i * 3.1) * 1800;
    const h = 110 + rnd(i * 5.7) * 260;
    const w = 70 + rnd(i * 7.1) * 100;
    const z = -400 - rnd(i * 9.3) * 200;
    b.b(x, h / 2 - 10, z, C.silh, w, h, 44);
    if (rnd(i * 11.3) > 0.4) b.b(x + w * 0.15, h * 0.25 - 10, z + 23, C.winLit2, w * 0.14, h * 0.5, 30);
  }
  // street lamps
  for (const lx of [-34, 34]) {
    for (let z = -180; z <= 60; z += 120) {
      b.b(lx, 5.5, z, C.steelDark, 0.7, 11, 0.7);
      b.b(lx, 11.2, z, 0xffe0a0, 1.6, 0.9, 1.6);
    }
  }
  return b.out();
}

function buildRooftop(): V[] {
  const b = new VB();
  b.b(0, -2.5, 0, C.roofTile, 150, 5, 150);
  b.b(0, -9, 0, 0x6f665f, 146, 8, 146);
  for (let x = -74; x <= 74; x += 2) {
    b.b(x, 0.6, -74, C.cream, 2.05, 2.4, 1.8);
    b.b(x, 0.6, 74, C.cream, 2.05, 2.4, 1.8);
  }
  for (let z = -74; z <= 74; z += 2) {
    b.b(-74, 0.6, z, C.cream, 1.8, 2.4, 2.05);
    b.b(74, 0.6, z, C.cream, 1.8, 2.4, 2.05);
  }
  b.b(-30, 1.2, 26, C.teal, 18, 2.4, 18);
  b.b(28, 1.0, 34, C.lilac, 14, 2.0, 14);
  b.b(-40, 0.6, 56, C.pink, 20, 1.2, 6);
  b.b(46, 0.6, 58, C.white, 16, 1.2, 6);
  for (const [px, pz] of [[-30, 26], [28, 34]] as const) {
    addPalm(b, px, 1.4, pz, 10, px * 0.11);
  }
  b.b(-52, 4.4, -60, C.steelDark, 8, 8.8, 8);
  for (const lx of [-55, -49]) for (const lz of [-63, -57]) b.b(lx, 0.8, lz, C.steelDark, 1.2, 1.6, 1.2);
  b.b(-52, 9.6, -60, C.steel, 9, 1.0, 9);
  b.b(52, 2.2, -66, C.concrete, 16, 4.4, 10);
  b.b(52, 4.8, -66, C.concreteDark, 17, 1.0, 11);

  for (let i = 0; i < 30; i++) {
    const x = -1200 + rnd(i * 3.1) * 2400;
    const h = 130 + rnd(i * 5.7) * 460;
    const w = 90 + rnd(i * 7.1) * 150;
    const z = -600 - rnd(i * 9.3) * 500;
    b.b(x, h / 2 - 340, z, 0x4a2540, w, h, 70);
    if (rnd(i * 11.3) > 0.45) b.b(x + w * 0.2, h * 0.2 - 340, z + 36, 0xa84a30, w * 0.12, h * 0.5, 40);
  }
  return b.out();
}

function buildPier(): V[] {
  const b = new VB();
  b.b(0, -2.4, 0, C.waterDeep, 3000, 1, 4000);
  b.b(0, 6.0, 40, 0x8a6a44, 44, 1.4, 140);
  for (let z = -24; z <= 104; z += 8) {
    b.b(0, 6.7, z, 0x9c7a4e, 44, 0.3, 0.7);
  }
  for (const sx of [-21, 21]) {
    for (let z = -22; z <= 104; z += 12) {
      b.b(sx, 0.5, z, 0x6d5232, 2.2, 11, 2.2);
    }
    b.b(sx, 7.6, 40, 0x6d5232, 1.2, 2.4, 1.2);
  }
  b.b(0, 7.4, -24, 0x6d5232, 46, 1.2, 2.4);
  for (let i = 0; i < 4; i++) {
    b.b(-19, 11.5, 90 - i * 34, C.steelDark, 0.8, 8, 0.8);
    b.b(-19, 15.4, 90 - i * 34, 0xffe0a0, 1.6, 1.2, 1.6);
  }
  for (let i = 0; i < 24; i++) {
    const x = -900 + rnd(i * 3.1) * 1800;
    const h = 90 + rnd(i * 5.7) * 340;
    const w = 60 + rnd(i * 7.1) * 110;
    const z = -420 - rnd(i * 9.3) * 320;
    b.b(x, h / 2 - 4, z, 0x6b3040, w, h, 50);
    if (rnd(i * 13.7) > 0.45) b.b(x + w * 0.15, h * 0.3 - 4, z + 26, 0xb85a34, w * 0.12, h * 0.45, 30);
  }
  return b.out();
}

function buildTitleWorld(): V[] {
  const b = new VB();
  b.b(0, -2.4, 0, C.waterDeep, 5000, 1, 5000);
  for (let i = 0; i < 40; i++) {
    const w = 20 + rnd(i * 3.3) * 100;
    b.b((rnd(i * 7.7) - 0.5) * 400, -1.9, 60 + i * 40, C.sunPath, w, 0.4, 16);
  }
  for (let i = 0; i < 32; i++) {
    const x = -1600 + rnd(i * 3.1) * 3200;
    const h = 80 + rnd(i * 5.7) * 300;
    const w = 60 + rnd(i * 7.1) * 150;
    const z = -800 - rnd(i * 9.3) * 400;
    b.b(x, h / 2 - 20, z, 0x3d1524, w, h, 60);
  }
  return b.out();
}

/* -------------------------------------------------------------------- render */

const VoxelMesh: React.FC<{ voxels: V[]; color: number }> = ({ voxels, color }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = voxels.length;
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const v = voxels[i];
      p.set(v.p[0], v.p[1], v.p[2]);
      s.set(v.s[0], v.s[1], v.s[2]);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
  }, [voxels, count]);
  if (!count) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count] as never}>
      <boxGeometry args={[1, 1, 1]} />
      <meshLambertMaterial color={color} />
    </instancedMesh>
  );
};

const VoxelGroup: React.FC<{ voxels: V[] }> = ({ voxels }) => {
  const groups = useMemo(() => {
    const map = new Map<number, V[]>();
    for (const v of voxels) {
      const arr = map.get(v.c);
      if (arr) arr.push(v);
      else map.set(v.c, [v]);
    }
    return Array.from(map.entries());
  }, [voxels]);
  return (
    <>
      {groups.map(([color, list]) => (
        <VoxelMesh key={color} voxels={list} color={color} />
      ))}
    </>
  );
};

const Rig: React.FC<{ p: [number, number, number]; t: [number, number, number]; fov?: number }> = ({
  p,
  t,
  fov = 50,
}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(p[0], p[1], p[2]);
  camera.up.set(0, 1, 0);
  camera.near = 0.4;
  camera.far = 9000;
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  camera.lookAt(t[0], t[1], t[2]);
  camera.updateMatrixWorld();
  return null;
};

const Sky: React.FC<{ top: string; mid: string; low: string }> = ({ top, mid, low }) => {
  const tex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, top);
      g.addColorStop(0.38, top);
      g.addColorStop(0.52, mid);
      g.addColorStop(0.58, low);
      g.addColorStop(0.64, mid);
      g.addColorStop(0.82, top);
      g.addColorStop(1, top);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 8, 512);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [top, mid, low]);
  return (
    <mesh frustumCulled={false} renderOrder={-20}>
      <sphereGeometry args={[5500, 24, 16]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

const SunDisc: React.FC<{ pos: [number, number, number]; r: number; core?: string; glow?: string }> = ({
  pos,
  r,
  core = "#FFF4CE",
  glow = "#FF7A38",
}) => (
  <group position={pos}>
    <mesh renderOrder={-5}>
      <sphereGeometry args={[r * 3.6, 20, 14]} />
      <meshBasicMaterial color={glow} transparent opacity={0.09} depthWrite={false} fog={false} toneMapped={false} />
    </mesh>
    <mesh renderOrder={-4}>
      <sphereGeometry args={[r * 2.2, 20, 14]} />
      <meshBasicMaterial color={glow} transparent opacity={0.22} depthWrite={false} fog={false} toneMapped={false} />
    </mesh>
    <mesh renderOrder={-3}>
      <sphereGeometry args={[r * 1.45, 20, 14]} />
      <meshBasicMaterial color="#FFC468" transparent opacity={0.65} depthWrite={false} fog={false} toneMapped={false} />
    </mesh>
    <mesh renderOrder={-2}>
      <sphereGeometry args={[r, 24, 16]} />
      <meshBasicMaterial color={core} fog={false} toneMapped={false} />
    </mesh>
  </group>
);

/* --------------------------------------------------------------------- shots */

const ShotCity: React.FC<{ frame: number }> = ({ frame }) => {
  const voxels = useMemo(() => buildCoastCity(), []);
  const t = ease(frame / 56);
  return (
    <>
      <Sky top="#7c2f4c" mid="#f0854a" low="#ffdcae" />
      <fog attach="fog" args={["#f7a86a", 240, 1400]} />
      <hemisphereLight args={["#ffd8a8", "#8a4a52", 1.35]} />
      <directionalLight position={[-320, 220, 620]} intensity={2.2} color="#ffb073" />
      <directionalLight position={[260, 140, -320]} intensity={0.55} color="#8ba8ff" />
      <Rig
        p={[lerp(-230, -20, t), lerp(150, 22, t), lerp(-500, -50, t)]}
        t={[lerp(20, 46, t), lerp(60, 26, t), lerp(180, 260, t)]}
        fov={52}
      />
      <SunDisc pos={[-620, 100, 1250]} r={130} />
      <VoxelGroup voxels={voxels} />
    </>
  );
};

const ShotCar: React.FC<{ frame: number }> = ({ frame }) => {
  const world = useMemo(() => buildStrip(), []);
  const car = useMemo(() => carVoxels(C.red, C.redDark), []);
  const beat = Math.floor(frame / BEAT);
  const roll = Math.sin(frame * 0.22) * 0.022;
  const sway = Math.sin(frame * 0.17) * 0.6;
  const boost = 0.75 + 0.6 * Math.abs(Math.sin(frame * 0.9));
  return (
    <>
      <Sky top="#6d2b4c" mid="#f0814a" low="#ffdca8" />
      <fog attach="fog" args={["#f59a5a", 150, 700]} />
      <hemisphereLight args={["#ffd2a4", "#7a4648", 1.25]} />
      <directionalLight position={[420, 220, -520]} intensity={2.3} color="#ffb173" />
      <directionalLight position={[-260, 90, 260]} intensity={0.6} color="#ffd7b0" />
      <Rig p={[sway * 0.5 + 1, 5.6, 16]} t={[sway * 0.25, 3.0, -18]} fov={52} />
      <SunDisc pos={[520, 90, -1400]} r={150} />
      <group rotation={[0, 0, roll]}>
        <group position={[0, 0, frame * 3.6]}>
          <VoxelGroup voxels={world} />
        </group>
        <group position={[sway * 0.25, 0, 0]}>
          <VoxelGroup voxels={car} />
        </group>
        <mesh position={[0, 2.3, -8.4]} scale={[boost, boost, boost]}>
          <boxGeometry args={[3.4, 1.6, 3.0]} />
          <meshBasicMaterial color={beat % 2 === 0 ? "#FFC24A" : "#FF7A2A"} fog={false} transparent opacity={0.6} />
        </mesh>
      </group>
    </>
  );
};

const ShotVault: React.FC<{ frame: number }> = ({ frame }) => {
  const voxels = useMemo(() => buildVault(), []);
  const t = ease(frame / 56);
  return (
    <>
      <color attach="background" args={["#2a2026"]} />
      <fog attach="fog" args={["#3a2a2e", 110, 320]} />
      <ambientLight intensity={1.3} color="#b8a8b0" />
      <hemisphereLight args={["#ffe0c0", "#5a4060", 0.85]} />
      <directionalLight position={[10, 60, 40]} intensity={1.3} color="#ffd0a4" />
      <pointLight position={[0, 30, -20]} intensity={3.0} decay={0} color="#ffb35c" />
      <pointLight position={[-34, 12, 4]} intensity={1.6} decay={0} color="#7fbaff" />
      <pointLight position={[34, 12, 6]} intensity={1.6} decay={0} color="#ff9a5a" />
      <pointLight position={[0, 20, 26]} intensity={1.4} decay={0} color="#ffe0b4" />
      <Rig p={[lerp(5, 0.5, t), lerp(14, 7.5, t), lerp(60, 26, t)]} t={[0, 10, -26]} fov={54} />
      <VoxelGroup voxels={voxels} />
    </>
  );
};

const Siren: React.FC<{ pos: [number, number, number]; red: boolean }> = ({ pos, red }) => (
  <group position={pos}>
    <mesh position={[-1.15, 0, 0]}>
      <boxGeometry args={[2.0, 0.9, 1.8]} />
      <meshBasicMaterial color={red ? "#ff3a24" : "#4a0c08"} fog={false} toneMapped={false} />
    </mesh>
    <mesh position={[1.15, 0, 0]}>
      <boxGeometry args={[2.0, 0.9, 1.8]} />
      <meshBasicMaterial color={red ? "#0c1440" : "#2f7dff"} fog={false} toneMapped={false} />
    </mesh>
    <mesh position={[0, -0.5, 0]}>
      <boxGeometry args={[4.4, 0.4, 1.9]} />
      <meshLambertMaterial color="#1a1a22" />
    </mesh>
  </group>
);

const Headlights: React.FC<{ x: number; y: number; z: number }> = ({ x, y, z }) => (
  <>
    <mesh position={[x - 2.0, y, z]}>
      <boxGeometry args={[1.6, 0.9, 0.4]} />
      <meshBasicMaterial color="#fff6d0" fog={false} toneMapped={false} />
    </mesh>
    <mesh position={[x + 2.0, y, z]}>
      <boxGeometry args={[1.6, 0.9, 0.4]} />
      <meshBasicMaterial color="#fff6d0" fog={false} toneMapped={false} />
    </mesh>
  </>
);

const ShotPolice: React.FC<{ frame: number }> = ({ frame }) => {
  const voxels = useMemo(() => buildRoadblock(), []);
  const police = useMemo(() => carVoxels(C.navy, C.navyDark), []);
  const heli = useMemo(() => helicopterVoxels(), []);
  const t = ease(frame / 56);
  const red = Math.floor(frame / 3.4) % 2 === 0;
  const rotor = frame * 1.9;
  const hx = -18;
  const hy = 56;
  const hz = -110;

  const cars: [number, number, number][] = [
    [-11, 0, 3],
    [9, 0, 1],
    [-2, 0, -9],
  ];

  return (
    <>
      <Sky top="#1f1540" mid="#5c2e60" low="#e8794a" />
      <fog attach="fog" args={["#7a4668", 260, 1600]} />
      <hemisphereLight args={["#ffc398", "#2a1a3a", 1.15]} />
      <ambientLight intensity={0.5} color="#806080" />
      <directionalLight position={[-360, 200, -520]} intensity={1.7} color="#ff9a68" />
      <directionalLight position={[200, 140, 300]} intensity={0.6} color="#7f9cff" />
      <Rig
        p={[lerp(10, 15, t), lerp(4.5, 22, t), lerp(26, 32, t)]}
        t={[lerp(0, -10, t), lerp(5, 30, t), lerp(-8, -58, t)]}
        fov={54}
      />
      <VoxelGroup voxels={voxels} />
      {cars.map(([cx, cy, cz], i) => (
        <React.Fragment key={i}>
          <group position={[cx, cy, cz]}>
            <VoxelGroup voxels={police} />
          </group>
          <Siren pos={[cx, cy + 7.5, cz]} red={i % 2 === 0 ? red : !red} />
          <Headlights x={cx} y={cy + 3.4} z={cz + 6.4} />
        </React.Fragment>
      ))}
      <group position={[hx, hy, hz]}>
        <VoxelGroup voxels={heli} />
        <group position={[0, 4.6, 0]} rotation={[0, rotor, 0]}>
          <mesh>
            <boxGeometry args={[42, 0.7, 1.8]} />
            <meshLambertMaterial color="#22222c" />
          </mesh>
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[42, 0.7, 1.8]} />
            <meshLambertMaterial color="#22222c" />
          </mesh>
        </group>
        <mesh position={[0, -0.4, -14.4]} rotation={[0, 0, rotor * 1.6]}>
          <boxGeometry args={[0.6, 11, 0.6]} />
          <meshLambertMaterial color="#22222c" />
        </mesh>
      </group>
      <mesh position={[hx, (hy + 1.5) / 2, (hz + 1.5) / 2]} rotation={[-0.24, 0, 0.04]}>
        <coneGeometry args={[26, hy - 2, 20, 1, true]} />
        <meshBasicMaterial
          color="#ffeeb4"
          transparent
          opacity={0.17}
          side={THREE.DoubleSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>
      <mesh position={[hx + 2, 0.9, hz + 26]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[24, 26]} />
        <meshBasicMaterial color="#ffeeb4" transparent opacity={0.28} depthWrite={false} fog={false} />
      </mesh>
      <pointLight position={[hx + 2, 20, hz + 26]} intensity={1.8} decay={0} color="#ffdca0" />
    </>
  );
};

const ShotLeads: React.FC<{ frame: number }> = ({ frame }) => {
  const voxels = useMemo(() => buildRooftop(), []);
  const t = ease(frame / 56);
  const ang = lerp(-0.72, 0.42, t);
  const R = lerp(17.5, 14.0, t);
  return (
    <>
      <Sky top="#4a1a3c" mid="#d8624a" low="#ffd29a" />
      <fog attach="fog" args={["#ef8a5a", 380, 2000]} />
      <hemisphereLight args={["#ffd0a4", "#5a2a48", 1.05]} />
      <ambientLight intensity={0.45} color="#a07088" />
      <directionalLight position={[30, 260, -1400]} intensity={2.8} color="#ffb478" />
      <directionalLight position={[0, 60, 220]} intensity={0.75} color="#ffd2a8" />
      <directionalLight position={[-260, 120, 120]} intensity={0.5} color="#9aa8ff" />
      <Rig
        p={[Math.sin(ang) * R + 1, lerp(11.5, 9.5, t), -52 + Math.cos(ang) * R]}
        t={[1.5, lerp(10.5, 10, t), -52]}
        fov={42}
      />
      <SunDisc pos={[60, 170, -2600]} r={230} />
      <VoxelGroup voxels={voxels} />
    </>
  );
};

const ShotJump: React.FC<{ frame: number }> = ({ frame }) => {
  const world = useMemo(() => buildPier(), []);
  const car = useMemo(() => carVoxels(C.white, 0xd8d0bc), []);
  const t = frame / 57;
  const cx = 0;
  const cy = 8 + 44 * t - 22 * t * t;
  const cz = 16 - 154 * t;
  const camP: [number, number, number] = [0, lerp(11, 26, ease(t)), lerp(34, -110, ease(t))];
  const pitch = 0.32 - t * 0.75;
  return (
    <>
      <Sky top="#5c2548" mid="#ef7d48" low="#ffdca8" />
      <fog attach="fog" args={["#f79a5e", 280, 1600]} />
      <hemisphereLight args={["#ffd6a8", "#6a3a48", 1.2]} />
      <directionalLight position={[420, 180, -1600]} intensity={2.6} color="#ffb478" />
      <directionalLight position={[-300, 120, 300]} intensity={0.55} color="#ffd6b0" />
      <Rig p={camP} t={[cx, cy + 1, cz]} fov={48} />
      <SunDisc pos={[380, 130, -2400]} r={240} />
      <VoxelGroup voxels={world} />
      <group position={[cx, cy, cz]} rotation={[pitch, 0.05, Math.sin(t * 3.2) * 0.1]}>
        <VoxelGroup voxels={car} />
      </group>
      <mesh position={[cx, cy + 0.5, cz + 10]} scale={[1 - t * 0.5, 1 - t * 0.5, 1]}>
        <boxGeometry args={[4.0, 2.2, 6]} />
        <meshBasicMaterial color="#ffd9a0" transparent opacity={0.18} depthWrite={false} fog={false} />
      </mesh>
    </>
  );
};

const ShotTitle: React.FC<{ frame: number }> = ({ frame }) => {
  const voxels = useMemo(() => buildTitleWorld(), []);
  const t = ease(frame / 52);
  return (
    <>
      <Sky top="#2a0614" mid="#7c1622" low="#ffb066" />
      <fog attach="fog" args={["#b8402a", 800, 3000]} />
      <hemisphereLight args={["#ffb27a", "#3a1020", 0.95]} />
      <directionalLight position={[0, 260, -900]} intensity={1.5} color="#ffb070" />
      <Rig p={[0, lerp(46, 36, t), lerp(340, 250, t)]} t={[0, lerp(30, 24, t), -850]} fov={46} />
      <SunDisc pos={[0, 46, -1900]} r={260} core="#FFE4AE" glow="#FF5A2A" />
      <VoxelGroup voxels={voxels} />
    </>
  );
};

/* ------------------------------------------------------------------- overlay */

const MaskLine: React.FC<{ text: string; start: number; frame: number }> = ({ text, start, frame }) => {
  if (frame < start) return null;
  const e = easeOut((frame - start) / 6);
  return (
    <div style={{ overflow: "hidden", paddingBottom: 6 }}>
      <div
        style={{
          transform: `translateY(${(1 - e) * 116}%)`,
          fontFamily: "Archivo",
          fontWeight: 900,
          fontSize: 108,
          lineHeight: 0.94,
          letterSpacing: "-0.018em",
          color: "#FFF7E8",
          textShadow: "0 8px 34px rgba(60,6,0,0.8), 0 2px 8px rgba(60,6,0,0.6)",
          whiteSpace: "nowrap",
          textTransform: "uppercase",
        }}
      >
        {text}
      </div>
    </div>
  );
};

const CUTS = [56, 113, 169, 225, 281, 338];

const Overlay: React.FC<{ frame: number }> = ({ frame }) => {
  const showLine = frame >= 7 && frame < 58;
  const barW = easeOut((frame - 7) / 8) * 140;

  let flash = 0;
  for (const c of CUTS) {
    const d = frame - c;
    if (d >= 0 && d < 4) flash = Math.max(flash, 1 - d / 4);
  }

  const showTitle = frame >= 338;
  const titleOp = clamp01((frame - 338) / 3);
  const titleE = easeOut((frame - 338) / 5);
  const subE = easeOut((frame - 339) / 5);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {showLine && (
        <>
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              width: 1200,
              height: 700,
              background:
                "linear-gradient(18deg, rgba(24,4,16,0.72) 0%, rgba(24,4,16,0.32) 48%, rgba(24,4,16,0) 78%)",
              opacity: clamp01((frame - 9) / 9),
            }}
          />
          <div style={{ position: "absolute", left: 92, bottom: 96 }}>
            <div style={{ width: barW, height: 11, backgroundColor: "#FF5A2A", marginBottom: 26 }} />
            <MaskLine text="ONE CITY." start={7} frame={frame} />
            <MaskLine text="TWO DEBTS." start={18} frame={frame} />
          </div>
        </>
      )}

      {showTitle && (
        <>
          <AbsoluteFill
            style={{
              background:
                "radial-gradient(ellipse 62% 46% at 50% 46%, rgba(30,4,14,0.62) 0%, rgba(30,4,14,0.34) 48%, rgba(30,4,14,0) 78%)",
              opacity: titleOp,
            }}
          />
          <AbsoluteFill
            style={{
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              paddingLeft: 80,
              paddingRight: 80,
            }}
          >
            <div
              style={{
                fontFamily: "Archivo",
                fontWeight: 900,
                fontSize: 238,
                lineHeight: 0.9,
                letterSpacing: "0.01em",
                color: "#FFF6E4",
                opacity: titleOp,
                transform: `scale(${lerp(1.34, 1, titleE)})`,
                textShadow:
                  "0 0 70px rgba(255,110,40,0.85), 0 0 160px rgba(255,150,60,0.55), 0 12px 40px rgba(40,0,0,0.85)",
              }}
            >
              SUNBURN
            </div>
            <div
              style={{
                marginTop: 30,
                fontFamily: "Archivo",
                fontWeight: 700,
                fontSize: 52,
                letterSpacing: `${lerp(0.92, 0.5, subE)}em`,
                color: "#FFE2B4",
                textTransform: "uppercase",
                clipPath: `inset(0 ${(1 - subE) * 50}% 0 ${(1 - subE) * 50}%)`,
                textShadow: "0 6px 28px rgba(40,0,0,0.9)",
                whiteSpace: "nowrap",
                paddingLeft: `${lerp(0.92, 0.5, subE)}em`,
              }}
            >
              COMING NOVEMBER
            </div>
          </AbsoluteFill>
        </>
      )}

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 90% 82% at 50% 52%, rgba(0,0,0,0) 52%, rgba(20,4,12,0.4) 100%)",
        }}
      />
      {flash > 0 && <AbsoluteFill style={{ backgroundColor: "#FFE0B0", opacity: flash * 0.5 }} />}
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------------- main */

export const Trailer: React.FC = () => {
  const frame = useCurrentFrame();
  const shot =
    frame < 56 ? 0 : frame < 113 ? 1 : frame < 169 ? 2 : frame < 225 ? 3 : frame < 281 ? 4 : frame < 338 ? 5 : 6;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0910" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <ThreeCanvas width={1920} height={1080}>
          {shot === 0 && <ShotCity frame={frame} />}
          {shot === 1 && <ShotCar frame={frame - 56} />}
          {shot === 2 && <ShotVault frame={frame - 113} />}
          {shot === 3 && <ShotPolice frame={frame - 169} />}
          {shot === 4 && <ShotLeads frame={frame - 225} />}
          {shot === 5 && <ShotJump frame={frame - 281} />}
          {shot === 6 && <ShotTitle frame={frame - 338} />}
        </ThreeCanvas>
      </div>
      <Overlay frame={frame} />
    </AbsoluteFill>
  );
};