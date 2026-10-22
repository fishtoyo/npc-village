import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { buildWorld } from "./world.js";
import { CHARACTERS } from "./characters.js";
import { NPC } from "./npc.js";
import { Particles } from "./particles.js";

const $ = (s) => document.querySelector(s);
const narrow = () => innerWidth <= 800;
const TAG_Y = { hero: 2.3, wizard: 2.55, ranger: 2.2, merchant: 2.2, slime: 1.35, fairy: 2.45 };
const HOME = { pos: new THREE.Vector3(0, 9, 15), target: new THREE.Vector3(0, 0.8, 0) };

const state = { selected: null, dance: false, night: false, lineIndex: new Map() };

// ---------- 場景 ----------
const stage = $("#stage");
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, narrow() ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.id = "labels";
stage.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
camera.position.copy(HOME.pos).add(new THREE.Vector3(6, 8, 8)); // 開場由遠拉近
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME.target);
controls.enableDamping = true;
controls.minDistance = 3;
controls.maxDistance = 32;
controls.maxPolarAngle = 1.38;
controls.enablePan = false;

const particles = new Particles(scene);
const world = buildWorld(scene, particles);

// ---------- 角色 ----------
const npcs = CHARACTERS.map((def) => {
  const npc = new NPC(def, world, particles);
  scene.add(npc.root);

  const tag = document.createElement("div");
  tag.className = "tag";
  tag.textContent = def.name;
  npc.tag = new CSS2DObject(tag);
  npc.tag.position.y = TAG_Y[def.id] ?? 2.2;
  npc.root.add(npc.tag);

  // CSS2DRenderer 會覆寫元素的 transform，所以對話框包一層錨點
  const anchor = document.createElement("div");
  anchor.className = "bubble-anchor";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  anchor.append(bubble);
  npc.bubbleEl = bubble;
  npc.bubble = new CSS2DObject(anchor);
  npc.bubble.position.y = (TAG_Y[def.id] ?? 2.2) + 0.25;
  npc.root.add(npc.bubble);
  return npc;
});

function say(npc, lookFrom = camera.position) {
  const i = state.lineIndex.get(npc) ?? 0;
  const line = npc.def.lines[i % npc.def.lines.length];
  state.lineIndex.set(npc, i + 1);
  npc.bubbleEl.innerHTML = "";
  const en = document.createElement("b");
  en.textContent = line.en;
  const zh = document.createElement("span");
  zh.textContent = line.zh;
  npc.bubbleEl.append(en, zh);
  npc.bubbleEl.classList.add("is-on");
  clearTimeout(npc.bubbleTimer);
  npc.bubbleTimer = setTimeout(() => npc.bubbleEl.classList.remove("is-on"), 3500);
  npc.greet(lookFrom);
  if (state.selected === npc) {
    $("#info-en").textContent = line.en;
    $("#info-zh").textContent = line.zh;
  }
}

// ---------- 名冊 ----------
$("#roster-list").innerHTML = CHARACTERS.map(
  (c, i) =>
    `<li><button type="button" class="roster-item" data-i="${i}"><span class="avatar" style="--c:${c.color}">${c.role[0]}</span><span><span class="roster-name">${c.name}</span><span class="roster-status" id="status-${c.id}"></span></span></button></li>`,
).join("");
$("#roster-list").addEventListener("click", (e) => {
  const b = e.target.closest("[data-i]");
  if (b) select(npcs[+b.dataset.i]);
});

function select(npc) {
  state.selected = npc;
  const d = npc.def;
  $("#info-avatar").textContent = d.role[0];
  $("#info-avatar").style.setProperty("--c", d.color);
  $("#info-role").textContent = d.role.toUpperCase();
  $("#info-name").textContent = d.name;
  $("#info-desc").textContent = d.desc;
  $("#info-tech").textContent = d.tech;
  $("#btn-special").textContent = d.special;
  $("#info").hidden = false;
  document.querySelectorAll(".roster-item").forEach((b) => b.classList.toggle("is-on", npcs[+b.dataset.i] === npc));
  // 鏡頭飛到角色正前方（避免被其他角色擋住），角色再轉身面向鏡頭打招呼
  const p = npc.root.getWorldPosition(new THREE.Vector3());
  const dist = narrow() ? 8 : 6.5;
  let pos = null;
  for (const off of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8, Math.PI]) {
    const yaw = npc.root.rotation.y + off;
    const cand = p.clone().add(new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(dist));
    if (clearView(p, cand, npc)) {
      pos = cand;
      break;
    }
  }
  pos ??= p.clone().add(new THREE.Vector3(Math.sin(npc.root.rotation.y), 0, Math.cos(npc.root.rotation.y)).multiplyScalar(dist));
  fly = { target: p.clone().setY(focusY(npc)), pos: pos.setY(narrow() ? 4.5 : 3.6) };
  say(npc, fly.pos);
}

// 鏡頭注視高度；手機的資訊卡在下方，注視點往下移讓角色出現在畫面上半部
const focusY = (npc) => (npc.char.flies ? 1.3 : 0.9) - (narrow() ? 1.6 : 0);

// 鏡頭到角色之間（俯視平面上）沒有障礙物或其他角色擋住
function clearView(from, to, self) {
  if (Math.hypot(to.x, to.z) > 13) return false;
  const blockers = [...world.obstacles.map((o) => ({ x: o.x, z: o.z, r: o.r + 0.4 })), ...npcs.filter((n) => n !== self).map((n) => ({ x: n.root.position.x, z: n.root.position.z, r: 0.7 }))];
  const dx = to.x - from.x,
    dz = to.z - from.z;
  const len2 = dx * dx + dz * dz;
  return blockers.every((b) => {
    const k = Math.max(0, Math.min(1, ((b.x - from.x) * dx + (b.z - from.z) * dz) / len2));
    return Math.hypot(from.x + dx * k - b.x, from.z + dz * k - b.z) > b.r;
  });
}

function deselect() {
  state.selected = null;
  $("#info").hidden = true;
  document.querySelectorAll(".roster-item").forEach((b) => b.classList.remove("is-on"));
  fly = { target: HOME.target.clone(), pos: HOME.pos.clone() };
}

$("#info-close").addEventListener("click", deselect);
$("#btn-back").addEventListener("click", deselect);
$("#btn-talk").addEventListener("click", () => state.selected && say(state.selected));
$("#btn-special").addEventListener("click", () => {
  const n = state.selected;
  if (n) n.play("special", n.def.id === "wizard" ? 2.6 : 1.6);
});

// ---------- 控制按鈕 ----------
$("#btn-dance").addEventListener("click", (e) => {
  state.dance = !state.dance;
  e.currentTarget.setAttribute("aria-pressed", state.dance);
  e.currentTarget.textContent = state.dance ? "停止跳舞" : "全體跳舞";
});
$("#btn-night").addEventListener("click", (e) => {
  state.night = !state.night;
  world.setNight(state.night);
  e.currentTarget.setAttribute("aria-pressed", state.night);
  e.currentTarget.textContent = state.night ? "切換白天" : "切換夜晚";
});
$("#btn-tags").addEventListener("click", (e) => {
  const on = document.body.classList.toggle("no-tags");
  e.currentTarget.setAttribute("aria-pressed", !on);
});
$("#btn-tech").addEventListener("click", () => ($("#tech").hidden = false));
$("#tech-close").addEventListener("click", () => ($("#tech").hidden = true));
$("#tech").addEventListener("click", (e) => e.target === e.currentTarget && ($("#tech").hidden = true));
addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!$("#tech").hidden) $("#tech").hidden = true;
  else if (state.selected) deselect();
});

// ---------- 點擊角色 ----------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const roots = npcs.map((n) => n.root);
function pick(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObjects(roots, true)[0]?.object.userData.npc || null;
}
let down = null;
renderer.domElement.addEventListener("pointerdown", (e) => (down = [e.clientX, e.clientY]));
renderer.domElement.addEventListener("pointerup", (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
  const npc = pick(e);
  if (npc) select(npc);
});
renderer.domElement.addEventListener("pointermove", (e) => {
  if (e.pointerType === "mouse" && !e.buttons) renderer.domElement.style.cursor = pick(e) ? "pointer" : "";
});
let fly = { target: HOME.target.clone(), pos: HOME.pos.clone() };
controls.addEventListener("start", () => (fly = null));

function resize() {
  const w = innerWidth,
    h = innerHeight;
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = w / h < 0.8 ? 52 : 38;
  camera.updateProjectionMatrix();
}
resize();
addEventListener("resize", resize);

// ---------- 迴圈 ----------
const clock = new THREE.Clock();
let statusTimer = 0;
const followed = new THREE.Vector3();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  world.update(t, dt);
  for (const n of npcs) n.update(dt, t, { dance: state.dance, others: npcs });
  particles.update(dt);
  $("#sky-night").style.opacity = world.night;

  if (fly) {
    const k = Math.min(1, dt * 3);
    controls.target.lerp(fly.target, k);
    camera.position.lerp(fly.pos, k);
    if (camera.position.distanceTo(fly.pos) < 0.02) fly = null;
  } else if (state.selected) {
    // 鏡頭跟著選取的角色移動
    state.selected.root.getWorldPosition(followed).setY(focusY(state.selected));
    const delta = followed.sub(controls.target).multiplyScalar(Math.min(1, dt * 4));
    controls.target.add(delta);
    camera.position.add(delta);
  }

  statusTimer -= dt;
  if (statusTimer <= 0) {
    statusTimer = 0.25;
    for (const n of npcs) $(`#status-${n.def.id}`).textContent = n.status;
  }

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
});

setTimeout(() => $("#loading").classList.add("is-done"), 400);
