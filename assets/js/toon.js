// 卡通著色（toon shading）與描邊工具
import * as THREE from "three";

export const INK = 0x3b2618; // 描邊色：WordHero 的深咖啡

// 三階明暗的漸層貼圖，讓光影呈現色塊感而不是平滑漸層
const gradient = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
gradient.needsUpdate = true;

const cache = new Map();
export function toon(color, opts = {}) {
  const key = `${color}|${JSON.stringify(opts)}`;
  if (!cache.has(key)) cache.set(key, new THREE.MeshToonMaterial({ color, gradientMap: gradient, ...opts }));
  return cache.get(key);
}

// 描邊：用「反面放大」的同形網格（inverted hull），不需後製
const outlineMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const noRaycast = () => {};

export function part(geo, color, { outline = true, thickness = 1.07, shadow = true, ...opts } = {}) {
  const mesh = new THREE.Mesh(geo, typeof color === "object" ? color : toon(color, opts));
  mesh.castShadow = shadow;
  if (outline) {
    const hull = new THREE.Mesh(geo, outlineMat);
    hull.scale.setScalar(thickness);
    hull.raycast = noRaycast;
    mesh.add(hull);
  }
  return mesh;
}
