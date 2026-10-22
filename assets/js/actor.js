// 格子裡的角色控制：原地發呆 → 原地踏步（順便轉一圈展示側面與背面）→ 偶爾特殊動作
// 提供 characters.js 需要的狀態欄位（walkBlend、walkPhase、action…）
import * as THREE from "three";

const rand = (a, b) => a + Math.random() * (b - a);
const tmp = new THREE.Vector3();
const TAU = Math.PI * 2;

export class Actor {
  constructor(def, particles) {
    this.def = def;
    this.particles = particles;
    this.char = def.create();
    this.root = this.char.root;
    this.seed = Math.random() * 10;
    this.world = { night: 0 };
    this.state = "idle";
    this.timer = rand(1, 3);
    this.walkBlend = 0;
    this.walkPhase = 0;
    this.lookYaw = 0;
    this.lookTimer = rand(1, 3);
    this.blinkTimer = rand(1, 4);
    this.blinking = false;
    this.action = null;
    this.dancing = false;
    this.specialDur = def.specialDur ?? 1.6;
    this.hoverY = 0.75; // 會飛的角色在格子裡的飛行高度
  }

  get status() {
    if (this.action?.name === "special") return this.def.special + "中";
    if (this.action?.name === "greet") return "打招呼";
    if (this.dancing) return "跳舞中";
    return this.state === "walk" ? "踏步中" : "發呆中";
  }

  fx(object, opts) {
    object.getWorldPosition(tmp);
    this.particles.emit(tmp.clone(), opts);
  }

  play(name, dur = name === "special" ? this.specialDur : 2.2) {
    this.action = { name, u: 0, dur };
    this.state = "idle";
  }

  update(dt, t, { dance }) {
    this.dancing = dance && !this.action;
    let walking = false;

    if (this.action) {
      this.action.u += dt / this.action.dur;
      if (this.action.u >= 1) {
        this.action = null;
        this.timer = rand(1.5, 3);
      }
    } else if (!dance) {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.state === "walk") {
          this.state = "idle";
          this.timer = rand(2.5, 4.5);
        } else if (Math.random() < 0.35) this.play("special");
        else {
          this.state = "walk";
          this.timer = rand(3.5, 5);
        }
      }
      walking = this.state === "walk";
    }

    // 踏步時慢慢轉一圈；其他時候轉回正面
    const rot = this.root.rotation;
    if (walking) rot.y += dt * 1.3;
    else if (this.dancing) rot.y += dt * 2;
    else {
      const front = Math.round(rot.y / TAU) * TAU;
      rot.y += (front - rot.y) * Math.min(1, dt * 4);
    }

    this.walkBlend += ((walking ? 1 : 0) - this.walkBlend) * Math.min(1, dt * 8);
    if (walking || this.dancing) this.walkPhase += dt * (this.char.hops ? 5 : this.def.speed * 6.5);

    this.lookTimer -= dt;
    if (this.lookTimer <= 0) {
      this.lookYaw = Math.random() < 0.6 ? rand(-0.6, 0.6) : 0;
      this.lookTimer = rand(1.2, 3);
    }
    if (walking || this.action) this.lookYaw = 0;

    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinking = !this.blinking;
      this.blinkTimer = this.blinking ? 0.12 : rand(2, 5);
    }

    this.char.animate(this, t, dt);
  }
}
