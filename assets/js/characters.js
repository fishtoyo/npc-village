// 角色：全部由基本幾何組成（球、膠囊、圓錐、圓柱），沒有外部模型
// 每個角色回傳 { root, animate(npc, t, dt), special(npc, u) 可選 }
import * as THREE from "three";
import { part, toon } from "./toon.js";

const SKIN = 0xf7d2b6;
const env = (u, edge = 0.18) => Math.min(1, u / edge, (1 - u) / edge); // 動作淡入淡出

// ---------- 共用：臉 ----------
function face(target, { y = 0.4, r = 0.42, mustache = false, brows = true, browColor = 0x5a3a24 } = {}) {
  const eyes = [];
  const happy = [];
  const browList = [];
  const z = (dx, dy) => Math.sqrt(Math.max(0, r * r - dx * dx - dy * dy));
  for (const s of [-1, 1]) {
    const eye = part(new THREE.SphereGeometry(0.065, 12, 10), 0x2b1d14, { outline: false, shadow: false });
    eye.scale.set(1, 1.35, 0.6);
    eye.position.set(0.15 * s, y - 0.04, z(0.15, 0.04) - 0.01);
    eye.userData.sy = 1.35;
    const hl = part(new THREE.SphereGeometry(0.024, 8, 6), 0xffffff, { outline: false, shadow: false });
    hl.position.set(0.025, 0.03, 0.05);
    eye.add(hl);
    target.add(eye);
    eyes.push(eye);
    // 笑瞇眼（^ ^），跳舞時顯示
    const h = part(new THREE.TorusGeometry(0.055, 0.017, 6, 12, Math.PI), 0x2b1d14, { outline: false, shadow: false });
    h.position.copy(eye.position);
    h.position.z += 0.012;
    h.visible = false;
    target.add(h);
    happy.push(h);
    if (brows) {
      const b = part(new THREE.CapsuleGeometry(0.017, 0.07, 3, 6), browColor, { outline: false, shadow: false });
      b.rotation.z = Math.PI / 2;
      b.position.set(0.15 * s, y + 0.1, z(0.15, 0.1) + 0.005);
      b.userData = { s, y: y + 0.1 };
      target.add(b);
      browList.push(b);
    }
    const blush = part(new THREE.SphereGeometry(0.06, 10, 8), 0xf49a8f, { outline: false, shadow: false });
    blush.scale.set(1.3, 0.6, 0.3);
    blush.position.set(0.25 * s, y - 0.13, z(0.25, 0.13) - 0.02);
    target.add(blush);
  }
  const mouth = part(new THREE.TorusGeometry(0.045, 0.014, 6, 12, Math.PI), 0x6b2e1f, { outline: false, shadow: false });
  mouth.rotation.z = Math.PI;
  mouth.position.set(0, y - 0.15, z(0, 0.15));
  target.add(mouth);
  // 張開的嘴：說話、做特殊動作時顯示
  const open = part(new THREE.SphereGeometry(0.06, 12, 8), 0x7a2e22, { outline: false, shadow: false });
  open.scale.set(1, 0.75, 0.4);
  open.position.set(0, y - 0.16, z(0, 0.16) - 0.005);
  open.visible = false;
  target.add(open);
  if (mustache) {
    for (const s of [-1, 1]) {
      const m = part(new THREE.SphereGeometry(0.07, 10, 8), 0x6b4226, { outline: false });
      m.scale.set(1.4, 0.55, 0.6);
      m.position.set(0.07 * s, y - 0.11, z(0.07, 0.11) + 0.01);
      m.rotation.z = 0.3 * s;
      target.add(m);
    }
  }
  return { eyes, happy, brows: browList, smile: mouth, open };
}

// 表情：眨眼、說話開合嘴、跳舞笑瞇眼、特殊動作皺眉張嘴
function express(f, npc, t) {
  const talking = npc.action?.name === "greet";
  const special = npc.action?.name === "special";
  const joy = npc.dancing;
  f.eyes.forEach((e, i) => {
    e.visible = !joy;
    f.happy[i].visible = joy;
    e.scale.y = e.userData.sy * (npc.blinking ? 0.12 : 1);
  });
  const mouthOpen = special || (talking && Math.sin(t * 16) > -0.3) || (joy && Math.sin(t * 6) > 0.6);
  f.smile.visible = !mouthOpen;
  f.open.visible = mouthOpen;
  if (mouthOpen) f.open.scale.y = special ? 0.95 : 0.5 + Math.abs(Math.sin(t * 16)) * 0.45;
  const raise = talking || joy ? 0.03 : 0;
  const frown = special ? 0.35 : 0;
  for (const b of f.brows) {
    b.position.y += (b.userData.y + raise - b.position.y) * 0.3;
    b.rotation.z = Math.PI / 2 + frown * b.userData.s;
  }
}

// ---------- 共用：Q 版人形骨架 ----------
// root（位置／朝向）→ bodyPivot（彈跳）→ 身體、頭、手、腳（各自有關節 pivot）
function humanoid({ body, legs = 0x5a3e2b, shoes = 0x4a3020, skin = SKIN, mustache = false }) {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const legGeo = new THREE.CapsuleGeometry(0.1, 0.18, 4, 10);
  const shoeGeo = new THREE.SphereGeometry(0.12, 12, 8);
  const leg = (s) => {
    const p = new THREE.Group();
    p.position.set(0.12 * s, 0.42, 0);
    const l = part(legGeo, legs);
    l.position.y = -0.17;
    const sh = part(shoeGeo, shoes);
    sh.scale.set(1, 0.7, 1.35);
    sh.position.set(0, -0.36, 0.05);
    p.add(l, sh);
    bodyPivot.add(p);
    return p;
  };

  const torso = part(new THREE.CapsuleGeometry(0.25, 0.18, 6, 14), body);
  torso.position.y = 0.68;
  torso.scale.z = 0.85;
  bodyPivot.add(torso);

  const headPivot = new THREE.Group();
  headPivot.position.y = 0.92;
  bodyPivot.add(headPivot);
  const head = part(new THREE.SphereGeometry(0.42, 24, 18), skin);
  head.position.y = 0.4;
  headPivot.add(head);
  const faceParts = face(headPivot, { mustache });

  const armGeo = new THREE.CapsuleGeometry(0.075, 0.18, 4, 10);
  const handGeo = new THREE.SphereGeometry(0.09, 10, 8);
  const arm = (s) => {
    const p = new THREE.Group(); // 肩關節：動畫轉 x / z
    p.position.set(0.3 * s, 0.86, 0);
    const inner = new THREE.Group();
    inner.rotation.z = 0.18 * s;
    const a = part(armGeo, body);
    a.position.y = -0.16;
    const hand = part(handGeo, skin);
    hand.position.y = -0.33;
    inner.add(a, hand);
    p.add(inner);
    bodyPivot.add(p);
    return { pivot: p, hand };
  };
  const L = arm(-1),
    R = arm(1);
  return { root, bodyPivot, torso, headPivot, face: faceParts, legL: leg(-1), legR: leg(1), armL: L.pivot, armR: R.pivot, handL: L.hand, handR: R.hand };
}

// 人形共用動畫：走路、呼吸、看向、跳舞、打招呼；回傳姿勢，角色可再覆寫
function pose(rig, npc, t) {
  const wb = npc.walkBlend;
  const ph = npc.walkPhase;
  const p = {
    legL: Math.sin(ph) * 0.7 * wb,
    legR: -Math.sin(ph) * 0.7 * wb,
    armLx: -Math.sin(ph) * 0.6 * wb,
    armRx: Math.sin(ph) * 0.6 * wb,
    armLz: 0,
    armRz: 0,
    bob: Math.abs(Math.sin(ph)) * 0.07 * wb + Math.sin(t * 2.2 + npc.seed) * 0.012,
    headYaw: npc.lookYaw,
    headTilt: 0,
    lean: wb * 0.08,
  };
  if (npc.dancing) {
    const d = t * 6 + npc.seed;
    p.bob = Math.abs(Math.sin(d)) * 0.16;
    p.armLz = -2.3 - Math.sin(d) * 0.4;
    p.armRz = 2.3 - Math.sin(d) * 0.4;
    p.legL = Math.max(0, Math.sin(d)) * 0.5;
    p.legR = Math.max(0, -Math.sin(d)) * 0.5;
    p.headTilt = Math.sin(d) * 0.2;
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

// ---------- 共用小零件 ----------
function collar(rig, color, y = 0.98) {
  const c = part(new THREE.TorusGeometry(0.2, 0.055, 8, 24), color, { outline: false });
  c.rotation.x = Math.PI / 2;
  c.position.y = y;
  rig.bodyPivot.add(c);
  return c;
}

function sideHair(rig, color, { y = 0.45, r = 0.13, spread = 0.32, z = -0.16 } = {}) {
  for (const s of [-1, 1]) {
    const h = part(new THREE.SphereGeometry(r, 12, 10), color);
    h.scale.set(0.8, 1.2, 1);
    h.position.set(spread * s, y, z);
    rig.headPivot.add(h);
  }
}

function belt(rig, color = 0x6e4426, y = 0.55) {
  const b = part(new THREE.TorusGeometry(0.25, 0.04, 6, 24), color, { outline: false });
  b.rotation.x = Math.PI / 2;
  b.position.y = y;
  b.scale.y = 0.85;
  rig.bodyPivot.add(b);
  return b;
}

// ---------- 勇者 ----------
function hero() {
  const rig = humanoid({ body: 0x3f86c9, legs: 0x4d5d7a, shoes: 0x6e4426 });
  const metal = 0xc9d3dc;
  // 肩甲（跟著手臂動）與胸前徽章
  for (const arm of [rig.armL, rig.armR]) {
    const pad = part(new THREE.SphereGeometry(0.14, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), metal);
    pad.position.y = 0.02;
    arm.add(pad);
  }
  const emblem = part(new THREE.OctahedronGeometry(0.075, 0), 0xf4b13b, { emissive: 0xf4b13b, emissiveIntensity: 0.2 });
  emblem.scale.z = 0.4;
  emblem.position.set(0, 0.76, 0.215);
  rig.bodyPivot.add(emblem);
  // 頭盔＋紅色羽飾
  const helm = part(new THREE.SphereGeometry(0.455, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), metal);
  helm.position.y = 0.4;
  rig.headPivot.add(helm);
  const rim = part(new THREE.TorusGeometry(0.42, 0.04, 8, 28), 0xf4b13b, { outline: false });
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.4 + 0.455 * Math.cos(Math.PI * 0.42);
  rig.headPivot.add(rim);
  const plume = part(new THREE.CapsuleGeometry(0.08, 0.28, 4, 8), 0xe0473a);
  plume.position.set(0, 0.92, -0.08);
  plume.rotation.x = -0.6;
  rig.headPivot.add(plume);
  // 腰帶
  const belt = part(new THREE.TorusGeometry(0.25, 0.04, 6, 24), 0x6e4426, { outline: false });
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.55;
  belt.scale.y = 0.85;
  rig.bodyPivot.add(belt);
  // 披風（會隨走路飄動）
  const capePivot = new THREE.Group();
  capePivot.position.set(0, 0.98, -0.2);
  const capeGeo = new THREE.PlaneGeometry(0.62, 0.8, 1, 4);
  capeGeo.translate(0, -0.4, 0);
  const cape = part(capeGeo, 0xd8402f, { outline: false, side: THREE.DoubleSide });
  capePivot.add(cape);
  rig.bodyPivot.add(capePivot);
  // 劍
  const sword = new THREE.Group();
  const blade = part(new THREE.BoxGeometry(0.07, 0.62, 0.025), 0xe6edf3);
  blade.position.y = 0.42;
  const guard = part(new THREE.BoxGeometry(0.26, 0.05, 0.07), 0xf4b13b);
  guard.position.y = 0.1;
  const grip = part(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 6), 0x6e4426);
  sword.add(blade, guard, grip);
  sword.rotation.x = Math.PI / 2;
  rig.handR.add(sword);
  // 盾牌
  const shield = new THREE.Group();
  const disc = part(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 20), 0xf4b13b);
  const boss = part(new THREE.CylinderGeometry(0.13, 0.13, 0.07, 16), 0x35bfcc, { outline: false });
  boss.position.y = 0.01;
  shield.add(disc, boss);
  shield.rotation.z = -Math.PI / 2;
  shield.position.set(-0.12, 0.05, 0.05);
  rig.handL.add(shield);

  return {
    root: rig.root,
    animate(npc, t, dt) {
      const p = pose(rig, npc, t);
      if (npc.action?.name === "special") {
        // 揮劍：舉起 → 快速劈下 → 收回
        const u = npc.action.u;
        p.armRx = u < 0.35 ? (-2.8 * u) / 0.35 : u < 0.5 ? -2.8 + ((u - 0.35) / 0.15) * 3.4 : 0.6 * (1 - (u - 0.5) / 0.5);
        p.bob += Math.sin(Math.min(1, u * 2) * Math.PI) * 0.15;
        if (Math.abs(u - 0.45) < 0.02 && !npc.action.fx) {
          npc.action.fx = true;
          npc.fx(rig.handR, { count: 14, colors: [0xffffff, 0xbfe8ff, 0xf4b13b], speed: 2.2, up: 1 });
        }
      }
      applyPose(rig, p, npc, dt, t);
      capePivot.rotation.x = 0.12 + npc.walkBlend * 0.45 + Math.sin(t * 3 + npc.seed) * 0.06 + (npc.dancing ? Math.abs(Math.sin(t * 6)) * 0.3 : 0);
    },
  };
}

// ---------- 魔法師 ----------
function wizard() {
  const rig = humanoid({ body: 0x7a5bc7, legs: 0x5b3fa0, shoes: 0x3d2a6b });
  sideHair(rig, 0xc9b6ff, { y: 0.42 });
  collar(rig, 0xf4b13b);
  const skirt = part(new THREE.CylinderGeometry(0.24, 0.4, 0.42, 18), 0x7a5bc7);
  skirt.position.y = 0.3;
  rig.bodyPivot.add(skirt);
  // 尖帽
  const hat = new THREE.Group();
  const brim = part(new THREE.CylinderGeometry(0.56, 0.56, 0.05, 28), 0x5b3fa0);
  const cone = part(new THREE.ConeGeometry(0.34, 0.8, 18), 0x5b3fa0);
  cone.position.y = 0.4;
  cone.rotation.z = -0.18;
  const band = part(new THREE.CylinderGeometry(0.33, 0.35, 0.09, 18), 0xf4b13b, { outline: false });
  band.position.y = 0.06;
  const star = part(new THREE.OctahedronGeometry(0.08, 0), 0xfff07a, { emissive: 0xfff07a, emissiveIntensity: 0.6 });
  star.position.set(0.12, 0.42, 0.24);
  hat.add(brim, cone, band, star);
  hat.position.y = 0.66;
  hat.rotation.x = -0.08;
  rig.headPivot.add(hat);
  // 法杖＋發光寶珠
  const staff = new THREE.Group();
  const stick = part(new THREE.CylinderGeometry(0.035, 0.04, 1.4, 8), 0x8a5a32);
  stick.position.y = 0.3;
  const orb = part(new THREE.SphereGeometry(0.13, 16, 12), 0x5ff0ff, { emissive: 0x35bfcc, emissiveIntensity: 0.8 });
  orb.position.y = 1.05;
  const glow = new THREE.PointLight(0x5ff0ff, 0, 3.5, 2);
  glow.position.y = 1.05;
  staff.add(stick, orb, glow);
  rig.handR.add(staff);

  return {
    root: rig.root,
    animate(npc, t, dt) {
      const p = pose(rig, npc, t);
      let pulse = 0;
      if (npc.action?.name === "special") {
        // 舉杖施法，寶珠發亮並噴出魔法粒子
        const e = env(npc.action.u, 0.2);
        p.armRx = -2.6 * e;
        p.armLz = -1.2 * e;
        p.headTilt = -0.1 * e;
        pulse = e;
        npc.action.acc = (npc.action.acc || 0) + dt;
        if (e > 0.8 && npc.action.acc > 0.08) {
          npc.action.acc = 0;
          npc.fx(orb, { count: 3, colors: [0x5ff0ff, 0xb9a6ff, 0xfff07a], speed: 1.2, up: 0.8, gravity: -0.3, life: 1.2 });
        }
      }
      applyPose(rig, p, npc, dt, t);
      const night = npc.world.night;
      orb.scale.setScalar(1 + pulse * 0.4 + Math.sin(t * 4) * 0.05);
      glow.intensity = night * 2.5 + pulse * 4;
      star.rotation.y = t * 2;
    },
  };
}

// ---------- 弓箭手 ----------
function ranger() {
  const rig = humanoid({ body: 0x4f9a4a, legs: 0x6e4426, shoes: 0x4a3020 });
  belt(rig, 0x8a5a32);
  const pouch = part(new THREE.BoxGeometry(0.14, 0.13, 0.08), 0xb07a45);
  pouch.position.set(-0.17, 0.5, 0.19);
  rig.bodyPivot.add(pouch);
  const brooch = part(new THREE.ConeGeometry(0.05, 0.13, 5), 0x9ad05a, { outline: false });
  brooch.rotation.z = 0.6;
  brooch.position.set(0.14, 0.97, 0.17);
  rig.bodyPivot.add(brooch);
  // 兜帽：只留後半顆球，臉露出來
  const hood = part(new THREE.SphereGeometry(0.46, 24, 16, Math.PI / 2 + 1.15, Math.PI * 2 - 2.3), 0x2f6b3a);
  hood.position.y = 0.42;
  rig.headPivot.add(hood);
  const tip = part(new THREE.ConeGeometry(0.16, 0.36, 10), 0x2f6b3a);
  tip.position.set(0, 0.62, -0.42);
  tip.rotation.x = -2.1;
  rig.headPivot.add(tip);
  // 箭筒
  const quiver = part(new THREE.CylinderGeometry(0.1, 0.09, 0.5, 10), 0x8a5a32);
  quiver.position.set(0.12, 0.82, -0.28);
  quiver.rotation.z = -0.4;
  rig.bodyPivot.add(quiver);
  for (const dx of [-0.04, 0.04]) {
    const fl = part(new THREE.ConeGeometry(0.04, 0.12, 4), 0xe0473a, { outline: false });
    fl.position.set(0.12 + 0.11 + dx, 1.08, -0.28);
    fl.rotation.z = -0.4;
    rig.bodyPivot.add(fl);
  }
  // 弓
  const bow = new THREE.Group();
  // 半圓弧轉成直立、往前彎（弦在手的位置）
  const arc = part(new THREE.TorusGeometry(0.42, 0.025, 6, 24, Math.PI), 0x8a5a32);
  arc.rotation.z = -Math.PI / 2;
  const string = part(new THREE.CylinderGeometry(0.006, 0.006, 0.84, 4), 0xf6ead2, { outline: false });
  bow.add(arc, string);
  bow.rotation.y = -0.9; // 斜一點，正面也看得到弧形
  bow.position.set(-0.05, 0.1, 0);
  rig.handL.add(bow);

  return {
    root: rig.root,
    animate(npc, t, dt) {
      const p = pose(rig, npc, t);
      if (npc.action?.name === "special") {
        // 舉弓、拉弦、放箭
        const u = npc.action.u;
        const e = env(u, 0.15);
        p.armLx = -1.5 * e;
        p.armRx = -1.4 * e;
        p.armRz = u < 0.7 ? 0.3 * e + (u / 0.7) * 0.6 * e : 0.2 * e;
        p.headYaw = 0;
        if (u > 0.7 && !npc.action.fx) {
          npc.action.fx = true;
          npc.fx(rig.handL, { count: 10, colors: [0xfff07a, 0xffffff], speed: 0.6, up: 0.4, gravity: 0, life: 0.6 });
        }
      }
      applyPose(rig, p, npc, dt, t);
    },
  };
}

// ---------- 商人 ----------
function merchant() {
  const rig = humanoid({ body: 0xef8a3a, legs: 0x6e4426, mustache: true });
  sideHair(rig, 0x6b4226, { y: 0.4, r: 0.12, spread: 0.37 });
  collar(rig, 0xd8402f);
  // 草帽
  const hat = new THREE.Group();
  const brim = part(new THREE.CylinderGeometry(0.6, 0.62, 0.05, 28), 0xe8c57a);
  const top = part(new THREE.CylinderGeometry(0.3, 0.34, 0.24, 20), 0xe8c57a);
  top.position.y = 0.13;
  const ribbon = part(new THREE.CylinderGeometry(0.345, 0.345, 0.07, 20), 0xd8402f, { outline: false });
  ribbon.position.y = 0.05;
  hat.add(brim, top, ribbon);
  hat.position.y = 0.72;
  hat.rotation.z = 0.08;
  rig.headPivot.add(hat);
  // 大背包＋睡袋
  const pack = part(new THREE.BoxGeometry(0.52, 0.58, 0.32), 0xb07a45);
  pack.position.set(0, 0.78, -0.36);
  const flap = part(new THREE.BoxGeometry(0.54, 0.16, 0.34), 0x8a5a32);
  flap.position.set(0, 1.0, -0.36);
  const roll = part(new THREE.CylinderGeometry(0.11, 0.11, 0.62, 12), 0x3f86c9);
  roll.rotation.z = Math.PI / 2;
  roll.position.set(0, 1.15, -0.36);
  rig.bodyPivot.add(pack, flap, roll);
  // 錢袋
  const bag = part(new THREE.SphereGeometry(0.12, 12, 8), 0xf4b13b);
  bag.position.set(0.24, 0.5, 0.12);
  rig.bodyPivot.add(bag);

  return {
    root: rig.root,
    animate(npc, t, dt) {
      const p = pose(rig, npc, t);
      if (npc.action?.name === "special") {
        // 招手叫賣，金幣往上彈
        const e = env(npc.action.u);
        p.armRz = 2.6 * e;
        p.armRx = Math.sin(t * 12) * 0.35 * e;
        p.armLx = -0.8 * e;
        p.bob += Math.abs(Math.sin(t * 8)) * 0.05 * e;
        npc.action.acc = (npc.action.acc || 0) + dt;
        if (e > 0.6 && npc.action.acc > 0.25) {
          npc.action.acc = 0;
          npc.fx(bag, { count: 3, color: 0xf4b13b, shape: "coin", speed: 0.6, up: 3, gravity: 7, life: 0.9, size: 1.2 });
        }
      }
      applyPose(rig, p, npc, dt, t);
    },
  };
}

// ---------- 史萊姆 ----------
function slime() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const jelly = part(new THREE.SphereGeometry(0.5, 28, 20), 0x4cc9d6, { emissive: 0x1b6f7a, emissiveIntensity: 0.25 });
  jelly.scale.y = 0.8;
  jelly.position.y = 0.4;
  const shine = part(new THREE.SphereGeometry(0.09, 10, 8), 0xffffff, { outline: false, shadow: false });
  shine.scale.set(1, 0.6, 0.5);
  shine.position.set(-0.2, 0.62, 0.3);
  const leaf = part(new THREE.ConeGeometry(0.08, 0.22, 6), 0x4b9450);
  leaf.position.set(0.04, 0.86, 0);
  leaf.rotation.z = -0.4;
  body.add(jelly, shine, leaf);
  const faceGroup = new THREE.Group();
  faceGroup.position.y = 0.0;
  const faceParts = face(faceGroup, { y: 0.46, r: 0.52, brows: false });
  faceGroup.scale.z = 0.95;
  body.add(faceGroup);

  return {
    root,
    hops: true,
    animate(npc, t, dt) {
      // 擠壓伸展（squash & stretch）：落地壓扁、彈起拉長
      let h = 0;
      let sq = Math.sin(t * 3 + npc.seed) * 0.03;
      if (npc.walkBlend > 0.05 || npc.dancing) {
        const u = (npc.walkPhase / Math.PI) % 1;
        h = Math.sin(u * Math.PI) * (npc.dancing ? 0.6 : 0.45);
        sq = u < 0.12 || u > 0.88 ? -0.22 : Math.sin(u * Math.PI) * 0.15;
      }
      if (npc.action?.name === "special") {
        // 大跳躍＋空中轉一圈
        const u = npc.action.u;
        h = Math.sin(u * Math.PI) * 2;
        sq = u < 0.1 || u > 0.9 ? -0.3 : 0.2;
        body.rotation.y = u * Math.PI * 2;
        if (u > 0.95 && !npc.action.fx) {
          npc.action.fx = true;
          npc.fx(root, { count: 16, colors: [0x4cc9d6, 0xbff6ff], speed: 2, up: 1.2, life: 0.7 });
        }
      } else body.rotation.y *= 0.9;
      if (npc.action?.name === "greet") sq = Math.sin(t * 16) * 0.12 * env(npc.action.u);
      body.position.y = h;
      body.scale.set(1 - sq * 0.6, 1 + sq, 1 - sq * 0.6);
      express(faceParts, npc, t);
    },
  };
}

// ---------- 小精靈 ----------
function fairy() {
  const rig = humanoid({ body: 0xf7a1c4, legs: 0xf7a1c4, shoes: 0xb9a6ff });
  rig.root.scale.setScalar(0.62);
  // 頭髮
  const hair = part(new THREE.SphereGeometry(0.45, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), 0xfff07a);
  hair.position.y = 0.43;
  hair.rotation.x = -0.25;
  rig.headPivot.add(hair);
  const bun = part(new THREE.SphereGeometry(0.16, 12, 10), 0xfff07a);
  bun.position.set(0, 0.86, -0.12);
  rig.headPivot.add(bun);
  // 翅膀：半透明、會拍動
  const wingMat = new THREE.MeshToonMaterial({ color: 0xcdf3ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
  const wings = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.08 * s, 0.85, -0.2);
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), wingMat);
    w.scale.set(1, 1.5, 1);
    w.position.set(0.42 * s, 0.25, 0);
    w.rotation.z = -0.5 * s;
    const w2 = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), wingMat);
    w2.position.set(0.32 * s, -0.25, 0);
    pivot.add(w, w2);
    rig.bodyPivot.add(pivot);
    return { pivot, s };
  });
  // 魔法棒
  const wand = new THREE.Group();
  const stick = part(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), 0xffffff);
  stick.position.y = 0.15;
  const star = part(new THREE.OctahedronGeometry(0.1, 0), 0xfff07a, { emissive: 0xfff07a, emissiveIntensity: 0.7 });
  star.position.y = 0.42;
  wand.add(stick, star);
  rig.handR.add(wand);

  return {
    root: rig.root,
    flies: true,
    animate(npc, t, dt) {
      const p = pose(rig, npc, t);
      p.legL = 0.3 + Math.sin(t * 3) * 0.15; // 飛行時腳輕輕擺動
      p.legR = 0.15 - Math.sin(t * 3) * 0.15;
      p.armLx = -0.3;
      p.armRx = -0.5 + Math.sin(t * 2) * 0.2;
      p.bob = 0;
      let flap = 18;
      if (npc.action?.name === "special") {
        // 空中翻一圈，撒出星星
        const u = npc.action.u;
        rig.bodyPivot.rotation.x = u * Math.PI * 2;
        flap = 30;
        npc.action.acc = (npc.action.acc || 0) + dt;
        if (npc.action.acc > 0.05) {
          npc.action.acc = 0;
          npc.fx(star, { count: 2, colors: [0xfff07a, 0xf7a1c4, 0xcdf3ff], speed: 0.4, up: 0.2, gravity: 0.6, life: 1 });
        }
      }
      if (npc.action?.name === "greet") p.armRz = 2.4 * env(npc.action.u);
      const lean = rig.bodyPivot.rotation.x;
      applyPose(rig, p, npc, dt, t);
      if (npc.action?.name === "special") rig.bodyPivot.rotation.x = lean;
      wings.forEach(({ pivot, s }) => (pivot.rotation.y = s * (0.3 + Math.sin(t * flap) * 0.5)));
      rig.root.position.y = (npc.hoverY ?? 1.3) + Math.sin(t * 2 + npc.seed) * 0.15;
      star.rotation.y = t * 3;
    },
  };
}

// ---------- 貓頭鷹老師 ----------
function owl() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const brown = 0x9a6b45;
  const dark = 0x6e4426;
  const torso = part(new THREE.SphereGeometry(0.55, 24, 18), brown);
  torso.scale.set(1, 1.12, 0.92);
  torso.position.y = 0.66;
  const belly = part(new THREE.SphereGeometry(0.42, 20, 14), 0xf1dcb8, { outline: false });
  belly.scale.set(1, 1.1, 0.55);
  belly.position.set(0, 0.55, 0.3);
  body.add(torso, belly);
  // 大眼睛＋圓眼鏡
  const whites = [];
  for (const s of [-1, 1]) {
    const white = part(new THREE.SphereGeometry(0.17, 18, 12), 0xffffff);
    white.scale.z = 0.45;
    white.position.set(0.18 * s, 0.94, 0.42);
    const pupil = part(new THREE.SphereGeometry(0.085, 12, 10), 0x2b1d14, { outline: false, shadow: false });
    pupil.position.z = 0.15;
    const hl = part(new THREE.SphereGeometry(0.03, 8, 6), 0xffffff, { outline: false, shadow: false });
    hl.position.set(0.03, 0.04, 0.24);
    white.add(pupil, hl);
    const ring = part(new THREE.TorusGeometry(0.2, 0.022, 8, 24), 0xf4b13b, { outline: false });
    ring.position.set(0.18 * s, 0.94, 0.5);
    body.add(white, ring);
    whites.push(white);
  }
  const bridge = part(new THREE.CylinderGeometry(0.018, 0.018, 0.1, 6), 0xf4b13b, { outline: false });
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, 0.97, 0.52);
  body.add(bridge);
  // 嘴、耳羽、學士帽
  const beak = part(new THREE.ConeGeometry(0.07, 0.17, 4), 0xf0a72a);
  beak.rotation.x = Math.PI;
  beak.position.set(0, 0.78, 0.52);
  body.add(beak);
  for (const s of [-1, 1]) {
    const tuft = part(new THREE.ConeGeometry(0.09, 0.26, 6), dark);
    tuft.position.set(0.36 * s, 1.18, 0);
    tuft.rotation.z = -0.5 * s;
    body.add(tuft);
  }
  const cap = new THREE.Group();
  const base = part(new THREE.CylinderGeometry(0.26, 0.28, 0.14, 16), 0x2b2b3a);
  const board = part(new THREE.BoxGeometry(0.66, 0.05, 0.66), 0x2b2b3a);
  board.position.y = 0.09;
  board.rotation.y = Math.PI / 4;
  const button = part(new THREE.SphereGeometry(0.035, 8, 6), 0xf4b13b, { outline: false });
  button.position.y = 0.13;
  const tassel = new THREE.Group();
  tassel.position.set(0, 0.12, 0);
  const cord = part(new THREE.CylinderGeometry(0.01, 0.01, 0.38, 4), 0xf4b13b, { outline: false });
  cord.rotation.z = Math.PI / 2;
  cord.position.x = 0.19;
  const tip = part(new THREE.CylinderGeometry(0.03, 0.05, 0.14, 8), 0xf4b13b, { outline: false });
  tip.position.set(0.38, -0.07, 0);
  tassel.add(cord, tip);
  cap.add(base, board, button, tassel);
  cap.position.y = 1.32;
  cap.rotation.z = 0.08;
  body.add(cap);
  // 翅膀與腳
  const wings = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.5 * s, 0.86, 0);
    const w = part(new THREE.SphereGeometry(0.3, 14, 10), dark);
    w.scale.set(0.35, 0.95, 0.75);
    w.position.y = -0.26;
    pivot.add(w);
    body.add(pivot);
    return pivot;
  });
  const feet = [-1, 1].map((s) => {
    const f = part(new THREE.SphereGeometry(0.09, 10, 8), 0xf0a72a);
    f.scale.set(1.2, 0.5, 1.4);
    f.position.set(0.16 * s, 0.05, 0.22);
    root.add(f);
    return f;
  });

  return {
    root,
    animate(npc, t, dt) {
      const wb = npc.walkBlend;
      const ph = npc.walkPhase;
      let flapL = 0,
        flapR = 0,
        hop = 0;
      body.rotation.z = Math.sin(ph) * 0.14 * wb + npc.lookYaw * 0.25; // 搖擺走路＋歪頭
      body.position.y = Math.abs(Math.sin(ph)) * 0.06 * wb + Math.sin(t * 2 + npc.seed) * 0.015;
      feet[0].position.y = 0.05 + Math.max(0, Math.sin(ph)) * 0.08 * wb;
      feet[1].position.y = 0.05 + Math.max(0, -Math.sin(ph)) * 0.08 * wb;
      if (npc.dancing) {
        hop = Math.abs(Math.sin(t * 6)) * 0.15;
        flapL = flapR = 0.6 + Math.sin(t * 12) * 0.5;
        body.rotation.z = Math.sin(t * 6) * 0.15;
      }
      if (npc.action?.name === "greet") flapR = 2.2 * env(npc.action.u) + Math.sin(t * 14) * 0.25 * env(npc.action.u);
      if (npc.action?.name === "special") {
        // 出題：雙翅舉起拍動、跳一下，帽子冒出星星
        const e = env(npc.action.u, 0.15);
        flapL = flapR = (1.6 + Math.sin(t * 20) * 0.5) * e;
        hop = Math.sin(npc.action.u * Math.PI) * 0.35;
        npc.action.acc = (npc.action.acc || 0) + dt;
        if (npc.action.acc > 0.12 && e > 0.5) {
          npc.action.acc = 0;
          npc.fx(button, { count: 3, colors: [0xfff07a, 0xffffff, 0xf4b13b], speed: 0.8, up: 1.2, gravity: 0.8, life: 1 });
        }
      }
      body.position.y += hop;
      wings[0].rotation.z = -flapL;
      wings[1].rotation.z = flapR;
      tassel.rotation.y = Math.sin(t * 2) * 0.3;
      const squint = npc.dancing ? 0.35 : npc.blinking ? 0.12 : 1;
      whites.forEach((w) => (w.scale.y = squint));
      beak.scale.y = npc.action?.name === "greet" ? 1 + Math.abs(Math.sin(t * 16)) * 0.3 : 1;
    },
  };
}

// ---------- 小龍 ----------
function dragon() {
  const green = 0x6cbf5a;
  const orange = 0xf2a65a;
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);
  const torso = part(new THREE.SphereGeometry(0.42, 22, 16), green);
  torso.scale.set(1, 1.05, 0.95);
  torso.position.y = 0.5;
  const belly = part(new THREE.SphereGeometry(0.33, 18, 12), 0xf3e3a6, { outline: false });
  belly.scale.set(1, 1.1, 0.5);
  belly.position.set(0, 0.45, 0.25);
  bodyPivot.add(torso, belly);
  // 腳與手
  const limb = (s, y, r, len, z = 0) => {
    const p = new THREE.Group();
    p.position.set(s, y, z);
    const l = part(new THREE.CapsuleGeometry(r, len, 4, 8), green);
    l.position.y = -len * 0.6;
    p.add(l);
    bodyPivot.add(p);
    return p;
  };
  const legL = limb(-0.2, 0.22, 0.1, 0.1),
    legR = limb(0.2, 0.22, 0.1, 0.1);
  const armL = limb(-0.36, 0.62, 0.065, 0.12, 0.08),
    armR = limb(0.36, 0.62, 0.065, 0.12, 0.08);
  // 頭
  const headPivot = new THREE.Group();
  headPivot.position.y = 0.86;
  bodyPivot.add(headPivot);
  const head = part(new THREE.SphereGeometry(0.36, 22, 16), green);
  head.position.y = 0.25;
  const snout = part(new THREE.SphereGeometry(0.2, 16, 12), 0x7fd06c);
  snout.scale.set(1.25, 0.85, 1);
  snout.position.set(0, 0.08, 0.27);
  headPivot.add(head, snout);
  for (const s of [-1, 1]) {
    const n = part(new THREE.SphereGeometry(0.025, 6, 4), 0x2b4a22, { outline: false, shadow: false });
    n.position.set(0.07 * s, 0.14, 0.45);
    headPivot.add(n);
    const hornM = part(new THREE.ConeGeometry(0.065, 0.24, 8), 0xfff3d6);
    hornM.position.set(0.17 * s, 0.56, -0.05);
    hornM.rotation.set(-0.3, 0, -0.35 * s);
    headPivot.add(hornM);
  }
  const faceParts = face(headPivot, { y: 0.34, r: 0.36, brows: false });
  // 背刺
  [
    [0.78, -0.3],
    [0.58, -0.4],
    [0.36, -0.4],
  ].forEach(([y, z]) => {
    const sp = part(new THREE.ConeGeometry(0.06, 0.16, 6), orange);
    sp.position.set(0, y, z);
    sp.rotation.x = -1.1;
    bodyPivot.add(sp);
  });
  // 翅膀（半透明橘色膜）
  const wingMat = new THREE.MeshToonMaterial({ color: orange, side: THREE.DoubleSide });
  const wings = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.18 * s, 0.75, -0.3);
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.36, 3), wingMat);
    w.position.set(0.28 * s, 0.12, 0);
    w.rotation.z = s > 0 ? 0.3 : Math.PI - 0.3;
    pivot.add(w);
    bodyPivot.add(pivot);
    return { pivot, s };
  });
  // 尾巴
  const tail = new THREE.Group();
  tail.position.set(0, 0.3, -0.36);
  [
    [0.14, -0.12, -0.02],
    [0.11, -0.28, -0.07],
    [0.08, -0.42, -0.1],
  ].forEach(([r, z, y]) => {
    const seg = part(new THREE.SphereGeometry(r, 12, 10), green);
    seg.position.set(0, y, z);
    tail.add(seg);
  });
  const tailTip = part(new THREE.ConeGeometry(0.08, 0.16, 4), orange);
  tailTip.position.set(0, -0.08, -0.55);
  tailTip.rotation.x = -Math.PI / 2;
  tail.add(tailTip);
  bodyPivot.add(tail);
  const fireDir = new THREE.Vector3();

  return {
    root,
    animate(npc, t, dt) {
      const wb = npc.walkBlend;
      const ph = npc.walkPhase;
      legL.rotation.x = Math.sin(ph) * 0.6 * wb;
      legR.rotation.x = -Math.sin(ph) * 0.6 * wb;
      armL.rotation.set(-Math.sin(ph) * 0.4 * wb, 0, -0.3);
      armR.rotation.set(Math.sin(ph) * 0.4 * wb, 0, 0.3);
      bodyPivot.position.y = Math.abs(Math.sin(ph)) * 0.06 * wb + Math.sin(t * 2.4 + npc.seed) * 0.012;
      headPivot.rotation.set(0, npc.lookYaw, 0);
      tail.rotation.y = Math.sin(t * 3 + npc.seed) * 0.45;
      let flap = 0.25 + Math.sin(t * 4) * 0.2;
      if (npc.dancing) {
        bodyPivot.position.y = Math.abs(Math.sin(t * 6)) * 0.15;
        armL.rotation.z = -2.2;
        armR.rotation.z = 2.2;
        flap = 0.4 + Math.sin(t * 14) * 0.4;
        tail.rotation.y = Math.sin(t * 6) * 0.7;
      }
      if (npc.action?.name === "greet") armR.rotation.z = 0.3 + 2.1 * env(npc.action.u) + Math.sin(t * 14) * 0.2 * env(npc.action.u);
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

// ---------- 公主 ----------
function princess() {
  const rig = humanoid({ body: 0xf7a1c4, legs: 0xf7a1c4, shoes: 0xd8402f });
  // 蓬蓬裙＋蕾絲裙襬
  const skirt = part(new THREE.CylinderGeometry(0.22, 0.52, 0.55, 26), 0xf48fb8);
  skirt.position.y = 0.3;
  const frill = part(new THREE.TorusGeometry(0.5, 0.045, 8, 28), 0xffffff, { outline: false });
  frill.rotation.x = Math.PI / 2;
  frill.position.y = 0.05;
  rig.bodyPivot.add(skirt, frill);
  collar(rig, 0xffffff);
  // 金色長髮
  const gold = 0xffd86b;
  const bangs = part(new THREE.SphereGeometry(0.45, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), gold);
  bangs.position.y = 0.43;
  bangs.rotation.x = -0.2;
  const back = part(new THREE.CapsuleGeometry(0.3, 0.4, 6, 14), gold);
  back.scale.z = 0.6;
  back.position.set(0, 0.22, -0.2);
  rig.headPivot.add(bangs, back);
  sideHair(rig, gold, { y: 0.3, r: 0.13, spread: 0.36 });
  // 皇冠＋寶石
  const crown = new THREE.Group();
  const band = part(new THREE.CylinderGeometry(0.2, 0.22, 0.1, 16), 0xf4b13b);
  crown.add(band);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spike = part(new THREE.ConeGeometry(0.045, 0.14, 6), 0xf4b13b, { outline: false });
    spike.position.set(Math.sin(a) * 0.19, 0.11, Math.cos(a) * 0.19);
    crown.add(spike);
  }
  const gem = part(new THREE.OctahedronGeometry(0.05, 0), 0xe0473a, { emissive: 0xe0473a, emissiveIntensity: 0.4, outline: false });
  gem.position.set(0, 0.01, 0.22);
  crown.add(gem);
  crown.position.y = 0.86;
  crown.rotation.x = -0.12;
  rig.headPivot.add(crown);

  return {
    root: rig.root,
    animate(npc, t, dt) {
      const p = pose(rig, npc, t);
      p.legL *= 0.4; // 裙子下的小碎步
      p.legR *= 0.4;
      let spin = 0;
      if (npc.action?.name === "special") {
        // 轉圈：張開雙手旋轉，灑出愛心色的星星
        const u = npc.action.u;
        const e = env(u, 0.12);
        spin = u * Math.PI * 4;
        p.armLz = -1.3 * e;
        p.armRz = 1.3 * e;
        p.bob += Math.sin(u * Math.PI) * 0.12;
        npc.action.acc = (npc.action.acc || 0) + dt;
        if (npc.action.acc > 0.06) {
          npc.action.acc = 0;
          npc.fx(rig.handR, { count: 2, colors: [0xf7a1c4, 0xffffff, 0xfff07a], speed: 0.5, up: 0.6, gravity: 0.3, life: 0.9 });
        }
      }
      applyPose(rig, p, npc, dt, t);
      rig.bodyPivot.rotation.y = spin;
      frill.scale.setScalar(1 + (spin ? 0.08 : 0));
    },
  };
}

// ---------- 角色清單 ----------
export const CHARACTERS = [
  {
    id: "hero",
    sky: ["#8fc6e0", "#dcf0f6"],
    name: "勇者 Leo",
    role: "Hero",
    color: "#3f86c9",
    speed: 1.5,
    desc: "守護營地的年輕勇者，口頭禪是「勇氣」。",
    tech: "關節動畫（揮劍）、披風擺動、組合式道具（頭盔、劍、盾）",
    special: "揮劍",
    lines: [
      { en: "Courage!", zh: "勇氣！" },
      { en: "Let's go on an adventure!", zh: "一起去冒險吧！" },
      { en: "I will protect you.", zh: "我會保護你。" },
    ],
    create: hero,
  },
  {
    id: "wizard",
    sky: ["#b7a6e8", "#eee8fb"],
    specialDur: 2.6,
    name: "魔法師 Mira",
    role: "Wizard",
    color: "#7a5bc7",
    speed: 1.1,
    desc: "喜歡研究咒語的魔法師，每個咒語都是一個英文單字。",
    tech: "自發光材質＋點光源（夜晚寶珠會照亮周圍）、魔法粒子",
    special: "施法",
    lines: [
      { en: "Magic!", zh: "魔法！" },
      { en: "Every word is a spell.", zh: "每個單字都是一個咒語。" },
      { en: "Abracadabra!", zh: "嘛哩嘛哩哄！" },
    ],
    create: wizard,
  },
  {
    id: "ranger",
    sky: ["#9fd3b0", "#e5f5e8"],
    name: "弓箭手 Rin",
    role: "Ranger",
    color: "#4f9a4a",
    speed: 1.7,
    desc: "森林裡的弓箭手，眼力很好，最會找出拼錯的字。",
    tech: "部分球體幾何（兜帽只留後半）、Torus 弧形弓、拉弓動作",
    special: "射箭",
    lines: [
      { en: "Bullseye!", zh: "正中紅心！" },
      { en: "Aim for the target.", zh: "瞄準目標。" },
      { en: "The forest is quiet today.", zh: "今天森林很安靜。" },
    ],
    create: ranger,
  },
  {
    id: "merchant",
    sky: ["#f6cf95", "#fcf1df"],
    name: "商人 Bob",
    role: "Merchant",
    color: "#ef8a3a",
    speed: 0.9,
    desc: "背著大背包四處旅行的商人，賣的是求救卡。",
    tech: "多個幾何組合（背包、睡袋、草帽、鬍子）、金幣粒子與重力",
    special: "叫賣",
    lines: [
      { en: "Welcome!", zh: "歡迎光臨！" },
      { en: "Do you need a hint card?", zh: "需要求救卡嗎？" },
      { en: "Ten coins, please.", zh: "請給我十枚金幣。" },
    ],
    create: merchant,
  },
  {
    id: "slime",
    sky: ["#93dbe3", "#e4f8f9"],
    name: "史萊姆 Puru",
    role: "Slime",
    color: "#35bfcc",
    speed: 1.2,
    desc: "營地的吉祥物，不會說話，只會彈來彈去。",
    tech: "擠壓伸展（squash & stretch）、跳躍拋物線",
    special: "大跳躍",
    lines: [
      { en: "Boing!", zh: "啵嚶！" },
      { en: "Jump!", zh: "跳！" },
      { en: "Bounce!", zh: "彈跳！" },
    ],
    create: slime,
  },
  {
    id: "fairy",
    sky: ["#bfe3f7", "#f2fafd"],
    name: "小精靈 Tink",
    role: "Fairy",
    color: "#f7a1c4",
    speed: 1.3,
    desc: "在空中飛來飛去的小精靈，會在答對時撒下星星。",
    tech: "飛行路徑、翅膀拍動、半透明材質、星星軌跡",
    special: "空翻",
    lines: [
      { en: "Sparkle!", zh: "閃閃發亮！" },
      { en: "You got it right!", zh: "你答對了！" },
      { en: "Fly high!", zh: "飛高高！" },
    ],
    create: fairy,
  },
  {
    id: "owl",
    sky: ["#d9c29b", "#f7efe0"],
    name: "貓頭鷹老師 Hoot",
    role: "Teacher",
    color: "#9a6b45",
    speed: 0.8,
    desc: "村裡的英文老師，戴著圓眼鏡，最喜歡出單字考題。",
    tech: "非人形骨架（翅膀關節）、眼鏡與學士帽組合、搖擺走路",
    special: "出題",
    lines: [
      { en: "Spell 'apple'!", zh: "拼出 apple！" },
      { en: "Good job!", zh: "做得好！" },
      { en: "Let's learn a new word.", zh: "來學新單字吧。" },
    ],
    create: owl,
  },
  {
    id: "dragon",
    sky: ["#f2b38a", "#fce8d8"],
    specialDur: 2.2,
    name: "小龍 Draco",
    role: "Dragon",
    color: "#5aa84a",
    speed: 1.0,
    desc: "剛從蛋裡孵出來的小龍，還不太會控制火焰。",
    tech: "尾巴與翅膀的次要動作、有方向的火焰粒子、角與背刺組合",
    special: "噴火",
    lines: [
      { en: "Roar!", zh: "吼！" },
      { en: "Fire!", zh: "火！" },
      { en: "I am a little dragon.", zh: "我是一隻小龍。" },
    ],
    create: dragon,
  },
  {
    id: "princess",
    sky: ["#f5b8d0", "#fdecf3"],
    specialDur: 1.8,
    name: "公主 Aria",
    role: "Princess",
    color: "#e46b9b",
    speed: 1.1,
    desc: "城堡裡的公主，每天都會來營地學一個新單字。",
    tech: "裙子與長髮的層次組合、皇冠寶石、身體旋轉＋星星粒子",
    special: "轉圈",
    lines: [
      { en: "Hello, everyone!", zh: "大家好！" },
      { en: "Beautiful!", zh: "好美！" },
      { en: "Let's be friends.", zh: "我們做朋友吧。" },
    ],
    create: princess,
  },
];
