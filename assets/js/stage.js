// 每張卡片的小舞台：草地圓台、燈光、一個小道具
import * as THREE from "three";
import { part } from "./toon.js";

const DAY = { sky: 0xfff4e0, ground: 0x6f8f5a, sun: 0xfff1d6, hemi: 1.6, sunI: 2.4 };
const NIGHT = { sky: 0x6a7fb8, ground: 0x1d2433, sun: 0x9fb4ff, hemi: 0.7, sunI: 0.6 };
const C = (hex) => new THREE.Color(hex);
const COLORS = { sky: [C(DAY.sky), C(NIGHT.sky)], ground: [C(DAY.ground), C(NIGHT.ground)], sun: [C(DAY.sun), C(NIGHT.sun)] };

function rock(s = 1) {
  const m = part(new THREE.DodecahedronGeometry(0.3, 0), 0x9a958c, { flatShading: true, thickness: 1.05 });
  m.scale.set(s * 1.2, s * 0.7, s);
  m.position.y = 0.1 * s;
  return m;
}

function mushroom(s = 1) {
  const g = new THREE.Group();
  const stem = part(new THREE.CylinderGeometry(0.06, 0.08, 0.2, 8), 0xf6ead2);
  stem.position.y = 0.1;
  const cap = part(new THREE.SphereGeometry(0.16, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xe0473a);
  cap.position.y = 0.18;
  g.add(stem, cap);
  g.scale.setScalar(s);
  return g;
}

// 每個角色的專屬道具
const PROPS = {
  hero() {
    const g = new THREE.Group();
    const r = rock(1.3);
    const flagPole = part(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6), 0x7a5232);
    flagPole.position.set(0.1, 0.6, 0);
    const flag = part(new THREE.PlaneGeometry(0.4, 0.26), 0xd8402f, { side: THREE.DoubleSide, outline: false });
    flag.position.set(0.31, 1.0, 0);
    g.add(r, flagPole, flag);
    g.userData.spin = (t) => (flag.rotation.y = Math.sin(t * 3) * 0.3);
    return g;
  },
  wizard() {
    const crystal = part(new THREE.OctahedronGeometry(0.2, 0), 0x5ff0ff, { emissive: 0x35bfcc, emissiveIntensity: 0.6, flatShading: true });
    crystal.scale.y = 1.5;
    crystal.position.y = 0.7;
    crystal.userData.spin = (t) => {
      crystal.rotation.y = t;
      crystal.position.y = 0.7 + Math.sin(t * 2) * 0.08;
    };
    return crystal;
  },
  ranger() {
    const g = new THREE.Group();
    const legs = part(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), 0x7a5232);
    legs.position.y = 0.4;
    g.add(legs);
    [
      [0.32, 0xffffff],
      [0.24, 0xe0473a],
      [0.15, 0xffffff],
      [0.07, 0xe0473a],
    ].forEach(([r, c], i) => {
      const ring = part(new THREE.CylinderGeometry(r, r, 0.04, 24), c, { outline: i === 0 });
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 0.85, 0.02 + i * 0.006);
      g.add(ring);
    });
    return g;
  },
  merchant() {
    const g = new THREE.Group();
    const crate = part(new THREE.BoxGeometry(0.45, 0.4, 0.45), 0xb07a45);
    crate.position.y = 0.2;
    const crate2 = part(new THREE.BoxGeometry(0.3, 0.26, 0.3), 0xc99a5c);
    crate2.position.set(0.05, 0.53, 0);
    crate2.rotation.y = 0.4;
    g.add(crate, crate2);
    return g;
  },
  slime() {
    const g = new THREE.Group();
    const a = mushroom(1.1);
    const b = mushroom(0.7);
    b.position.set(0.25, 0, 0.15);
    g.add(a, b);
    return g;
  },
  fairy() {
    const g = new THREE.Group();
    const stem = part(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), 0x4b9450);
    stem.position.y = 0.3;
    g.add(stem);
    for (let i = 0; i < 5; i++) {
      const petal = part(new THREE.SphereGeometry(0.12, 10, 8), 0xf7a1c4, { outline: false });
      const a = (i / 5) * Math.PI * 2;
      petal.scale.set(1, 0.4, 1);
      petal.position.set(Math.cos(a) * 0.13, 0.62, Math.sin(a) * 0.13);
      g.add(petal);
    }
    const core = part(new THREE.SphereGeometry(0.07, 10, 8), 0xfff07a, { outline: false });
    core.position.y = 0.65;
    g.add(core);
    return g;
  },
};

export function buildStage(id) {
  const scene = new THREE.Scene();
  const hemi = new THREE.HemisphereLight(DAY.sky, DAY.ground, DAY.hemi);
  const sun = new THREE.DirectionalLight(DAY.sun, DAY.sunI);
  sun.position.set(-3, 6, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(512, 512);
  Object.assign(sun.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 1, far: 15 });
  sun.shadow.bias = -0.001;
  scene.add(hemi, sun);

  // 草地圓台
  const top = part(new THREE.CylinderGeometry(1.7, 1.7, 0.18, 40), 0x7cc04e, { outline: false });
  top.position.y = -0.09;
  top.receiveShadow = true;
  const side = part(new THREE.CylinderGeometry(1.7, 1.45, 0.45, 40), 0x8a6a45, { outline: false, shadow: false });
  side.position.y = -0.4;
  scene.add(top, side);
  const flowers = [0xfff07a, 0xf7a1c4, 0xffffff, 0xb9a6ff];
  for (let i = 0; i < 14; i++) {
    const f = part(new THREE.SphereGeometry(0.045, 6, 4), flowers[i % 4], { outline: false, shadow: false });
    const a = (i / 14) * Math.PI * 2 + i;
    const r = 1.05 + (i % 3) * 0.18;
    f.position.set(Math.cos(a) * r, 0.03, Math.sin(a) * r);
    scene.add(f);
  }

  const prop = PROPS[id]?.();
  if (prop) {
    prop.position.set(1.05, 0, -0.55);
    scene.add(prop);
  }

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 1.9, 5.9);
  camera.lookAt(0, 1.0, 0);

  return {
    scene,
    camera,
    update(t, night) {
      prop?.traverse((o) => o.userData.spin?.(t));
      hemi.color.lerpColors(...COLORS.sky, night);
      hemi.groundColor.lerpColors(...COLORS.ground, night);
      sun.color.lerpColors(...COLORS.sun, night);
      hemi.intensity = THREE.MathUtils.lerp(DAY.hemi, NIGHT.hemi, night);
      sun.intensity = THREE.MathUtils.lerp(DAY.sunI, NIGHT.sunI, night);
    },
  };
}
