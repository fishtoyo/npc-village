// 角色：全部由基本幾何組成（球、膠囊、圓錐、圓柱），沒有外部模型
// 每個角色回傳 { root, animate(npc, t, dt), special(npc, u) 可選 }
import * as THREE from "three";
import { part, toon } from "./toon.js";

const SKIN = 0xf7d2b6;
const env = (u, edge = 0.18) => Math.min(1, u / edge, (1 - u) / edge); // 動作淡入淡出

// ---------- 共用：臉 ----------
function face(target, { y = 0.4, r = 0.42, mustache = false } = {}) {
  const eyes = [];
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
    const blush = part(new THREE.SphereGeometry(0.06, 10, 8), 0xf49a8f, { outline: false, shadow: false });
    blush.scale.set(1.3, 0.6, 0.3);
    blush.position.set(0.25 * s, y - 0.13, z(0.25, 0.13) - 0.02);
    target.add(blush);
  }
  const mouth = part(new THREE.TorusGeometry(0.045, 0.014, 6, 12, Math.PI), 0x6b2e1f, { outline: false, shadow: false });
  mouth.rotation.z = Math.PI;
  mouth.position.set(0, y - 0.15, z(0, 0.15));
  target.add(mouth);
  if (mustache) {
    for (const s of [-1, 1]) {
      const m = part(new THREE.SphereGeometry(0.07, 10, 8), 0x6b4226, { outline: false });
      m.scale.set(1.4, 0.55, 0.6);
      m.position.set(0.07 * s, y - 0.11, z(0.07, 0.11) + 0.01);
      m.rotation.z = 0.3 * s;
      target.add(m);
    }
  }
  return eyes;
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
  const eyes = face(headPivot, { mustache });

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
  return { root, bodyPivot, torso, headPivot, eyes, legL: leg(-1), legR: leg(1), armL: L.pivot, armR: R.pivot, handL: L.hand, handR: R.hand };
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

function applyPose(rig, p, npc, dt) {
  rig.legL.rotation.x = p.legL;
  rig.legR.rotation.x = p.legR;
  rig.armL.rotation.set(p.armLx, 0, p.armLz);
  rig.armR.rotation.set(p.armRx, 0, p.armRz);
  rig.bodyPivot.position.y = p.bob;
  rig.bodyPivot.rotation.x = p.lean;
  rig.headPivot.rotation.y += (p.headYaw - rig.headPivot.rotation.y) * Math.min(1, dt * 5);
  rig.headPivot.rotation.z = p.headTilt;
  blink(rig.eyes, npc);
}

function blink(eyes, npc) {
  const k = npc.blinking ? 0.12 : 1;
  for (const e of eyes) e.scale.y = e.userData.sy * k;
}

// ---------- 勇者 ----------
function hero() {
  const rig = humanoid({ body: 0x3f86c9, legs: 0x4d5d7a });
  const metal = 0xc9d3dc;
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
      applyPose(rig, p, npc, dt);
      capePivot.rotation.x = 0.12 + npc.walkBlend * 0.45 + Math.sin(t * 3 + npc.seed) * 0.06 + (npc.dancing ? Math.abs(Math.sin(t * 6)) * 0.3 : 0);
    },
  };
}

// ---------- 魔法師 ----------
function wizard() {
  const rig = humanoid({ body: 0x7a5bc7, legs: 0x5b3fa0, shoes: 0x3d2a6b });
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
      applyPose(rig, p, npc, dt);
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
      applyPose(rig, p, npc, dt);
    },
  };
}

// ---------- 商人 ----------
function merchant() {
  const rig = humanoid({ body: 0xef8a3a, legs: 0x6e4426, mustache: true });
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
      applyPose(rig, p, npc, dt);
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
  const eyes = face(faceGroup, { y: 0.46, r: 0.52 });
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
      blink(eyes, npc);
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
      applyPose(rig, p, npc, dt);
      if (npc.action?.name === "special") rig.bodyPivot.rotation.x = lean;
      wings.forEach(({ pivot, s }) => (pivot.rotation.y = s * (0.3 + Math.sin(t * flap) * 0.5)));
      rig.root.position.y = (npc.hoverY ?? 1.3) + Math.sin(t * 2 + npc.seed) * 0.15;
      star.rotation.y = t * 3;
    },
  };
}

// ---------- 角色清單 ----------
export const CHARACTERS = [
  {
    id: "hero",
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
];
