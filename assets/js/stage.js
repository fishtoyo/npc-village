// 每張卡片的小舞台：參考設計圖，單色背景＋圓形底座，柔和的攝影棚打光
import * as THREE from "three";
import { m } from "./materials.js";

const BASE = { beige: 0xeadfce, blue: 0xc9d5e4 };
const DAY = { key: 2.4, fill: 0.7, rim: 1.2, hemi: 0.9, env: 0.55 };
const NIGHT = { key: 0.7, fill: 0.25, rim: 0.6, hemi: 0.35, env: 0.18 };

export function buildStage(def, envMap) {
  const scene = new THREE.Scene();
  scene.environment = envMap; // 環境光反射：讓金屬與亮面材質有公仔光澤
  scene.environmentIntensity = DAY.env;

  const hemi = new THREE.HemisphereLight(0xffffff, 0xd9cbb8, DAY.hemi);
  const key = new THREE.DirectionalLight(0xfff3e6, DAY.key);
  key.position.set(-2.5, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -1.6, right: 1.6, top: 2.6, bottom: -0.6, near: 1, far: 14 });
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.02;
  const fill = new THREE.DirectionalLight(0xdfe8ff, DAY.fill);
  fill.position.set(3, 2, 2);
  const rim = new THREE.DirectionalLight(0xffffff, DAY.rim);
  rim.position.set(0.5, 3, -4);
  scene.add(hemi, key, fill, rim);

  // 圓形底座
  const color = BASE[def.bg] ?? BASE.beige;
  const base = m(new THREE.CylinderGeometry(0.95, 0.98, 0.09, 72), color, { rough: 0.6, coat: 0.2 });
  base.position.y = -0.045;
  const edge = m(new THREE.TorusGeometry(0.95, 0.025, 10, 72), color, { rough: 0.6, coat: 0.2 });
  edge.rotation.x = Math.PI / 2;
  scene.add(base, edge);

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);

  return {
    scene,
    camera,
    // 依角色實際高度取景，讓大帽子、牛角都完整入鏡
    fit(object) {
      const box = new THREE.Box3().setFromObject(object);
      const h = Math.max(1.7, box.max.y + 0.12);
      const cy = h * 0.47;
      const dist = (h * 0.54) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      camera.position.set(0, cy + dist * 0.12, dist);
      camera.lookAt(0, cy, 0);
    },
    update(t, night) {
      key.intensity = THREE.MathUtils.lerp(DAY.key, NIGHT.key, night);
      fill.intensity = THREE.MathUtils.lerp(DAY.fill, NIGHT.fill, night);
      rim.intensity = THREE.MathUtils.lerp(DAY.rim, NIGHT.rim, night);
      hemi.intensity = THREE.MathUtils.lerp(DAY.hemi, NIGHT.hemi, night);
      scene.environmentIntensity = THREE.MathUtils.lerp(DAY.env, NIGHT.env, night);
    },
  };
}
