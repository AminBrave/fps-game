import * as THREE from 'three';
import { PlayerState, STATE_FLAGS } from './types';
import { soundEngine } from './audio';

export interface BotInstance {
  state: PlayerState;
  meshGroup: THREE.Group;
  weaponMesh: THREE.Group;
  targetPos: THREE.Vector3;
  patrolWaypoints: THREE.Vector3[];
  currentWaypointIdx: number;
  fireCooldown: number;
  burstCount: number;
  repositionTimer: number;
  isDead: boolean;
  respawnTimer: number;
  difficulty: 'recruit' | 'regular' | 'hardened' | 'veteran';
}

export class BotManager {
  private scene: THREE.Scene;
  public bots: BotInstance[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public clearBots() {
    for (const bot of this.bots) {
      this.scene.remove(bot.meshGroup);
    }
    this.bots = [];
  }

  public syncRoster(count: number, difficulty: 'recruit' | 'regular' | 'hardened' | 'veteran') {
    this.clearBots();
    if (count <= 0) return;

    const names = [
      'Shadow-01 (Viper)',
      'Shadow-02 (Specter)',
      'Shadow-03 (Brimstone)',
      'Shadow-04 (Apex)',
      'Shadow-05 (Reaper)',
      'Shadow-06 (Phantom)',
      'Shadow-07 (Wraith)',
      'Shadow-08 (Titan)',
    ];

    const spawnOffsets: [number, number][] = [
      [-12, -12],
      [14, 14],
      [-15, 12],
      [16, -14],
      [0, -18],
      [18, 0],
      [-18, 0],
      [0, 18],
    ];

    for (let i = 0; i < Math.min(count, 8); i++) {
      const offset = spawnOffsets[i % spawnOffsets.length];
      const bot = this.spawnBot(names[i], 'shadow_company', new THREE.Vector3(offset[0], 0, offset[1]));
      bot.difficulty = difficulty;
    }
  }

  public createBotMesh(team: 'spec_ops' | 'shadow_company'): { group: THREE.Group; weapon: THREE.Group } {
    const group = new THREE.Group();

    // Uniform & Armor palette
    const uniformColor = team === 'spec_ops' ? 0x2e3532 : 0x1d212a;
    const vestColor = team === 'spec_ops' ? 0x48514c : 0x15161c;

    const uniformMat = new THREE.MeshStandardMaterial({
      color: uniformColor,
      roughness: 0.8,
      metalness: 0.1,
    });
    const vestMat = new THREE.MeshStandardMaterial({
      color: vestColor,
      roughness: 0.6,
      metalness: 0.2,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xc89d7c,
      roughness: 0.7,
    });
    const helmetMat = new THREE.MeshStandardMaterial({
      color: 0x1a1e1b,
      roughness: 0.4,
      metalness: 0.5,
    });

    // Torso + Tactical Plate Carrier
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.65, 0.28), uniformMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    group.add(torso);

    const plateCarrier = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.48, 0.32), vestMat);
    plateCarrier.position.y = 1.1;
    group.add(plateCarrier);

    // Head + FAST Ballistic Helmet
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), skinMat);
    head.position.y = 1.55;
    group.add(head);

    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.3), helmetMat);
    helmet.position.y = 1.64;
    group.add(helmet);

    // Goggles / NVG mount
    const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.08), vestMat);
    goggles.position.set(0, 1.57, 0.14);
    group.add(goggles);

    // Legs
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.2), uniformMat);
    leftLeg.position.set(-0.14, 0.38, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.2), uniformMat);
    rightLeg.position.set(0.14, 0.38, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    // Weapon mesh held by bot
    const weaponGroup = new THREE.Group();
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x151618, roughness: 0.4, metalness: 0.8 });
    const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.5), gunMat);
    gunBody.position.set(0.22, 1.15, 0.35);
    weaponGroup.add(gunBody);
    group.add(weaponGroup);

    return { group, weapon: weaponGroup };
  }

  public spawnBot(name: string, team: 'spec_ops' | 'shadow_company', spawnPos: THREE.Vector3): BotInstance {
    const { group, weapon } = this.createBotMesh(team);
    group.position.copy(spawnPos);
    this.scene.add(group);

    // Create tactical patrol routes around warehouse and killhouse
    const waypoints: THREE.Vector3[] = [
      new THREE.Vector3(spawnPos.x, 0, spawnPos.z),
      new THREE.Vector3(spawnPos.x + (Math.random() - 0.5) * 16, 0, spawnPos.z + (Math.random() - 0.5) * 16),
      new THREE.Vector3(0, 0, (Math.random() - 0.5) * 8), // Center killhouse
      new THREE.Vector3((Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 20),
    ];

    const bot: BotInstance = {
      state: {
        id: `bot_${Math.random().toString(36).substring(2, 8)}`,
        name,
        isBot: true,
        isLocal: false,
        position: [spawnPos.x, spawnPos.y, spawnPos.z],
        velocity: [0, 0, 0],
        yaw: 0,
        pitch: 0,
        health: 100,
        maxHealth: 100,
        armor: 100, // 2 armor plates
        maxArmor: 150,
        stateFlags: 0,
        currentWeaponId: 'm4a1',
        ammoInClip: 30,
        reserveAmmo: 120,
        kills: 0,
        deaths: 0,
        score: 0,
        ping: Math.floor(12 + Math.random() * 15),
        team,
      },
      meshGroup: group,
      weaponMesh: weapon,
      targetPos: waypoints[1].clone(),
      patrolWaypoints: waypoints,
      currentWaypointIdx: 1,
      fireCooldown: 0.5 + Math.random() * 1.5,
      burstCount: 0,
      repositionTimer: 2.0 + Math.random() * 3.0,
      isDead: false,
      respawnTimer: 0,
      difficulty: 'regular',
    };

    this.bots.push(bot);
    return bot;
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    onBotFireBullet: (bot: BotInstance, targetPoint: THREE.Vector3) => void
  ) {
    for (const bot of this.bots) {
      if (bot.isDead) {
        bot.respawnTimer -= dt;
        if (bot.respawnTimer <= 0) {
          // Respawn
          bot.isDead = false;
          bot.state.health = 100;
          bot.state.armor = 100;
          bot.state.stateFlags &= ~STATE_FLAGS.DEAD;
          bot.meshGroup.visible = true;

          // Pick random safe perimeter spawn
          const rx = (Math.random() - 0.5) * 36;
          const rz = (Math.random() - 0.5) * 36;
          bot.meshGroup.position.set(rx, 0, rz);
          bot.state.position = [rx, 0, rz];
        }
        continue;
      }

      const botPos = bot.meshGroup.position;
      const distToPlayer = botPos.distanceTo(playerPos);

      // Detection range based on difficulty
      const detectionRange = bot.difficulty === 'veteran' ? 36 : bot.difficulty === 'hardened' ? 30 : 24;
      const canSeePlayer = distToPlayer < detectionRange && playerPos.y < 5;

      if (canSeePlayer) {
        // Face player
        const dx = playerPos.x - botPos.x;
        const dz = playerPos.z - botPos.z;
        const targetYaw = Math.atan2(dx, dz);
        const rotSpeed = bot.difficulty === 'veteran' ? 12.0 : 8.0;
        bot.state.yaw = THREE.MathUtils.lerp(bot.state.yaw, targetYaw, dt * rotSpeed);
        bot.meshGroup.rotation.y = bot.state.yaw;

        // Tactical combat movement
        if (distToPlayer > 18) {
          const moveSpeed = bot.difficulty === 'veteran' ? 5.8 : 5.0;
          botPos.x += Math.sin(bot.state.yaw) * moveSpeed * dt;
          botPos.z += Math.cos(bot.state.yaw) * moveSpeed * dt;
          bot.state.stateFlags |= STATE_FLAGS.SPRINTING;
        } else if (distToPlayer < 6) {
          const moveSpeed = 3.2;
          botPos.x -= Math.sin(bot.state.yaw) * moveSpeed * dt;
          botPos.z -= Math.cos(bot.state.yaw) * moveSpeed * dt;
          bot.state.stateFlags &= ~STATE_FLAGS.SPRINTING;
        } else {
          const strafeDir = Math.sin(Date.now() * 0.003 + bot.currentWaypointIdx) > 0 ? 1 : -1;
          const strafeSpeed = bot.difficulty === 'veteran' ? 3.0 : 2.2;
          botPos.x += Math.cos(bot.state.yaw) * strafeDir * strafeSpeed * dt;
          botPos.z -= Math.sin(bot.state.yaw) * strafeDir * strafeSpeed * dt;
        }

        // Firing logic
        bot.fireCooldown -= dt;
        if (bot.fireCooldown <= 0) {
          const maxBursts = bot.difficulty === 'veteran' ? 4 : 3;
          if (bot.burstCount < maxBursts) {
            // Accuracy spread tuned by difficulty
            const spread = bot.difficulty === 'veteran' ? 0.15 : bot.difficulty === 'hardened' ? 0.3 : 0.65;
            const aimPoint = playerPos.clone().add(new THREE.Vector3(
              (Math.random() - 0.5) * spread,
              1.2 + (Math.random() - 0.5) * (spread * 0.6),
              (Math.random() - 0.5) * spread
            ));

            onBotFireBullet(bot, aimPoint);
            soundEngine.playGunshot('AR', false);

            bot.burstCount++;
            bot.fireCooldown = 0.09;
          } else {
            bot.burstCount = 0;
            const pauseTime = bot.difficulty === 'veteran' ? 0.45 : bot.difficulty === 'hardened' ? 0.7 : 1.2;
            bot.fireCooldown = pauseTime + Math.random() * 0.5;
          }
        }
      } else {
        // Patrol behavior
        const waypoint = bot.patrolWaypoints[bot.currentWaypointIdx];
        const toWp = waypoint.clone().sub(botPos);
        toWp.y = 0;

        if (toWp.length() < 2.0) {
          bot.currentWaypointIdx = (bot.currentWaypointIdx + 1) % bot.patrolWaypoints.length;
        } else {
          const moveDir = toWp.normalize();
          const moveSpeed = 3.2;
          botPos.addScaledVector(moveDir, moveSpeed * dt);

          const targetYaw = Math.atan2(moveDir.x, moveDir.z);
          bot.state.yaw = THREE.MathUtils.lerp(bot.state.yaw, targetYaw, dt * 6.0);
          bot.meshGroup.rotation.y = bot.state.yaw;
        }
      }

      // Keep within bounds [-23, 23]
      botPos.x = Math.max(-22.5, Math.min(22.5, botPos.x));
      botPos.z = Math.max(-22.5, Math.min(22.5, botPos.z));
      bot.state.position = [botPos.x, botPos.y, botPos.z];
    }
  }

  public damageBot(bot: BotInstance, damage: number, isHeadshot: boolean): { isKill: boolean; armorBreak: boolean } {
    let armorBreak = false;
    const finalDamage = isHeadshot ? damage * 1.8 : damage;

    if (bot.state.armor > 0) {
      bot.state.armor -= finalDamage * 0.6;
      bot.state.health -= finalDamage * 0.4;
      if (bot.state.armor <= 0) {
        bot.state.armor = 0;
        armorBreak = true;
      }
    } else {
      bot.state.health -= finalDamage;
    }

    if (bot.state.health <= 0 && !bot.isDead) {
      bot.state.health = 0;
      bot.isDead = true;
      bot.state.stateFlags |= STATE_FLAGS.DEAD;
      bot.meshGroup.visible = false;
      bot.respawnTimer = 3.5;
      bot.state.deaths++;
      return { isKill: true, armorBreak };
    }

    return { isKill: false, armorBreak };
  }
}
