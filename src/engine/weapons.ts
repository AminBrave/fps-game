import * as THREE from 'three';
import { WeaponConfig } from './types';

export const WEAPON_REGISTRY: Record<string, WeaponConfig> = {
  m4a1: {
    id: 'm4a1',
    name: 'M4A1 Assault Rifle',
    category: 'AR',
    damage: 32,
    headshotMultiplier: 1.65,
    fireRateRPM: 800,
    automatic: true,
    magSize: 30,
    maxReserveAmmo: 180,
    reloadTime: 2.1,
    bulletSpeed: 910,
    penetrationPower: 3,
    destructionRadius: 0.35,
    recoilPitch: 0.024,
    recoilYawSpread: 0.012,
    recoilRecoveryRate: 14.0,
    adsFov: 55,
    adsSpeed: 0.22,
    sprintToFire: 0.18,
    attachments: {
      barrel: 'standard',
      optic: 'reflex_sight',
      grip: 'commando_foregrip',
      magazine: 'standard',
    },
  },
  mp5: {
    id: 'mp5',
    name: 'MP5 Submachine Gun',
    category: 'SMG',
    damage: 26,
    headshotMultiplier: 1.45,
    fireRateRPM: 900,
    automatic: true,
    magSize: 30,
    maxReserveAmmo: 210,
    reloadTime: 1.8,
    bulletSpeed: 400,
    penetrationPower: 2,
    destructionRadius: 0.28,
    recoilPitch: 0.018,
    recoilYawSpread: 0.018,
    recoilRecoveryRate: 16.0,
    adsFov: 60,
    adsSpeed: 0.16,
    sprintToFire: 0.12,
    attachments: {
      barrel: 'tactical_suppressor',
      optic: 'iron_sights',
      grip: 'stippled_grip',
      magazine: 'standard',
    },
  },
  kar98k: {
    id: 'kar98k',
    name: 'Kar98k Marksman Rifle',
    category: 'SNIPER',
    damage: 115,
    headshotMultiplier: 2.2,
    fireRateRPM: 48,
    automatic: false,
    magSize: 5,
    maxReserveAmmo: 40,
    reloadTime: 2.8,
    bulletSpeed: 1050,
    penetrationPower: 6,
    destructionRadius: 0.55,
    recoilPitch: 0.08,
    recoilYawSpread: 0.02,
    recoilRecoveryRate: 8.0,
    adsFov: 28,
    adsSpeed: 0.34,
    sprintToFire: 0.3,
    attachments: {
      barrel: 'extended_heavy',
      optic: 'variable_sniper_scope',
      grip: 'none',
      magazine: 'standard',
    },
  },
  deagle: {
    id: 'deagle',
    name: '.50 GS Hand Cannon',
    category: 'PISTOL',
    damage: 64,
    headshotMultiplier: 2.0,
    fireRateRPM: 260,
    automatic: false,
    magSize: 7,
    maxReserveAmmo: 35,
    reloadTime: 1.6,
    bulletSpeed: 520,
    penetrationPower: 4,
    destructionRadius: 0.38,
    recoilPitch: 0.065,
    recoilYawSpread: 0.025,
    recoilRecoveryRate: 11.0,
    adsFov: 65,
    adsSpeed: 0.14,
    sprintToFire: 0.1,
    attachments: {
      barrel: 'standard',
      optic: 'iron_sights',
      grip: 'stippled_grip',
      magazine: 'standard',
    },
  },
  rpg7: {
    id: 'rpg7',
    name: 'RPG-7 Rocket Launcher',
    category: 'LAUNCHER',
    damage: 180,
    headshotMultiplier: 1.0,
    fireRateRPM: 25,
    automatic: false,
    magSize: 1,
    maxReserveAmmo: 6,
    reloadTime: 3.5,
    bulletSpeed: 150,
    penetrationPower: 8,
    destructionRadius: 3.2, // Massive micro-voxel crater
    recoilPitch: 0.09,
    recoilYawSpread: 0.03,
    recoilRecoveryRate: 6.0,
    adsFov: 58,
    adsSpeed: 0.38,
    sprintToFire: 0.35,
    attachments: {
      barrel: 'standard',
      optic: 'iron_sights',
      grip: 'none',
      magazine: 'standard',
    },
  },
};

/**
 * Creates high-detail procedural 3D weapon meshes using Three.js PBR materials.
 * Supports customizable camos, attachments, and first-person vs turntable positioning.
 */
export function createWeaponMesh(
  config: WeaponConfig,
  camo: 'factory' | 'urban_digital' | 'od_green' | 'carbon_fiber' | 'desert_splinter' | 'gold_damascus' = 'factory',
  isTurntable = false
): THREE.Group {
  const root = new THREE.Group();
  root.name = `weapon_${config.id}`;

  // Dynamic Camo PBR Material
  let camoColor = 0x1f2326;
  let camoRoughness = 0.45;
  let camoMetalness = 0.85;

  if (camo === 'urban_digital') {
    camoColor = 0x4a5568;
    camoRoughness = 0.6;
    camoMetalness = 0.3;
  } else if (camo === 'od_green') {
    camoColor = 0x39482d;
    camoRoughness = 0.65;
    camoMetalness = 0.2;
  } else if (camo === 'carbon_fiber') {
    camoColor = 0x151618;
    camoRoughness = 0.35;
    camoMetalness = 0.7;
  } else if (camo === 'desert_splinter') {
    camoColor = 0x8a7755;
    camoRoughness = 0.7;
    camoMetalness = 0.2;
  } else if (camo === 'gold_damascus') {
    camoColor = 0xd4af37;
    camoRoughness = 0.2;
    camoMetalness = 0.95;
  }

  const primaryMat = new THREE.MeshStandardMaterial({
    color: camoColor,
    roughness: camoRoughness,
    metalness: camoMetalness,
  });

  const gunMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1a1d20,
    roughness: 0.45,
    metalness: 0.88,
  });

  const darkPolymerMat = new THREE.MeshStandardMaterial({
    color: 0x121416,
    roughness: 0.8,
    metalness: 0.1,
  });

  const tanTacticalMat = new THREE.MeshStandardMaterial({
    color: 0x7c735d,
    roughness: 0.7,
    metalness: 0.2,
  });

  const redDotGlassMat = new THREE.MeshBasicMaterial({
    color: 0xff0044,
  });

  if (config.category === 'AR') {
    // M4A1
    // Lower & Upper Receiver (uses primary camo material)
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.09, 0.32), primaryMat);
    receiver.position.set(0, 0, 0);
    receiver.castShadow = true;
    root.add(receiver);

    // Handguard / Rail system
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.07, 0.28), tanTacticalMat);
    handguard.position.set(0, 0.005, -0.28);
    handguard.castShadow = true;
    root.add(handguard);

    // Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 12), gunMetalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, -0.48);
    barrel.castShadow = true;
    root.add(barrel);

    // Flash hider / Muzzle / Suppressor based on attachment
    const isSuppressed = config.attachments.barrel === 'tactical_suppressor';
    const muzzle = new THREE.Mesh(
      isSuppressed
        ? new THREE.CylinderGeometry(0.022, 0.022, 0.22, 14)
        : new THREE.CylinderGeometry(0.016, 0.014, 0.06, 12),
      gunMetalMat
    );
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.01, isSuppressed ? -0.66 : -0.6);
    muzzle.castShadow = true;
    root.add(muzzle);

    // Pistol grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.13, 0.05), darkPolymerMat);
    grip.position.set(0, -0.1, 0.08);
    grip.rotation.x = -0.35;
    grip.castShadow = true;
    root.add(grip);

    // Curved Stanag Magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.17, 0.07), gunMetalMat);
    mag.position.set(0, -0.11, -0.05);
    mag.rotation.x = 0.15;
    mag.castShadow = true;
    root.add(mag);

    // Buffer tube & Stock
    const bufferTube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.2, 12), gunMetalMat);
    bufferTube.rotation.x = Math.PI / 2;
    bufferTube.position.set(0, 0.02, 0.22);
    root.add(bufferTube);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.11, 0.14), tanTacticalMat);
    stock.position.set(0, -0.01, 0.28);
    stock.castShadow = true;
    root.add(stock);

    // Optic System (reflex / iron / sniper)
    if (config.attachments.optic === 'reflex_sight') {
      const opticBase = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.02, 0.09), darkPolymerMat);
      opticBase.position.set(0, 0.055, -0.06);
      root.add(opticBase);

      const opticHood = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.045, 0.05), gunMetalMat);
      opticHood.position.set(0, 0.08, -0.06);
      root.add(opticHood);

      const reticle = new THREE.Mesh(new THREE.RingGeometry(0.003, 0.006, 12), redDotGlassMat);
      reticle.position.set(0, 0.08, -0.075);
      root.add(reticle);
    } else if (config.attachments.optic === 'variable_sniper_scope') {
      const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 14), darkPolymerMat);
      scopeTube.rotation.x = Math.PI / 2;
      scopeTube.position.set(0, 0.075, -0.06);
      root.add(scopeTube);
    }

    // Foregrip
    if (config.attachments.grip !== 'none') {
      const foregrip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.014, 0.08, 10), darkPolymerMat);
      foregrip.position.set(0, -0.065, -0.26);
      foregrip.rotation.x = 0.15;
      root.add(foregrip);
    }

  } else if (config.category === 'SMG') {
    // MP5
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.07, 0.26), primaryMat);
    receiver.castShadow = true;
    root.add(receiver);

    const handguard = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.18, 12), darkPolymerMat);
    handguard.rotation.x = Math.PI / 2;
    handguard.position.set(0, -0.005, -0.2);
    handguard.castShadow = true;
    root.add(handguard);

    const suppressor = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.22, 16), darkPolymerMat);
    suppressor.rotation.x = Math.PI / 2;
    suppressor.position.set(0, 0.005, -0.38);
    suppressor.castShadow = true;
    root.add(suppressor);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.19, 0.045), gunMetalMat);
    mag.position.set(0, -0.11, -0.06);
    mag.rotation.x = 0.22;
    mag.castShadow = true;
    root.add(mag);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, 0.045), darkPolymerMat);
    grip.position.set(0, -0.09, 0.07);
    grip.rotation.x = -0.32;
    grip.castShadow = true;
    root.add(grip);

    const stockRail = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.015, 0.22), gunMetalMat);
    stockRail.position.set(0, 0.01, 0.2);
    root.add(stockRail);

  } else if (config.category === 'SNIPER') {
    // Kar98k
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.06, 0.65), primaryMat);
    chassis.position.set(0, -0.02, 0.05);
    chassis.castShadow = true;
    root.add(chassis);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.62, 12), gunMetalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.48);
    barrel.castShadow = true;
    root.add(barrel);

    const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.12), gunMetalMat);
    bolt.position.set(0.01, 0.03, -0.02);
    root.add(bolt);

    const boltHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.05, 8), gunMetalMat);
    boltHandle.rotation.z = Math.PI / 2.5;
    boltHandle.position.set(0.04, 0.03, -0.02);
    root.add(boltHandle);

    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 16), darkPolymerMat);
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 0.08, -0.08);
    scopeTube.castShadow = true;
    root.add(scopeTube);

    const scopeLens = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.02, 0.04, 16), gunMetalMat);
    scopeLens.rotation.x = Math.PI / 2;
    scopeLens.position.set(0, 0.08, -0.22);
    root.add(scopeLens);

  } else if (config.category === 'PISTOL') {
    // Desert Eagle
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.055, 0.22), primaryMat);
    slide.position.set(0, 0.03, -0.04);
    slide.castShadow = true;
    root.add(slide);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.2), darkPolymerMat);
    frame.position.set(0, -0.01, -0.03);
    frame.castShadow = true;
    root.add(frame);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.13, 0.06), darkPolymerMat);
    grip.position.set(0, -0.09, 0.04);
    grip.rotation.x = -0.3;
    grip.castShadow = true;
    root.add(grip);

  } else {
    // RPG-7
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.85, 16), primaryMat);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0.02, 0);
    tube.castShadow = true;
    root.add(tube);

    const warhead = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.25, 16), tanTacticalMat);
    warhead.rotation.x = -Math.PI / 2;
    warhead.position.set(0, 0.02, -0.52);
    warhead.castShadow = true;
    root.add(warhead);
  }

  // Positioning
  if (isTurntable) {
    root.position.set(0, 0, 0);
    root.scale.setScalar(1.4);
  } else {
    root.position.set(0.24, -0.22, -0.42);
    root.scale.setScalar(1.0);
  }

  return root;
}

/**
 * Returns muzzle offset relative to weapon root group.
 */
export function getWeaponMuzzleOffset(config: WeaponConfig): THREE.Vector3 {
  if (config.category === 'AR') {
    return new THREE.Vector3(0, 0.01, config.attachments.barrel === 'tactical_suppressor' ? -0.78 : -0.64);
  } else if (config.category === 'SMG') {
    return new THREE.Vector3(0, 0.005, -0.5);
  } else if (config.category === 'SNIPER') {
    return new THREE.Vector3(0, 0.02, -0.8);
  } else if (config.category === 'PISTOL') {
    return new THREE.Vector3(0, 0.03, -0.16);
  } else {
    return new THREE.Vector3(0, 0.02, -0.66);
  }
}

/**
 * Returns brass shell ejection offset relative to weapon root group.
 */
export function getWeaponEjectionOffset(config: WeaponConfig): THREE.Vector3 {
  if (config.category === 'AR') {
    return new THREE.Vector3(0.028, 0.025, -0.04);
  } else if (config.category === 'SMG') {
    return new THREE.Vector3(0.024, 0.02, -0.03);
  } else if (config.category === 'SNIPER') {
    return new THREE.Vector3(0.025, 0.03, 0.0);
  } else if (config.category === 'PISTOL') {
    return new THREE.Vector3(0.022, 0.035, -0.05);
  } else {
    return new THREE.Vector3(0, 0, 0);
  }
}
