// 簡易粒子系統：預先建立一批小網格重複使用（物件池），避免一直新增刪除
import * as THREE from "three";

const GEO = {
  spark: new THREE.OctahedronGeometry(0.07, 0),
  coin: new THREE.CylinderGeometry(0.09, 0.09, 0.025, 14).rotateX(Math.PI / 2),
  leaf: new THREE.TetrahedronGeometry(0.07, 0),
};

export class Particles {
  constructor(scene, size = 240) {
    this.pool = [];
    for (let i = 0; i < size; i++) {
      const mesh = new THREE.Mesh(GEO.spark, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push({ mesh, vel: new THREE.Vector3(), life: 0, max: 1, gravity: 0, spin: 0 });
    }
    this.cursor = 0;
  }

  // 從 pos 噴出 count 顆粒子
  emit(pos, { count = 12, color = 0xffe27a, colors, speed = 1.5, up = 1.5, life = 0.9, gravity = 2, shape = "spark", size = 1, spread = 0.1, dir = null } = {}) {
    for (let i = 0; i < count; i++) {
      const p = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % this.pool.length;
      p.mesh.geometry = GEO[shape] || GEO.spark;
      p.mesh.material.color.set(colors ? colors[i % colors.length] : color);
      p.mesh.position.set(pos.x + (Math.random() - 0.5) * spread, pos.y + (Math.random() - 0.5) * spread, pos.z + (Math.random() - 0.5) * spread);
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * speed;
      p.vel.set(Math.cos(a) * r, up * (0.5 + Math.random() * 0.8), Math.sin(a) * r);
      if (dir) p.vel.add(dir); // 有方向的噴射（例如噴火）
      p.life = p.max = life * (0.7 + Math.random() * 0.6);
      p.gravity = gravity;
      p.spin = (Math.random() - 0.5) * 12;
      p.size = size * (0.6 + Math.random() * 0.6);
      p.mesh.visible = true;
    }
  }

  update(dt) {
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.y += p.spin * dt;
      p.mesh.rotation.x += p.spin * 0.5 * dt;
      const k = p.life / p.max;
      p.mesh.material.opacity = Math.min(1, k * 2);
      p.mesh.scale.setScalar(p.size * (0.4 + k * 0.6));
    }
  }
}
