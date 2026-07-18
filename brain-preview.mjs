// brain-preview.mjs
// Dev tool: software-renders the procedural brain from brainGeometry.js to
// PNG (no GPU/browser needed) so the sculpt can be checked from Node.
//   node brain-preview.mjs
// Writes brain-preview-front.png / -threequarter.png / -side.png.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import * as THREE from 'three';
import { buildBrainGeometries } from './brainGeometry.js';

const W = 560, H = 560;

/* minimal PNG encoder (RGB, filter 0) */
function crc32(buf) {
  let c, table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  c = -1;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])), 8 + data.length);
  return out;
}
function writePng(path, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  const raw = Buffer.alloc(H * (W * 3 + 1));
  for (let y = 0; y < H; y++) rgb.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
  writeFileSync(path, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]));
}

/* collect triangles */
const geos = Object.values(buildBrainGeometries());
const BLUE = new THREE.Color('#3b82f6'), DEEP = new THREE.Color('#1e3a8a'), AMBER = new THREE.Color('#f0a500');
const L = new THREE.Vector3(0.5, 0.7, 0.6).normalize();

function render(rotY, path) {
  const rgb = Buffer.alloc(W * H * 3);
  // dark navy page background
  for (let i = 0; i < W * H; i++) { rgb[i * 3] = 7; rgb[i * 3 + 1] = 10; rgb[i * 3 + 2] = 22; }
  const zbuf = new Float32Array(W * H).fill(Infinity);
  const rot = new THREE.Matrix4().makeRotationY(rotY);
  const nmat = new THREE.Matrix3().setFromMatrix4(rot);
  const camZ = 4.6, f = (H / 2) / Math.tan((42 * Math.PI / 180) / 2);
  const va = new THREE.Vector3(), na = new THREE.Vector3();

  for (const geo of geos) {
    const pos = geo.attributes.position, nor = geo.attributes.normal;
    const cav = geo.attributes.aCavity, idx = geo.index;
    const triCount = idx ? idx.count / 3 : pos.count / 3;
    const vtx = [];
    // pre-transform + per-vertex shade (Gouraud, mirrors the GLSL)
    for (let i = 0; i < pos.count; i++) {
      va.fromBufferAttribute(pos, i).applyMatrix4(rot);
      na.fromBufferAttribute(nor, i).applyMatrix3(nmat).normalize();
      const zc = camZ - va.z;
      const sx = W / 2 + (va.x / zc) * f;
      const sy = H / 2 - (va.y / zc) * f;
      const diff = na.dot(L) * 0.5 + 0.5;
      const fres = Math.pow(1 - Math.min(1, Math.abs(na.z)), 2.2);
      const c = cav ? cav.array[i] : 0.6;
      const cavShade = 0.3 + 0.82 * (c < 0.05 ? 0 : Math.min(1, (c - 0.05) / 0.85));
      const base = DEEP.clone().lerp(BLUE, Math.max(0, Math.min(1, va.y * 0.5 + 0.5)));
      base.multiplyScalar(cavShade * (0.5 + 0.5 * diff));
      base.lerp(AMBER, fres * 0.45);
      vtx.push({ sx, sy, z: zc, r: base.r, g: base.g, b: base.b });
    }
    for (let t = 0; t < triCount; t++) {
      const a = vtx[idx ? idx.getX(t * 3) : t * 3];
      const b = vtx[idx ? idx.getX(t * 3 + 1) : t * 3 + 1];
      const c = vtx[idx ? idx.getX(t * 3 + 2) : t * 3 + 2];
      const minX = Math.max(0, Math.floor(Math.min(a.sx, b.sx, c.sx)));
      const maxX = Math.min(W - 1, Math.ceil(Math.max(a.sx, b.sx, c.sx)));
      const minY = Math.max(0, Math.floor(Math.min(a.sy, b.sy, c.sy)));
      const maxY = Math.min(H - 1, Math.ceil(Math.max(a.sy, b.sy, c.sy)));
      const den = (b.sy - c.sy) * (a.sx - c.sx) + (c.sx - b.sx) * (a.sy - c.sy);
      if (Math.abs(den) < 1e-9) continue;
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const w0 = ((b.sy - c.sy) * (x - c.sx) + (c.sx - b.sx) * (y - c.sy)) / den;
          const w1 = ((c.sy - a.sy) * (x - c.sx) + (a.sx - c.sx) * (y - c.sy)) / den;
          const w2 = 1 - w0 - w1;
          if (w0 < 0 || w1 < 0 || w2 < 0) continue;
          const z = w0 * a.z + w1 * b.z + w2 * c.z;
          const pi = y * W + x;
          if (z >= zbuf[pi]) continue;
          zbuf[pi] = z;
          rgb[pi * 3] = Math.min(255, 255 * (w0 * a.r + w1 * b.r + w2 * c.r));
          rgb[pi * 3 + 1] = Math.min(255, 255 * (w0 * a.g + w1 * b.g + w2 * c.g));
          rgb[pi * 3 + 2] = Math.min(255, 255 * (w0 * a.b + w1 * b.b + w2 * c.b));
        }
      }
    }
  }
  writePng(path, rgb);
  console.log('wrote', path);
}

render(0, 'brain-preview-front.png');
render(-Math.PI / 4, 'brain-preview-threequarter.png');
render(-Math.PI / 2, 'brain-preview-side.png');

// quick stats
for (const [name, geo] of Object.entries(buildBrainGeometries())) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  console.log(name,
    'tris', (geo.index ? geo.index.count : geo.attributes.position.count) / 3 | 0,
    'bbox', bb.min.toArray().map(v => v.toFixed(2)), bb.max.toArray().map(v => v.toFixed(2)));
}
