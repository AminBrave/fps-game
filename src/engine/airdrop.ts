import * as THREE from 'three';
import { soundEngine } from './audio';

export interface AirdropInstance {
  id: string;
  crateGroup: THREE.Group;
  parachuteGroup: THREE.Group;
  smokeParticles: THREE.Points;
  particleGeo: THREE.BufferGeometry;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  landed: boolean;
  opened: boolean;
  flareTimer: number;
}

export class AirdropManager {
  private scene: THREE.Scene;
  public airdrops: AirdropInstance[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public spawnAirdrop(x: number, z: number, startY: number = 28): AirdropInstance {
    const root = new THREE.Group();
    root.position.set(x, startY, z);

    // Military Crate (Olive Drab with stenciled details)
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0x3d4a36,
      roughness: 0.6,
      metalness: 0.3,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1b201a,
      roughness: 0.5,
      metalness: 0.8,
    });

    const crateGroup = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.2), crateMat);
    body.castShadow = true;
    body.receiveShadow = true;
    crateGroup.add(body);

    // Metal reinforcement corners
    const corner1 = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.12, 1.25), frameMat);
    corner1.position.y = 0.42;
    crateGroup.add(corner1);
    const corner2 = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.12, 1.25), frameMat);
    corner2.position.y = -0.42;
    crateGroup.add(corner2);

    // Parachute Assembly
    const parachuteGroup = new THREE.Group();
    parachuteGroup.position.set(0, 3.2, 0);

    const chuteMat = new THREE.MeshStandardMaterial({
      color: 0xdf8a28,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), chuteMat);
    canopy.position.y = 1.0;
    parachuteGroup.add(canopy);

    // Parachute lines
    const lineMat = new THREE.LineBasicMaterial({ color: 0xcccccc });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const lx = Math.cos(angle) * 2.2;
      const lz = Math.sin(angle) * 2.2;
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -2.6, 0),
        new THREE.Vector3(lx, 1.0, lz),
      ]);
      const line = new THREE.Line(lineGeo, lineMat);
      parachuteGroup.add(line);
    }
    crateGroup.add(parachuteGroup);

    // Tactical Signal Smoke Flare (Bright Green/Orange billow)
    const particleCount = 40;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3 + 0] = (Math.random() - 0.5) * 0.4;
      particlePositions[i * 3 + 1] = 0.5 + Math.random() * 2.5;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const smokeMat = new THREE.PointsMaterial({
      color: 0x22ee77,
      size: 0.55,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const smokeParticles = new THREE.Points(particleGeo, smokeMat);
    crateGroup.add(smokeParticles);

    this.scene.add(crateGroup);

    const instance: AirdropInstance = {
      id: `airdrop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      crateGroup,
      parachuteGroup,
      smokeParticles,
      particleGeo,
      position: new THREE.Vector3(x, startY, z),
      velocity: new THREE.Vector3(0, -4.2, 0),
      landed: false,
      opened: false,
      flareTimer: 0,
    };

    soundEngine.playAirdropSiren();
    this.airdrops.push(instance);
    return instance;
  }

  public update(dt: number) {
    for (const drop of this.airdrops) {
      if (!drop.landed) {
        drop.position.y += drop.velocity.y * dt;

        // Subtle wind drift
        drop.position.x += Math.sin(Date.now() * 0.002) * 0.2 * dt;
        drop.position.z += Math.cos(Date.now() * 0.002) * 0.2 * dt;

        drop.crateGroup.position.copy(drop.position);

        // Ground contact (landed on warehouse floor or cover)
        if (drop.position.y <= 0.45) {
          drop.position.y = 0.45;
          drop.landed = true;
          drop.crateGroup.position.copy(drop.position);

          // Fold parachute
          drop.parachuteGroup.visible = false;
          soundEngine.playDestructionSound(1.2);
        }
      }

      // Animate billowing smoke signal flare
      drop.flareTimer += dt;
      const positions = drop.particleGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] += 2.0 * dt;
        positions[i * 3 + 0] += Math.sin(drop.flareTimer * 2 + i) * 0.4 * dt;
        positions[i * 3 + 2] += Math.cos(drop.flareTimer * 2 + i) * 0.4 * dt;

        // Loop smoke upwards
        if (positions[i * 3 + 1] > 6.0) {
          positions[i * 3 + 1] = 0.5;
          positions[i * 3 + 0] = (Math.random() - 0.5) * 0.3;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
        }
      }
      drop.particleGeo.attributes.position.needsUpdate = true;
    }
  }

  public checkInteraction(playerPos: THREE.Vector3): AirdropInstance | null {
    for (const drop of this.airdrops) {
      if (drop.landed && !drop.opened) {
        const dist = drop.position.distanceTo(playerPos);
        if (dist <= 2.2) {
          drop.opened = true;
          // Change smoke flare to gold loot color
          (drop.smokeParticles.material as THREE.PointsMaterial).color.setHex(0xffcc00);
          soundEngine.playReloadSound();
          return drop;
        }
      }
    }
    return null;
  }
}
