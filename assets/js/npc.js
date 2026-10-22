// NPC 行為：簡單的狀態機（發呆 → 散步 → 發呆 → 偶爾做特殊動作），加上眨眼與東張西望
import * as THREE from "three";
import { WALK_RADIUS } from "./world.js";

const rand = (a, b) => a + Math.random() * (b - a);
const tmp = new THREE.Vector3();

export const STATUS = { idle: "發呆中", walk: "散步中", special: "", greet: "打招呼", dance: "跳舞中" };

export class NPC {
  constructor(def, world, particles) {
    this.def = def;
    this.world = world;
    this.particles = particles;
    this.char = def.create();
    this.root = this.char.root;
    this.seed = Math.random() * 10;
    this.state = "idle";
    this.timer = rand(0.5, 2.5);
    this.target = new THREE.Vector3();
    this.walkBlend = 0;
    this.walkPhase = 0;
    this.lookYaw = 0;
    this.lookTimer = rand(1, 3);
    this.blinkTimer = rand(1, 4);
    this.blinking = false;
    this.action = null;
    this.dancing = false;
    this.facing = null; // 打招呼時要面向的方向
    this.root.traverse((o) => (o.userData.npc = this));
    this.place();
  }

  place() {
    for (let i = 0; i < 50; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = rand(2.5, WALK_RADIUS);
      tmp.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      if (this.free(tmp, 0.6)) break;
    }
    this.root.position.x = tmp.x;
    this.root.position.z = tmp.z;
    this.root.rotation.y = Math.random() * Math.PI * 2;
  }

  free(p, margin = 0.5) {
    if (this.char.flies) return Math.hypot(p.x, p.z) < WALK_RADIUS + 1; // 會飛的不管障礙物
    if (Math.hypot(p.x, p.z) > WALK_RADIUS) return false;
    return this.world.obstacles.every((o) => Math.hypot(p.x - o.x, p.z - o.z) > o.r + margin);
  }

  get status() {
    if (this.action?.name === "special") return this.def.special + "中";
    if (this.dancing) return STATUS.dance;
    if (this.action) return STATUS[this.action.name];
    return STATUS[this.state];
  }

  // 在某個物件的世界座標噴粒子
  fx(object, opts) {
    object.getWorldPosition(tmp);
    this.particles.emit(tmp.clone(), opts);
  }

  play(name, dur) {
    this.action = { name, u: 0, dur };
    this.state = "idle";
  }

  greet(cameraPos) {
    this.facing = Math.atan2(cameraPos.x - this.root.position.x, cameraPos.z - this.root.position.z);
    this.play("greet", 2.2);
  }

  update(dt, t, { dance, others }) {
    const pos = this.root.position;
    let moving = false;
    this.dancing = dance && !this.action;

    if (this.action) {
      this.action.u += dt / this.action.dur;
      if (this.action.u >= 1) {
        this.action = null;
        this.facing = null;
        this.timer = rand(1, 3);
      }
    } else if (!dance) {
      this.timer -= dt;
      if (this.state === "idle" && this.timer <= 0) {
        if (Math.random() < 0.3) this.play("special", this.def.id === "wizard" ? 2.6 : 1.6);
        else this.pickTarget();
      } else if (this.state === "walk") {
        tmp.subVectors(this.target, pos).setY(0);
        const d = tmp.length();
        if (d < 0.15 || this.timer <= 0) {
          this.state = "idle";
          this.timer = rand(1.5, 4.5);
        } else {
          tmp.multiplyScalar(Math.min(d, this.def.speed * dt * (this.char.hops ? this.hopSpeed() : 1)) / d);
          const next = pos.clone().add(tmp);
          if (this.free(next, 0.3)) {
            pos.x = next.x;
            pos.z = next.z;
            moving = true;
            this.facing = Math.atan2(tmp.x, tmp.z);
          } else this.pickTarget();
        }
      }
    }

    // 角色之間保持距離
    if (!this.char.flies) {
      for (const o of others) {
        if (o === this || o.char.flies) continue;
        const dx = pos.x - o.root.position.x;
        const dz = pos.z - o.root.position.z;
        const d = Math.hypot(dx, dz);
        if (d > 0 && d < 1.1) {
          pos.x += (dx / d) * (1.1 - d) * 0.5;
          pos.z += (dz / d) * (1.1 - d) * 0.5;
        }
      }
    }

    // 轉向（取最短角度）
    const goal = this.dancing ? this.root.rotation.y + dt * 1.5 : this.facing;
    if (goal !== null) {
      let diff = goal - this.root.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.root.rotation.y += diff * Math.min(1, dt * (this.dancing ? 20 : 8));
    }

    this.walkBlend += ((moving ? 1 : 0) - this.walkBlend) * Math.min(1, dt * 8);
    if (moving || this.dancing) this.walkPhase += dt * (this.char.hops ? 5 : this.def.speed * 6.5);

    // 東張西望
    this.lookTimer -= dt;
    if (this.lookTimer <= 0) {
      this.lookYaw = this.state === "idle" && Math.random() < 0.7 ? rand(-0.7, 0.7) : 0;
      this.lookTimer = rand(1.2, 3.5);
    }
    if (moving || this.action) this.lookYaw = 0;

    // 眨眼
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinking = !this.blinking;
      this.blinkTimer = this.blinking ? 0.12 : rand(2, 5);
    }

    this.char.animate(this, t, dt);
  }

  // 史萊姆只在彈起時前進
  hopSpeed() {
    const u = (this.walkPhase / Math.PI) % 1;
    return u > 0.1 && u < 0.9 ? 1.6 : 0;
  }

  pickTarget() {
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = rand(1, 4.5);
      this.target.set(this.root.position.x + Math.cos(a) * r, 0, this.root.position.z + Math.sin(a) * r);
      if (this.free(this.target, 0.6)) break;
    }
    this.state = "walk";
    this.timer = 8;
  }
}
