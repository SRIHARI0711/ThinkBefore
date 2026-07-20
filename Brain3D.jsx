// Brain3D.jsx
// A single persistent 3D brain rendered with three.js via @react-three/fiber.
// The mesh is fully procedural (no external assets) and anatomically shaped:
// two cerebral hemispheres with domain-warped-noise gyri/sulci, tapered
// frontal lobes, bulging temporal lobes, a flat medial fissure wall, plus a
// folia-banded cerebellum and brainstem (see brainGeometry.js). A custom
// shader darkens the sulci (aCavity attribute) and adds a Fresnel amber rim
// over the brand-blue body (#2563eb blue, #f0a500 amber) — natural anatomy,
// stylized rendering.
//
// A neural overlay is mapped onto 3D points sampled from the brain surface:
// neuron sprites, synapse lines between near neighbours and amber signal
// pulses travelling along them. Moving the cursor near the brain excites the
// closest neurons (proximity check against the pointer ray, done once per
// frame); clicking near a neuron triggers a multi-hop ripple across its
// connections.
//
// Rotation is scroll-position-locked: progress 0 (top of page) shows the
// front view, and by the time the final login/signup CTA enters the viewport
// the brain has eased to a 90° profile view. The rotation is damped per frame
// so scrolling in either direction stays fluid, and it holds at the side view
// beyond the CTA.
//
// This module is heavy (pulls in three.js) and is only ever loaded through
// React.lazy() in Brain3DBackground.jsx.
import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { buildBrainGeometries } from './brainGeometry.js';

const BLUE = '#3b82f6';
const BLUE_DEEP = '#1e3a8a';
const AMBER = '#f0a500';

const NODE_COUNT = 170;
const NEIGHBOR_MAX = 3;
const NEIGHBOR_DIST = 0.6;
const MAX_PULSES = 48;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeInOut = (t) => t * t * (3 - 2 * t); // smoothstep — eased, not linear

/* ── Neural overlay sampling ──────────────────────────────────────── */

// Sample neuron anchor points from the displaced hemisphere vertices so the
// overlay sits exactly on the sculpted surface. Medial-wall verts 
// (hidden in the fissure) are skipped and a minimum spacing keeps the layout even.
function sampleNodes(geos) {
  const candidates = [];
  const v = new THREE.Vector3();
  for (const geo of geos) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i += 3) {
      v.fromBufferAttribute(pos, i);
      if (Math.abs(v.x) < 0.16) continue; // skip the medial fissure walls
      // lift slightly off the surface so sprites aren't half-buried now
      // that the brain writes depth
      candidates.push(v.clone().multiplyScalar(1.025));
    }
  }
  // deterministic-ish shuffle
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const nodes = [];
  for (const c of candidates) {
    if (nodes.length >= NODE_COUNT) break;
    let ok = true;
    for (const n of nodes) {
      if (n.distanceToSquared(c) < 0.13 * 0.13) { ok = false; break; }
    }
    if (ok) nodes.push(c);
  }

  // Nearest-neighbour wiring (synapses).
  const neighbors = nodes.map(() => []);
  for (let i = 0; i < nodes.length; i++) {
    const dists = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const d = nodes[i].distanceTo(nodes[j]);
      if (d < NEIGHBOR_DIST) dists.push([d, j]);
    }
    dists.sort((a, b) => a[0] - b[0]);
    for (let k = 0; k < Math.min(NEIGHBOR_MAX, dists.length); k++) {
      neighbors[i].push(dists[k][1]);
    }
  }
  const edgeSet = new Set();
  const edges = [];
  for (let i = 0; i < nodes.length; i++) {
    for (const j of neighbors[i]) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!edgeSet.has(key)) { edgeSet.add(key); edges.push([Math.min(i, j), Math.max(i, j)]); }
    }
  }
  return { nodes, neighbors, edges };
}

/* ── Shaders ──────────────────────────────────────────────────────── */

const brainVert = /* glsl */ `
  attribute float aCavity;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vPosL;
  varying float vCavity;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    vPosL = position;
    vCavity = aCavity;
    gl_Position = projectionMatrix * mv;
  }
`;

// Anatomy-revealing shading: the aCavity attribute (0 = sulcus floor,
// 1 = gyral crown) darkens the grooves like ambient occlusion, wrap
// diffuse + a soft specular give the cortex a moist sheen, and a Fresnel
// rim grades into brand amber. Mostly solid so the folds actually read;
// no scene lights needed.
const brainFrag = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vPosL;
  varying float vCavity;
  uniform vec3 uBlue;
  uniform vec3 uDeep;
  uniform vec3 uAmber;
  uniform float uOpacity;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 vd = normalize(vView);
    vec3 ld = normalize(vec3(0.5, 0.7, 0.6));
    float fres = pow(1.0 - clamp(dot(n, vd), 0.0, 1.0), 2.2);
    float diff = dot(n, ld) * 0.5 + 0.5;
    float spec = pow(max(dot(n, normalize(ld + vd)), 0.0), 26.0);
    float cav = smoothstep(0.05, 0.9, vCavity);
    vec3 base = mix(uDeep, uBlue, clamp(vPosL.y * 0.45 + 0.5, 0.0, 1.0));
    base *= mix(0.26, 1.12, cav);        // dark sulci, lit gyral crowns
    base *= 0.42 + 0.58 * diff;
    vec3 col = base + spec * vec3(0.45, 0.55, 0.7) * (0.4 + 0.6 * cav);
    col = mix(col, uAmber, fres * 0.5);
    float a = (0.78 + 0.18 * fres) * uOpacity;
    gl_FragColor = vec4(col, a);
  }
`;

const nodeVert = /* glsl */ `
  attribute float aExcite;
  attribute float aSize;
  varying float vExcite;
  uniform float uDpr;
  uniform float uTime;
  void main() {
    vExcite = aExcite;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float breathe = 0.85 + 0.3 * (sin(uTime * 2.0 + position.x * 9.0 + position.y * 7.0) * 0.5 + 0.5);
    gl_PointSize = aSize * uDpr * breathe * (1.0 + aExcite * 1.6) * (14.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const nodeFrag = /* glsl */ `
  varying float vExcite;
  uniform vec3 uBlue;
  uniform vec3 uAmber;
  uniform float uOpacity;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.08, d);
    vec3 col = mix(uBlue, uAmber, vExcite);
    gl_FragColor = vec4(col, a * (0.45 + 0.55 * vExcite) * uOpacity);
  }
`;

const pulseVert = /* glsl */ `
  attribute float aLife;
  varying float vLife;
  uniform float uDpr;
  void main() {
    vLife = aLife;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uDpr * (18.0 / -mv.z) * (0.6 + aLife);
    gl_Position = projectionMatrix * mv;
  }
`;

const pulseFrag = /* glsl */ `
  varying float vLife;
  uniform vec3 uAmber;
  uniform float uOpacity;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d) * vLife;
    gl_FragColor = vec4(uAmber, a * uOpacity);
  }
`;

/* ── Scene ────────────────────────────────────────────────────────── */

function BrainScene() {
  const groupRef = useRef();
  const rotYRef = useRef(0);
  const scrollRef = useRef(0);       // eased 0..1 progress toward the CTA
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const clickRef = useRef(null);     // NDC of an unprocessed click
  const pulsesRef = useRef([]);      // live pulses {a, b, t, speed, hop}

  const { camera, gl } = useThree();

  const built = useMemo(() => {
    const { hemiL, hemiR, cere, stem } = buildBrainGeometries();
    const { nodes, neighbors, edges } = sampleNodes([hemiL, hemiR]);

    const nodePos = new Float32Array(nodes.length * 3);
    const nodeExcite = new Float32Array(nodes.length);
    const nodeSize = new Float32Array(nodes.length);
    nodes.forEach((n, i) => {
      nodePos.set([n.x, n.y, n.z], i * 3);
      nodeSize[i] = 2.2 + Math.random() * 1.7;
    });

    const linePos = new Float32Array(edges.length * 6);
    edges.forEach(([a, b], i) => {
      linePos.set([nodes[a].x, nodes[a].y, nodes[a].z, nodes[b].x, nodes[b].y, nodes[b].z], i * 6);
    });

    const pulsePos = new Float32Array(MAX_PULSES * 3);
    const pulseLife = new Float32Array(MAX_PULSES);
    pulsePos.fill(9999); // park inactive pulses far off-screen

    const brainMat = new THREE.ShaderMaterial({
      vertexShader: brainVert,
      fragmentShader: brainFrag,
      uniforms: {
        uBlue: { value: new THREE.Color(BLUE) },
        uDeep: { value: new THREE.Color(BLUE_DEEP) },
        uAmber: { value: new THREE.Color(AMBER) },
        uOpacity: { value: 1 },
      },
      transparent: true,
      depthWrite: true, // solid-looking cortex; far-side overlay gets occluded
    });

    const nodeMat = new THREE.ShaderMaterial({
      vertexShader: nodeVert,
      fragmentShader: nodeFrag,
      uniforms: {
        uBlue: { value: new THREE.Color('#82b9ff') },
        uAmber: { value: new THREE.Color(AMBER) },
        uOpacity: { value: 1 },
        uDpr: { value: 1 },
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const pulseMat = new THREE.ShaderMaterial({
      vertexShader: pulseVert,
      fragmentShader: pulseFrag,
      uniforms: {
        uAmber: { value: new THREE.Color(AMBER) },
        uOpacity: { value: 1 },
        uDpr: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const lineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#5f91f0'),
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePos, 3));
    nodeGeo.setAttribute('aExcite', new THREE.BufferAttribute(nodeExcite, 1));
    nodeGeo.setAttribute('aSize', new THREE.BufferAttribute(nodeSize, 1));

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));

    const pulseGeo = new THREE.BufferGeometry();
    pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePos, 3));
    pulseGeo.setAttribute('aLife', new THREE.BufferAttribute(pulseLife, 1));

    return {
      hemiL, hemiR, cere, stem, nodes, neighbors, edges,
      brainMat, nodeMat, pulseMat, lineMat,
      nodeGeo, lineGeo, pulseGeo,
    };
  }, []);

  // Scroll progress, pointer and click listeners live on window so the layer
  // itself can stay pointer-events:none (full click-through to page content).
  // NOTE: html AND body both set overflow-x:hidden, which makes <body> its
  // own scroll container — its scroll events do not bubble to window, so the
  // scroll listener must be capture-phase and we read whichever element
  // actually scrolled.
  useEffect(() => {
    const getScrollTop = () => {
      const se = document.scrollingElement || document.documentElement;
      return Math.max(se.scrollTop, document.body.scrollTop || 0);
    };
    let endY = 1;

    // Rotation completes when the final login/signup CTA enters the viewport
    // (the page order is hero → features → how-it-works → testimonials → CTA).
    const measure = () => {
      const vh = window.innerHeight || 1;
      const cta = document.querySelector('.home-final-cta');
      if (cta) {
        const rect = cta.getBoundingClientRect();
        endY = rect.top + getScrollTop() - vh * 0.85;
      } else {
        const se = document.scrollingElement || document.documentElement;
        endY = Math.max(se.scrollHeight, document.body.scrollHeight) - vh * 1.8;
      }
      endY = Math.max(vh * 0.5, endY);
    };
    const onScroll = () => { scrollRef.current = clamp01(getScrollTop() / endY); };
    const onMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseRef.current.active = true;
    };
    const onLeave = () => { mouseRef.current.active = false; };
    const onClick = (e) => {
      clickRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      };
    };

    measure();
    onScroll();
    // Fonts/images settling can shift the CTA's offset; re-measure once late.
    const settle = setTimeout(measure, 1500);
    window.addEventListener('resize', measure);
    // capture-phase so scrolls of the <body> scroll container are seen too
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseleave', onLeave);
    window.addEventListener('click', onClick);
    return () => {
      clearTimeout(settle);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('click', onClick);
    };
  }, []);

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const tmp = useMemo(() => ({
    ray: new THREE.Ray(),
    inv: new THREE.Matrix4(),
    ndc: new THREE.Vector2(),
    a: new THREE.Vector3(),
  }), []);

  const spawnPulse = (a, b, hop = 0) => {
    const pulses = pulsesRef.current;
    if (pulses.length >= MAX_PULSES) return;
    pulses.push({ a, b, t: 0, speed: 0.9 + Math.random() * 0.8, hop });
  };

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const group = groupRef.current;
    if (!group) return;

    const {
      nodes, neighbors, edges,
      brainMat, nodeMat, pulseMat, lineMat, nodeGeo, pulseGeo,
    } = built;

    /* Scroll-locked rotation: damped toward the eased target so scrubbing
       the scrollbar never snaps. Holds at 90° past the CTA. */
    const p = easeInOut(clamp01(scrollRef.current));
    const targetY = -Math.PI / 2 * p;
    rotYRef.current = THREE.MathUtils.damp(rotYRef.current, targetY, 3.2, dt);
    if (typeof window !== 'undefined') window.__brainDebug = { p, rotY: rotYRef.current };
    group.rotation.y = rotYRef.current + Math.sin(t * 0.24) * 0.05 * (1 - p);
    group.rotation.x = Math.sin(t * 0.17) * 0.025 + p * 0.06;

    // Idle "breathing" scale pulse on top of a viewport-fit base scale.
    const vp = state.viewport;
    const baseScale = Math.min((vp.height * 0.56) / 2.0, (vp.width * 0.6) / 1.5);
    group.scale.setScalar(baseScale * (1 + Math.sin(t * 0.9) * 0.013));
    group.position.y = Math.sin(t * 0.5) * 0.03;

    // Slight camera drift with scroll + tiny mouse parallax.
    const m = mouseRef.current;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, p * 0.55 + (m.active ? m.x * 0.08 : 0), 2.5, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, p * -0.15 + (m.active ? m.y * 0.05 : 0), 2.5, dt);
    camera.lookAt(0, 0, 0);

    // Fade the layer back a touch as content sections take over.
    const opacity = 1 - p * 0.45;
    brainMat.uniforms.uOpacity.value = opacity;
    nodeMat.uniforms.uOpacity.value = opacity;
    pulseMat.uniforms.uOpacity.value = opacity;
    lineMat.opacity = 0.15 * (1 - p * 0.5);
    nodeMat.uniforms.uTime.value = t;
    const dpr = gl.getPixelRatio();
    nodeMat.uniforms.uDpr.value = dpr;
    pulseMat.uniforms.uDpr.value = dpr;

    const excite = nodeGeo.attributes.aExcite.array;
    const decay = Math.exp(-3 * dt);
    for (let i = 0; i < excite.length; i++) excite[i] *= decay;

    /* Hover: one proximity pass per frame against the pointer ray (the frame
       loop is the throttle). The ray is transformed into brain-local space so
       node positions never need re-projecting. */
    group.updateMatrixWorld();
    const processRay = (ndcX, ndcY, cb) => {
      tmp.ndc.set(ndcX, ndcY);
      raycaster.setFromCamera(tmp.ndc, camera);
      tmp.inv.copy(group.matrixWorld).invert();
      tmp.ray.copy(raycaster.ray).applyMatrix4(tmp.inv);
      cb(tmp.ray);
    };

    if (m.active) {
      processRay(m.x, m.y, (ray) => {
        const reach = 0.3 / Math.max(0.35, group.scale.x);
        for (let i = 0; i < nodes.length; i++) {
          const d2 = ray.distanceSqToPoint(nodes[i]);
          if (d2 < reach * reach) {
            const boost = 1 - Math.sqrt(d2) / reach;
            if (boost > excite[i]) excite[i] = boost;
            // excited neurons occasionally fire toward a neighbour
            if (boost > 0.55 && Math.random() < 0.06 && neighbors[i].length) {
              spawnPulse(i, neighbors[i][(Math.random() * neighbors[i].length) | 0], 0);
            }
          }
        }
      });
    }

    // Click ripple: fully excite the nearest neuron and fire a 3-hop wave.
    if (clickRef.current) {
      const c = clickRef.current;
      clickRef.current = null;
      processRay(c.x, c.y, (ray) => {
        let best = -1, bestD = 0.35 / Math.max(0.35, group.scale.x);
        for (let i = 0; i < nodes.length; i++) {
          const d = Math.sqrt(ray.distanceSqToPoint(nodes[i]));
          if (d < bestD) { bestD = d; best = i; }
        }
        if (best >= 0) {
          excite[best] = 1;
          for (const j of neighbors[best]) spawnPulse(best, j, 2);
        }
      });
    }

    // Ambient firing keeps the network alive without interaction.
    if (Math.random() < 0.05 + p * 0.04) {
      const e = edges[(Math.random() * edges.length) | 0];
      if (e) Math.random() > 0.5 ? spawnPulse(e[0], e[1], 0) : spawnPulse(e[1], e[0], 0);
    }

    // Advance pulses; on arrival excite the target and let ripples hop on.
    const pulses = pulsesRef.current;
    const pPos = pulseGeo.attributes.position.array;
    const pLife = pulseGeo.attributes.aLife.array;
    for (let i = pulses.length - 1; i >= 0; i--) {
      const s = pulses[i];
      s.t += s.speed * dt;
      if (s.t >= 1) {
        if (excite[s.b] < 0.9) excite[s.b] = 0.9;
        if (s.hop > 0) {
          for (const j of neighbors[s.b]) {
            if (j !== s.a && Math.random() < 0.8) spawnPulse(s.b, j, s.hop - 1);
          }
        }
        pulses.splice(i, 1);
      }
    }
    for (let i = 0; i < MAX_PULSES; i++) {
      if (i < pulses.length) {
        const s = pulses[i];
        tmp.a.copy(nodes[s.a]).lerp(nodes[s.b], s.t);
        pPos[i * 3] = tmp.a.x; pPos[i * 3 + 1] = tmp.a.y; pPos[i * 3 + 2] = tmp.a.z;
        pLife[i] = Math.sin(s.t * Math.PI); // ease in/out over the trip
      } else {
        pPos[i * 3] = 9999; pLife[i] = 0;
      }
    }
    nodeGeo.attributes.aExcite.needsUpdate = true;
    pulseGeo.attributes.position.needsUpdate = true;
    pulseGeo.attributes.aLife.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={built.hemiL} material={built.brainMat} />
      <mesh geometry={built.hemiR} material={built.brainMat} />
      <mesh geometry={built.cere} material={built.brainMat} />
      <mesh geometry={built.stem} material={built.brainMat} />
      <lineSegments geometry={built.lineGeo} material={built.lineMat} />
      <points geometry={built.nodeGeo} material={built.nodeMat} />
      <points geometry={built.pulseGeo} material={built.pulseMat} />
    </group>
  );
}

export default function Brain3D() {
  // Cap DPR to keep GPU cost bounded on retina screens; PerformanceMonitor
  // drops it to 1 if the frame rate can't hold.
  const cap = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
  const [dpr, setDpr] = useState(cap);

  return (
    <Canvas
      className="brain3d-wrap"
      dpr={dpr}
      camera={{ fov: 42, position: [0, 0, 4.6], near: 0.1, far: 30 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(cap)} />
      <BrainScene />
    </Canvas>
  );
}
