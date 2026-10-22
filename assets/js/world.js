// 森林營地場景：草地、營火、帳篷、松樹、石頭、遠方城堡、雲、螢火蟲、日夜光線
import * as THREE from "three";
import { part, toon } from "./toon.js";

export const WALK_RADIUS = 9;

function seeded(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const DAY = { sky: 0xfff4e0, ground: 0x6f8f5a, sun: 0xfff1d6, hemi: 1.5, sunI: 2.6, fog: 0xbfdbe6 };
const NIGHT = { sky: 0x5b6fa8, ground: 0x1d2433, sun: 0x9fb4ff, hemi: 0.55, sunI: 0.45, fog: 0x2a3a5c };

function pine(rng, scale = 1) {
  const g = new THREE.Group();
  const trunk = part(new THREE.CylinderGeometry(0.14, 0.2, 0.7, 7), 0x7a5232);
  trunk.position.y = 0.35;
  g.add(trunk);
  const greens = [0x2f6b3a, 0x3b7f44, 0x4b9450];
  [
    [1.25, 1.3, 0.95],
    [1.0, 1.15, 1.6],
    [0.7, 0.95, 2.2],
  ].forEach(([r, h, y], i) => {
    const cone = part(new THREE.ConeGeometry(r, h, 8), greens[i], { thickness: 1.04 });
    cone.position.y = y;
    cone.rotation.y = rng() * Math.PI;
    g.add(cone);
  });
  g.scale.setScalar(scale);
  return g;
}

function rock(rng, s = 1) {
  const m = part(new THREE.DodecahedronGeometry(0.5, 0), 0x9a958c, { flatShading: true, thickness: 1.05 });
  m.scale.set(s * (0.8 + rng() * 0.5), s * (0.5 + rng() * 0.3), s * (0.8 + rng() * 0.4));
  m.rotation.set(rng(), rng() * 3, rng());
  m.position.y = 0.12 * s;
  m.receiveShadow = true;
  return m;
}

function mushroom(rng) {
  const g = new THREE.Group();
  const stem = part(new THREE.CylinderGeometry(0.07, 0.09, 0.22, 8), 0xf6ead2);
  stem.position.y = 0.11;
  const cap = part(new THREE.SphereGeometry(0.18, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xe0473a);
  cap.position.y = 0.2;
  g.add(stem, cap);
  for (let i = 0; i < 4; i++) {
    const dot = part(new THREE.SphereGeometry(0.03, 6, 4), 0xffffff, { outline: false });
    const a = (i / 4) * Math.PI * 2 + rng();
    dot.position.set(Math.cos(a) * 0.12, 0.3, Math.sin(a) * 0.12);
    g.add(dot);
  }
  g.scale.setScalar(0.9 + rng() * 0.6);
  return g;
}

function tent() {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(1.5, 1.5, 2.8, 3, 1);
  geo.rotateZ(Math.PI / 2).rotateX(-Math.PI / 2);
  const body = part(geo, 0xe8742f, { thickness: 1.03 });
  body.position.y = 0.75;
  body.scale.y = 1.05;
  g.add(body);
  const door = part(new THREE.CircleGeometry(0.75, 3), 0x5a2a14, { outline: false });
  door.rotation.z = Math.PI / 2;
  door.position.set(1.41, 0.55, 0);
  door.rotation.y = Math.PI / 2;
  g.add(door);
  for (const x of [-1.6, 1.6]) {
    const stake = part(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 6), 0x7a5232);
    stake.position.set(x, 1.05, 0);
    g.add(stake);
  }
  return g;
}

function castle() {
  const g = new THREE.Group();
  const stone = toon(0x7f93b0);
  const roof = toon(0x40557a);
  const add = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  add(new THREE.BoxGeometry(6, 4, 3), stone, 0, 2, 0);
  for (const [x, h] of [
    [-3.4, 7],
    [3.4, 6],
    [0, 9],
    [-1.6, 5.5],
  ]) {
    add(new THREE.CylinderGeometry(0.9, 0.9, h, 10), stone, x, h / 2, 0.6);
    add(new THREE.ConeGeometry(1.15, 2.6, 10), roof, x, h + 1.3, 0.6);
  }
  return g;
}

export function buildWorld(scene, particles) {
  const rng = seeded(42);
  const group = new THREE.Group();
  scene.add(group);
  const obstacles = [];

  // 燈光
  const hemi = new THREE.HemisphereLight(DAY.sky, DAY.ground, DAY.hemi);
  const sun = new THREE.DirectionalLight(DAY.sun, DAY.sunI);
  sun.position.set(-10, 18, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 50 });
  sun.shadow.bias = -0.0005;
  scene.add(hemi, sun);
  scene.fog = new THREE.Fog(DAY.fog, 30, 90);

  // 地面：草地島
  const grass = part(new THREE.CylinderGeometry(15, 15.4, 1, 56), 0x7cc04e, { outline: false });
  grass.position.y = -0.5;
  grass.receiveShadow = true;
  const cliff = part(new THREE.CylinderGeometry(15.4, 12, 3, 56), 0x8a6a45, { outline: false, shadow: false });
  cliff.position.y = -2.5;
  group.add(grass, cliff);

  // 營火周圍的泥土地
  const dirt = part(new THREE.CircleGeometry(2.6, 32), 0xd9b16a, { outline: false });
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.y = 0.01;
  dirt.receiveShadow = true;
  group.add(dirt);

  // 蜿蜒小路：一串踏腳石
  const path = new THREE.CatmullRomCurve3([new THREE.Vector3(2.4, 0, 1.2), new THREE.Vector3(5, 0, 4), new THREE.Vector3(3.5, 0, 8), new THREE.Vector3(6, 0, 12.5)]);
  for (let i = 0; i <= 22; i++) {
    const p = path.getPoint(i / 22);
    const s = part(new THREE.CylinderGeometry(0.42, 0.46, 0.06, 9), 0xe2c48b, { outline: false });
    s.position.set(p.x + (rng() - 0.5) * 0.3, 0.02, p.z);
    s.rotation.y = rng() * 3;
    s.receiveShadow = true;
    group.add(s);
  }

  // 營火
  const fire = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const st = rock(rng, 0.45);
    st.position.set(Math.cos(a) * 0.75, 0.08, Math.sin(a) * 0.75);
    fire.add(st);
  }
  for (const r of [0.5, -0.5]) {
    const log = part(new THREE.CylinderGeometry(0.1, 0.12, 1.2, 8), 0x6e4426);
    log.rotation.set(Math.PI / 2, r, 0.25);
    log.position.y = 0.15;
    fire.add(log);
  }
  const flames = [
    [0xff7a1f, 0.38, 0.9, 0],
    [0xffb21f, 0.27, 0.7, 0.12],
    [0xfff07a, 0.16, 0.45, 0.2],
  ].map(([c, r, h, z]) => {
    const f = part(new THREE.ConeGeometry(r, h, 7), c, { outline: false, shadow: false, emissive: c, emissiveIntensity: 0.9 });
    f.position.set(0, 0.2 + h / 2, z * 0.3);
    f.userData.h = h;
    fire.add(f);
    return f;
  });
  const fireLight = new THREE.PointLight(0xff9a3c, 0, 9, 1.6);
  fireLight.position.y = 0.9;
  fire.add(fireLight);
  group.add(fire);
  obstacles.push({ x: 0, z: 0, r: 1.5 });

  // 帳篷
  const t = tent();
  t.position.set(5.5, 0, -4);
  t.rotation.y = -0.5;
  group.add(t);
  obstacles.push({ x: 5.5, z: -4, r: 2.4 });

  // 松樹：外圈一整圈，內圈幾棵
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rng() * 0.2;
    const r = 11.6 + rng() * 2.6;
    const tr = pine(rng, 0.9 + rng() * 0.6);
    tr.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    group.add(tr);
  }
  for (const [x, z, s] of [
    [-6.5, -5, 1.1],
    [-8, 2.5, 0.9],
    [7.5, 3, 1],
  ]) {
    const tr = pine(rng, s);
    tr.position.set(x, 0, z);
    group.add(tr);
    obstacles.push({ x, z, r: 1.3 * s });
  }

  // 石頭、香菇、小花
  for (const [x, z, s] of [
    [-3.8, 4.5, 1.2],
    [3, -6.5, 0.9],
    [-6, -1, 0.7],
  ]) {
    const r = rock(rng, s);
    r.position.x = x;
    r.position.z = z;
    group.add(r);
    obstacles.push({ x, z, r: 0.8 * s });
  }
  for (let i = 0; i < 7; i++) {
    const m = mushroom(rng);
    const a = rng() * Math.PI * 2;
    const r = 3 + rng() * 7;
    m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    group.add(m);
  }
  const flowerColors = [0xfff07a, 0xf7a1c4, 0xffffff, 0xb9a6ff];
  for (let i = 0; i < 70; i++) {
    const f = part(new THREE.SphereGeometry(0.06, 6, 4), flowerColors[i % 4], { outline: false, shadow: false });
    const a = rng() * Math.PI * 2;
    const r = 3 + rng() * 10.5;
    f.position.set(Math.cos(a) * r, 0.05, Math.sin(a) * r);
    group.add(f);
  }

  // 遠景：山丘、城堡、山
  const hill = part(new THREE.SphereGeometry(18, 24, 12), 0x5f9a58, { outline: false, shadow: false });
  hill.scale.y = 0.45;
  hill.position.set(-14, -3, -42);
  const c = castle();
  c.position.set(-14, 4, -44);
  c.scale.setScalar(0.9);
  group.add(hill, c);
  for (const [x, z, h, r] of [
    [18, -50, 22, 14],
    [32, -46, 16, 11],
    [-36, -48, 18, 13],
  ]) {
    const m = part(new THREE.ConeGeometry(r, h, 7), 0x587a98, { outline: false, shadow: false, flatShading: true });
    m.position.set(x, h / 2 - 3, z);
    group.add(m);
  }

  // 雲
  const clouds = [];
  for (let i = 0; i < 6; i++) {
    const cl = new THREE.Group();
    for (let j = 0; j < 4; j++) {
      const puff = part(new THREE.SphereGeometry(1 + rng() * 0.8, 12, 8), 0xffffff, { outline: false, shadow: false });
      puff.position.set(j * 1.3 - 2, rng() * 0.6, rng() * 0.8);
      cl.add(puff);
    }
    cl.position.set(-40 + i * 16, 14 + rng() * 6, -30 + rng() * 14);
    cl.userData.speed = 0.4 + rng() * 0.5;
    group.add(cl);
    clouds.push(cl);
  }

  // 螢火蟲（夜晚才出現）
  const fireflies = [];
  const ffMat = new THREE.MeshBasicMaterial({ color: 0xfff27a, transparent: true, opacity: 0 });
  for (let i = 0; i < 40; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), ffMat);
    m.userData = { a: rng() * 6.28, r: 2 + rng() * 10, y: 0.4 + rng() * 2.2, s: 0.2 + rng() * 0.4 };
    group.add(m);
    fireflies.push(m);
  }

  let night = 0;
  let nightTarget = 0;
  let emberTimer = 0;
  const tmp = new THREE.Color();
  const lerpColor = (a, b, k) => tmp.set(a).lerp(new THREE.Color(b), k);

  return {
    obstacles,
    fireLight,
    get night() {
      return night;
    },
    setNight(on) {
      nightTarget = on ? 1 : 0;
    },
    update(t, dt) {
      night += (nightTarget - night) * Math.min(1, dt * 2.5);
      hemi.color.copy(lerpColor(DAY.sky, NIGHT.sky, night));
      hemi.groundColor.copy(lerpColor(DAY.ground, NIGHT.ground, night));
      sun.color.copy(lerpColor(DAY.sun, NIGHT.sun, night));
      hemi.intensity = THREE.MathUtils.lerp(DAY.hemi, NIGHT.hemi, night);
      sun.intensity = THREE.MathUtils.lerp(DAY.sunI, NIGHT.sunI, night);
      scene.fog.color.copy(lerpColor(DAY.fog, NIGHT.fog, night));

      // 營火閃爍
      flames.forEach((f, i) => {
        const s = 1 + Math.sin(t * (9 + i * 3) + i) * 0.12 + Math.sin(t * 17 + i * 2) * 0.06;
        f.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
        f.position.y = 0.2 + (f.userData.h * s) / 2;
      });
      fireLight.intensity = (1.2 + night * 7) * (0.85 + Math.sin(t * 13) * 0.1 + Math.sin(t * 29) * 0.05);
      emberTimer -= dt;
      if (emberTimer <= 0) {
        emberTimer = 0.25 - night * 0.15;
        particles.emit(new THREE.Vector3(0, 0.8, 0), { count: 1, colors: [0xffb21f, 0xff7a1f], speed: 0.25, up: 1.2, gravity: -0.2, life: 1.4, size: 0.6 });
      }

      clouds.forEach((cl) => {
        cl.position.x += cl.userData.speed * dt;
        if (cl.position.x > 55) cl.position.x = -55;
      });

      ffMat.opacity = night * (0.7 + Math.sin(t * 3) * 0.3);
      fireflies.forEach((m) => {
        const d = m.userData;
        m.visible = night > 0.05;
        m.position.set(Math.cos(d.a + t * d.s) * d.r, d.y + Math.sin(t * 1.3 + d.a) * 0.4, Math.sin(d.a * 1.7 + t * d.s) * d.r);
      });
    },
  };
}
