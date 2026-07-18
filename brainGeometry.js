// brainGeometry.js
// Procedural anatomical brain geometry for the 3D background (no external
// assets). Pure JS + three.js so it can also be imported from Node for
// sanity checks.
//
// The cerebrum is built per hemisphere from a welded icosphere that is
// remapped onto one side of the x axis (flat-ish medial wall), sculpted into
// real brain proportions — tapered frontal lobe, bulging temporal lobe,
// squashed occiput, flattened orbital underside — and then displaced along
// the radius by a domain-warped noise field whose zero-crossings produce
// narrow incised sulci between rounded gyri, the way a real cortex folds.
// A banded cerebellum (folia) and a sheared brainstem complete the shape.
//
// Every geometry carries an `aCavity` vertex attribute (0 = sulcus floor,
// 1 = gyral crown) that the shader uses to darken grooves, which is what
// makes the folding read visually even at background opacity.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/* ── Deterministic 3D simplex noise (Gustavson-style, seeded) ─────── */

const GRAD3 = [
  1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
  1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
  0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1,
];

function makeNoise3D(seed = 1337) {
  // mulberry32 PRNG → deterministic permutation table (same brain each load)
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0;
    const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
  }
  const perm = new Uint8Array(512);
  const permMod12 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
    permMod12[i] = perm[i] % 12;
  }
  const F3 = 1 / 3;
  const G3 = 1 / 6;

  return function noise(xin, yin, zin) {
    const skew = (xin + yin + zin) * F3;
    const i = Math.floor(xin + skew);
    const j = Math.floor(yin + skew);
    const k = Math.floor(zin + skew);
    const t = (i + j + k) * G3;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    const z0 = zin - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }
    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    let n = 0;
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 > 0) {
      const g = permMod12[ii + perm[jj + perm[kk]]] * 3;
      t0 *= t0;
      n += t0 * t0 * (GRAD3[g] * x0 + GRAD3[g + 1] * y0 + GRAD3[g + 2] * z0);
    }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 > 0) {
      const g = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
      t1 *= t1;
      n += t1 * t1 * (GRAD3[g] * x1 + GRAD3[g + 1] * y1 + GRAD3[g + 2] * z1);
    }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 > 0) {
      const g = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
      t2 *= t2;
      n += t2 * t2 * (GRAD3[g] * x2 + GRAD3[g + 1] * y2 + GRAD3[g + 2] * z2);
    }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 > 0) {
      const g = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;
      t3 *= t3;
      n += t3 * t3 * (GRAD3[g] * x3 + GRAD3[g + 1] * y3 + GRAD3[g + 2] * z3);
    }
    return 32 * n; // roughly [-1, 1]
  };
}

const noise = makeNoise3D(20260718);

const fbm = (x, y, z) =>
  0.62 * noise(x, y, z) +
  0.27 * noise(x * 2.1 + 11.3, y * 2.1 + 7.7, z * 2.1 + 5.1) +
  0.11 * noise(x * 4.3 + 23.9, y * 4.3 + 17.2, z * 4.3 + 29.4);

const smooth01 = (t) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

/* ── Cortical fold field ──────────────────────────────────────────── */

// Returns 0..1: 0 along the narrow zero-crossing lines of a domain-warped
// noise field (→ incised sulci), plateauing near 1 over wide areas
// (→ rounded gyral crowns). The noise domain is compressed along z so the
// folds elongate front-to-back like real gyri, and the warp makes them wind.
function corticalFold(x, y, z) {
  const wx = x + 0.32 * fbm(x * 1.3 + 31.0, y * 1.3 + 13.0, z * 1.3 + 47.0);
  const wy = y + 0.32 * fbm(x * 1.3 + 71.0, y * 1.3 + 3.0, z * 1.3 + 19.0);
  const wz = z + 0.32 * fbm(x * 1.3 + 5.0, y * 1.3 + 59.0, z * 1.3 + 37.0);
  const n = fbm(wx * 4.1, wy * 4.1, wz * 2.3);
  return Math.pow(Math.min(1, Math.abs(n) * 1.7), 0.72);
}

/* ── Cerebral hemisphere ──────────────────────────────────────────── */

// side: +1 right, -1 left. +z is anatomically the front.
export function buildHemisphere(side) {
  // Weld duplicated icosphere verts first so displacement moves shared verts
  // identically and computeVertexNormals yields smooth creased shading.
  const geo = mergeVertices(new THREE.IcosahedronGeometry(1, 20)); // ~8.8k tris
  const pos = geo.attributes.position;
  const cav = new Float32Array(pos.count);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    // Smooth-max(0, x) squashes the sphere's negative-x half into a
    // near-flat medial wall while keeping a single, smoothly-curved surface —
    // the longitudinal fissure then reads as a thin gap, not a wide V.
    const u = v.x;
    const lx = 0.5 * (u + Math.hypot(u, 0.34));

    // Base proportions: rounded halves, long front-to-back.
    let x = lx * 0.70;
    let y = v.y * 0.78;
    let z = v.z * 1.12;

    // Frontal lobe taper toward the forehead.
    const front = smooth01((z - 0.3) / 0.75);
    x *= 1 - 0.1 * front;
    y *= 1 - 0.1 * front;

    // Parietal narrowing toward the vertex (rounded top ridge).
    const top = smooth01((y - 0.3) / 0.5);
    x *= 1 - 0.12 * top;

    // Occipital squash at the back.
    const back = smooth01((-z - 0.55) / 0.55);
    y *= 1 - 0.1 * back;

    // Temporal lobe: bulge low on the lateral surface, mid-front.
    const tb =
      Math.exp(-((y + 0.34) ** 2) / 0.045) *
      Math.exp(-((z - 0.18) ** 2) / 0.32) *
      smooth01((lx - 0.25) / 0.5);
    x += 0.14 * tb;
    y -= 0.06 * tb;

    // Flatten the underside (orbital surface sitting on the skull base).
    if (y < -0.46) y = -0.46 + (y + 0.46) * 0.45;

    // Sink the medial wall a touch so the fissure rim doesn't poke above
    // the folded lateral surface.
    y *= 1 - 0.05 * smooth01((-u + 0.1) / 0.5);

    // Cortical folds — faded out on the medial wall so the longitudinal
    // fissure between the hemispheres stays clean, and softened underneath.
    const medial = smooth01((u + 0.15) / 0.4);
    const under = smooth01((y + 0.55) / 0.25);
    const s = corticalFold(x, y, z);
    const amp = 0.095 * medial * (0.45 + 0.55 * under);
    const disp = (s - 0.45) * amp;

    const len = Math.hypot(x, y, z) || 1;
    const k = 1 + disp / len;
    pos.setXYZ(i, side * (x * k + 0.03), y * k, z * k);
    cav[i] = THREE.MathUtils.lerp(0.75, s, medial);
  }
  geo.setAttribute('aCavity', new THREE.BufferAttribute(cav, 1));
  geo.computeVertexNormals();
  return geo;
}

/* ── Cerebellum ───────────────────────────────────────────────────── */

// Tucked under the occipital lobes, with the fine horizontal folia banding
// that visually distinguishes it from the cerebrum.
export function buildCerebellum() {
  const geo = mergeVertices(new THREE.IcosahedronGeometry(1, 10)); // ~2.4k tris
  const pos = geo.attributes.position;
  const cav = new Float32Array(pos.count);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    let x = v.x * 0.46;
    let y = v.y * 0.30;
    let z = v.z * 0.38;
    // Slight midline pinch (vermis) so it reads as two small lobes.
    const pinch = Math.exp(-(x * x) / 0.02);
    y *= 1 - 0.12 * pinch;
    // Folia: tight horizontal bands, wobbled by noise so they aren't rings.
    const s = Math.pow(
      Math.abs(Math.sin(y * 34 + 2.2 * fbm(x * 2.6, y * 2.6, z * 2.6))),
      0.8
    );
    const disp = (s - 0.5) * 0.045;
    const len = Math.hypot(x, y, z) || 1;
    const k = 1 + disp / len;
    pos.setXYZ(i, x * k, y * k - 0.64, z * k - 0.74);
    cav[i] = 0.15 + 0.75 * s;
  }
  geo.setAttribute('aCavity', new THREE.BufferAttribute(cav, 1));
  geo.computeVertexNormals();
  return geo;
}

/* ── Brainstem ────────────────────────────────────────────────────── */

// A smooth capsule sheared backward as it descends — pons/medulla
// abstraction, mostly visible from the side/profile view.
export function buildBrainstem() {
  const geo = mergeVertices(new THREE.CapsuleGeometry(0.13, 0.62, 6, 20));
  const pos = geo.attributes.position;
  const cav = new Float32Array(pos.count).fill(0.6); // no folds, mid shade
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // widen toward the top (pons) and shear so the bottom trails backward
    const t = smooth01((v.y + 0.44) / 0.88); // 0 bottom .. 1 top
    const w = 0.85 + 0.45 * t;
    pos.setXYZ(
      i,
      v.x * w,
      v.y * 0.9 - 0.72,
      v.z * w - 0.3 - (1 - t) * 0.28
    );
  }
  geo.setAttribute('aCavity', new THREE.BufferAttribute(cav, 1));
  geo.computeVertexNormals();
  return geo;
}

export function buildBrainGeometries() {
  return {
    hemiL: buildHemisphere(-1),
    hemiR: buildHemisphere(1),
    cere: buildCerebellum(),
    stem: buildBrainstem(),
  };
}
