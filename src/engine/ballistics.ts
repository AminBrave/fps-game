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
    const maxRange = 120;

    // FMJ attachment penetration bonus
    const fmjBonus = weapon.attachments.barrel === 'extended_heavy' ? 0.35 : 0.0;

    // 2. Amanatides-Woo voxel traversal. This visits crossed voxels instead of
    // sampling every 5cm, reducing long-range work from ~2400 probes to O(voxels).
    let penetrations = 0;
    const materialsPenetrated: string[] = [];
    let insideMaterial = false;
    let lastSolidVoxelCoord: [number, number, number] | null = null;
    let hitBot: BotInstance | null = null;
    let isHeadshot = false;
    let isWallbang = false;
    let distTravelled = 0;
    let currPos = origin.clone();

    const nearestBotHit = (): { bot: BotInstance; distance: number; headshot: boolean } | null => {
      if (!botManager) return null;
      let nearest: { bot: BotInstance; distance: number; headshot: boolean } | null = null;
      for (const bot of botManager.bots) {
        if (bot.isDead) continue;
        const center = bot.meshGroup.position.clone(); center.y += 0.9;
        const t = center.clone().sub(origin).dot(dir);
        if (t < 0 || t > maxRange) continue;
        const closest = origin.clone().addScaledVector(dir, t);
        if (closest.distanceToSquared(center) > 0.48 * 0.48) continue;
        if (!nearest || t < nearest.distance) {
          nearest = { bot, distance: t, headshot: closest.y >= bot.meshGroup.position.y + 1.45 };
        }
      }
      return nearest;
    };

    const botHit = nearestBotHit();
    const botDistance = botHit?.distance ?? Infinity;

    // Start at the voxel containing the muzzle and walk boundary-to-boundary.
    const startVoxel = this.voxelEngine.worldToVoxel(origin.x, origin.y, origin.z);
    let vx = startVoxel.cx * 16 + startVoxel.lx;
    let vy = startVoxel.cy * 16 + startVoxel.ly;
    let vz = startVoxel.cz * 16 + startVoxel.lz;
    const sx = dir.x >= 0 ? 1 : -1;
    const sy = dir.y >= 0 ? 1 : -1;
    const sz = dir.z >= 0 ? 1 : -1;
    const cell = VOXEL_SIZE;
    const nextBoundary = (v:number, d:number) => ((v + (d > 0 ? 1 : 0)) * cell - (d < 0 ? 0 : 0));
    const txDelta = Math.abs(cell / (dir.x || 1e-9));
    const tyDelta = Math.abs(cell / (dir.y || 1e-9));
    const tzDelta = Math.abs(cell / (dir.z || 1e-9));
    const wx0 = vx * cell, wy0 = vy * cell, wz0 = vz * cell;
    let tx = dir.x >= 0 ? (wx0 + cell - origin.x) / dir.x : (wx0 - origin.x) / dir.x;
    let ty = dir.y >= 0 ? (wy0 + cell - origin.y) / dir.y : (wy0 - origin.y) / dir.y;
    let tz = dir.z >= 0 ? (wz0 + cell - origin.z) / dir.z : (wz0 - origin.z) / dir.z;
    if (!Number.isFinite(tx)) tx = Infinity; if (!Number.isFinite(ty)) ty = Infinity; if (!Number.isFinite(tz)) tz = Infinity;

    while (distTravelled < maxRange && currentEnergy > 5 && distTravelled < botDistance) {
      const nextT = Math.min(tx, ty, tz, maxRange);
      const segment = Math.max(0, nextT - distTravelled);
      const center = new THREE.Vector3((vx + 0.5) * cell, (vy + 0.5) * cell, (vz + 0.5) * cell);
      const voxelType = this.voxelEngine.getVoxelAtWorld(center.x, center.y, center.z);

      if (voxelType !== VOXEL_TYPES.AIR) {
        const mat = MATERIAL_REGISTRY[voxelType] || MATERIAL_REGISTRY[MATERIAL_TYPES.CONCRETE];
        penetrations += insideMaterial ? 0 : 1;
        if (!insideMaterial && !materialsPenetrated.includes(mat.name)) materialsPenetrated.push(mat.name);
        if (!insideMaterial) {
          const entry = origin.clone().addScaledVector(dir, distTravelled);
          this.weaponFX.spawnMaterialImpactFX(entry, dir.clone().negate(), mat, false);
        }
        insideMaterial = true;
        lastSolidVoxelCoord = [vx, vy, vz];

        const energyLoss = mat.density * (mat.hardness / 5) * Math.max(segment, cell) * 0.0035 * (1 - fmjBonus);
        const damage = Math.min(currentEnergy, energyLoss * 120);
        const breach = structuralTracker.applyDamage(vx, vy, vz, voxelType, damage);
        if (breach.breached) {
          this.voxelEngine.setVoxelAtWorld(center.x, center.y, center.z, VOXEL_TYPES.AIR);
          const chunk = this.voxelEngine.getOrCreateChunk(Math.floor(vx / 16), Math.floor(vy / 16), Math.floor(vz / 16));
          this.voxelEngine.updateChunkMesh(chunk);
        }
        currentEnergy -= energyLoss;
        if (currentEnergy <= 5) {
          this.weaponFX.spawnMaterialImpactFX(origin.clone().addScaledVector(dir, distTravelled), dir.clone().negate(), mat, true);
          break;
        }
      } else if (insideMaterial && lastSolidVoxelCoord) {
        insideMaterial = false;
        const exit = origin.clone().addScaledVector(dir, distTravelled);
        this.voxelEngine.carveSphere(exit.x, exit.y, exit.z, weapon.destructionRadius * 0.35);
      }

      distTravelled = nextT;
      if (tx <= ty && tx <= tz) { vx += sx; tx += txDelta; }
      else if (ty <= tz) { vy += sy; ty += tyDelta; }
      else { vz += sz; tz += tzDelta; }
      currPos.copy(origin).addScaledVector(dir, distTravelled);
      if (currPos.y <= 0) { currPos.y = 0; break; }
    }

    if (botHit && botDistance <= distTravelled + 1e-4) {
      hitBot = botHit.bot;
      isHeadshot = botHit.headshot;
      isWallbang = penetrations > 0;
      distTravelled = botDistance;
      currPos.copy(origin).addScaledVector(dir, distTravelled);
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
