/**
 * BreachPoint Tactical Ballistics & Real-World Material Penetration Engine
 * High-precision micro-step ray-marching utilizing real-world mass-density calculations,
 * kinetic energy decay, angle-of-incidence deflection, and cumulative structural degradation.
 */

import * as THREE from 'three';
import { VoxelEngine, VOXEL_SIZE, VOXEL_TYPES } from './voxelEngine';
import { MATERIAL_REGISTRY, structuralTracker, MaterialProperties, MATERIAL_TYPES } from './materials';
import { WeaponConfig } from './types';
import { BotManager, BotInstance } from './botAI';
import { WeaponFXManager } from './weaponFX';

export interface BallisticHitResult {
  hitType: 'none' | 'environment' | 'bot' | 'ricochet';
  penetrations: number;
  materialsPenetrated: string[];
  finalPoint: THREE.Vector3;
  wallbang: boolean;
  botHit: BotInstance | null;
  isHeadshot: boolean;
  damageDealt: number;
  remainingEnergyRatio: number;
}

export class BallisticsEngine {
  private voxelEngine: VoxelEngine;
  private weaponFX: WeaponFXManager;

  constructor(voxelEngine: VoxelEngine, weaponFX: WeaponFXManager) {
    this.voxelEngine = voxelEngine;
    this.weaponFX = weaponFX;
  }

  /**
   * Fires a physical projectile / micro-step ray-march from origin along direction.
   */
  public fireBullet(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    weapon: WeaponConfig,
    botManager: BotManager | null
  ): BallisticHitResult {
    const dir = direction.clone().normalize();
    const currPos = origin.clone();

    // 1. Caliber Ballistics & Kinetic Energy Parameters
    let bulletMassGrams = 4.0; // 5.56 NATO default
    let muzzleVelocity = weapon.bulletSpeed; // m/s

    if (weapon.category === 'SMG') {
      bulletMassGrams = 8.0; // 9x19mm Parabellum (heavier, slower)
    } else if (weapon.category === 'SNIPER') {
      bulletMassGrams = 12.8; // 7.92x57mm Mauser (heavy, high velocity)
    } else if (weapon.category === 'PISTOL') {
      bulletMassGrams = 21.0; // .50 Action Express (heavy slug)
    } else if (weapon.category === 'LAUNCHER') {
      bulletMassGrams = 2500.0; // High-explosive warhead
    }

    const bulletMassKg = bulletMassGrams / 1000.0;
    const initialEnergy = 0.5 * bulletMassKg * muzzleVelocity * muzzleVelocity;
    let currentEnergy = initialEnergy;

    // FMJ attachment penetration bonus
    const fmjBonus = weapon.attachments.barrel === 'extended_heavy' ? 0.35 : 0.0;

    // 2. Micro-Step Ray-Marching Loop
    const stepSize = 0.05; // 5cm micro-steps
    const maxRange = 120.0;
    let distTravelled = 0;

    let penetrations = 0;
    const materialsPenetrated: string[] = [];
    let insideMaterial = false;
    let lastSolidVoxelCoord: [number, number, number] | null = null;
    let hitBot: BotInstance | null = null;
    let isHeadshot = false;
    let isWallbang = false;

    // Launcher Rocket Instant Crater
    if (weapon.category === 'LAUNCHER') {
      const ray = new THREE.Ray(origin, dir);
      let closestDist = maxRange;
      let hitPoint = origin.clone().addScaledVector(dir, maxRange);

      // Check floor/walls
      for (let d = 0.5; d < maxRange; d += 0.25) {
        const testP = origin.clone().addScaledVector(dir, d);
        if (testP.y <= 0.1 || this.voxelEngine.getVoxelAtWorld(testP.x, testP.y, testP.z) !== VOXEL_TYPES.AIR) {
          closestDist = d;
          hitPoint = testP;
          break;
        }
      }

      this.voxelEngine.carveSphere(hitPoint.x, hitPoint.y, hitPoint.z, weapon.destructionRadius);
      this.weaponFX.spawnMaterialImpactFX(
        hitPoint,
        new THREE.Vector3(0, 1, 0),
        MATERIAL_REGISTRY[MATERIAL_TYPES.CONCRETE],
        false
      );

      // Splash damage to bots
      if (botManager) {
        for (const bot of botManager.bots) {
          if (bot.isDead) continue;
          const dToBot = bot.meshGroup.position.distanceTo(hitPoint);
          if (dToBot < weapon.destructionRadius * 1.5) {
            const splashDamage = weapon.damage * Math.max(0.2, 1 - dToBot / (weapon.destructionRadius * 1.5));
            botManager.damageBot(bot, splashDamage, false);
            hitBot = bot;
          }
        }
      }

      return {
        hitType: 'environment',
        penetrations: 1,
        materialsPenetrated: ['Explosive Breach'],
        finalPoint: hitPoint,
        wallbang: false,
        botHit: hitBot,
        isHeadshot: false,
        damageDealt: weapon.damage,
        remainingEnergyRatio: 0,
      };
    }

    // Step-by-step Ray March
    while (distTravelled < maxRange && currentEnergy > 5.0) {
      currPos.addScaledVector(dir, stepSize);
      distTravelled += stepSize;

      // Check ground plane collision
      if (currPos.y <= 0) {
        currPos.y = 0;
        this.weaponFX.spawnMaterialImpactFX(
          currPos,
          new THREE.Vector3(0, 1, 0),
          MATERIAL_REGISTRY[MATERIAL_TYPES.CONCRETE],
          true
        );
        break;
      }

      // Check Tactical Bots hitboxes
      if (botManager && !hitBot) {
        for (const bot of botManager.bots) {
          if (bot.isDead) continue;
          const botPos = bot.meshGroup.position;
          // Approximate bot as vertical capsule [botPos.y to botPos.y + 1.8]
          const dx = currPos.x - botPos.x;
          const dz = currPos.z - botPos.z;
          const horizDistSq = dx * dx + dz * dz;

          if (horizDistSq < 0.22 && currPos.y >= botPos.y && currPos.y <= botPos.y + 1.85) {
            hitBot = bot;
            isHeadshot = currPos.y >= botPos.y + 1.45;
            isWallbang = penetrations > 0;
            break;
          }
        }

        if (hitBot) {
          // Bullet struck bot!
          break;
        }
      }

      // Sample Voxel at current point
      const voxelType = this.voxelEngine.getVoxelAtWorld(currPos.x, currPos.y, currPos.z);

      if (voxelType !== VOXEL_TYPES.AIR) {
        const mat = MATERIAL_REGISTRY[voxelType] || MATERIAL_REGISTRY[MATERIAL_TYPES.CONCRETE];

        const vx = Math.floor(currPos.x / VOXEL_SIZE);
        const vy = Math.floor(currPos.y / VOXEL_SIZE);
        const vz = Math.floor(currPos.z / VOXEL_SIZE);

        // Check if just entering a solid material
        if (!insideMaterial) {
          insideMaterial = true;
          penetrations++;
          if (!materialsPenetrated.includes(mat.name)) {
            materialsPenetrated.push(mat.name);
          }

          // Compute surface normal for impact FX
          const normal = new THREE.Vector3(
            currPos.x - (vx + 0.5) * VOXEL_SIZE,
            currPos.y - (vy + 0.5) * VOXEL_SIZE,
            currPos.z - (vz + 0.5) * VOXEL_SIZE
          ).normalize();

          // Spawn entry impact FX
          this.weaponFX.spawnMaterialImpactFX(currPos, normal, mat, false);
        }

        lastSolidVoxelCoord = [vx, vy, vz];

        // Kinetic Energy Loss Formula:
        // dE = rho * hardness * dx * factor * (1 - fmjBonus)
        const energyLossRate = (mat.density * (mat.hardness / 5.0) * stepSize * 0.0035) * (1 - fmjBonus);
        const damageToApply = Math.min(currentEnergy, energyLossRate * 120);

        // Cumulative structural degradation
        const breachResult = structuralTracker.applyDamage(vx, vy, vz, voxelType, damageToApply);

        if (breachResult.breached) {
          // Voxel collapsed from sustained gunfire!
          this.voxelEngine.setVoxelAtWorld(currPos.x, currPos.y, currPos.z, VOXEL_TYPES.AIR);
          const chunk = this.voxelEngine.getOrCreateChunk(
            Math.floor(vx / 16),
            Math.floor(vy / 16),
            Math.floor(vz / 16)
          );
          this.voxelEngine.updateChunkMesh(chunk);
        }

        currentEnergy -= energyLossRate * 100;

        // If kinetic energy depleted within the material
        if (currentEnergy <= 5.0) {
          // Bullet lodged or ricocheted!
          const normal = new THREE.Vector3(
            (vx + 0.5) * VOXEL_SIZE - currPos.x,
            (vy + 0.5) * VOXEL_SIZE - currPos.y,
            (vz + 0.5) * VOXEL_SIZE - currPos.z
          ).normalize();

          this.weaponFX.spawnMaterialImpactFX(currPos, normal, mat, true);
          break;
        }

      } else {
        // Bullet is in AIR
        if (insideMaterial && lastSolidVoxelCoord) {
          // Just exited solid material -> Exit breach!
          insideMaterial = false;

          // Trajectory deflection upon exit:
          // Deflect slightly based on angle of incidence
          const deflectionAngle = (Math.random() - 0.5) * 0.08 * (1 - (fmjBonus * 0.5));
          dir.x += deflectionAngle;
          dir.z += (Math.random() - 0.5) * 0.06;
          dir.normalize();

          // Carve small bullet exit hole
          this.voxelEngine.carveSphere(currPos.x, currPos.y, currPos.z, weapon.destructionRadius * 0.85);
        }
      }
    }

    // 3. Compute Damage Dealt
    let damageDealt = 0;
    const remainingEnergyRatio = Math.max(0, currentEnergy / initialEnergy);

    if (hitBot && botManager) {
      // Calculate damage scaled by remaining kinetic energy
      const effectiveDamage = weapon.damage * Math.max(0.35, Math.sqrt(remainingEnergyRatio));
      damageDealt = isHeadshot ? effectiveDamage * weapon.headshotMultiplier : effectiveDamage;
      botManager.damageBot(hitBot, damageDealt, isHeadshot);
    }

    return {
      hitType: hitBot ? 'bot' : penetrations > 0 ? 'environment' : 'none',
      penetrations,
      materialsPenetrated,
      finalPoint: currPos,
      wallbang: isWallbang,
      botHit: hitBot,
      isHeadshot,
      damageDealt,
      remainingEnergyRatio,
    };
  }
}
