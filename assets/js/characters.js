// 角色：參考設計圖的軟膠公仔畫風（大頭、大眼、塊狀頭髮、柔和光影、沒有描邊）
// 全部由基本幾何組成；每個角色回傳 { root, animate(npc, t, dt) }
import * as THREE from "three";
import { m, METAL, GOLD, GLOSS } from "./materials.js";

const SKIN = 0xffd9c4;
const HEAD_R = 0.46;
const HEAD_Y = 0.44; // 頭的中心（相對 headPivot）
const env = (u, edge = 0.18) => Math.min(1, u / edge, (1 - u) / edge); // 動作淡入淡出
const HAIR = { rough: 0.42, coat: 0.55 };

// ---------- 幾何小工具 ----------
const sph = (r, w = 24, h = 18) => new THREE.SphereGeometry(r, w, h);
const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 8, 16);
const cyl = (rt, rb, h, s = 24, open = false, ts = 0, tl = Math.PI * 2) => new THREE.CylinderGeometry(rt, rb, h, s, 1, open, ts, tl);
const torus = (r, t, arc = Math.PI * 2, rs = 10, ts = 32) => new THREE.TorusGeometry(r, t, rs, ts, arc);
function lathe(points, seg = 40) {
  return new THREE.LatheGeometry(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
    seg,
  );
}
// 旋轉體做成的殼（裙子、長袍、帽簷）：雙面顯示，不管輪廓點的順序都看得到
function shell(points, color, opts = {}, seg = 40) {
  return m(lathe(points, seg), color, { ...opts, side: THREE.DoubleSide });
}
// 彎曲的圓錐（巫師帽尖、角）：底部在 y=0，越往上越往 +x 彎
function bentCone(r, h, bend, seg = 20) {
  const g = new THREE.ConeGeometry(r, h, seg, 10);
  g.translate(0, h / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + bend * (p.getY(i) / h) ** 2);
  g.computeVertexNormals();
  return g;
}
// 五角星（帽子上的星星）
function starGeo(r = 0.07, depth = 0.02) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    s[i ? "lineTo" : "moveTo"](Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 });
  g.center();
  return g;
}

// 把物件貼在頭的表面（x、y 為相對頭中心的位置）
function onHead(x, y, r = HEAD_R) {
  return Math.sqrt(Math.max(0, r * r - x * x - y * y));
}

// ---------- 臉 ----------
function face(target, { iris = 0x3b7fd0, brow = 0x6b4226, lashes = false, r = HEAD_R, cy = HEAD_Y, spread = 0.17, eyeY = -0.05, browTilt = 0, nose = true, mouth = true, ears = true, skin = SKIN } = {}) {
  const eyes = [];
  const happy = [];
  const brows = [];
  for (const s of [-1, 1]) {
    const x = spread * s;
    const g = new THREE.Group();
    g.position.set(x, cy + eyeY, onHead(x, eyeY, r) - 0.012);
    g.rotation.y = Math.asin(x / r);
    const outer = m(sph(0.092), 0x2b1d14, { ...GLOSS, shadow: false });
    outer.scale.set(0.82, 1.08, 0.3);
    const ir = m(sph(0.074), iris, { ...GLOSS, shadow: false });
    ir.scale.set(0.8, 1.0, 0.3);
    ir.position.set(0, -0.01, 0.012);
    const pupil = m(sph(0.036), 0x1a120c, { ...GLOSS, shadow: false });
    pupil.scale.set(0.85, 1, 0.3);
    pupil.position.set(0, -0.012, 0.022);
    const hl1 = m(sph(0.028), 0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.7, shadow: false });
    hl1.scale.z = 0.4;
    hl1.position.set(-0.024, 0.034, 0.03);
    const hl2 = m(sph(0.013), 0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.7, shadow: false });
    hl2.position.set(0.026, -0.036, 0.03);
    g.add(outer, ir, pupil, hl1, hl2);
    if (lashes) {
      const lash = m(cap(0.012, 0.05), 0x2b1d14, { shadow: false });
      lash.position.set(0.075 * s, 0.07, 0.005);
      lash.rotation.z = -0.9 * s;
      g.add(lash);
    }
    target.add(g);
    eyes.push(g);

    // 笑瞇眼（^ ^）
    const h = m(torus(0.06, 0.017, Math.PI, 6, 12), 0x2b1d14, { shadow: false });
    h.position.copy(g.position);
    h.position.z += 0.015;
    h.rotation.y = g.rotation.y;
    h.visible = false;
    target.add(h);
    happy.push(h);

    if (brow !== null) {
      const by = eyeY + 0.135;
      const b = m(cap(0.017, 0.085), brow, { shadow: false });
      b.position.set(spread * s, cy + by, onHead(spread, by, r) + 0.004);
      b.userData = { s, y: cy + by, tilt: browTilt };
      b.rotation.set(0, Math.asin(x / r), Math.PI / 2 + browTilt * s);
      target.add(b);
      brows.push(b);
    }

    const blush = m(sph(0.07), 0xff8f8f, { transparent: true, opacity: 0.4, shadow: false });
    blush.scale.set(1.3, 0.65, 0.3);
    const bx = 0.27 * (r / HEAD_R) * s;
    const byy = eyeY - 0.11;
    blush.position.set(bx, cy + byy, onHead(bx, byy, r) - 0.008);
    blush.rotation.y = Math.asin(bx / r);
    target.add(blush);

    if (ears) {
      const ear = m(sph(0.085), skin);
      ear.scale.set(0.55, 1, 0.8);
      ear.position.set((r - 0.01) * s, cy - 0.04, 0);
      target.add(ear);
    }
  }
  if (nose) {
    const n = m(sph(0.028), 0xffbfa3, { shadow: false });
    n.position.set(0, cy - 0.14, onHead(0, -0.14, r) + 0.004);
    target.add(n);
  }
  const smile = m(torus(0.042, 0.011, Math.PI, 8, 12), 0x8a3b2b, { shadow: false });
  smile.rotation.z = Math.PI;
  smile.position.set(0, cy - 0.205, onHead(0, -0.205, r) + 0.002);
  const open = m(sph(0.05), 0x8a3b2b, { shadow: false });
  open.scale.set(1, 0.8, 0.35);
  open.position.copy(smile.position);
  open.visible = false;
  smile.visible = mouth;
  target.add(smile, open);
  return { eyes, happy, brows, smile, open, mouth };
}

// 表情：眨眼、說話開合嘴、跳舞笑瞇眼、特殊動作皺眉張嘴
function express(f, npc, t) {
  const talking = npc.action?.name === "greet";
  const special = npc.action?.name === "special";
  const joy = npc.dancing;
  f.eyes.forEach((e, i) => {
    e.visible = !joy;
    f.happy[i].visible = joy;
    e.scale.y = npc.blinking ? 0.1 : 1;
  });
  if (f.mouth) {
    const open = special || (talking && Math.sin(t * 16) > -0.3) || (joy && Math.sin(t * 6) > 0.5);
    f.smile.visible = !open;
    f.open.visible = open;
    if (open) f.open.scale.y = special ? 0.95 : 0.5 + Math.abs(Math.sin(t * 16)) * 0.45;
  }
  const raise = talking || joy ? 0.025 : 0;
  const frown = special ? 0.3 : 0;
  for (const b of f.brows) {
    b.position.y += (b.userData.y + raise - b.position.y) * 0.3;
    b.rotation.z = Math.PI / 2 + (b.userData.tilt + frown) * b.userData.s;
  }
}

// ---------- 頭髮：頭頂、後腦、瀏海一塊一塊 ----------
function hair(headPivot, color, { top = true, back = true, fringe = 5, fringeY = 0.3, spreadA = 1.9, side = 0, sideY = -0.05 } = {}) {
  if (top) {
    const c = m(new THREE.SphereGeometry(HEAD_R + 0.035, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.52), color, HAIR);
    c.position.y = HEAD_Y;
    c.rotation.x = -0.32;
    headPivot.add(c);
  }
  if (back) {
    const b = m(sph(HEAD_R + 0.03), color, HAIR);
    b.scale.set(1, 0.92, 0.75);
    b.position.set(0, HEAD_Y - 0.02, -0.12);
    headPivot.add(b);
  }
  for (let i = 0; i < fringe; i++) {
    const a = fringe === 1 ? 0 : (i / (fringe - 1) - 0.5) * spreadA;
    const chunk = m(sph(0.13), color, HAIR);
    chunk.scale.set(0.95, 1.25, 0.55);
    const rr = HEAD_R * 0.86;
    chunk.position.set(Math.sin(a) * rr, HEAD_Y + fringeY - Math.abs(a) * 0.05, Math.cos(a) * rr);
    chunk.rotation.set(-0.25, a, -a * 0.35);
    headPivot.add(chunk);
  }
  for (const s of side ? [-1, 1] : []) {
    const lock = m(cap(0.1, side), color, HAIR);
    lock.position.set((HEAD_R - 0.02) * s, HEAD_Y + sideY - side / 2, 0.05);
    lock.rotation.z = 0.12 * s;
    headPivot.add(lock);
  }
}

// ---------- Q 版身體 ----------
// root（位置／朝向）→ bodyPivot（彈跳）→ 身體、頭、手、腳（各自有關節 pivot）
function figure({ shirt, pants = 0x5a3e2b, boots = 0x6e4426, bootsOpts = {}, gloves = SKIN, skin = SKIN, faceOpts = {}, longBoots = false }) {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const leg = (s) => {
    const p = new THREE.Group();
    p.position.set(0.11 * s, 0.36, 0);
    const l = m(cap(0.09, 0.12), pants);
    l.position.y = -0.12;
    const boot = new THREE.Group();
    boot.position.y = -0.27;
    const shaft = m(cyl(0.105, 0.115, longBoots ? 0.22 : 0.13), boots, bootsOpts);
    shaft.position.y = longBoots ? 0.06 : 0.02;
    const toe = m(sph(0.115), boots, bootsOpts);
    toe.scale.set(1, 0.65, 1.3);
    toe.position.set(0, -0.04, 0.04);
    boot.add(shaft, toe);
    p.add(l, boot);
    bodyPivot.add(p);
    return p;
  };

  const hips = m(sph(0.2), pants);
  hips.scale.set(1.12, 0.62, 0.9);
  hips.position.y = 0.4;
  const torso = m(cap(0.21, 0.14), shirt);
  torso.position.y = 0.6;
  torso.scale.set(1.08, 1, 0.86);
  const neck = m(cyl(0.07, 0.08, 0.1, 12), skin);
  neck.position.y = 0.8;
  bodyPivot.add(hips, torso, neck);

  const headPivot = new THREE.Group();
  headPivot.position.y = 0.8;
  bodyPivot.add(headPivot);
  const head = m(sph(HEAD_R, 40, 30), skin);
  head.scale.set(1.04, 0.97, 1);
  head.position.y = HEAD_Y;
  headPivot.add(head);
  const f = face(headPivot, { skin, ...faceOpts });

  const arm = (s) => {
    const p = new THREE.Group();
    p.position.set(0.27 * s, 0.75, 0);
    const inner = new THREE.Group();
    inner.rotation.z = 0.22 * s;
    const a = m(cap(0.068, 0.13), shirt);
    a.position.y = -0.12;
    const hand = m(sph(0.078), gloves);
    hand.position.y = -0.27;
    inner.add(a, hand);
    p.add(inner);
    bodyPivot.add(p);
    return { pivot: p, inner, hand };
  };
  const L = arm(-1),
    R = arm(1);
  return { root, bodyPivot, torso, headPivot, face: f, legL: leg(-1), legR: leg(1), armL: L.pivot, armR: R.pivot, innerL: L.inner, innerR: R.inner, handL: L.hand, handR: R.hand };
}

// 人形共用動畫：踏步、呼吸、看向、跳舞、打招呼；回傳姿勢，角色可再覆寫
function pose(rig, npc, t) {
  const wb = npc.walkBlend;
  const ph = npc.walkPhase;
  const p = {
    legL: Math.sin(ph) * 0.55 * wb,
    legR: -Math.sin(ph) * 0.55 * wb,
    armLx: -Math.sin(ph) * 0.5 * wb,
    armRx: Math.sin(ph) * 0.5 * wb,
    armLz: 0,
    armRz: 0,
    bob: Math.abs(Math.sin(ph)) * 0.05 * wb + Math.sin(t * 2.2 + npc.seed) * 0.01,
    headYaw: npc.lookYaw,
    headTilt: Math.sin(t * 1.3 + npc.seed) * 0.03,
    lean: wb * 0.05,
  };
  if (npc.dancing) {
    const d = t * 6 + npc.seed;
    p.bob = Math.abs(Math.sin(d)) * 0.12;
    p.armLz = -2.3 - Math.sin(d) * 0.4;
    p.armRz = 2.3 - Math.sin(d) * 0.4;
    p.legL = Math.max(0, Math.sin(d)) * 0.4;
    p.legR = Math.max(0, -Math.sin(d)) * 0.4;
    p.headTilt = Math.sin(d) * 0.18;
    p.lean = 0;
  }
  if (npc.action?.name === "greet") {
    const e = env(npc.action.u);
    p.armRz = 2.5 * e;
    p.armRx = Math.sin(t * 14) * 0.3 * e;
    p.headTilt = 0.15 * e;
  }
  return p;
}

function applyPose(rig, p, npc, dt, t) {
  rig.legL.rotation.x = p.legL;
  rig.legR.rotation.x = p.legR;
  rig.armL.rotation.set(p.armLx, 0, p.armLz);
  rig.armR.rotation.set(p.armRx, 0, p.armRz);
  rig.bodyPivot.position.y = p.bob;
  rig.bodyPivot.rotation.x = p.lean;
  rig.headPivot.rotation.y += (p.headYaw - rig.headPivot.rotation.y) * Math.min(1, dt * 5);
  rig.headPivot.rotation.z = p.headTilt;
  express(rig.face, npc, t);
}

// ---------- 共用動作 ----------
// 揮砍：舉起 → 快速劈下 → 收回
function swing(p, npc, fxTarget) {
  const u = npc.action.u;
  p.armRx = u < 0.35 ? (-2.8 * u) / 0.35 : u < 0.5 ? -2.8 + ((u - 0.35) / 0.15) * 3.4 : 0.6 * (1 - (u - 0.5) / 0.5);
  p.bob += Math.sin(Math.min(1, u * 2) * Math.PI) * 0.12;
  if (u > 0.43 && !npc.action.fx) {
    npc.action.fx = true;
    npc.fx(fxTarget, { count: 14, colors: [0xffffff, 0xbfe8ff, 0xf4b13b], speed: 2.2, up: 1 });
  }
}
// 施法：舉起法杖，持續冒出魔法粒子
function cast(p, npc, dt, fxTarget, colors) {
  const e = env(npc.action.u, 0.2);
  p.armRx = -2.4 * e;
  p.armLz = -1.1 * e;
  p.headTilt = -0.1 * e;
  npc.action.acc = (npc.action.acc || 0) + dt;
  if (e > 0.8 && npc.action.acc > 0.07) {
    npc.action.acc = 0;
    npc.fx(fxTarget, { count: 3, colors, speed: 1.2, up: 0.8, gravity: -0.3, life: 1.2 });
  }
  return e;
}
// 射箭：舉弓、拉弦、放箭
function shoot(p, npc, fxTarget) {
  const u = npc.action.u;
  const e = env(u, 0.15);
  p.armLx = -1.5 * e;
  p.armRx = -1.4 * e;
  p.armRz = u < 0.7 ? 0.3 * e + (u / 0.7) * 0.6 * e : 0.2 * e;
  p.headYaw = 0;
  if (u > 0.7 && !npc.action.fx) {
    npc.action.fx = true;
    npc.fx(fxTarget, { count: 12, colors: [0xfff07a, 0xffffff], speed: 0.7, up: 0.4, gravity: 0, life: 0.6 });
  }
}

// ---------- 共用道具 ----------
function belt(rig, color = 0x6e4426, buckle = 0xf4b13b, y = 0.46) {
  const b = m(torus(0.215, 0.035), color);
  b.rotation.x = Math.PI / 2;
  b.scale.y = 0.86;
  b.position.y = y;
  const bk = m(new THREE.BoxGeometry(0.09, 0.07, 0.03), buckle, GOLD);
  bk.position.set(0, y, 0.19);
  rig.bodyPivot.add(b, bk);
}

function crown(color = 0xf4c542, gem = 0xd0306a) {
  const g = new THREE.Group();
  const band = m(cyl(0.2, 0.21, 0.1, 24), color, GOLD);
  g.add(band);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spike = m(new THREE.ConeGeometry(0.05, 0.13, 8), color, GOLD);
    spike.position.set(Math.sin(a) * 0.19, 0.11, Math.cos(a) * 0.19);
    const ball = m(sph(0.022, 10, 8), color, GOLD);
    ball.position.set(Math.sin(a) * 0.19, 0.18, Math.cos(a) * 0.19);
    g.add(spike, ball);
  }
  const gm = m(new THREE.OctahedronGeometry(0.045, 1), gem, { ...GLOSS, emissive: gem, emissiveIntensity: 0.25 });
  gm.position.set(0, 0.01, 0.21);
  g.add(gm);
  return g;
}

function sword({ blade = 0xdfe6ee, guard = 0xf4b13b, grip = 0x2e5cb8, len = 0.6, pommel = 0xf4b13b } = {}) {
  const g = new THREE.Group();
  const b = m(new THREE.BoxGeometry(0.1, len, 0.035), blade, METAL);
  b.position.y = 0.12 + len / 2;
  const tip = m(new THREE.ConeGeometry(0.071, 0.12, 4), blade, METAL);
  tip.rotation.y = Math.PI / 4;
  tip.scale.z = 0.35;
  tip.position.y = 0.12 + len + 0.06;
  const gd = m(new THREE.BoxGeometry(0.32, 0.06, 0.08), guard, GOLD);
  gd.position.y = 0.1;
  const gr = m(cyl(0.032, 0.032, 0.16, 10), grip);
  const pm = m(sph(0.05), pommel, GOLD);
  pm.position.y = -0.1;
  g.add(b, tip, gd, gr, pm);
  return g;
}

function bow(color, grip, size = 0.42) {
  const g = new THREE.Group();
  const arc = m(torus(size, 0.028, Math.PI, 8, 28), color, { coat: 0.6 });
  arc.rotation.z = -Math.PI / 2;
  const tips = [-1, 1].map((s) => {
    const t = m(sph(0.04), color);
    t.position.y = size * s;
    return t;
  });
  const str = m(cyl(0.006, 0.006, size * 2, 4), 0xf6ead2, { shadow: false });
  const gp = m(cyl(0.04, 0.04, 0.14, 10), grip);
  gp.position.x = size;
  g.add(arc, str, gp, ...tips);
  g.rotation.y = -0.9; // 斜一點，正面也看得到弧形
  g.position.set(-0.05, 0.06, 0);
  return g;
}

function quiver(rig, fletch) {
  const q = new THREE.Group();
  const body = m(cyl(0.1, 0.09, 0.48, 16), 0x7a4a24);
  q.add(body);
  fletch.forEach((c, i) => {
    const shaft = m(cyl(0.01, 0.01, 0.2, 4), 0xc9a77a, { shadow: false });
    const x = (i - (fletch.length - 1) / 2) * 0.045;
    shaft.position.set(x, 0.3, 0);
    const f = m(new THREE.ConeGeometry(0.035, 0.12, 4), c);
    f.position.set(x, 0.42, 0);
    q.add(shaft, f);
  });
  q.position.set(0.14, 0.68, -0.26);
  q.rotation.z = -0.45;
  rig.bodyPivot.add(q);
  // 斜背帶
  const strap = m(new THREE.BoxGeometry(0.05, 0.5, 0.03), 0x6e4426);
  strap.position.set(0, 0.62, 0.19);
  strap.rotation.z = 0.75;
  rig.bodyPivot.add(strap);
}

// ---------- 男戰士 ----------
function warriorM() {
  const silver = 0xc3cbd6;
  const rig = figure({ shirt: 0x3f6fc0, pants: 0x6e4426, boots: silver, bootsOpts: METAL, gloves: 0x6e4426, faceOpts: { iris: 0x3b8fe0, brow: 0x8a5a2b, browTilt: 0.15 } });
  hair(rig.headPivot, 0xf2c14e, { top: false, back: false, fringe: 4, fringeY: 0.24, spreadA: 1.3 });
  // 牛角頭盔
  const helm = m(new THREE.SphereGeometry(HEAD_R + 0.07, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.45), silver, METAL);
  helm.position.y = HEAD_Y;
  helm.rotation.x = -0.12;
  rig.headPivot.add(helm);
  const rim = m(torus(HEAD_R + 0.02, 0.05, Math.PI * 2, 10, 40), 0xaab3bf, METAL);
  rim.rotation.x = Math.PI / 2 - 0.12;
  rim.position.set(0, HEAD_Y + 0.08, -0.01);
  rig.headPivot.add(rim);
  // 鉚釘排在頭盔上半圈
  const rr = Math.sqrt((HEAD_R + 0.07) ** 2 - 0.22 ** 2);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const rv = m(sph(0.026, 10, 8), 0x9aa3b0, METAL);
    rv.position.set(Math.sin(a) * rr, HEAD_Y + 0.22 - Math.cos(a) * 0.03, Math.cos(a) * rr - 0.02);
    rig.headPivot.add(rv);
  }
  for (const s of [-1, 1]) {
    const horn = m(bentCone(0.085, 0.42, -0.22 * s), 0xf3e6c4, { coat: 0.6 });
    horn.position.set(0.42 * s, HEAD_Y + 0.16, 0);
    horn.rotation.z = -1.15 * s;
    rig.headPivot.add(horn);
  }
  // 胸甲、肩甲、圍巾、腰帶、藍色前襟
  const chest = m(sph(0.24), silver, METAL);
  chest.scale.set(1.08, 0.95, 0.82);
  chest.position.set(0, 0.62, 0.03);
  rig.bodyPivot.add(chest);
  for (const arm of [rig.armL, rig.armR]) {
    const pad = m(new THREE.SphereGeometry(0.14, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), silver, METAL);
    pad.position.y = 0.02;
    arm.add(pad);
  }
  const scarf = m(torus(0.17, 0.06), 0x2e5cb8);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 0.78;
  rig.bodyPivot.add(scarf);
  belt(rig);
  const tabard = m(new THREE.CylinderGeometry(0.1, 0.07, 0.16, 4, 1), 0x2e5cb8);
  tabard.rotation.y = Math.PI / 4;
  tabard.scale.z = 0.3;
  tabard.position.set(0, 0.36, 0.17);
  rig.bodyPivot.add(tabard);
  // 劍與盾
  const sw = sword();
  sw.rotation.x = Math.PI / 2;
  rig.handR.add(sw);
  const shield = new THREE.Group();
  const wood = m(cyl(0.21, 0.21, 0.05, 32), 0x9a6234);
  const srim = m(torus(0.21, 0.028), silver, METAL);
  srim.rotation.x = Math.PI / 2;
  const boss = m(sph(0.08), silver, METAL);
  boss.scale.y = 0.5;
  boss.position.y = 0.03;
  shield.add(wood, srim, boss);
  shield.rotation.z = -Math.PI / 2;
  shield.position.set(-0.12, 0.04, 0.04);
  rig.handL.add(shield);

  return {
    root: rig.root,
    animate(npc, t, dt) {
      const p = pose(rig, npc, t);
      if (npc.action?.name === "special") swing(p, npc, rig.handR);
      applyPose(rig, p, npc, dt, t);
    },
  };
}

// ---------- 女戰士 ----------
function warriorF() {
  const silver = 0xc3cbd6;
  const red = 0xc8302a;
  const rig = figure({ shirt: red, pants: SKIN, boots: red, longBoots: true, faceOpts: { iris: 0xc0392b, brow: 0x9a2a1f, lashes: true, browTilt: 0.18 } });
  hair(rig.headPivot, 0xc8302a, { fringe: 5, fringeY: 0.28 });
  // 雙馬尾
  for (const s of [-1, 1]) {
    const tail = m(sph(0.2, 24, 18), 0xc8302a, HAIR);
    tail.scale.set(0.75, 1.55, 0.8);
    tail.position.set(0.52 * s, HEAD_Y - 0.02, -0.08);
    tail.rotation.z = 0.25 * s;
    const tie = m(torus(0.07, 0.025), 0xf4b13b, GOLD);
    tie.position.set(0.44 * s, HEAD_Y + 0.27, -0.06);
    tie.rotation.set(0, Math.PI / 2, 0.4 * s);
    rig.headPivot.add(tail, tie);
  }
  // 額飾
  const plate = m(sph(0.07), silver, METAL);
  plate.scale.set(1.4, 0.7, 0.4);
  plate.position.set(0, HEAD_Y + 0.17, onHead(0, 0.17) + 0.05);
  const gem = m(new THREE.OctahedronGeometry(0.035, 1), 0xd0303a, { ...GLOSS, emissive: 0xd0303a, emissiveIntensity: 0.3 });
  gem.position.set(0, HEAD_Y + 0.17, onHead(0, 0.17) + 0.08);
  rig.headPivot.add(plate, gem);
  // 胸甲、肩甲、紅裙金邊、護腕
  const chest = m(sph(0.22), silver, METAL);
  chest.scale.set(1.05, 0.8, 0.78);
  chest.position.set(0, 0.68, 0.04);
  rig.bodyPivot.add(chest);
  for (const arm of [rig.armL, rig.armR]) {
    const pad = m(new THREE.SphereGeometry(0.12, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), silver, METAL);
    pad.position.y = 0.02;
    arm.add(pad);
  }
  for (const inner of [rig.innerL, rig.innerR]) {
    const brace = m(cyl(0.08, 0.075, 0.1, 16), silver, METAL);
    brace.position.y = -0.2;
    inner.add(brace);
  }
  const skirt = shell([
    [0.2, 0.52],
    [0.26, 0.4],
    [0.33, 0.24],
    [0.34, 0.22],
  ], red);
  const trim = m(torus(0.335, 0.025), 0xf4b13b, GOLD);
  trim.rotation.x = Math.PI / 2;
  trim.position.y = 0.23;
  rig.bodyPivot.add(skirt, trim);
  belt(rig, 0x6e4426, 0xf4b13b, 0.5);
  // 戰斧＋羽毛
  const axe = new THREE.Group();
  const handle = m(cyl(0.03, 0.03, 0.85, 10), 0x8a3a2a);
  handle.position.y = 0.2;
  const blade = m(cyl(0.2, 0.2, 0.04, 24, false, 0, Math.PI), silver, METAL);
  blade.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  blade.position.set(0, 0.52, 0);
  const top = m(new THREE.ConeGeometry(0.035, 0.1, 8), 0xf4b13b, GOLD);
  top.position.y = 0.66;
  axe.add(handle, blade, top);
  [0xffffff, 0xf2a65a, 0xd8402f].forEach((c, i) => {
    const fe = m(new THREE.ConeGeometry(0.035, 0.2, 6), c);
    fe.scale.z = 0.35;
    fe.position.set(-0.05 - i * 0.03, 0.62, 0);
    fe.rotation.z = 0.5 + i * 0.25;
    axe.add(fe);
  });
  axe.rotation.x = Math.PI / 2;
  rig.handR.add(axe);

  return {
    root: rig.root,
    animate(npc, t, dt) {
      const p = pose(rig, npc, t);
      if (npc.action?.name === "special") swing(p, npc, rig.handR);
      applyPose(rig, p, npc, dt, t);
    },
  };
}

// ---------- 男巫師 ----------
function wizardM() {
  const blue = 0x2e5cb8;
  const rig = figure({ shirt: blue, pants: blue, boots: 0x3b2a1a, faceOpts: { iris: 0x4aa3df, brow: 0x5a3a22 } });
  hair(rig.headPivot, 0x6b4226, { top: false, fringe: 5, fringeY: 0.27, side: 0.16, sideY: 0.02 });
  // 圓眼鏡
  for (const s of [-1, 1]) {
    const ring = m(torus(0.105, 0.016, Math.PI * 2, 8, 28), 0x24306e, METAL);
    ring.position.set(0.17 * s, HEAD_Y - 0.05, onHead(0.17, -0.05) + 0.03);
    ring.rotation.y = Math.asin((0.17 * s) / HEAD_R);
    rig.headPivot.add(ring);
  }
  const bridge = m(cyl(0.012, 0.012, 0.08, 6), 0x24306e, METAL);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, HEAD_Y - 0.03, onHead(0, -0.03) + 0.04);
  rig.headPivot.add(bridge);
  // 大巫師帽＋星星
  const hat = new THREE.Group();
  const brim = shell([
    [0.18, 0.02],
    [0.75, -0.04],
    [0.8, -0.02],
    [0.78, 0.01],
    [0.2, 0.05],
  ], blue);
  const crownM = m(bentCone(0.4, 0.95, 0.38), blue);
  crownM.position.y = 0.02;
  const band = m(cyl(0.385, 0.405, 0.1, 32), 0xf4b13b, GOLD);
  band.position.y = 0.08;
  hat.add(brim, crownM, band);
  [
    [0.14, 0.42, 0.27, 0.07],
    [-0.12, 0.3, 0.33, 0.06],
    [0.26, 0.7, 0.13, 0.05],
  ].forEach(([x, y, z, r]) => {
    const st = m(starGeo(r), 0xf4c542, GOLD);
    st.position.set(x, y, z);
    st.rotation.y = Math.atan2(x, z);
    hat.add(st);
  });
  hat.position.y = HEAD_Y + 0.26;
  hat.rotation.set(-0.08, 0, 0.06);
  rig.headPivot.add(hat);
  // 長袍、寬袖、扣環
  const robe = shell([
    [0.2, 0.8],
    [0.25, 0.66],
    [0.3, 0.45],
    [0.4, 0.08],
    [0.43, 0.02],
    [0.42, 0.0],
  ], blue);
  const hem = m(torus(0.42, 0.025), 0xf4b13b, GOLD);
  hem.rotation.x = Math.PI / 2;
  hem.position.y = 0.02;
  const clasp = m(new THREE.OctahedronGeometry(0.045, 0), 0xf4b13b, GOLD);
  clasp.scale.z = 0.5;
  clasp.position.set(0, 0.72, 0.21);
  const hood = m(new THREE.SphereGeometry(0.26, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), blue);
  hood.rotation.x = -1.9;
  hood.position.set(0, 0.8, -0.14);
  rig.bodyPivot.add(robe, hem, clasp, hood);
  for (const inner of [rig.innerL, rig.innerR]) {
    const sleeve = m(cyl(0.075, 0.13, 0.22, 20, true), blue, { side: THREE.DoubleSide });
    sleeve.position.y = -0.16;
    const cuff = m(torus(0.13, 0.018), 0xf4b13b, GOLD);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.27;
    inner.add(sleeve, cuff);
  }
  // 彎曲木杖
  const staff = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    [0, -0.45, 0],
    [0.02, -0.1, 0],
    [-0.02, 0.3, 0],
    [0.03, 0.7, 0],
    [0.1, 0.85, 0],
    [0.06, 0.95, 0],
    [-0.02, 0.9, 0],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const stick = m(new THREE.TubeGeometry(curve, 40, 0.032, 8), 0x7a5232, { rough: 0.7 });
  const glow = new THREE.PointLight(0xfff0a0, 0, 2.5, 2);
  glow.position.set(0.05, 1.0, 0);
  staff.add(stick, glow);
  rig.handR.add(staff);

  return {
    root: rig.root,
    animate(npc, t, dt) {
      const p = pose(rig, npc, t);
      // 長袍下的腳不用大步
      p.legL *= 0.3;
      p.legR *= 0.3;
      let e = 0;
      if (npc.action?.name === "special") e = cast(p, npc, dt, glow, [0xfff07a, 0xffffff, 0x9fd8ff]);
      applyPose(rig, p, npc, dt, t);
      glow.intensity = npc.world.night * 1.5 + e * 3;
      hat.rotation.z = 0.06 + Math.sin(t * 2 + npc.seed) * 0.03;
    },
  };
}

// ---------- 女巫＋黑貓 ----------
function witch() {
  const purple = 0x8e44c9;
  const rig = figure({ shirt: 0x2b2233, pants: 0x2b2233, boots: purple, faceOpts: { iris: 0x8e44c9, brow: 0x3a2340, lashes: true } });
  // 條紋襪：在腿上加幾圈紫色
  for (const legP of [rig.legL, rig.legR]) {
    for (const y of [-0.06, -0.16]) {
      const stripe = m(cyl(0.094, 0.094, 0.04, 16), purple);
      stripe.position.y = y;
      legP.add(stripe);
    }
  }
  hair(rig.headPivot, 0x3a2347, { top: true, fringe: 5, fringeY: 0.27 });
  // 辮子
  for (const s of [-1, 1]) {
    [0, 1, 2].forEach((i) => {
      const b = m(sph(0.095 - i * 0.012), 0x3a2347, HAIR);
      b.position.set(0.4 * s, HEAD_Y - 0.25 - i * 0.12, -0.02);
      rig.headPivot.add(b);
    });
    const ribbon = m(sph(0.05), 0xb76be0);
    ribbon.scale.set(1.6, 0.7, 0.7);
    ribbon.position.set(0.4 * s, HEAD_Y - 0.31, 0.05);
    rig.headPivot.add(ribbon);
  }
  // 巫婆帽＋蝴蝶結
  const hat = new THREE.Group();
  const brim = shell([
    [0.18, 0.02],
    [0.7, -0.03],
    [0.74, -0.01],
    [0.72, 0.01],
    [0.2, 0.05],
  ], purple);
  const crownM = m(bentCone(0.36, 0.85, -0.4), purple);
  const band = m(cyl(0.345, 0.365, 0.09, 32), 0x6a2e9a);
  band.position.y = 0.07;
  const bow = new THREE.Group();
  for (const s of [-1, 1]) {
    const loop = m(sph(0.09), 0xb76be0);
    loop.scale.set(1.3, 0.8, 0.5);
    loop.position.x = 0.1 * s;
    bow.add(loop);
  }
  const knot = m(sph(0.05), 0xb76be0);
  bow.add(knot);
  bow.position.set(0.2, 0.09, 0.3);
  bow.rotation.y = 0.6;
  hat.add(brim, crownM, band, bow);
  hat.position.y = HEAD_Y + 0.26;
  hat.rotation.set(-0.1, 0, -0.08);
  rig.headPivot.add(hat);
  // 洋裝：泡泡袖、蓬裙、蕾絲裙襬、項鍊
  const skirt = shell([
    [0.2, 0.52],
    [0.28, 0.42],
    [0.42, 0.22],
    [0.44, 0.18],
  ], purple);
  const lace = m(torus(0.43, 0.035), 0xe9d8ff);
  lace.rotation.x = Math.PI / 2;
  lace.position.y = 0.19;
  rig.bodyPivot.add(skirt, lace);
  for (const arm of [rig.armL, rig.armR]) {
    const puff = m(sph(0.12), purple);
    puff.position.y = -0.04;
    arm.add(puff);
  }
  const pendant = m(new THREE.OctahedronGeometry(0.035, 1), 0xd0306a, { ...GLOSS, emissive: 0xd0306a, emissiveIntensity: 0.3 });
  pendant.position.set(0, 0.7, 0.2);
  rig.bodyPivot.add(pendant);
  // 掃把
  const broom = new THREE.Group();
  const stick = m(cyl(0.028, 0.03, 1.15, 10), 0x7a5232, { rough: 0.7 });
  stick.position.y = 0.05;
  const bristles = m(new THREE.ConeGeometry(0.16, 0.36, 18), 0xd9a53b, { rough: 0.8 });
  bristles.position.y = -0.62;
  bristles.rotation.x = Math.PI;
  const tie = m(cyl(0.06, 0.06, 0.05, 14), 0x8e44c9);
  tie.position.y = -0.46;
  broom.add(stick, bristles, tie);
  rig.handR.add(broom);
  // 肩上的黑貓
  const cat = new THREE.Group();
  const cbody = m(sph(0.12), 0x22202a);
  cbody.scale.set(1, 0.85, 1.2);
  const chead = m(sph(0.1), 0x22202a);
  chead.position.set(0, 0.12, 0.06);
  cat.add(cbody, chead);
  for (const s of [-1, 1]) {
    const ear = m(new THREE.ConeGeometry(0.04, 0.08, 6), 0x22202a);
    ear.position.set(0.055 * s, 0.22, 0.05);
    ear.rotation.z = -0.3 * s;
    const ce = m(sph(0.022, 10, 8), 0xf4d03f, { ...GLOSS, emissive: 0xf4d03f, emissiveIntensity: 0.3, shadow: false });
    ce.scale.set(0.8, 1.1, 0.5);
    ce.position.set(0.04 * s, 0.13, 0.15);
    cat.add(ear, ce);
  }
  const catTail = new THREE.Group();
  catTail.position.set(0, 0, -0.12);
  const tailGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.05, 0.08, -0.08), new THREE.Vector3(0.12, 0.2, -0.05)]), 16, 0.025, 8);
  catTail.add(m(tailGeo, 0x22202a));
  cat.add(catTail);
  cat.position.set(-0.3, 0.92, -0.02);
  cat.rotation.y = 0.3;
  rig.bodyPivot.add(cat);

  return {
    root: rig.root,
    animate(npc, t, dt) {
      const p = pose(rig, npc, t);
      p.legL *= 0.6;
      p.legR *= 0.6;
      if (npc.action?.name === "special") cast(p, npc, dt, rig.handR, [0xb76be0, 0xf7a1c4, 0xfff07a]);
      applyPose(rig, p, npc, dt, t);
      catTail.rotation.z = Math.sin(t * 3 + npc.seed) * 0.5;
      cat.rotation.y = 0.3 + Math.sin(t * 0.7) * 0.25;
    },
  };
}

// ---------- 男弓箭手 ----------
function archerM() {
  const green = 0x4f9a3a;
  const rig = figure({ shirt: green, pants: 0x2f5a2a, boots: 0x6e4426, longBoots: true, gloves: 0x6e4426, faceOpts: { iris: 0x8a5a2b, brow: 0x6b4226, browTilt: 0.12 } });
  hair(rig.headPivot, 0x7a4a24, { top: false, fringe: 5, fringeY: 0.27, side: 0.12, sideY: 0.05 });
  // 羅賓漢帽＋羽毛
  const hat = new THREE.Group();
  const dome = m(new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), green);
  dome.scale.set(1, 0.62, 1.12);
  const brim = m(torus(0.48, 0.05, Math.PI * 2, 10, 36), 0x3f7f2e);
  brim.rotation.x = Math.PI / 2;
  brim.scale.set(1, 1.12, 1);
  const tail = m(new THREE.ConeGeometry(0.16, 0.36, 16), green);
  tail.rotation.x = -1.9;
  tail.position.set(0, 0.12, -0.55);
  const feather = m(bentCone(0.05, 0.5, 0.12, 10), 0xe08a3a);
  feather.scale.z = 0.3;
  feather.position.set(0.36, 0.08, -0.05);
  feather.rotation.set(0, Math.PI / 2, -0.45);
  hat.add(dome, brim, tail, feather);
  hat.position.y = HEAD_Y + 0.17;
  hat.rotation.x = -0.12;
  rig.headPivot.add(hat);
  // 兜帽領、腰帶、箭筒、弓
  const collar = m(new THREE.ConeGeometry(0.3, 0.18, 24, 1, true), 0x3f7f2e, { side: THREE.DoubleSide });
  collar.position.y = 0.76;
  rig.bodyPivot.add(collar);
  belt(rig);
  quiver(rig, [0xd8402f, 0xd8402f, 0xffffff]);
  rig.handL.add(bow(0x8a5a2b, 0xf2e2c4));

  return {
    root: rig.root,
    animate(npc, t, dt) {
      const p = pose(rig, npc, t);
      if (npc.action?.name === "special") shoot(p, npc, rig.handL);
      applyPose(rig, p, npc, dt, t);
    },
  };
}

// ---------- 女弓箭手 ----------
function archerF() {
  const green = 0x5aa84a;
  const rig = figure({ shirt: 0xf6f2ea, pants: SKIN, boots: green, longBoots: true, faceOpts: { iris: 0x3f9a4a, brow: 0x6b4226, lashes: true } });
  hair(rig.headPivot, 0x8a5a2b, { fringe: 5, fringeY: 0.28, side: 0.18, sideY: 0.0 });
  // 高馬尾＋葉子與小花
  const ponyPivot = new THREE.Group(); // 綁在後腦頂，往下垂
  ponyPivot.position.set(0, HEAD_Y + 0.36, -0.3);
  const pony = m(cap(0.13, 0.4), 0x8a5a2b, HAIR);
  pony.position.set(0, -0.26, -0.12);
  pony.rotation.x = 0.35;
  const tieM = m(torus(0.075, 0.028), 0x4f9a3a);
  tieM.rotation.x = Math.PI / 2 - 0.5;
  ponyPivot.add(pony, tieM);
  rig.headPivot.add(ponyPivot);
  for (const [x, rz] of [
    [-0.1, 0.8],
    [0.1, -0.8],
  ]) {
    const leaf = m(new THREE.ConeGeometry(0.06, 0.2, 8), 0x4f9a3a);
    leaf.scale.z = 0.35;
    leaf.position.set(x, HEAD_Y + 0.5, -0.12);
    leaf.rotation.z = rz;
    rig.headPivot.add(leaf);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const petal = m(sph(0.035, 10, 8), 0xffffff);
    petal.position.set(Math.cos(a) * 0.04, HEAD_Y + 0.5 + Math.sin(a) * 0.04, -0.05);
    rig.headPivot.add(petal);
  }
  const fc = m(sph(0.025, 8, 6), 0xf4c542);
  fc.position.set(0, HEAD_Y + 0.5, -0.02);
  rig.headPivot.add(fc);
  // 綠色背心、葉片短裙、護腕
  const vest = m(sph(0.225), green);
  vest.scale.set(1.08, 0.75, 0.85);
  vest.position.set(0, 0.52, 0.01);
  rig.bodyPivot.add(vest);
  const skirt = shell([
    [0.2, 0.46],
    [0.27, 0.36],
    [0.33, 0.22],
    [0.32, 0.2],
  ], green, { rough: 0.55 }, 10);
  rig.bodyPivot.add(skirt);
  belt(rig, 0x6e4426, 0xf4b13b, 0.47);
  for (const inner of [rig.innerL, rig.innerR]) {
    const brace = m(cyl(0.078, 0.072, 0.1, 16), green);
    brace.position.y = -0.2;
    inner.add(brace);
  }
  quiver(rig, [0xd8402f, 0xf4b13b, 0x4f9a3a, 0x3f86c9, 0x8e44c9]);
  rig.handL.add(bow(0xf08fb8, 0x4f9a3a));

  return {
    root: rig.root,
    animate(npc, t, dt) {
      const p = pose(rig, npc, t);
      if (npc.action?.name === "special") shoot(p, npc, rig.handL);
      applyPose(rig, p, npc, dt, t);
      ponyPivot.rotation.z = Math.sin(t * 2.5 + npc.seed) * 0.1 + npc.walkBlend * Math.sin(npc.walkPhase) * 0.18;
    },
  };
}

// ---------- 王子 ----------
function prince() {
  const red = 0xc8302a;
  const rig = figure({ shirt: red, pants: 0xf3efe6, boots: 0x5a3a22, longBoots: true, faceOpts: { iris: 0x3b8fe0, brow: 0xc9962e } });
  hair(rig.headPivot, 0xf2c14e, { fringe: 6, fringeY: 0.29, side: 0.14, sideY: 0.05 });
  const cr = crown();
  cr.position.y = HEAD_Y + 0.42;
  cr.rotation.x = -0.15;
  rig.headPivot.add(cr);
  // 白色前襟＋金釦、毛領披風、泡泡肩
  const front = m(new THREE.BoxGeometry(0.15, 0.3, 0.04), 0xf3efe6);
  front.position.set(0, 0.6, 0.19);
  rig.bodyPivot.add(front);
  [0.68, 0.6, 0.52].forEach((y) => {
    const btn = m(sph(0.022, 10, 8), 0xf4b13b, GOLD);
    btn.position.set(0, y, 0.215);
    rig.bodyPivot.add(btn);
  });
  const fur = m(torus(0.19, 0.075), 0xffffff, { rough: 0.9, coat: 0 });
  fur.rotation.x = Math.PI / 2;
  fur.position.y = 0.79;
  rig.bodyPivot.add(fur);
  const capeG = cyl(0.24, 0.42, 0.72, 24, true, Math.PI * 0.55, Math.PI * 0.9);
  const cape = m(capeG, red, { side: THREE.DoubleSide }); // 角度範圍以 π（背後）為中心
  cape.position.y = 0.42;
  rig.bodyPivot.add(cape);
  const capeHem = m(torus(0.42, 0.03, Math.PI * 0.9, 8, 24), 0xffffff, { rough: 0.9, coat: 0 });
  capeHem.rotation.set(Math.PI / 2, 0, -Math.PI * 0.95);
  capeHem.position.y = 0.06;
  rig.bodyPivot.add(capeHem);
  for (const arm of [rig.armL, rig.armR]) {
    const puff = m(sph(0.11), red);
    puff.position.y = -0.03;
    arm.add(puff);
    const stripe = m(torus(0.105, 0.02), 0xf3efe6);
    stripe.rotation.x = Math.PI / 2;
    stripe.position.y = -0.03;
    arm.add(stripe);
  }
  belt(rig, 0x5a3a22, 0xf4b13b, 0.45);
  const sw = sword({ grip: 0x8a2a1f, pommel: 0xd0306a, len: 0.52 });
  sw.rotation.x = Math.PI / 2;
  rig.handR.add(sw);

  return {
    root: rig.root,
    animate(npc, t, dt) {
      const p = pose(rig, npc, t);
      if (npc.action?.name === "special") {
        // 舉劍：高舉寶劍，灑下金色光點
        const e = env(npc.action.u, 0.2);
        p.armRx = -3.0 * e;
        p.armLz = -0.5 * e;
        p.headTilt = -0.12 * e;
        p.bob += 0.05 * e;
        npc.action.acc = (npc.action.acc || 0) + dt;
        if (e > 0.8 && npc.action.acc > 0.08) {
          npc.action.acc = 0;
          npc.fx(rig.handR, { count: 3, colors: [0xf4c542, 0xffffff], speed: 0.9, up: 1, gravity: 0.5, life: 1 });
        }
      }
      applyPose(rig, p, npc, dt, t);
      cape.rotation.x = -0.05 - npc.walkBlend * 0.15;
    },
  };
}

// ---------- 公主 ----------
function princess() {
  const pink = 0xf7a6c4;
  const rig = figure({ shirt: pink, pants: pink, boots: 0xf48fb8, gloves: 0xffffff, faceOpts: { iris: 0xd0587e, brow: 0xc8955a, lashes: true } });
  const hc = 0xf6c79a;
  hair(rig.headPivot, hc, { fringe: 5, fringeY: 0.3, spreadA: 1.7 });
  // 長捲髮：後面一大片＋兩側一串波浪
  const backHair = m(cap(0.36, 0.45), hc, HAIR);
  backHair.scale.z = 0.55;
  backHair.position.set(0, HEAD_Y - 0.35, -0.2);
  rig.headPivot.add(backHair);
  for (const s of [-1, 1]) {
    [0, 1, 2, 3].forEach((i) => {
      const w = m(sph(0.12 - i * 0.008), hc, HAIR);
      w.position.set((0.42 + (i % 2) * 0.04) * s, HEAD_Y - 0.12 - i * 0.15, -0.02 - i * 0.01);
      rig.headPivot.add(w);
    });
  }
  const cr = crown(0xf4c542, 0xe0477a);
  cr.position.y = HEAD_Y + 0.44;
  cr.rotation.x = -0.15;
  cr.scale.setScalar(0.85);
  rig.headPivot.add(cr);
  // 珍珠項鍊、泡泡袖、手套、大禮服
  const pearls = m(torus(0.12, 0.018, Math.PI * 2, 8, 24), 0xffffff, GLOSS);
  pearls.rotation.x = Math.PI / 2 - 0.3;
  pearls.position.set(0, 0.8, 0.03);
  rig.bodyPivot.add(pearls);
  for (const arm of [rig.armL, rig.armR]) {
    const puff = m(sph(0.12), pink);
    puff.position.y = -0.03;
    arm.add(puff);
  }
  for (const inner of [rig.innerL, rig.innerR]) {
    const glove = m(cyl(0.072, 0.07, 0.14, 14), 0xffffff);
    glove.position.y = -0.2;
    inner.add(glove);
  }
  const gown = shell([
    [0.2, 0.56],
    [0.26, 0.46],
    [0.44, 0.22],
    [0.54, 0.05],
    [0.55, 0.0],
  ], pink);
  const tier = shell([
    [0.26, 0.46],
    [0.34, 0.36],
    [0.46, 0.22],
    [0.47, 0.2],
  ], 0xf9bfd5);
  const lace1 = m(torus(0.54, 0.035), 0xffffff);
  lace1.rotation.x = Math.PI / 2;
  lace1.position.y = 0.03;
  const lace2 = m(torus(0.465, 0.025), 0xffffff);
  lace2.rotation.x = Math.PI / 2;
  lace2.position.y = 0.21;
  rig.bodyPivot.add(gown, tier, lace1, lace2);

  return {
    root: rig.root,
    animate(npc, t, dt) {
      const p = pose(rig, npc, t);
      p.legL *= 0.25;
      p.legR *= 0.25;
      // 平常雙手合十放胸前
      if (!npc.dancing && !npc.action) {
        p.armLx = -0.75;
        p.armRx = -0.75;
        p.armLz = 0.62;
        p.armRz = -0.62;
      }
      let spin = 0;
      if (npc.action?.name === "special") {
        // 轉圈：張開雙手旋轉，灑出星星
        const u = npc.action.u;
        const e = env(u, 0.12);
        spin = u * Math.PI * 4;
        p.armLz = -1.3 * e;
        p.armRz = 1.3 * e;
        p.bob += Math.sin(u * Math.PI) * 0.1;
        npc.action.acc = (npc.action.acc || 0) + dt;
        if (npc.action.acc > 0.06) {
          npc.action.acc = 0;
          npc.fx(rig.handR, { count: 2, colors: [0xf7a1c4, 0xffffff, 0xfff07a], speed: 0.5, up: 0.6, gravity: 0.3, life: 0.9 });
        }
      }
      applyPose(rig, p, npc, dt, t);
      rig.bodyPivot.rotation.y = spin;
    },
  };
}

// ---------- 噴火龍 ----------
function dragon() {
  const red = 0xd8402f;
  const yellow = 0xf5c542;
  const orange = 0xf28c3a;
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);
  const torso = m(sph(0.48, 36, 28), red);
  torso.scale.set(1, 1.08, 0.95);
  torso.position.y = 0.55;
  const belly = m(sph(0.38, 30, 22), yellow);
  belly.scale.set(1, 1.15, 0.55);
  belly.position.set(0, 0.5, 0.26);
  bodyPivot.add(torso, belly);
  for (const y of [0.32, 0.48, 0.64]) {
    const line = m(torus(0.28 - Math.abs(y - 0.48) * 0.5, 0.008, Math.PI, 6, 20), 0xd9a23a, { shadow: false });
    line.position.set(0, y, 0.43);
    line.scale.set(1, 0.3, 1);
    line.rotation.x = -0.15;
    bodyPivot.add(line);
  }
  // 背上的小圓點
  for (const [x, y] of [
    [0.3, 0.3],
    [0.36, 0.42],
    [-0.32, 0.36],
  ]) {
    const dot = m(sph(0.04, 10, 8), 0xb8321f, { shadow: false });
    dot.position.set(x, y, 0.3);
    bodyPivot.add(dot);
  }
  const limb = (x, y, r, len, z = 0) => {
    const p = new THREE.Group();
    p.position.set(x, y, z);
    const l = m(cap(r, len), red);
    l.position.y = -len * 0.6;
    p.add(l);
    bodyPivot.add(p);
    return p;
  };
  const legL = limb(-0.24, 0.26, 0.13, 0.12),
    legR = limb(0.24, 0.26, 0.13, 0.12);
  for (const leg of [legL, legR]) {
    for (const dx of [-0.06, 0, 0.06]) {
      const claw = m(sph(0.03, 8, 6), 0xfff3d6);
      claw.position.set(dx, -0.26, 0.12);
      leg.add(claw);
    }
  }
  const armL = limb(-0.38, 0.66, 0.08, 0.14, 0.12),
    armR = limb(0.38, 0.66, 0.08, 0.14, 0.12);
  // 頭
  const headPivot = new THREE.Group();
  headPivot.position.y = 0.9;
  bodyPivot.add(headPivot);
  const HR = 0.46;
  const head = m(sph(HR, 36, 28), red);
  head.position.y = 0.28;
  const snout = m(sph(0.24, 28, 20), red);
  snout.scale.set(1.35, 0.78, 1);
  snout.position.set(0, 0.08, 0.32);
  headPivot.add(head, snout);
  for (const s of [-1, 1]) {
    const nostril = m(sph(0.025, 8, 6), 0x7a1f14, { shadow: false });
    nostril.position.set(0.08 * s, 0.14, 0.55);
    const fang = m(new THREE.ConeGeometry(0.03, 0.07, 8), 0xffffff);
    fang.rotation.x = Math.PI;
    fang.position.set(0.12 * s, -0.03, 0.48);
    const horn = m(bentCone(0.07, 0.25, -0.06 * s), 0xfff3d6);
    horn.position.set(0.22 * s, 0.66, -0.05);
    horn.rotation.set(-0.3, 0, -0.3 * s);
    headPivot.add(nostril, fang, horn);
  }
  const faceParts = face(headPivot, { r: HR, cy: 0.28, spread: 0.19, eyeY: 0.1, brow: null, nose: false, mouth: false, ears: false, skin: red, iris: 0x8a4a1f });
  // 背刺
  [
    [0.82, -0.3],
    [0.62, -0.44],
    [0.4, -0.46],
  ].forEach(([y, z]) => {
    const sp = m(new THREE.ConeGeometry(0.07, 0.17, 8), orange);
    sp.position.set(0, y, z);
    sp.rotation.x = -1.1;
    bodyPivot.add(sp);
  });
  const headSpikes = [-0.12, 0, 0.12].map((x) => {
    const sp = m(new THREE.ConeGeometry(0.05, 0.13, 8), orange);
    sp.position.set(x, 0.74, -0.1);
    headPivot.add(sp);
    return sp;
  });
  headSpikes[1].scale.y = 1.3;
  // 翅膀
  const wings = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.22 * s, 0.82, -0.32);
    const membrane = m(new THREE.CircleGeometry(0.28, 5, 0, Math.PI * 0.75), orange, { side: THREE.DoubleSide });
    membrane.position.set(0.12 * s, 0.05, 0);
    membrane.rotation.z = s > 0 ? 0.3 : Math.PI - 0.3;
    const bone = m(cap(0.03, 0.3), 0xb8321f);
    bone.position.set(0.17 * s, 0.17, 0);
    bone.rotation.z = -1.1 * s;
    pivot.add(membrane, bone);
    bodyPivot.add(pivot);
    return { pivot, s };
  });
  // 尾巴＋尾端火焰
  const tail = new THREE.Group();
  tail.position.set(0, 0.28, -0.42);
  [
    [0.17, -0.12, -0.02],
    [0.13, -0.3, -0.06],
    [0.1, -0.46, -0.04],
  ].forEach(([r, z, y]) => {
    const seg = m(sph(r), red);
    seg.position.set(0.0, y, z);
    tail.add(seg);
  });
  const tailFire = new THREE.Group();
  tailFire.position.set(0, 0.04, -0.58);
  const flames = [
    [0xff7a1f, 0.09, 0.24],
    [0xffc23a, 0.06, 0.17],
  ].map(([c, r, h]) => {
    const f = m(new THREE.ConeGeometry(r, h, 12), c, { emissive: c, emissiveIntensity: 0.9, shadow: false });
    f.position.y = h / 2;
    tailFire.add(f);
    return f;
  });
  tail.add(tailFire);
  bodyPivot.add(tail);
  const fireDir = new THREE.Vector3();

  return {
    root,
    animate(npc, t, dt) {
      const wb = npc.walkBlend;
      const ph = npc.walkPhase;
      legL.rotation.x = Math.sin(ph) * 0.5 * wb;
      legR.rotation.x = -Math.sin(ph) * 0.5 * wb;
      armL.rotation.set(-Math.sin(ph) * 0.3 * wb, 0, -0.35);
      armR.rotation.set(Math.sin(ph) * 0.3 * wb, 0, 0.35);
      bodyPivot.position.y = Math.abs(Math.sin(ph)) * 0.05 * wb + Math.sin(t * 2.4 + npc.seed) * 0.012;
      bodyPivot.rotation.z = Math.sin(ph) * 0.06 * wb;
      headPivot.rotation.set(0, npc.lookYaw, Math.sin(t * 1.3) * 0.04);
      tail.rotation.y = Math.sin(t * 3 + npc.seed) * 0.45;
      flames.forEach((f, i) => f.scale.set(1, 1 + Math.sin(t * (12 + i * 5)) * 0.18, 1));
      let flap = 0.25 + Math.sin(t * 4) * 0.2;
      if (npc.dancing) {
        bodyPivot.position.y = Math.abs(Math.sin(t * 6)) * 0.13;
        armL.rotation.z = -2.2;
        armR.rotation.z = 2.2;
        flap = 0.4 + Math.sin(t * 14) * 0.4;
        tail.rotation.y = Math.sin(t * 6) * 0.7;
      }
      if (npc.action?.name === "greet") armR.rotation.z = 0.35 + 2.1 * env(npc.action.u) + Math.sin(t * 14) * 0.2 * env(npc.action.u);
      if (npc.action?.name === "special") {
        // 噴火：先吸氣仰頭，再往前噴出火焰粒子
        const u = npc.action.u;
        headPivot.rotation.x = u < 0.25 ? -0.45 * (u / 0.25) : u < 0.85 ? 0.2 : 0.2 * (1 - (u - 0.85) / 0.15);
        flap = 0.6 + Math.sin(t * 18) * 0.4;
        npc.action.acc = (npc.action.acc || 0) + dt;
        if (u > 0.28 && u < 0.85 && npc.action.acc > 0.03) {
          npc.action.acc = 0;
          const yaw = root.rotation.y;
          fireDir.set(Math.sin(yaw) * 3, 0.2, Math.cos(yaw) * 3);
          npc.fx(snout, { count: 3, colors: [0xff7a1f, 0xffb21f, 0xfff07a, 0xd8402f], speed: 0.35, up: 0.2, gravity: -0.6, life: 0.55, size: 1.3, dir: fireDir });
        }
      }
      wings.forEach(({ pivot, s }) => (pivot.rotation.y = s * flap));
      express(faceParts, npc, t);
    },
  };
}

// ---------- 角色清單（排列與背景色依照設計圖） ----------
export const CHARACTERS = [
  {
    id: "warrior-m",
    bg: "beige",
    name: "男戰士 Leo",
    role: "Warrior",
    color: "#3f6fc0",
    speed: 1.4,
    desc: "戴著牛角頭盔的勇敢戰士，口頭禪是「勇氣」。",
    tech: "金屬材質＋環境反射、彎曲圓錐做牛角、揮劍關節動畫",
    special: "揮劍",
    lines: [
      { en: "Courage!", zh: "勇氣！" },
      { en: "Let's go on an adventure!", zh: "一起去冒險吧！" },
      { en: "I will protect you.", zh: "我會保護你。" },
    ],
    create: warriorM,
  },
  {
    id: "warrior-f",
    bg: "beige",
    name: "女戰士 Ruby",
    role: "Valkyrie",
    color: "#c8302a",
    speed: 1.5,
    desc: "紅色雙馬尾的女戰士，揮起戰斧毫不猶豫。",
    tech: "雙馬尾的拉長球體、半圓柱斧刃、羽毛裝飾",
    special: "揮斧",
    lines: [
      { en: "Battle!", zh: "戰鬥！" },
      { en: "I am brave.", zh: "我很勇敢。" },
      { en: "Never give up!", zh: "永不放棄！" },
    ],
    create: warriorF,
  },
  {
    id: "wizard-m",
    bg: "blue",
    specialDur: 2.6,
    name: "男巫師 Max",
    role: "Wizard",
    color: "#2e5cb8",
    speed: 1.0,
    desc: "戴圓眼鏡的小巫師，對每個新單字都充滿好奇。",
    tech: "旋轉體（Lathe）做長袍與帽簷、擠出（Extrude）做星星、曲線管做木杖",
    special: "施法",
    lines: [
      { en: "Curious!", zh: "好奇！" },
      { en: "Every word is a spell.", zh: "每個單字都是一個咒語。" },
      { en: "Let me read this book.", zh: "讓我讀讀這本書。" },
    ],
    create: wizardM,
  },
  {
    id: "witch",
    bg: "beige",
    specialDur: 2.4,
    name: "女巫 Luna",
    role: "Witch",
    color: "#8e44c9",
    speed: 1.1,
    desc: "帶著黑貓和掃把的小女巫，有點調皮。",
    tech: "條紋襪、蓬裙蕾絲、肩上黑貓的尾巴擺動",
    special: "魔法",
    lines: [
      { en: "Magic!", zh: "魔法！" },
      { en: "My cat is named Mochi.", zh: "我的貓叫麻糬。" },
      { en: "Abracadabra!", zh: "嘛哩嘛哩哄！" },
    ],
    create: witch,
  },
  {
    id: "archer-m",
    bg: "blue",
    name: "男弓箭手 Robin",
    role: "Archer",
    color: "#4f9a3a",
    speed: 1.6,
    desc: "森林裡的弓箭手，眼力很好，最會找出拼錯的字。",
    tech: "羅賓漢帽與羽毛、斜背箭筒、拉弓動作",
    special: "射箭",
    lines: [
      { en: "Bullseye!", zh: "正中紅心！" },
      { en: "Aim for the target.", zh: "瞄準目標。" },
      { en: "The forest is quiet.", zh: "森林很安靜。" },
    ],
    create: archerM,
  },
  {
    id: "archer-f",
    bg: "beige",
    name: "女弓箭手 Ivy",
    role: "Ranger",
    color: "#5aa84a",
    speed: 1.6,
    desc: "綁著高馬尾的弓箭手，箭羽是彩虹色的。",
    tech: "高馬尾隨走路擺動、葉片短裙（低多邊形旋轉體）、彩虹箭羽",
    special: "射箭",
    lines: [
      { en: "Rainbow arrow!", zh: "彩虹箭！" },
      { en: "Nature is beautiful.", zh: "大自然好美。" },
      { en: "Ready, aim, go!", zh: "預備、瞄準、出發！" },
    ],
    create: archerF,
  },
  {
    id: "prince",
    bg: "beige",
    specialDur: 2.0,
    name: "王子 Arthur",
    role: "Prince",
    color: "#c8302a",
    speed: 1.2,
    desc: "城堡裡的王子，披著毛領紅披風，總是很有禮貌。",
    tech: "金屬皇冠、開口圓柱做披風、金色光點粒子",
    special: "舉劍",
    lines: [
      { en: "Good morning!", zh: "早安！" },
      { en: "Nice to meet you.", zh: "很高興認識你。" },
      { en: "For the kingdom!", zh: "為了王國！" },
    ],
    create: prince,
  },
  {
    id: "princess",
    bg: "beige",
    specialDur: 1.8,
    name: "公主 Aria",
    role: "Princess",
    color: "#e46b9b",
    speed: 1.0,
    desc: "城堡裡的公主，每天都會來營地學一個新單字。",
    tech: "多層旋轉體禮服、蕾絲裙襬、長捲髮、雙手合十姿勢",
    special: "轉圈",
    lines: [
      { en: "Hello, everyone!", zh: "大家好！" },
      { en: "Beautiful!", zh: "好美！" },
      { en: "Let's be friends.", zh: "我們做朋友吧。" },
    ],
    create: princess,
  },
  {
    id: "dragon",
    bg: "blue",
    specialDur: 2.2,
    name: "噴火龍 Draco",
    role: "Dragon",
    color: "#d8402f",
    speed: 1.0,
    desc: "胖嘟嘟的小紅龍，尾巴上一直有小火苗。",
    tech: "自發光火焰、有方向的火焰粒子、翅膀與尾巴的次要動作",
    special: "噴火",
    lines: [
      { en: "Roar!", zh: "吼！" },
      { en: "Fire!", zh: "火！" },
      { en: "I am a little dragon.", zh: "我是一隻小龍。" },
    ],
    create: dragon,
  },
];
