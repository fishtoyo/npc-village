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

function pine(s = 1) {
  const g = new THREE.Group();
  const trunk = part(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 6), 0x7a5232);
  trunk.position.y = 0.15;
  g.add(trunk);
  [
    [0.5, 0.55, 0.45, 0x2f6b3a],
    [0.4, 0.5, 0.75, 0x3b7f44],
    [0.28, 0.4, 1.0, 0x4b9450],
  ].forEach(([r, h, y, c]) => {
    const cone = part(new THREE.ConeGeometry(r, h, 8), c, { thickness: 1.05 });
    cone.position.y = y;
    g.add(cone);
  });
  g.scale.setScalar(s);
  return g;
}

function book(color, w = 0.36, h = 0.08) {
  const g = new THREE.Group();
  const cover = part(new THREE.BoxGeometry(w, h, 0.26), color);
  const pages = part(new THREE.BoxGeometry(w - 0.03, h - 0.025, 0.24), 0xfff8e8, { outline: false });
  pages.position.z = 0.015;
  g.add(cover, pages);
  return g;
}

// 背景布景：放在角色後方，讓每張卡片有自己的場景
const BACKDROPS = {
  hero() {
    const g = new THREE.Group();
    const tower = part(new THREE.CylinderGeometry(0.3, 0.34, 1.5, 12), 0xd3d9e2);
    tower.position.y = 0.75;
    const roof = part(new THREE.ConeGeometry(0.42, 0.6, 12), 0x3f86c9);
    roof.position.y = 1.8;
    const door = part(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12, 1, false, 0, Math.PI), 0x6e4426, { outline: false });
    door.rotation.x = Math.PI / 2;
    door.position.set(0, 0.1, 0.32);
    const win = part(new THREE.BoxGeometry(0.1, 0.16, 0.04), 0x35506e, { outline: false });
    win.position.set(0, 1.05, 0.31);
    g.add(tower, roof, door, win);
    g.position.set(-1.05, 0, -0.95);
    return g;
  },
  wizard() {
    const g = new THREE.Group();
    const moon = part(new THREE.TorusGeometry(0.22, 0.07, 8, 20, Math.PI * 1.25), 0xfff07a, { emissive: 0xfff07a, emissiveIntensity: 0.5 });
    moon.position.set(-0.95, 2.05, -1.2);
    moon.rotation.z = 0.9;
    g.add(moon);
    const stars = [];
    for (const [x, y] of [
      [-0.5, 2.3],
      [0.6, 2.2],
      [1.0, 1.7],
      [-1.2, 1.5],
      [0.2, 2.5],
    ]) {
      const st = part(new THREE.OctahedronGeometry(0.06, 0), 0xfff07a, { emissive: 0xfff07a, emissiveIntensity: 0.7, outline: false });
      st.position.set(x, y, -1.3);
      g.add(st);
      stars.push(st);
    }
    g.userData.spin = (t) => stars.forEach((st, i) => st.scale.setScalar(0.8 + Math.sin(t * 3 + i) * 0.35));
    return g;
  },
  ranger() {
    const g = new THREE.Group();
    const a = pine(0.85);
    a.position.set(-1.05, 0, -0.95);
    const b = pine(0.6);
    b.position.set(-0.45, 0, -1.3);
    const c = pine(0.5);
    c.position.set(0.55, 0, -1.3);
    g.add(a, b, c);
    return g;
  },
  merchant() {
    const g = new THREE.Group();
    for (const x of [-0.45, 0.45]) {
      const post = part(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 6), 0x7a5232);
      post.position.set(x, 0.65, 0);
      g.add(post);
    }
    for (let i = 0; i < 6; i++) {
      const stripe = part(new THREE.BoxGeometry(0.17, 0.04, 0.5), i % 2 ? 0xffffff : 0xd8402f, { outline: false });
      stripe.position.set(-0.425 + i * 0.17, 1.32, 0.05);
      stripe.rotation.x = 0.25;
      g.add(stripe);
    }
    const counter = part(new THREE.BoxGeometry(1.0, 0.45, 0.35), 0xb07a45);
    counter.position.y = 0.23;
    g.add(counter);
    for (const [x, c] of [
      [-0.28, 0xe0473a],
      [0, 0xf4b13b],
      [0.28, 0x7cc04e],
    ]) {
      const fruit = part(new THREE.SphereGeometry(0.08, 10, 8), c);
      fruit.position.set(x, 0.53, 0);
      g.add(fruit);
    }
    g.position.set(-0.95, 0, -1.0);
    g.rotation.y = 0.35;
    return g;
  },
  slime() {
    const g = new THREE.Group();
    const pond = part(new THREE.CircleGeometry(0.5, 24), 0x6cc6e6, { outline: false, shadow: false });
    pond.rotation.x = -Math.PI / 2;
    pond.scale.set(1.3, 1, 1);
    pond.position.set(-0.85, 0.012, -0.6);
    g.add(pond);
    for (const [x, z] of [
      [-1.0, -0.5],
      [-0.65, -0.75],
    ]) {
      const pad = part(new THREE.CircleGeometry(0.12, 12, 0.3, Math.PI * 1.8), 0x4b9450, { outline: false, shadow: false });
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(x, 0.02, z);
      g.add(pad);
    }
    const b = pine(0.55);
    b.position.set(0.6, 0, -1.3);
    g.add(b);
    return g;
  },
  fairy() {
    const g = new THREE.Group();
    for (const [x, z, h, c] of [
      [-1.0, -0.9, 1.3, 0xb9a6ff],
      [-0.5, -1.25, 0.95, 0xfff07a],
      [0.7, -1.2, 1.1, 0x9fd8f5],
    ]) {
      const stem = part(new THREE.CylinderGeometry(0.03, 0.03, h, 6), 0x4b9450);
      stem.position.set(x, h / 2, z);
      g.add(stem);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const petal = part(new THREE.SphereGeometry(0.11, 10, 8), c, { outline: false });
        petal.scale.set(1, 0.35, 1);
        petal.position.set(x + Math.cos(a) * 0.13, h, z + Math.sin(a) * 0.13);
        g.add(petal);
      }
      const core = part(new THREE.SphereGeometry(0.07, 10, 8), 0xf4b13b, { outline: false });
      core.position.set(x, h + 0.03, z);
      g.add(core);
    }
    return g;
  },
  owl() {
    const g = new THREE.Group();
    const board = part(new THREE.BoxGeometry(1.1, 0.75, 0.06), 0x2f5a44);
    board.position.y = 1.1;
    const frame = part(new THREE.BoxGeometry(1.2, 0.85, 0.04), 0x8a5a32, { outline: false });
    frame.position.set(0, 1.1, -0.03);
    g.add(board, frame);
    for (const x of [-0.45, 0.45]) {
      const leg = part(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), 0x8a5a32);
      leg.position.set(x, 0.4, -0.05);
      g.add(leg);
    }
    // 黑板上的粉筆字（用小方塊排出 ABC 的感覺）
    for (const [x, y, w, h] of [
      [-0.32, 1.2, 0.18, 0.025],
      [-0.32, 1.08, 0.14, 0.025],
      [-0.05, 1.2, 0.2, 0.025],
      [0.25, 1.15, 0.16, 0.025],
      [-0.2, 0.95, 0.5, 0.02],
    ]) {
      const chalk = part(new THREE.BoxGeometry(w, h, 0.01), 0xf6f1e4, { outline: false, shadow: false });
      chalk.position.set(x, y, 0.035);
      g.add(chalk);
    }
    g.position.set(-0.55, 0, -1.15);
    g.rotation.y = 0.2;
    return g;
  },
  dragon() {
    const g = new THREE.Group();
    for (const [x, z, s] of [
      [-1.0, -0.9, 1.5],
      [-0.5, -1.25, 1.1],
      [0.75, -1.15, 1.2],
    ]) {
      const r = part(new THREE.DodecahedronGeometry(0.35, 0), 0x8f7e72, { flatShading: true, thickness: 1.05 });
      r.scale.set(s, s * 1.3, s);
      r.position.set(x, 0.3 * s, z);
      g.add(r);
    }
    const lava = part(new THREE.CircleGeometry(0.22, 16), 0xff7a1f, { emissive: 0xff7a1f, emissiveIntensity: 0.7, outline: false, shadow: false });
    lava.rotation.x = -Math.PI / 2;
    lava.position.set(-0.3, 0.012, -0.85);
    g.add(lava);
    return g;
  },
  princess() {
    const g = new THREE.Group();
    const arch = part(new THREE.TorusGeometry(0.55, 0.07, 10, 28, Math.PI), 0xf7c1d9);
    arch.position.y = 0.95;
    g.add(arch);
    for (const x of [-0.55, 0.55]) {
      const pillar = part(new THREE.CylinderGeometry(0.07, 0.07, 0.95, 10), 0xf7c1d9);
      pillar.position.set(x, 0.475, 0);
      g.add(pillar);
      for (let i = 0; i < 3; i++) {
        const rose = part(new THREE.SphereGeometry(0.06, 8, 6), i % 2 ? 0xe0473a : 0xffffff, { outline: false });
        rose.position.set(x + (i - 1) * 0.06, 0.3 + i * 0.25, 0.07);
        g.add(rose);
      }
    }
    const heart = new THREE.Group();
    for (const s of [-1, 1]) {
      const lobe = part(new THREE.SphereGeometry(0.1, 12, 10), 0xe46b9b, { emissive: 0xe46b9b, emissiveIntensity: 0.3 });
      lobe.position.x = 0.07 * s;
      heart.add(lobe);
    }
    const tipH = part(new THREE.ConeGeometry(0.15, 0.2, 12), 0xe46b9b, { emissive: 0xe46b9b, emissiveIntensity: 0.3 });
    tipH.rotation.x = Math.PI;
    tipH.position.y = -0.1;
    heart.add(tipH);
    heart.position.y = 1.65;
    g.add(heart);
    g.userData.spin = (t) => {
      heart.position.y = 1.65 + Math.sin(t * 2) * 0.06;
      heart.rotation.y = Math.sin(t) * 0.5;
    };
    g.position.set(0, 0, -1.15);
    return g;
  },
};

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
  owl() {
    const g = new THREE.Group();
    [0xd8402f, 0x3f86c9, 0x4f9a4a].forEach((c, i) => {
      const b = book(c, 0.38 - i * 0.04);
      b.position.y = 0.04 + i * 0.08;
      b.rotation.y = (i - 1) * 0.25;
      g.add(b);
    });
    return g;
  },
  dragon() {
    const g = new THREE.Group();
    for (const [x, rot] of [
      [-0.12, 0.3],
      [0.15, -0.5],
    ]) {
      const shell = part(new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 0xfff3d6, { side: THREE.DoubleSide });
      shell.position.set(x, 0.17, 0);
      shell.rotation.z = rot;
      g.add(shell);
    }
    for (let i = 0; i < 6; i++) {
      const coin = part(new THREE.CylinderGeometry(0.07, 0.07, 0.025, 12), 0xf4b13b, { outline: false });
      coin.position.set(0.3 + (i % 3) * 0.07, 0.015 + Math.floor(i / 3) * 0.03, 0.2);
      g.add(coin);
    }
    return g;
  },
  princess() {
    const g = new THREE.Group();
    const cushion = part(new THREE.CylinderGeometry(0.22, 0.24, 0.12, 16), 0xb9a6ff);
    cushion.position.y = 0.06;
    const tiara = part(new THREE.TorusGeometry(0.1, 0.02, 6, 16), 0xf4b13b, { outline: false });
    tiara.position.y = 0.16;
    tiara.rotation.x = Math.PI / 2;
    g.add(cushion, tiara);
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
  // 輪廓光：從背後打一道暖光，卡通角色邊緣會亮起來
  const rim = new THREE.DirectionalLight(0xfff0d0, 1.4);
  rim.position.set(2, 3, -5);
  scene.add(hemi, sun, rim);

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

  // 腳下的柔和陰影
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshBasicMaterial({ color: 0x2b4a22, transparent: true, opacity: 0.18, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.006;
  scene.add(blob);

  const backdrop = BACKDROPS[id]?.();
  if (backdrop) scene.add(backdrop);

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
      backdrop?.traverse((o) => o.userData.spin?.(t));
      rim.intensity = 1.4 * (1 - night * 0.5);
      hemi.color.lerpColors(...COLORS.sky, night);
      hemi.groundColor.lerpColors(...COLORS.ground, night);
      sun.color.lerpColors(...COLORS.sun, night);
      hemi.intensity = THREE.MathUtils.lerp(DAY.hemi, NIGHT.hemi, night);
      sun.intensity = THREE.MathUtils.lerp(DAY.sunI, NIGHT.sunI, night);
    },
  };
}
