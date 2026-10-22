// 格狀展示：一個 WebGL 畫布固定在畫面上，用 scissor 把每個小舞台畫進對應卡片的位置
import * as THREE from "three";
import { CHARACTERS } from "./characters.js";
import { Actor } from "./actor.js";
import { buildStage } from "./stage.js";
import { Particles } from "./particles.js";

const $ = (s) => document.querySelector(s);
const state = { dance: false, night: false, nightK: 0 };

// ---------- 卡片 ----------
$("#grid").innerHTML = CHARACTERS.map(
  (c, i) => `<article class="card" data-i="${i}" style="--c:${c.color};--sky-a:${c.sky?.[0] ?? "#8fc6e0"};--sky-b:${c.sky?.[1] ?? "#dcf0f6"}">
    <div class="view" title="點一下讓 ${c.name} 說話">
      <span class="status" id="status-${i}"></span>
      <div class="bubble" id="bubble-${i}"></div>
    </div>
    <div class="card-body">
      <p class="role">${c.role.toUpperCase()}</p>
      <h2>${c.name}</h2>
      <p class="desc">${c.desc}</p>
      <p class="tech"><b>用到的技術</b>${c.tech}</p>
      <div class="btn-row">
        <button type="button" class="btn orange" data-act="talk">說話</button>
        <button type="button" class="btn gold" data-act="special">${c.special}</button>
      </div>
    </div>
  </article>`,
).join("");

// ---------- 3D ----------
const canvas = document.createElement("canvas");
canvas.id = "gl";
document.body.prepend(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const cards = [...document.querySelectorAll(".card")].map((el, i) => {
  const def = CHARACTERS[i];
  const stage = buildStage(def.id);
  const particles = new Particles(stage.scene, 60);
  const actor = new Actor(def, particles);
  stage.scene.add(actor.root);
  return { el, view: el.querySelector(".view"), bubble: el.querySelector(".bubble"), status: el.querySelector(".status"), def, stage, particles, actor, line: 0 };
});

function say(card) {
  const line = card.def.lines[card.line++ % card.def.lines.length];
  card.bubble.innerHTML = "";
  const en = document.createElement("b");
  en.textContent = line.en;
  const zh = document.createElement("span");
  zh.textContent = line.zh;
  card.bubble.append(en, zh);
  card.bubble.classList.add("is-on");
  clearTimeout(card.bubbleTimer);
  card.bubbleTimer = setTimeout(() => card.bubble.classList.remove("is-on"), 3200);
  card.actor.play("greet");
}

$("#grid").addEventListener("click", (e) => {
  const card = cards[+e.target.closest(".card")?.dataset.i];
  if (!card) return;
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (act === "talk" || (!act && e.target.closest(".view"))) say(card);
  else if (act === "special") card.actor.play("special");
});

$("#btn-dance").addEventListener("click", (e) => {
  state.dance = !state.dance;
  e.currentTarget.setAttribute("aria-pressed", state.dance);
  e.currentTarget.textContent = state.dance ? "停止跳舞" : "全體跳舞";
});
$("#btn-night").addEventListener("click", (e) => {
  state.night = !state.night;
  document.body.classList.toggle("night", state.night);
  e.currentTarget.setAttribute("aria-pressed", state.night);
  e.currentTarget.textContent = state.night ? "切換白天" : "切換夜晚";
});
$("#btn-tech").addEventListener("click", () => ($("#tech").hidden = false));
$("#tech-close").addEventListener("click", () => ($("#tech").hidden = true));
$("#tech").addEventListener("click", (e) => e.target === e.currentTarget && ($("#tech").hidden = true));
addEventListener("keydown", (e) => e.key === "Escape" && ($("#tech").hidden = true));

// ---------- 迴圈 ----------
const clock = new THREE.Clock();
let statusTimer = 0;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  state.nightK += ((state.night ? 1 : 0) - state.nightK) * Math.min(1, dt * 3);

  // 畫布大小跟著視窗
  const w = canvas.clientWidth,
    h = canvas.clientHeight;
  const pr = renderer.getPixelRatio();
  if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) renderer.setSize(w, h, false);

  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setScissorTest(true);

  statusTimer -= dt;
  const showStatus = statusTimer <= 0;
  if (showStatus) statusTimer = 0.25;

  for (const c of cards) {
    const r = c.view.getBoundingClientRect();
    // 不在畫面上的卡片不更新也不繪製
    if (r.bottom < 0 || r.top > h || r.right < 0 || r.left > w) continue;
    c.actor.world.night = state.nightK;
    c.actor.update(dt, t, { dance: state.dance });
    c.particles.update(dt);
    c.stage.update(t, state.nightK);
    if (showStatus) c.status.textContent = c.actor.status;

    const bottom = h - r.bottom;
    renderer.setViewport(r.left, bottom, r.width, r.height);
    renderer.setScissor(r.left, bottom, r.width, r.height);
    c.stage.camera.aspect = r.width / r.height;
    c.stage.camera.updateProjectionMatrix();
    renderer.render(c.stage.scene, c.stage.camera);
  }
});

setTimeout(() => $("#loading").classList.add("is-done"), 300);
