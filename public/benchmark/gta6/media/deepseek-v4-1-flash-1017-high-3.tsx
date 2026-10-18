/**
 * SUNBURN — an original open-world crime game. Trailer, 13s, 30fps.
 *
 * CONCEPT
 * One golden hour that curdles into ember. The whole coast is voxels: art-deco
 * towers in cream and peach, a boulevard of palms, an ocean that goes from teal
 * to burnt orange. Two leads in one red convertible, driving toward a sun that
 * never quite sets. The city is beautiful, expensive, and about to be a crime
 * scene.
 *
 * STORYBOARD (beats at n * 14.0625; cuts land on bars 0,4,8,12,16,20,24)
 * S1 000–056 bar 0  WATER-LEVEL APPROACH.
 *      Camera skims the marina at eye height, yachts and palms sliding past, the
 *      pastel waterfront towers dead ahead with the pixel sun behind them.
 *      Rises and pushes in; FOV punches on every kick.
 * S2 056–113 bar 1  LOW CHASE CAM.
 *      Camera 1.2m off the tarmac behind the red convertible, both leads' heads
 *      above the windshield, towers and palms shearing past, sun at the end of
 *      the street.
 * S3 113–169 bar 2  ROOFTOP / PRESSURE.
 *      Over-the-shoulder low angle: two leads at the parapet in silhouette
 *      against the sun, cash on the deck, chopper above with a searchlight pool
 *      sweeping the roof. Slow push-in.
 * S4 169–225 bar 3  ROADBLOCK SMASH.
 *      Ground-level 3/4 on a police barricade. The convertible charges in,
 *      detonates through it at f197, then drops into slow-motion. Debris burst,
 *      camera shake, strobes.
 * S5 225–323 bars 4–5  THE TWO LEADS. STRONGEST BEAT.
 *      Orbit the convertible at sunset — faces, wind, cash in the air — then
 *      crane up and pull back onto the coastal highway with the sun over water.
 * S6 323–390 bar 6+  TITLE.
 *      A huge voxel sun sinks into black water behind a spired skyline; SUNBURN
 *      slams in with a mask wipe and scale, COMING NOVEMBER wipes underneath.
 *
 * TEXT ONLY:
 *   "ONE CITY. TWO DEBTS."  f24–108  (fully readable f40–96)
 *   "SUNBURN"               f326–    (fully readable from f338)
 *   "COMING NOVEMBER"       f334–    (fully readable from f344)
 */

import React, { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* math                                                                */
/* ------------------------------------------------------------------ */

type V3 = [number, number, number];
type VoxData = { pos: Float32Array; col: Float32Array; count: number };

const BEAT = 14.0625;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
const pulse = (f: number) => Math.exp(-((f % BEAT) / 5));
const pick = (a: number[], r: number): number => a[Math.floor(r * a.length) % a.length] ?? a[0];

const toLinear = (v: number) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

const mul = (hex: number, k: number) => {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((hex >> 8) & 255) * k));
  const b = Math.min(255, Math.round((hex & 255) * k));
  return (r << 16) | (g << 8) | b;
};

/* ------------------------------------------------------------------ */
/* voxel buffer                                                        */
/* ------------------------------------------------------------------ */

class Vox {
  P: number[] = [];
  C: number[] = [];
  cache = new Map<number, V3>();

  add(x: number, y: number, z: number, c: number) {
    this.P.push(x, y, z);
    let v = this.cache.get(c);
    if (!v) {
      v = [toLinear((c >> 16) & 255), toLinear((c >> 8) & 255), toLinear(c & 255)];
      this.cache.set(c, v);
    }
    this.C.push(v[0], v[1], v[2]);
  }

  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: number) {
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        for (let z = z0; z <= z1; z++) this.add(x, y, z, c);
  }

  build(): VoxData {
    return {
      pos: new Float32Array(this.P),
      col: new Float32Array(this.C),
      count: this.P.length / 3,
    };
  }
}

/* ------------------------------------------------------------------ */
/* instanced voxel mesh                                                */
/* ------------------------------------------------------------------ */

const VoxMesh: React.FC<{
  data: VoxData;
  scale?: number;
  position?: V3;
  rotation?: V3;
  max?: number;
  unlit?: boolean;
}> = ({ data, scale = 1, position, rotation, max, unlit }) => {
  const cap = Math.max(1, Math.min(max ?? data.count, data.count));
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    const c = new THREE.Color();
    for (let i = 0; i < cap; i++) {
      d.position.set(data.pos[i * 3], data.pos[i * 3 + 1], data.pos[i * 3 + 2]);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      c.setRGB(data.col[i * 3], data.col[i * 3 + 1], data.col[i * 3 + 2]);
      m.setColorAt(i, c);
    }
    m.count = cap;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [data, cap]);

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, cap] as any}
      scale={scale}
      position={position}
      rotation={rotation}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      {unlit ? <meshBasicMaterial fog={false} toneMapped={false} /> : <meshLambertMaterial />}
    </instancedMesh>
  );
};

/* ------------------------------------------------------------------ */
/* soft radial glow (generated texture)                                */
/* ------------------------------------------------------------------ */

const Glow: React.FC<{ pos: V3; size: number; color: string; opacity?: number }> = ({
  pos,
  size,
  color,
  opacity = 1,
}) => {
  const ref = useRef<THREE.Mesh>(null);
  const cam = useThree((s) => s.camera);
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.32, "rgba(255,255,255,0.55)");
    g.addColorStop(0.62, "rgba(255,255,255,0.16)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  useLayoutEffect(() => {
    if (ref.current) ref.current.lookAt(cam.position);
  });

  return (
    <mesh ref={ref} position={pos}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial
        map={tex}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
        fog={false}
      />
    </mesh>
  );
};

/* ------------------------------------------------------------------ */
/* voxel sun                                                           */
/* ------------------------------------------------------------------ */

const Sun: React.FC<{ pos: V3; r: number; cell?: number; glow?: number; core?: string }> = ({
  pos,
  r,
  cell = 6,
  glow = 2.6,
  core = "#ff9a40",
}) => {
  const data = useMemo(() => {
    const v = new Vox();
    const R = Math.max(1, Math.round(r / cell));
    for (let y = -R; y <= R; y++) {
      for (let x = -R; x <= R; x++) {
        const d = Math.sqrt(x * x + y * y) / R;
        if (d > 1) continue;
        const c = d < 0.5 ? 0xfff8de : d < 0.82 ? 0xffd684 : 0xff9440;
        v.add(x, y, 0, c);
      }
    }
    return v.build();
  }, [r, cell]);

  return (
    <group position={pos}>
      <Glow pos={[0, 0, 6]} size={r * glow * 2} color={core} opacity={0.6} />
      <VoxMesh data={data} scale={cell} unlit max={24000} />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* gradient sky + camera                                               */
/* ------------------------------------------------------------------ */

type Stop = [number, string];

const SkyGrad: React.FC<{ stops: Stop[]; fog?: string; near?: number; far?: number }> = ({
  stops,
  fog,
  near = 100,
  far = 1000,
}) => {
  const scene = useThree((s) => s.scene);
  const key = stops.map((s) => s[0] + s[1]).join("|");
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 2;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    for (const [p, col] of stops) g.addColorStop(p, col);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useLayoutEffect(() => {
    scene.background = tex;
    scene.fog = fog ? new THREE.Fog(new THREE.Color(fog), near, far) : null;
  }, [tex, fog, near, far, scene]);

  return null;
};

const Cam: React.FC<{ pos: V3; target: V3; fov?: number }> = ({ pos, target, fov = 45 }) => {
  const cam = useThree((s) => s.camera);
  useLayoutEffect(() => {
    cam.position.set(pos[0], pos[1], pos[2]);
    cam.lookAt(target[0], target[1], target[2]);
    const p = cam as THREE.PerspectiveCamera;
    if (p.isPerspectiveCamera) {
      p.near = 0.1;
      p.far = 16000;
      p.fov = fov;
      p.updateProjectionMatrix();
    }
    cam.updateMatrixWorld();
  });
  return null;
};

/* ------------------------------------------------------------------ */
/* shared model builders                                               */
/* ------------------------------------------------------------------ */

const PALETTE = [
  0xf7e6c6, 0xffd9b6, 0xf9bfa4, 0xa9dfd2, 0xffe7ab, 0xe9c6de, 0xd2ebe8, 0xffc79c,
];
const PALETTE_FAR = [0xd9a98e, 0xc89fab, 0xb9a2b8, 0xd8b39a, 0xb0a6c0];

const GLASS = 0x2a4a66;
const LITWIN = 0xffcf8e;

function tower(
  v: Vox,
  cx: number,
  cz: number,
  w: number,
  d: number,
  h: number,
  seed: string,
  pal: number[] = PALETTE,
  simple = false
) {
  const wall = pick(pal, random(seed + "w"));
  const base = mul(wall, 0.62);
  const shade = mul(wall, 0.88);

  for (let y = 0; y < h; y++) {
    for (let x = -w; x <= w; x++) {
      for (let z = -d; z <= d; z++) {
        const bx = Math.abs(x) === w;
        const bz = Math.abs(z) === d;
        if (!bx && !bz) continue;
        const corner = bx && bz;
        let c = wall;
        if (y === 0) c = base;
        else if (y % 3 === 1 && !corner) {
          const along = bx ? z : x;
          if (Math.abs(along) % 3 !== 0) {
            c = random(seed + along + "_" + y) > 0.9 ? LITWIN : GLASS;
          } else c = shade;
        } else if (y % 3 === 0) c = shade;
        v.add(cx + x, y, cz + z, c);
      }
    }
  }

  if (simple) return;

  for (let x = -w - 1; x <= w + 1; x++)
    for (let z = -d - 1; z <= d + 1; z++) {
      if (Math.abs(x) !== w + 1 && Math.abs(z) !== d + 1) continue;
      v.add(cx + x, h, cz + z, mul(wall, 0.8));
    }

  for (let x = -w; x <= w; x++)
    for (let z = -d; z <= d; z++) v.add(cx + x, h + 1, cz + z, mul(wall, 0.5));

  if (random(seed + "prop") > 0.5) {
    const px = cx + Math.round((random(seed + "px") - 0.5) * w);
    const pz = cz + Math.round((random(seed + "pz") - 0.5) * d);
    const ph = 2 + Math.floor(random(seed + "ph") * 4);
    for (let y = h + 2; y < h + 2 + ph; y++) v.add(px, y, pz, 0xff5a3c);
  }
}

const PALM_S = 0.36;

function addPalm(v: Vox, wx: number, wz: number, h: number, lean: number) {
  const x = Math.round(wx / PALM_S);
  const z = Math.round(wz / PALM_S);
  const trunk = 0x94714a;
  const trunk2 = 0x77573a;
  const leafA = 0x2c7d46;
  const leafB = 0x44a75e;

  for (let i = 0; i < h; i++) {
    const px = x + Math.round(Math.sin(i * 0.24) * lean);
    v.add(px, i, z, i % 3 === 0 ? trunk2 : trunk);
  }
  const tx = x + Math.round(Math.sin((h - 1) * 0.24) * lean);
  const ty = h;
  for (let a = 0; a < 9; a++) {
    const ang = (a / 9) * Math.PI * 2 + 0.25;
    for (let d = 1; d <= 5; d++) {
      v.add(
        tx + Math.round(Math.cos(ang) * d),
        ty - Math.floor(d * 0.45),
        z + Math.round(Math.sin(ang) * d),
        d < 3 ? leafA : leafB
      );
    }
  }
  v.add(tx, ty + 1, z, leafB);
  v.add(tx, ty + 2, z, leafA);
}

function buildPerson(o: {
  skin: number;
  hair: number;
  top: number;
  pants: number;
  shades?: boolean;
}): VoxData {
  const v = new Vox();
  const shoe = 0x1a1a20;
  const sleeve = mul(o.top, 0.8);
  const hem = mul(o.top, 0.7);

  for (let y = 0; y <= 10; y++)
    for (let x = -2; x <= 2; x++)
      for (let z = -1; z <= 1; z++) {
        if (x === 0) continue;
        v.add(x, y, z, y <= 1 ? shoe : y === 10 ? mul(o.pants, 0.82) : o.pants);
      }

  for (let y = 11; y <= 19; y++)
    for (let x = -2; x <= 2; x++)
      for (let z = -1; z <= 1; z++) v.add(x, y, z, y === 11 ? hem : y === 19 ? sleeve : o.top);

  for (const ax of [-3, 3])
    for (let y = 11; y <= 18; y++)
      for (let z = -1; z <= 1; z++) v.add(ax, y, z, y >= 16 ? o.skin : o.top);

  v.add(0, 20, 0, o.skin);

  for (let y = 21; y <= 25; y++)
    for (let x = -2; x <= 2; x++)
      for (let z = -2; z <= 2; z++) {
        let c = o.skin;
        if (y === 25) c = o.hair;
        if (z === -2) c = o.hair;
        if (y >= 23 && Math.abs(x) === 2 && z <= 0) c = o.hair;
        if (y === 24 && z === 2 && Math.abs(x) <= 1)
          c = o.shades ? 0x14151b : mul(o.skin, 0.5);
        if (y === 22 && z === 2 && Math.abs(x) <= 1) c = mul(o.skin, 0.88);
        v.add(x, y, z, c);
      }

  return v.build();
}

/** The hero car: a deep-red sunset cruiser with cream trim and an open top. */
function buildHeroCar(): VoxData {
  const v = new Vox();
  const body = 0xc0392b;
  const bodyHi = 0xd94b34;
  const cream = 0xf2e3c4;
  const wheel = 0x14151b;
  const hub = 0xd8dde6;
  const glass = 0x24333f;
  const seat = 0x8a6a4a;
  const dark = 0x1c1d24;

  for (let z = -9; z <= 9; z++)
    for (let x = -4; x <= 4; x++) {
      v.add(x, 1, z, body);
      v.add(x, 2, z, z > 4 || z < -4 ? body : bodyHi);
    }

  for (let z = -8; z <= 8; z++) {
    v.add(-5, 1, z, cream);
    v.add(5, 1, z, cream);
    v.add(-5, 2, z, z < -6 || z > 6 ? cream : dark);
    v.add(5, 2, z, z < -6 || z > 6 ? cream : dark);
  }

  for (let z = -9; z <= -5; z++) for (let x = -4; x <= 4; x++) v.add(x, 3, z, bodyHi);
  for (let z = 6; z <= 9; z++) for (let x = -4; x <= 4; x++) v.add(x, 3, z, bodyHi);
  for (let z = -5; z <= 6; z++) {
    v.add(-4, 3, z, body);
    v.add(4, 3, z, body);
  }

  for (let z = -4; z <= 5; z++) {
    for (let x = -3; x <= 3; x++) v.add(x, 2, z, dark);
    v.add(-2, 3, z, seat);
    v.add(2, 3, z, seat);
  }

  for (let x = -3; x <= 3; x++) {
    v.add(x, 3, -5, body);
    v.add(x, 4, -5, glass);
    v.add(x, 5, -5, glass);
    v.add(x, 6, -5, cream);
  }
  for (const sx of [-3, 3]) {
    v.add(sx, 4, -4, glass);
    v.add(sx, 5, -4, glass);
  }

  for (const x of [-3, -2, 2, 3]) {
    v.add(x, 2, -9, 0xfff6d8);
    v.add(x, 2, 9, 0xff3a22);
  }
  v.add(0, 2, -9, 0xfff6d8);
  v.add(0, 2, 9, 0xff3a22);

  for (const wz of [-6, 6])
    for (const wx of [-5, 5]) {
      v.add(wx, 0, wz - 1, wheel);
      v.add(wx, 0, wz, hub);
      v.add(wx, 0, wz + 1, wheel);
      v.add(wx, -1, wz, wheel);
    }

  return v.build();
}

function buildCopCar(): VoxData {
  const v = new Vox();
  const body = 0xe9edf2;
  const bLow = 0x20222a;
  const glass = 0x1d2b39;
  const wheel = 0x14151b;
  const hub = 0xc4cad4;

  for (let z = -9; z <= 9; z++)
    for (let x = -4; x <= 4; x++) {
      v.add(x, 1, z, bLow);
      v.add(x, 2, z, body);
    }
  for (let z = -9; z <= 9; z++) {
    v.add(-5, 2, z, bLow);
    v.add(5, 2, z, bLow);
  }
  for (let z = -9; z <= 9; z++) for (let x = -4; x <= 4; x++) v.add(x, 3, z, body);
  for (let z = -4; z <= 4; z++)
    for (let x = -3; x <= 3; x++) {
      const c = z === -4 || z === 4 ? glass : body;
      v.add(x, 4, z, c);
      v.add(x, 5, z, c);
      v.add(x, 6, z, body);
    }
  v.add(0, 7, 0, 0x1a1c24);
  for (const x of [-1, 1]) {
    v.add(x, 7, 0, x < 0 ? 0xff2233 : 0x2244ff);
    v.add(x, 8, 0, x < 0 ? 0xff2233 : 0x2244ff);
  }
  for (const x of [-3, -2, 2, 3]) {
    v.add(x, 2, -9, 0xfff6d8);
    v.add(x, 2, 9, 0xff3a22);
  }
  for (const wz of [-6, 6])
    for (const wx of [-5, 5]) {
      v.add(wx, 0, wz, wheel);
      v.add(wx, 1, wz, hub);
    }
  return v.build();
}

function buildHeli(): VoxData {
  const v = new Vox();
  const body = 0x23252e;
  const trim = 0x3b404b;
  for (let z = -4; z <= 4; z++)
    for (let y = 0; y <= 4; y++)
      for (let x = -3; x <= 3; x++) {
        if (Math.abs(x) === 3 && (y === 0 || y === 4)) continue;
        if (z === 4 && (Math.abs(x) === 3 || y === 4)) continue;
        v.add(x, y, z, body);
      }
  for (let z = 5; z <= 13; z++) for (let y = 1; y <= 2; y++) v.add(0, y, z, trim);
  v.add(0, 3, 13, trim);
  v.add(0, 4, 13, trim);
  for (const x of [-3, 3]) for (let z = -3; z <= 3; z++) v.add(x, -1, z, trim);
  v.add(0, 5, 0, trim);
  v.add(0, 6, 0, trim);
  v.add(2, 3, 4, 0xff4a3a);
  v.add(-2, 3, 4, 0x4affa0);
  return v.build();
}

function buildBarrier(): VoxData {
  const v = new Vox();
  for (let x = -7; x <= 7; x++)
    for (let y = 5; y <= 7; y++) {
      const stripe = Math.floor((x + 7) / 2) % 2 === 0;
      v.add(x, y, 0, stripe ? 0xf4f4f6 : 0xd7452a);
    }
  for (const lx of [-5, 5]) {
    for (let y = 0; y <= 4; y++) v.add(lx, y, 0, 0x9aa2ac);
    v.add(lx, 0, 1, 0x8a929c);
    v.add(lx, 0, -1, 0x8a929c);
  }
  return v.build();
}

function buildFarSkyline(seedBase: string, count: number, spread: number, zBase: number): VoxData {
  const v = new Vox();
  for (let i = 0; i < count; i++) {
    const s = seedBase + i;
    const cx = -spread / 2 + (i / count) * spread + (random(s + "x") - 0.5) * 10;
    const cz = zBase - Math.round(random(s + "z") * 70);
    const w = 3 + Math.floor(random(s + "w") * 4);
    const d = 3 + Math.floor(random(s + "d") * 4);
    const h = 12 + Math.floor(random(s + "h") * 22);
    tower(v, cx, cz, w, d, h, s, PALETTE_FAR, true);
  }
  return v.build();
}

/* ------------------------------------------------------------------ */
/* SHOT 1 — water-level approach to the skyline (0 → 56)               */
/* ------------------------------------------------------------------ */

function buildBayCity(): VoxData {
  const v = new Vox();
  for (let i = 0; i < 11; i++) {
    const s = "w" + i;
    const cx = -70 + i * 14 + Math.round((random(s + "x") - 0.5) * 6);
    const cz = -22 - Math.round(random(s + "z") * 26);
    const w = 4 + Math.floor(random(s + "w") * 3);
    const d = 4 + Math.floor(random(s + "d") * 3);
    const h = 16 + Math.floor(random(s + "h") * 13);
    tower(v, cx, cz, w, d, h, s);
  }
  for (let i = 0; i < 12; i++) {
    const s = "r" + i;
    const cx = -96 + i * 17 + Math.round((random(s + "x") - 0.5) * 8);
    const cz = -120 - Math.round(random(s + "z") * 80);
    const w = 5 + Math.floor(random(s + "w") * 4);
    const d = 5 + Math.floor(random(s + "d") * 4);
    const h = 20 + Math.floor(random(s + "h") * 16);
    tower(v, cx, cz, w, d, h, s, PALETTE_FAR, true);
  }
  return v.build();
}

function buildShore(): VoxData {
  const v = new Vox();
  for (let i = 0; i < 13; i++) {
    addPalm(v, -84 + i * 14 + (random("sp" + i) - 0.5) * 6, -6 + (random("spz" + i) - 0.5) * 8, 20 + Math.floor(random("sph" + i) * 6), 1);
  }
  return v.build();
}

const ShotCity: React.FC<{ f: number }> = ({ f }) => {
  const city = useMemo(buildBayCity, []);
  const shore = useMemo(buildShore, []);
  const e = smooth(f / 55);
  const p = pulse(f);

  const pos: V3 = [lerp(56, 12, e), lerp(17, 31, e), lerp(150, 76, e)];
  const tgt: V3 = [lerp(-8, 0, e), lerp(40, 44, e), lerp(-190, -240, e)];

  return (
    <>
      <SkyGrad
        stops={[
          [0, "#5a3578"],
          [0.28, "#b85f7e"],
          [0.5, "#ef8f6e"],
          [0.68, "#ffb47e"],
          [0.84, "#ffd0a0"],
          [1, "#ffe3b8"],
        ]}
        fog="#ffb98e"
        near={200}
        far={1500}
      />
      <Cam pos={pos} target={tgt} fov={44 - p * 2.6} />

      <ambientLight intensity={0.58} color="#ffd3b4" />
      <hemisphereLight args={["#ffd2a6", "#6a3f66", 1.0]} />
      <directionalLight position={[-420, 170, -880]} intensity={3.0} color="#ffc884" />
      <directionalLight position={[300, 140, 320]} intensity={0.5} color="#8fb0ff" />

      <Sun pos={[-60, 76, -980]} r={128} cell={8} glow={2.6} />

      {/* water */}
      <mesh position={[0, -0.9, 420]}>
        <boxGeometry args={[5200, 1.6, 1900]} />
        <meshLambertMaterial color="#1f6482" />
      </mesh>
      <mesh position={[0, -0.62, 190]}>
        <boxGeometry args={[3400, 1.0, 380]} />
        <meshLambertMaterial color="#2a7694" />
      </mesh>
      <mesh position={[-60, -0.2, 300]}>
        <boxGeometry args={[190, 0.1, 900]} />
        <meshBasicMaterial color="#ffcf9c" transparent opacity={0.34} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[-60, -0.16, 120]}>
        <boxGeometry args={[95, 0.1, 260]} />
        <meshBasicMaterial color="#ffe0b4" transparent opacity={0.5} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* land */}
      <mesh position={[0, -0.3, -420]}>
        <boxGeometry args={[3600, 1, 900]} />
        <meshLambertMaterial color="#cbb191" />
      </mesh>
      <mesh position={[0, 0.05, -14]}>
        <boxGeometry args={[1600, 0.5, 34]} />
        <meshLambertMaterial color="#e6d0a6" />
      </mesh>
      <mesh position={[0, 0.35, 4]}>
        <boxGeometry args={[1500, 0.7, 8]} />
        <meshLambertMaterial color="#c9b291" />
      </mesh>

      <VoxMesh data={city} scale={3} />
      <VoxMesh data={shore} scale={PALM_S} />

      {/* yachts */}
      {[
        [-58, 66, 4],
        [-18, 118, 3.4],
        [42, 82, 3.8],
        [-112, 96, 3.2],
        [96, 132, 3.6],
      ].map(([bx, bz, bs], i) => (
        <group key={i} position={[bx, -0.2, bz]} rotation={[0, (i - 2) * 0.4, 0]}>
          <mesh>
            <boxGeometry args={[7 * bs, 2 * bs, 3 * bs]} />
            <meshLambertMaterial color="#f3ede2" />
          </mesh>
          <mesh position={[0, 1.6 * bs, 0]}>
            <boxGeometry args={[3.6 * bs, 1.6 * bs, 2.4 * bs]} />
            <meshLambertMaterial color="#dbe6ea" />
          </mesh>
          <mesh position={[0, 3.4 * bs, 0]}>
            <boxGeometry args={[0.18, 2.4 * bs, 0.18]} />
            <meshLambertMaterial color="#b9c2cc" />
          </mesh>
        </group>
      ))}

      {/* breakwater */}
      <mesh position={[240, 0.3, 60]}>
        <boxGeometry args={[8, 2.4, 420]} />
        <meshLambertMaterial color="#9d9484" />
      </mesh>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* SHOT 2 — low chase cam (56 → 113)                                   */
/* ------------------------------------------------------------------ */

function buildBoulevard(): VoxData {
  const v = new Vox();
  for (const side of [-1, 1]) {
    for (let i = 0; i < 11; i++) {
      const s = `bv${side}_${i}`;
      const cz = 16 - i * 24;
      const w = 2 + Math.floor(random(s + "w") * 3);
      const d = 3 + Math.floor(random(s + "d") * 3);
      const h = 9 + Math.floor(random(s + "h") * 13);
      const cx = side * (12 + w + Math.floor(random(s + "cx") * 3));
      tower(v, cx, cz, w, d, h, s);
    }
    for (let i = 0; i < 8; i++) {
      const s = `bvB${side}_${i}`;
      const cz = 6 - i * 34;
      const w = 3 + Math.floor(random(s + "w") * 3);
      const h = 16 + Math.floor(random(s + "h") * 20);
      tower(v, side * (30 + w), cz, w, 4, h, s, PALETTE, true);
    }
  }
  return v.build();
}

function buildStreetPalms(): VoxData {
  const v = new Vox();
  for (let i = 0; i < 16; i++) {
    const z = 34 - i * 19;
    addPalm(v, -10.5, z, 17 + Math.floor(random("stp" + i) * 4), 1);
    addPalm(v, 10.5, z + 9, 16 + Math.floor(random("stq" + i) * 4), 1);
  }
  return v.build();
}

const CAR_S = 0.26;

const ShotChase: React.FC<{ f: number }> = ({ f }) => {
  const city = useMemo(buildBoulevard, []);
  const palms = useMemo(buildStreetPalms, []);
  const car = useMemo(buildHeroCar, []);
  const leadA = useMemo(
    () => buildPerson({ skin: 0x8d5a3c, hair: 0x14101a, top: 0xf4f1ea, pants: 0x24242c }),
    []
  );
  const leadB = useMemo(
    () => buildPerson({ skin: 0xc9915f, hair: 0x2a1a12, top: 0xffc247, pants: 0x2a2a33, shades: true }),
    []
  );

  const t = clamp01((f - 56) / 57);
  const carZ = 30 - t * 262;
  const bob = Math.sin(f * 0.85) * 0.05;
  const p = pulse(f);

  const pos: V3 = [2.6 + Math.sin(f * 0.06) * 0.35, lerp(1.15, 1.45, t) + bob - p * 0.05, carZ + 7.4];
  const tgt: V3 = [0, 0.95, carZ - 9];

  return (
    <>
      <SkyGrad
        stops={[
          [0, "#5d3778"],
          [0.32, "#c96a78"],
          [0.6, "#fb9668"],
          [0.8, "#ffc191"],
          [1, "#ffe4bb"],
        ]}
        fog="#ffb98c"
        near={60}
        far={470}
      />
      <Cam pos={pos} target={tgt} fov={56 - p * 3.2} />

      <ambientLight intensity={0.55} color="#ffdcc0" />
      <hemisphereLight args={["#ffd4a4", "#5a3450", 0.95]} />
      <directionalLight position={[-160, 130, carZ - 460]} intensity={2.8} color="#ffc98e" />
      <directionalLight position={[120, 60, carZ + 200]} intensity={0.5} color="#7f9cff" />

      <Sun pos={[-10, 36, -760]} r={92} cell={8} glow={2.6} />

      <mesh position={[0, -0.15, -130]}>
        <boxGeometry args={[16, 0.3, 640]} />
        <meshLambertMaterial color="#44464e" />
      </mesh>
      <mesh position={[-10, 0.12, -130]}>
        <boxGeometry args={[4, 0.25, 640]} />
        <meshLambertMaterial color="#b3a290" />
      </mesh>
      <mesh position={[10, 0.12, -130]}>
        <boxGeometry args={[4, 0.25, 640]} />
        <meshLambertMaterial color="#b3a290" />
      </mesh>
      {Array.from({ length: 15 }).map((_, i) => (
        <mesh key={i} position={[0, 0.04, 24 - i * 22]}>
          <boxGeometry args={[0.4, 0.05, 8]} />
          <meshBasicMaterial color="#ffe2a8" />
        </mesh>
      ))}

      <VoxMesh data={city} scale={2} />
      <VoxMesh data={palms} scale={PALM_S} />

      <VoxMesh data={car} scale={CAR_S} position={[0, 0, carZ]} />
      <VoxMesh data={leadA} scale={CAR_S * 0.29} position={[-0.34, 0.72, carZ + 0.2]} />
      <VoxMesh data={leadB} scale={CAR_S * 0.29} position={[0.36, 0.72, carZ + 0.05]} />

      {Array.from({ length: 10 }).map((_, i) => {
        const s = "stk" + i;
        const zz = carZ + 30 - ((i * 19 + f * 7) % 110);
        return (
          <mesh key={i} position={[i % 2 ? -8.6 : 8.6, 0.45 + random(s) * 1.6, zz]}>
            <boxGeometry args={[0.1, 0.1, 6]} />
            <meshBasicMaterial
              color="#ffe4b0"
              transparent
              opacity={0.4}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* SHOT 3 — rooftop, two leads, police pressure (113 → 169)            */
/* ------------------------------------------------------------------ */

function buildRoofDeck(): VoxData {
  const v = new Vox();
  const deck = 0x4d4756;
  const deckAlt = 0x434050;
  const edge = 0x6f6878;
  for (let x = -24; x <= 24; x++)
    for (let z = -18; z <= 18; z++) {
      if (Math.abs(x) === 24 || Math.abs(z) === 18) continue;
      v.add(x, 0, z, (x + z) % 2 === 0 ? deck : deckAlt);
    }
  for (let x = -24; x <= 24; x++) {
    v.add(x, 1, -18, edge);
    v.add(x, 2, -18, edge);
    v.add(x, 3, -18, mul(edge, 0.85));
    v.add(x, 4, -18, mul(edge, 1.1));
  }
  for (const sx of [-24, 24])
    for (let z = -18; z <= 18; z++) {
      v.add(sx, 1, z, edge);
      v.add(sx, 2, z, edge);
      v.add(sx, 3, z, mul(edge, 0.85));
    }
  // back wall + door
  for (let x = -24; x <= 24; x++)
    for (let y = 1; y <= 16; y++) v.add(x, y, 18, y % 4 === 0 ? 0x3a3543 : 0x4a4452);
  v.box(-3, 1, 17, 3, 7, 18, 0x2a2532);
  v.box(3, 6, 17, 8, 12, 18, 0xff4a3c);
  // clutter
  v.box(-18, 1, -8, -13, 5, -3, 0x6d6676);
  v.box(13, 1, -4, 19, 7, 4, 0x5f5869);
  v.box(14, 8, -1, 18, 9, 3, 0x6d6676);
  v.box(-20, 1, 6, -15, 3, 11, 0x565060);
  // cash on the deck
  v.box(-3, 1, -6, 1, 2, -4, 0x8f9a5e);
  v.add(-1, 3, -5, 0xc6d184);
  v.add(1, 3, -5, 0xc6d184);
  v.box(4, 1, -8, 6, 2, -6, 0x8f9a5e);
  v.add(5, 3, -7, 0xc6d184);
  return v.build();
}

const ShotRooftop: React.FC<{ f: number }> = ({ f }) => {
  const deck = useMemo(buildRoofDeck, []);
  const below = useMemo(() => buildFarSkyline("cb", 14, 520, -260), []);
  const heli = useMemo(buildHeli, []);
  const leadA = useMemo(
    () => buildPerson({ skin: 0x8d5a3c, hair: 0x14101a, top: 0xf4f1ea, pants: 0x24242c }),
    []
  );
  const leadB = useMemo(
    () => buildPerson({ skin: 0xc9915f, hair: 0x2a1a12, top: 0xd8433a, pants: 0x25252d, shades: true }),
    []
  );

  const t = smooth((f - 113) / 56);
  const p = pulse(f);

  const pos: V3 = [lerp(-1.35, -0.95, t), lerp(1.82, 1.62, t) - p * 0.03, lerp(-0.55, -1.35, t)];
  const tgt: V3 = [lerp(0.42, 0.28, t), lerp(1.42, 1.52, t), -5.6];

  const sweep = Math.sin(f * 0.09) * 4.2;
  const rotor = f * 0.62;
  const heliPos: V3 = [7.5, 6.2, -22];

  return (
    <>
      <SkyGrad
        stops={[
          [0, "#43255a"],
          [0.26, "#8f3f6c"],
          [0.5, "#dd6a60"],
          [0.7, "#ff9b62"],
          [0.88, "#ffcb94"],
          [1, "#ffe7bc"],
        ]}
        fog="#cf7370"
        near={50}
        far={420}
      />
      <Cam pos={pos} target={tgt} fov={47} />

      <ambientLight intensity={0.58} color="#ffc7ae" />
      <hemisphereLight args={["#ffb183", "#3c2448", 1.0]} />
      <directionalLight position={[110, 70, -760]} intensity={2.8} color="#ffab6e" />

      <Sun pos={[66, 34, -860]} r={116} cell={8} glow={2.7} />

      <VoxMesh data={below} scale={2.4} position={[0, -46, 0]} />

      <mesh position={[0, -28, -90]}>
        <boxGeometry args={[1400, 40, 460]} />
        <meshLambertMaterial color="#3b2b46" />
      </mesh>

      <VoxMesh data={deck} scale={0.25} position={[0, 0, 0]} />

      <VoxMesh data={leadA} scale={0.062} position={[-0.55, 0.05, -4.15]} rotation={[0, Math.PI, 0]} />
      <VoxMesh
        data={leadB}
        scale={0.062}
        position={[0.5, 0.05, -4.35]}
        rotation={[0, Math.PI - 0.24, 0]}
      />

      <VoxMesh data={heli} scale={0.5} position={heliPos} rotation={[0, 0.5, 0.16]} />
      <mesh position={[heliPos[0], heliPos[1] + 2.9, heliPos[2]]} rotation={[0, rotor, 0]}>
        <boxGeometry args={[6.4, 0.16, 0.5]} />
        <meshBasicMaterial color="#8f95a4" />
      </mesh>
      <mesh position={[heliPos[0], heliPos[1] + 2.9, heliPos[2]]} rotation={[0, rotor + 1.57, 0]}>
        <boxGeometry args={[6.4, 0.16, 0.5]} />
        <meshBasicMaterial color="#8f95a4" />
      </mesh>
      <mesh position={[heliPos[0] + 1.1, heliPos[1] + 1.3, heliPos[2] + 1.9]}>
        <boxGeometry args={[0.55, 0.55, 0.55]} />
        <meshBasicMaterial
          color={Math.floor(f / 5) % 2 === 0 ? "#ff2a3a" : "#180b12"}
          toneMapped={false}
        />
      </mesh>

      {/* searchlight pool sweeping the parapet */}
      <mesh position={[sweep, 1.02, -3.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.9, 24]} />
        <meshBasicMaterial
          color="#bcd8ff"
          transparent
          opacity={0.34}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* SHOT 4 — roadblock smash (169 → 225)                                */
/* ------------------------------------------------------------------ */

const IMPACT = 197;
const BLOCK_Z = -48;
const CAR_S4 = 0.62;

const ShotRoadblock: React.FC<{ f: number }> = ({ f }) => {
  const cop = useMemo(buildCopCar, []);
  const hero = useMemo(buildHeroCar, []);
  const barrier = useMemo(buildBarrier, []);
  const backdrop = useMemo(() => buildFarSkyline("rb", 14, 420, -260), []);

  const dt = f - 169;
  const carZ = f < IMPACT ? -150 + dt * 3.64 : BLOCK_Z + (f - IMPACT) * 0.55;

  const shake = f >= IMPACT && f < IMPACT + 8 ? Math.sin(f * 2.3) * 0.16 : 0;
  const p = pulse(f);
  const push = smooth((f - 169) / 56);

  const pos: V3 = [lerp(11.5, 8.6, push) + shake, 2.9 + shake * 0.5 - p * 0.04, lerp(-20, -24, push)];
  const tgt: V3 = [0, 2.3, BLOCK_Z - 6];

  const strobe = Math.floor(f / 3) % 2 === 0;

  const debris = useMemo(() => {
    const v = new Vox();
    const d = f - IMPACT;
    if (d > 0 && d < 44) {
      const ds = d / 30;
      for (let i = 0; i < 54; i++) {
        const a = random("da" + i) * Math.PI * 2;
        const sp = 3 + random("ds" + i) * 8;
        const up = 3 + random("du" + i) * 7;
        const wx = Math.cos(a) * sp * ds;
        const wz = BLOCK_Z + Math.sin(a) * sp * ds * 0.7;
        const wy = 0.9 + up * ds - 9 * ds * ds;
        if (wy < 0.12) continue;
        const c = i % 4 === 0 ? 0x9aa2ac : i % 4 === 1 ? 0xd7452a : i % 4 === 2 ? 0xf0f0f2 : 0x2a2a32;
        v.add(wx / 0.34, wy / 0.34, wz / 0.34, c);
      }
    }
    return v.build();
  }, [f]);

  const sparks = useMemo(() => {
    const v = new Vox();
    const d = f - IMPACT;
    if (d > 0 && d < 14) {
      for (let i = 0; i < 20; i++) {
        const a = random("sa" + i) * Math.PI * 2;
        const rr = 1.2 + d * 0.5;
        v.add((Math.cos(a) * rr) / 0.16, (0.7 + random("su" + i) * 1.4 + d * 0.1) / 0.16, (BLOCK_Z + Math.sin(a) * rr) / 0.16, 0xffcf7a);
      }
    }
    return v.build();
  }, [f]);

  const barrierState = (i: number) => {
    if (f < IMPACT) return { x: (i - 1) * 7.5, y: 0, rz: 0 };
    const k = Math.min(1, (f - IMPACT) / 10);
    return {
      x: (i - 1) * 7.5 + (i === 1 ? 0 : (i - 1) * 5 * k),
      y: i === 1 ? -0.6 * k : 0,
      rz: i === 1 ? -0.5 * k : (i - 1) * 0.7 * k,
    };
  };

  return (
    <>
      <SkyGrad
        stops={[
          [0, "#2a1740"],
          [0.28, "#6a2f5c"],
          [0.54, "#c25656"],
          [0.76, "#ff9558"],
          [0.9, "#ffc78f"],
          [1, "#ffe6bd"],
        ]}
        fog="#a8556a"
        near={60}
        far={420}
      />
      <Cam pos={pos} target={tgt} fov={46} />

      <ambientLight intensity={1.0} color={strobe ? "#ffc0b0" : "#bcd0ff"} />
      <hemisphereLight args={["#ffb98a", "#33203e", 1.15]} />
      <directionalLight position={[-90, 80, -520]} intensity={2.6} color="#ffb27e" />

      <Sun pos={[-30, 40, -900]} r={110} cell={8} glow={2.6} />

      {/* road */}
      <mesh position={[0, -0.15, -60]}>
        <boxGeometry args={[90, 0.3, 420]} />
        <meshLambertMaterial color="#3b3e46" />
      </mesh>
      <mesh position={[0, 0.04, -60]}>
        <boxGeometry args={[0.5, 0.05, 420]} />
        <meshBasicMaterial color="#e0cf9c" />
      </mesh>
      <mesh position={[-26, 0.16, -60]}>
        <boxGeometry args={[8, 0.32, 420]} />
        <meshLambertMaterial color="#8a7e6e" />
      </mesh>
      <mesh position={[26, 0.16, -60]}>
        <boxGeometry args={[8, 0.32, 420]} />
        <meshLambertMaterial color="#8a7e6e" />
      </mesh>

      <VoxMesh data={backdrop} scale={3} position={[0, 0, -60]} />

      {/* barriers */}
      {[0, 1, 2].map((i) => {
        const s = barrierState(i);
        return (
          <VoxMesh
            key={i}
            data={barrier}
            scale={0.42}
            position={[s.x, s.y, BLOCK_Z]}
            rotation={[0, 0, s.rz]}
          />
        );
      })}

      {/* streetlights */}
      {[-14, 14].map((lx, i) => (
        <group key={i} position={[lx, 0, BLOCK_Z - 14]}>
          <mesh position={[0, 5, 0]}>
            <boxGeometry args={[0.35, 10, 0.35]} />
            <meshLambertMaterial color="#363a43" />
          </mesh>
          <mesh position={[0, 10.2, 0]}>
            <boxGeometry args={[2.2, 0.4, 0.7]} />
            <meshBasicMaterial color="#ffe0a8" toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* police cruisers */}
      <VoxMesh data={cop} scale={CAR_S4} position={[-17, 0, -58]} rotation={[0, 0.85, 0]} />
      <VoxMesh data={cop} scale={CAR_S4} position={[17, 0, -60]} rotation={[0, -0.85, 0]} />
      <VoxMesh data={cop} scale={CAR_S4} position={[-1, 0, -72]} rotation={[0, 0.1, 0]} />

      {[
        [-17, -58, 3.6],
        [17, -60, 3.6],
        [-1, -72, 3.6],
      ].map(([lx, lz, ly], i) => (
        <group key={i}>
          <mesh position={[lx, ly, lz]}>
            <boxGeometry args={[3.4, 0.5, 1.3]} />
            <meshBasicMaterial
              color={(strobe && i % 2 === 0) || (!strobe && i % 2 === 1) ? "#ff2233" : "#2b46ff"}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[lx, ly, lz]}>
            <boxGeometry args={[5.5, 5.5, 5.5]} />
            <meshBasicMaterial
              color={(strobe && i % 2 === 0) || (!strobe && i % 2 === 1) ? "#ff2233" : "#2b46ff"}
              transparent
              opacity={0.14}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      <VoxMesh data={hero} scale={CAR_S4} position={[0, 0, carZ]} rotation={[0, 0.02, 0]} />

      <mesh position={[0, 0.07, carZ - 14]}>
        <boxGeometry args={[16, 0.05, 30]} />
        <meshBasicMaterial
          color="#ffe6b0"
          transparent
          opacity={0.14}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <VoxMesh data={debris} scale={0.34} max={60} />
      <VoxMesh data={sparks} scale={0.16} max={30} unlit />

      {f >= IMPACT && f < IMPACT + 10 && (
        <mesh position={[0, 2.2, BLOCK_Z]}>
          <planeGeometry args={[40, 40]} />
          <meshBasicMaterial
            color="#ffd9a0"
            transparent
            opacity={Math.max(0, 0.6 - (f - IMPACT) * 0.06)}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* SHOT 5 — the two leads, orbit then crane (225 → 323)                */
/* ------------------------------------------------------------------ */

function buildCoastPalms(): VoxData {
  const v = new Vox();
  for (let i = 0; i < 24; i++) {
    const z = 44 - i * 15;
    addPalm(v, -10.5, z, 19 + Math.floor(random("cp" + i) * 5), 1);
    addPalm(v, 10.5, z + 7, 18 + Math.floor(random("cq" + i) * 5), 1);
  }
  return v.build();
}

const ShotLeads: React.FC<{ f: number }> = ({ f }) => {
  const palms = useMemo(buildCoastPalms, []);
  const car = useMemo(buildHeroCar, []);
  const leadA = useMemo(
    () => buildPerson({ skin: 0x8d5a3c, hair: 0x14101a, top: 0xf4f1ea, pants: 0x24242c }),
    []
  );
  const leadB = useMemo(
    () => buildPerson({ skin: 0xc9915f, hair: 0x2a1a12, top: 0xffc247, pants: 0x2a2a33, shades: true }),
    []
  );

  const carZ = -Math.max(0, f - 225) * 2.2;
  const aE = smooth((f - 225) / 58);
  const bE = smooth((f - 283) / 40);
  const p = pulse(f);

  const ang = lerp(lerp(-2.5, 0.85, aE), 0.18, bE);
  const rad = lerp(lerp(7.4, 5.2, aE), 21, bE);
  const hgt = lerp(lerp(1.05, 1.75, aE), 12, bE) - p * 0.05;

  const pos: V3 = [Math.sin(ang) * rad, hgt, carZ + Math.cos(ang) * rad];
  const tgt: V3 = [0, lerp(1.0, 2.4, bE), carZ + lerp(0, -26, bE)];

  return (
    <>
      <SkyGrad
        stops={[
          [0, "#4a2a6a"],
          [0.26, "#a8506e"],
          [0.48, "#e87560"],
          [0.66, "#ffa564"],
          [0.84, "#ffcf96"],
          [1, "#ffe8c2"],
        ]}
        fog="#ffab7e"
        near={120}
        far={600}
      />
      <Cam pos={pos} target={tgt} fov={50 - p * 2} />

      <ambientLight intensity={0.6} color="#ffd6b4" />
      <hemisphereLight args={["#ffd0a0", "#5c3358", 1.0]} />
      <directionalLight position={[-170, 95, carZ - 640]} intensity={3.0} color="#ffc490" />
      <directionalLight position={[120, 50, carZ + 260]} intensity={0.55} color="#8ea6ff" />

      <Sun pos={[-160, 44, -940]} r={114} cell={8} glow={2.7} />

      <mesh position={[0, -0.15, carZ - 60]}>
        <boxGeometry args={[19, 0.3, 520]} />
        <meshLambertMaterial color="#45474f" />
      </mesh>
      <mesh position={[0, 0.04, carZ - 60]}>
        <boxGeometry args={[0.45, 0.05, 520]} />
        <meshBasicMaterial color="#ffe2a8" />
      </mesh>
      <mesh position={[-32, -0.2, carZ - 60]}>
        <boxGeometry args={[28, 0.8, 520]} />
        <meshLambertMaterial color="#e2cca4" />
      </mesh>
      <mesh position={[-640, -0.7, carZ - 60]}>
        <boxGeometry args={[1160, 1.2, 1000]} />
        <meshLambertMaterial color="#226078" />
      </mesh>
      <mesh position={[-330, -0.3, carZ - 260]}>
        <boxGeometry args={[420, 0.2, 900]} />
        <meshBasicMaterial color="#ffcf9c" transparent opacity={0.22} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[240, -0.2, carZ - 60]}>
        <boxGeometry args={[440, 0.8, 520]} />
        <meshLambertMaterial color="#cdb894" />
      </mesh>

      <VoxMesh data={palms} scale={PALM_S} position={[0, 0, carZ * 0.18]} />

      <VoxMesh data={car} scale={CAR_S} position={[0, 0, carZ]} />
      <VoxMesh data={leadA} scale={CAR_S * 0.29} position={[-0.34, 0.72, carZ + 0.2]} />
      <VoxMesh data={leadB} scale={CAR_S * 0.29} position={[0.36, 0.72, carZ + 0.05]} />

      {/* neon motel beacon far off */}
      <mesh position={[-46, 7, carZ - 190]}>
        <boxGeometry args={[1.6, 6, 1.6]} />
        <meshBasicMaterial color="#ff3f7a" toneMapped={false} />
      </mesh>

      {Array.from({ length: 16 }).map((_, i) => {
        const s = "cash" + i;
        const sp = 3 + random(s + "sp") * 5;
        const life = (f * 0.95 + random(s + "o") * 200) % 120;
        if (life > 100) return null;
        const x = (random(s + "x") - 0.5) * 12 + Math.sin(f * 0.11 + i) * 1.6;
        const y = 1.05 + Math.sin(f * 0.09 + i * 1.7) * 0.9 + life * 0.011;
        const z = carZ + 7 - life * sp * 0.13;
        return (
          <mesh key={i} position={[x, y, z]} rotation={[f * 0.06 + i, f * 0.09, i]}>
            <boxGeometry args={[0.3, 0.03, 0.16]} />
            <meshBasicMaterial color={i % 3 === 0 ? "#c8e8b0" : "#e2edbc"} toneMapped={false} />
          </mesh>
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* SHOT 6 — title (323 → 390)                                          */
/* ------------------------------------------------------------------ */

function buildTitleSkyline(): VoxData {
  const v = new Vox();
  for (let i = 0; i < 24; i++) {
    const s = "t" + i;
    const cx = -92 + i * 8;
    const h = 4 + Math.floor(random(s + "h") * 16);
    const w = 2 + Math.floor(random(s + "w") * 2);
    for (let y = 0; y < h; y++)
      for (let x = -w; x <= w; x++)
        for (let z = -w; z <= w; z++) {
          if (Math.abs(x) !== w && Math.abs(z) !== w) continue;
          const lit = y % 4 === 1 && Math.abs(x + z) % 3 === 0;
          v.add(cx + x, y, z, lit ? 0xff8a4a : 0x12091a);
        }
    if (random(s + "sp") > 0.7) {
      for (let y = h; y < h + 4 + Math.floor(random(s + "sh") * 6); y++)
        v.add(cx, y, 0, 0x12091a);
      v.add(cx, h + 6, 0, 0xff3a2a);
    }
  }
  return v.build();
}

const PalmSilhouette: React.FC<{ x: number; z: number; s: number }> = ({ x, z, s }) => {
  const data = useMemo(() => {
    const v = new Vox();
    for (let i = 0; i < 30; i++) v.add(Math.round(Math.sin(i * 0.2) * 2), i, 0, 0x0a0410);
    const tx = Math.round(Math.sin(29 * 0.2) * 2);
    for (let a = 0; a < 9; a++) {
      const ang = (a / 9) * Math.PI * 2;
      for (let d = 1; d <= 7; d++)
        v.add(
          tx + Math.round(Math.cos(ang) * d),
          30 - Math.floor(d * 0.5),
          Math.round(Math.sin(ang) * d),
          0x0a0410
        );
    }
    return v.build();
  }, []);
  return <VoxMesh data={data} scale={s} position={[x / s, 0, z / s]} unlit />;
};

const ShotTitle: React.FC<{ f: number }> = ({ f }) => {
  const city = useMemo(buildTitleSkyline, []);
  const t = smooth((f - 323) / 67);
  const p = pulse(f);
  const sink = lerp(4, -22, t);

  const pos: V3 = [0, lerp(13, 9.5, t), lerp(122, 76, t)];
  const tgt: V3 = [0, lerp(26, 22, t), -420];

  return (
    <>
      <SkyGrad
        stops={[
          [0, "#0c0614"],
          [0.3, "#200f28"],
          [0.52, "#4e1c2c"],
          [0.7, "#9c382c"],
          [0.85, "#e0672c"],
          [1, "#6d2018"],
        ]}
      />
      <Cam pos={pos} target={tgt} fov={44 - p * 1.4} />

      <ambientLight intensity={0.45} color="#8a4a5a" />
      <hemisphereLight args={["#c05a3a", "#160812", 0.85]} />
      <directionalLight position={[0, 90, -700]} intensity={1.3} color="#ff9a5a" />

      <group position={[0, sink, 0]}>
        <Sun pos={[0, 16, -620]} r={96} cell={9} glow={2.9} />
      </group>

      <mesh position={[0, -0.9, 200]}>
        <boxGeometry args={[3000, 1.6, 1900]} />
        <meshLambertMaterial color="#100812" />
      </mesh>
      <group position={[0, sink, 0]}>
        <mesh position={[0, 0.06, -300]}>
          <boxGeometry args={[130, 0.1, 720]} />
          <meshBasicMaterial
            color="#ff8a3c"
            transparent
            opacity={0.26}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 0.06, -140]}>
          <boxGeometry args={[64, 0.1, 260]} />
          <meshBasicMaterial
            color="#ffb066"
            transparent
            opacity={0.34}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>

      <VoxMesh data={city} scale={5} position={[0, 0, -560]} />

      <PalmSilhouette x={-150} z={40} s={3.2} />
      <PalmSilhouette x={168} z={62} s={3.6} />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* HTML overlay                                                        */
/* ------------------------------------------------------------------ */

const Caption: React.FC<{ f: number }> = ({ f }) => {
  if (f < 22 || f > 110) return null;
  const inP = smooth((f - 24) / 15);
  const outP = clamp01((f - 96) / 12);
  const clip = `inset(${(1 - inP) * 100}% 0% 0% 0%)`;

  return (
    <div
      style={{
        position: "absolute",
        left: 100,
        bottom: 150,
        opacity: 1 - outP,
        transform: `translateY(${(1 - inP) * 26 - outP * 18}px)`,
      }}
    >
      <div style={{ width: 132 * inP, height: 7, background: "#ff9a3c", marginBottom: 20 }} />
      <div
        style={{
          fontSize: 92,
          fontWeight: 900,
          lineHeight: 1.04,
          letterSpacing: "-0.014em",
          color: "#fff6e8",
          clipPath: clip,
          WebkitClipPath: clip,
          textShadow: "0 10px 44px rgba(70,22,0,0.8)",
        }}
      >
        ONE CITY. TWO DEBTS.
      </div>
    </div>
  );
};

const TitleText: React.FC<{ f: number }> = ({ f }) => {
  if (f < 320) return null;
  const slam = smooth((f - 326) / 11);
  const sub = smooth((f - 334) / 9);
  const p = pulse(f);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 66% 52% at 50% 48%, rgba(8,3,12,0.7) 0%, rgba(8,3,12,0.2) 56%, rgba(8,3,12,0.92) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 540,
          height: 2,
          opacity: slam * (0.4 + p * 0.3),
          background:
            "linear-gradient(90deg, rgba(255,160,80,0) 8%, rgba(255,190,120,0.9) 50%, rgba(255,160,80,0) 92%)",
        }}
      />
      <div style={{ position: "relative", textAlign: "center", transform: "translateY(16px)" }}>
        <div
          style={{
            fontSize: 208,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: "0.035em",
            transform: `scale(${lerp(1.18, 1, slam)})`,
            transformOrigin: "50% 50%",
            clipPath: `inset(0% 0% ${(1 - slam) * 100}% 0%)`,
            WebkitClipPath: `inset(0% 0% ${(1 - slam) * 100}% 0%)`,
            background:
              "linear-gradient(180deg,#fffaf0 0%,#ffe0a4 36%,#ff8f3c 72%,#ef4a1c 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            filter: `drop-shadow(0 14px 48px rgba(255,105,35,${0.45 + p * 0.22}))`,
          }}
        >
          SUNBURN
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 38,
            fontWeight: 600,
            letterSpacing: "0.54em",
            textIndent: "0.54em",
            color: "#ffeece",
            clipPath: `inset(0% ${(1 - sub) * 100}% 0% 0%)`,
            WebkitClipPath: `inset(0% ${(1 - sub) * 100}% 0% 0%)`,
            textShadow: "0 6px 26px rgba(0,0,0,0.85)",
          }}
        >
          COMING NOVEMBER
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Overlay: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill style={{ fontFamily: "Archivo, system-ui, sans-serif", pointerEvents: "none" }}>
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse 78% 68% at 50% 48%, rgba(0,0,0,0) 44%, rgba(12,5,14,0.5) 100%)",
      }}
    />
    {f < 320 && (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 470,
          height: 3,
          opacity: 0.1 + pulse(f) * 0.22,
          background:
            "linear-gradient(90deg, rgba(255,150,70,0) 4%, rgba(255,200,140,0.75) 50%, rgba(255,150,70,0) 96%)",
        }}
      />
    )}
    <Caption f={f} />
    <TitleText f={f} />
  </AbsoluteFill>
);

/* ------------------------------------------------------------------ */
/* root                                                                */
/* ------------------------------------------------------------------ */

export const Trailer: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0610" }}>
      <ThreeCanvas width={1920} height={1080}>
        {frame < 56 ? (
          <ShotCity f={frame} />
        ) : frame < 113 ? (
          <ShotChase f={frame} />
        ) : frame < 169 ? (
          <ShotRooftop f={frame} />
        ) : frame < 225 ? (
          <ShotRoadblock f={frame} />
        ) : frame < 323 ? (
          <ShotLeads f={frame} />
        ) : (
          <ShotTitle f={frame} />
        )}
      </ThreeCanvas>
      <Overlay f={frame} />
    </AbsoluteFill>
  );
};