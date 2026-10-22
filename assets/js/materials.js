// 軟膠公仔質感：物理材質＋亮面塗層（clearcoat），搭配環境光反射
import * as THREE from "three";

export const METAL = { rough: 0.28, metal: 0.85, coat: 0.6 };
export const GOLD = { rough: 0.3, metal: 0.9, coat: 0.5 };
export const GLOSS = { rough: 0.2, coat: 1 };

const cache = new Map();
export function mat(color, { rough = 0.5, metal = 0, coat = 0.35, emissive = 0x000000, emissiveIntensity = 0, transparent = false, opacity = 1, side = THREE.FrontSide } = {}) {
  const key = [color, rough, metal, coat, emissive, emissiveIntensity, transparent, opacity, side].join("|");
  if (!cache.has(key)) {
    cache.set(
      key,
      new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: metal, clearcoat: coat, clearcoatRoughness: 0.35, emissive, emissiveIntensity, transparent, opacity, side }),
    );
  }
  return cache.get(key);
}

// 建立網格：預設會投射與接收陰影
export function m(geo, color, opts = {}) {
  const mesh = new THREE.Mesh(geo, mat(color, opts));
  mesh.castShadow = opts.shadow !== false;
  mesh.receiveShadow = opts.shadow !== false;
  return mesh;
}
