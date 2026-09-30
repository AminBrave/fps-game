export interface PlayerInput {
  seq: number;
  dt: number;
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  crouch: boolean;
  slide: boolean;
  tacSprint: boolean;
  ads: boolean;
  fire: boolean;
  reload: boolean;
  leanLeft: boolean;
  leanRight: boolean;
  yaw: number;
  pitch: number;
  weaponIndex: number;
}

export const STATE_FLAGS = {
  SPRINTING: 1 << 0,
  SLIDING: 1 << 1,
  JUMPING: 1 << 2,
  CROUCHING: 1 << 3,
  ADS: 1 << 4,
  FIRING: 1 << 5,
  DEAD: 1 << 6,
  LEANING_LEFT: 1 << 7,
  LEANING_RIGHT: 1 << 8,
} as const;

export interface PlayerState {
  id: string;
  name: string;
  isBot?: boolean;
  isLocal?: boolean;
  position: [number, number, number];
  velocity: [number, number, number];
  yaw: number;
  pitch: number;
  health: number;
  maxHealth: number;
  armor: number; // 0 to 150
  maxArmor: number;
  stateFlags: number;
  currentWeaponId: string;
  ammoInClip: number;
  reserveAmmo: number;
  kills: number;
  deaths: number;
  score: number;
  ping: number;
  lastDamageTimestamp?: number;
  team: 'spec_ops' | 'shadow_company';
}

export interface WeaponAttachmentConfig {
  barrel: 'standard' | 'tactical_suppressor' | 'extended_heavy';
  optic: 'iron_sights' | 'reflex_sight' | 'variable_sniper_scope';
  grip: 'none' | 'commando_foregrip' | 'stippled_grip';
  magazine: 'standard' | 'extended_drum';
}

export interface WeaponConfig {
  id: string;
  name: string;
  category: 'AR' | 'SMG' | 'SNIPER' | 'PISTOL' | 'LAUNCHER';
  damage: number;
  headshotMultiplier: number;
  fireRateRPM: number; // rounds per minute
  automatic: boolean;
  magSize: number;
  maxReserveAmmo: number;
  reloadTime: number; // seconds
  bulletSpeed: number; // m/s
  penetrationPower: number; // thickness in voxel blocks it cuts through
  destructionRadius: number; // meter radius for micro-voxel carving
  recoilPitch: number;
  recoilYawSpread: number;
  recoilRecoveryRate: number;
  adsFov: number; // degrees
  adsSpeed: number; // seconds
  sprintToFire: number; // seconds
  attachments: WeaponAttachmentConfig;
}

export interface VoxelDelta {
  x: number;
  y: number;
  z: number;
  radius: number;
  timestamp: number;
  sourcePlayerId?: string;
}

export interface AirdropState {
  id: string;
  position: [number, number, number];
  velocity: [number, number, number];
  landed: boolean;
  opened: boolean;
  smokeColor: string;
  flareIntensity: number;
}

export interface KillfeedEntry {
  id: string;
  killer: string;
  victim: string;
  weapon: string;
  headshot: boolean;
  wallbang: boolean;
  timestamp: number;
}

export interface HitmarkerEvent {
  id: string;
  type: 'body' | 'headshot' | 'kill' | 'armor_break';
  timestamp: number;
  damage: number;
  direction?: [number, number, number];
}

export interface GunshotRadarPing {
  id: string;
  x: number;
  z: number;
  timestamp: number;
  isHostile: boolean;
}

export interface LeaderboardRecord {
  id: string;
  name: string;
  elo: number;
  kills: number;
  deaths: number;
  kdRatio: number;
  matchesPlayed: number;
  wins: number;
  lastActive: string;
}
