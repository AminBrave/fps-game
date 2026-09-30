/**
 * BreachPoint Weapon Visual & Audio FX Engine
 * Zero-GC Object Pools for Muzzle Flashes, Physical Brass Shell Ejections,
 * Smoke/Spark Particles, and Procedural Viewmodel Recoil Kickback.
 */

import * as THREE from 'three';
import { soundEngine } from './audio';
import { MaterialProperties } from './materials';

interface ShellCasing {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotVelocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
  bounced: boolean;
}

interface FXParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
  color: THREE.Color;
  initialScale: number;
}

export class WeaponFXManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  // 1. Dynamic Point-Light Muzzle Flash
  public muzzleLight: THREE.PointLight;
  private muzzleFlashTimer: number = 0;

  // 2. Physical Brass Shell Ejection Pool (Zero-GC)
  private shellPool: ShellCasing[] = [];
  private readonly MAX_SHELLS = 48;
  private shellGeometry: THREE.CylinderGeometry;
  private shellMaterial: THREE.MeshStandardMaterial;

  // 3. Spark & Smoke Impact Particle Pools (Zero-GC)
  private particlePool: FXParticle[] = [];
  private readonly MAX_PARTICLES = 160;
  private sparkGeometry: THREE.BoxGeometry;
  private sparkMaterial: THREE.MeshBasicMaterial;

  // 4. Viewmodel Procedural Recoil Spring
  public recoilOffset = new THREE.Vector3(0, 0, 0);
  public recoilRotation = new THREE.Euler(0, 0, 0);
  private recoilVel = new THREE.Vector3(0, 0, 0);
  private recoilRotVel = new THREE.Vector3(0, 0, 0);

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;

    // Initialize Dynamic Muzzle Flash Point-Light
    this.muzzleLight = new THREE.PointLight(0xffb84d, 0, 8.0, 1.8);
    this.muzzleLight.castShadow = false; // Fast real-time dynamic light
    this.scene.add(this.muzzleLight);

    // Initialize Brass Shell Pool
    this.shellGeometry = new THREE.CylinderGeometry(0.007, 0.007, 0.024, 8);
    this.shellMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Polished brass gold
      metalness: 0.95,
      roughness: 0.25,
    });

    for (let i = 0; i < this.MAX_SHELLS; i++) {
      const mesh = new THREE.Mesh(this.shellGeometry, this.shellMaterial);
      mesh.visible = false;
      this.scene.add(mesh);
      this.shellPool.push({
        mesh,
        velocity: new THREE.Vector3(),
        rotVelocity: new THREE.Vector3(),
        life: 0,
        maxLife: 3.5,
        active: false,
        bounced: false,
      });
    }

    // Initialize Impact & Muzzle Particle Pool
    this.sparkGeometry = new THREE.BoxGeometry(0.025, 0.025, 0.025);
    this.sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xffea77 });

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const mesh = new THREE.Mesh(this.sparkGeometry, this.sparkMaterial.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      this.particlePool.push({
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0.6,
        active: false,
        color: new THREE.Color(),
        initialScale: 1.0,
      });
    }
  }

  /**
   * Triggers realistic weapon firing effects:
   * Dynamic muzzle flash illumination, physical brass shell ejection,
   * muzzle sparks, and procedural recoil kickback.
   */
  public triggerMuzzleFX(
    muzzleWorldPos: THREE.Vector3,
    ejectionPos: THREE.Vector3,
    aimDir: THREE.Vector3,
    isSuppressed = false,
    kickIntensity = 1.0
  ) {
    // 1. Dynamic Point-Light Flash
    if (!isSuppressed) {
      this.muzzleLight.position.copy(muzzleWorldPos);
      this.muzzleLight.intensity = 4.5 * kickIntensity;
      this.muzzleFlashTimer = 0.05; // 50ms intense flash
    } else {
      this.muzzleLight.position.copy(muzzleWorldPos);
      this.muzzleLight.intensity = 0.8;
      this.muzzleFlashTimer = 0.025;
    }

    // 2. Physical Brass Shell Ejection
    this.ejectBrassShell(ejectionPos, aimDir);

    // 3. Muzzle Sparks & Gas Puffs
    const sparkCount = isSuppressed ? 3 : 8;
    for (let i = 0; i < sparkCount; i++) {
      this.spawnParticle(
        muzzleWorldPos,
        new THREE.Vector3(
          aimDir.x * (3.0 + Math.random() * 4.0) + (Math.random() - 0.5) * 1.5,
          aimDir.y * (3.0 + Math.random() * 4.0) + (Math.random() - 0.5) * 1.2,
          aimDir.z * (3.0 + Math.random() * 4.0) + (Math.random() - 0.5) * 1.5
        ),
        isSuppressed ? 0x999999 : 0xffaa33,
        0.18 + Math.random() * 0.15,
        0.8 + Math.random() * 0.5
      );
    }

    // 4. Viewmodel Procedural Recoil Kick
    this.recoilVel.z += 0.045 * kickIntensity;  // Backward slide kick
    this.recoilVel.y += 0.015 * kickIntensity;  // Upward muzzle rise
    this.recoilRotVel.x -= 0.08 * kickIntensity; // Pitch kick
    this.recoilRotVel.z += (Math.random() - 0.5) * 0.04 * kickIntensity; // Roll shudder
  }

  /**
   * Ejects a brass shell casing to the right and slightly upward.
   */
  private ejectBrassShell(ejectionPos: THREE.Vector3, aimDir: THREE.Vector3) {
    const shell = this.shellPool.find(s => !s.active);
    if (!shell) return;

    shell.active = true;
    shell.bounced = false;
    shell.life = 0;
    shell.mesh.position.copy(ejectionPos);
    shell.mesh.visible = true;

    // Right vector relative to aim direction
    const right = new THREE.Vector3(0, 1, 0).cross(aimDir).normalize().negate();
    const up = new THREE.Vector3(0, 1, 0);

    const speedRight = 1.6 + Math.random() * 0.8;
    const speedUp = 1.4 + Math.random() * 0.8;
    const speedBack = -0.4 + (Math.random() - 0.5) * 0.4;

    shell.velocity.set(
      right.x * speedRight + up.x * speedUp + aimDir.x * speedBack,
      right.y * speedRight + up.y * speedUp + aimDir.y * speedBack,
      right.z * speedRight + up.z * speedUp + aimDir.z * speedBack
    );

    // High angular spin
    shell.rotVelocity.set(
      (Math.random() - 0.5) * 35,
      (Math.random() - 0.5) * 35,
      (Math.random() - 0.5) * 35
    );
  }

  /**
   * Spawns material-specific impact FX (sparks on metal, splinters on wood, dust on concrete).
   */
  public spawnMaterialImpactFX(
    point: THREE.Vector3,
    normal: THREE.Vector3,
    material: MaterialProperties,
    isRicochet = false
  ) {
    const count = isRicochet ? 14 : 7;
    const sparkColor = isRicochet ? 0xffffff : material.sparkColor;

    for (let i = 0; i < count; i++) {
      // Reflect particles outward along surface normal
      const spread = 2.5;
      const speed = 2.0 + Math.random() * 4.5;
      const vel = new THREE.Vector3(
        normal.x * speed + (Math.random() - 0.5) * spread,
        normal.y * speed + (Math.random() - 0.5) * spread + 0.5,
        normal.z * speed + (Math.random() - 0.5) * spread
      );

      this.spawnParticle(
        point,
        vel,
        sparkColor,
        0.25 + Math.random() * 0.25,
        0.6 + Math.random() * 0.6
      );
    }

    // Audio cue
    soundEngine.playMaterialImpact(material.soundType, isRicochet);
  }

  private spawnParticle(
    pos: THREE.Vector3,
    velocity: THREE.Vector3,
    hexColor: number,
    maxLife: number,
    scale: number
  ) {
    const p = this.particlePool.find(item => !item.active);
    if (!p) return;

    p.active = true;
    p.life = 0;
    p.maxLife = maxLife;
    p.mesh.position.copy(pos);
    p.velocity.copy(velocity);
    p.initialScale = scale;
    p.mesh.scale.setScalar(scale);

    const mat = p.mesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(hexColor);
    p.mesh.visible = true;
  }

  /**
   * Updates all active shell physics, particles, and viewmodel spring recovery.
   */
  public update(dt: number) {
    // 1. Muzzle Flash Light Decay
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleLight.intensity = 0;
      }
    }

    // 2. Brass Shell Casing Physics
    const gravity = -14.0;
    for (const shell of this.shellPool) {
      if (!shell.active) continue;

      shell.life += dt;
      if (shell.life >= shell.maxLife) {
        shell.active = false;
        shell.mesh.visible = false;
        continue;
      }

      shell.velocity.y += gravity * dt;
      shell.mesh.position.x += shell.velocity.x * dt;
      shell.mesh.position.y += shell.velocity.y * dt;
      shell.mesh.position.z += shell.velocity.z * dt;

      shell.mesh.rotation.x += shell.rotVelocity.x * dt;
      shell.mesh.rotation.y += shell.rotVelocity.y * dt;
      shell.mesh.rotation.z += shell.rotVelocity.z * dt;

      // Floor bounce check (Killhouse floor is y=0)
      if (shell.mesh.position.y <= 0.015) {
        shell.mesh.position.y = 0.015;
        if (!shell.bounced) {
          shell.bounced = true;
          soundEngine.playShellClink();
        }
        shell.velocity.y = -shell.velocity.y * 0.35;
        shell.velocity.x *= 0.55;
        shell.velocity.z *= 0.55;
        shell.rotVelocity.multiplyScalar(0.4);

        if (Math.abs(shell.velocity.y) < 0.2) {
          shell.velocity.set(0, 0, 0);
          shell.rotVelocity.set(0, 0, 0);
        }
      }
    }

    // 3. Particles Update
    for (const p of this.particlePool) {
      if (!p.active) continue;

      p.life += dt;
      const progress = p.life / p.maxLife;
      if (progress >= 1.0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      p.velocity.y += -9.8 * dt * 0.5;
      p.mesh.position.addScaledVector(p.velocity, dt);

      // Shrink over lifetime
      const scale = p.initialScale * (1 - progress);
      p.mesh.scale.setScalar(scale);
    }

    // 4. Viewmodel Procedural Spring Recovery
    // Damped harmonic oscillator
    const springFreq = 22.0;
    const damping = 12.0;

    // Position spring
    this.recoilVel.x -= (this.recoilOffset.x * springFreq * springFreq + this.recoilVel.x * damping) * dt;
    this.recoilVel.y -= (this.recoilOffset.y * springFreq * springFreq + this.recoilVel.y * damping) * dt;
    this.recoilVel.z -= (this.recoilOffset.z * springFreq * springFreq + this.recoilVel.z * damping) * dt;
    this.recoilOffset.addScaledVector(this.recoilVel, dt);

    // Rotation spring
    this.recoilRotVel.x -= (this.recoilRotation.x * springFreq * springFreq + this.recoilRotVel.x * damping) * dt;
    this.recoilRotVel.y -= (this.recoilRotation.y * springFreq * springFreq + this.recoilRotVel.y * damping) * dt;
    this.recoilRotVel.z -= (this.recoilRotation.z * springFreq * springFreq + this.recoilRotVel.z * damping) * dt;
    this.recoilRotation.x += this.recoilRotVel.x * dt;
    this.recoilRotation.y += this.recoilRotVel.y * dt;
    this.recoilRotation.z += this.recoilRotVel.z * dt;
  }
}
