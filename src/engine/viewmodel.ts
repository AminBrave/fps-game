import * as THREE from 'three';

export interface ViewmodelRig {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  weaponRoot: THREE.Group | null;
}

export function createViewmodelRig(width: number, height: number): ViewmodelRig {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(82, width / height, 0.01, 12);
  camera.rotation.order = 'YXZ';
  scene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(0.5, 1, 1);
  scene.add(key);
  return { scene, camera, weaponRoot: null };
}

export function attachViewmodel(rig: ViewmodelRig, weapon: THREE.Group) {
  if (rig.weaponRoot) rig.scene.remove(rig.weaponRoot);
  rig.weaponRoot = weapon;
  rig.scene.add(weapon);
  weapon.renderOrder = 1000;
  weapon.traverse(o => {
    o.renderOrder = 1000;
    if (o instanceof THREE.Mesh) {
      o.frustumCulled = false;
      o.material.depthTest = true;
      o.material.depthWrite = true;
    }
  });
}

export function syncViewmodelCamera(rig: ViewmodelRig, mainCamera: THREE.PerspectiveCamera) {
  rig.camera.fov = mainCamera.fov;
  rig.camera.aspect = mainCamera.aspect;
  rig.camera.updateProjectionMatrix();
}

export function getSocketWorldPosition(
  socket: THREE.Object3D,
  mainCamera: THREE.Camera,
  target = new THREE.Vector3(),
) {
  socket.updateWorldMatrix(true, false);
  target.copy(socket.getWorldPosition(new THREE.Vector3()));
  return target.applyMatrix4(mainCamera.matrixWorld);
}

export function findMuzzleSocket(root: THREE.Object3D) {
  return root.getObjectByName('Muzzle_Socket') || root.getObjectByName('muzzleSocket') || null;
}
