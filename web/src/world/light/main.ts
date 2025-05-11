import * as THREE from "three";

const ambientLight = new THREE.AmbientLight(0x606060);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(1, 1.5, 1).normalize();

const initDefaultMainLights = ()=>{
  return [ambientLight, directionalLight];
}

export {initDefaultMainLights};