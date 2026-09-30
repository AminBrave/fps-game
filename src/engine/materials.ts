/**
 * BreachPoint Tactical Material Registry & Structural Physics
 * Real-world material densities, hardness ratings, and cumulative degradation thresholds.
 */

export interface MaterialProperties {
  id: number;
  name: string;
  density: number;          // kg/m^3 (Mass density)
  hardness: number;         // Mohs / relative ballistic resistance index (1.0 to 10.0)
  elasticity: number;       // Deflection & bounce coefficient (0.0 to 1.0)
  durability: number;       // Joules of kinetic damage absorbed before voxel structural failure
  color: number;            // Three.js hex color
  soundType: 'concrete' | 'metal' | 'wood' | 'glass' | 'sand' | 'brick';
  sparkColor: number;
  penetrable: boolean;
}

export const MATERIAL_TYPES = {
  AIR: 0,
  CONCRETE: 1,
  WOOD: 2,
  METAL: 3,
  BRICK: 4,
  GLASS: 5,
  SANDBAG: 6,
  ARMOR_STEEL: 7,
} as const;

export const MATERIAL_REGISTRY: Record<number, MaterialProperties> = {
  [MATERIAL_TYPES.AIR]: {
    id: 0,
    name: 'Air',
    density: 1.2,
    hardness: 0.0,
    elasticity: 0.0,
    durability: 0,
    color: 0x000000,
    soundType: 'concrete',
    sparkColor: 0x000000,
    penetrable: true,
  },
  [MATERIAL_TYPES.CONCRETE]: {
    id: 1,
    name: 'Reinforced Concrete',
    density: 2400,        // 2,400 kg/m³
    hardness: 6.5,
    elasticity: 0.25,
    durability: 2800,     // Requires multiple rifle rounds to breach
    color: 0x82888f,
    soundType: 'concrete',
    sparkColor: 0xffddaa,
    penetrable: true,
  },
  [MATERIAL_TYPES.WOOD]: {
    id: 2,
    name: 'Treated Plywood & Timber',
    density: 650,         // 650 kg/m³
    hardness: 2.2,
    elasticity: 0.15,
    durability: 750,      // Easily penetrated by AR/marksman rounds
    color: 0x8a6240,
    soundType: 'wood',
    sparkColor: 0x997755,
    penetrable: true,
  },
  [MATERIAL_TYPES.METAL]: {
    id: 3,
    name: 'Corrugated Sheet Metal',
    density: 7850,        // 7,850 kg/m³
    hardness: 5.2,
    elasticity: 0.45,
    durability: 1900,
    color: 0x3a424a,
    soundType: 'metal',
    sparkColor: 0xffea77,
    penetrable: true,
  },
  [MATERIAL_TYPES.BRICK]: {
    id: 4,
    name: 'Masonry Kiln Brick',
    density: 1920,        // 1,920 kg/m³
    hardness: 5.8,
    elasticity: 0.2,
    durability: 2100,
    color: 0x944a3d,
    soundType: 'brick',
    sparkColor: 0xffaa66,
    penetrable: true,
  },
  [MATERIAL_TYPES.GLASS]: {
    id: 5,
    name: 'Reinforced Safety Glass',
    density: 2500,        // 2,500 kg/m³
    hardness: 5.5,
    elasticity: 0.1,
    durability: 250,      // Shatters on single bullet hit
    color: 0x66aacc,
    soundType: 'glass',
    sparkColor: 0xaaddff,
    penetrable: true,
  },
  [MATERIAL_TYPES.SANDBAG]: {
    id: 6,
    name: 'Ballistic Sandbag Barrier',
    density: 1600,        // 1,600 kg/m³
    hardness: 3.0,
    elasticity: 0.05,     // Absorbs kinetic energy rapidly without ricochet
    durability: 3200,
    color: 0x9c8a62,
    soundType: 'sand',
    sparkColor: 0xcca872,
    penetrable: true,
  },
  [MATERIAL_TYPES.ARMOR_STEEL]: {
    id: 7,
    name: 'Hardened Armor Steel Plate',
    density: 7900,
    hardness: 8.8,
    elasticity: 0.65,     // High ricochet probability
    durability: 6500,
    color: 0x22262a,
    soundType: 'metal',
    sparkColor: 0xffffff,
    penetrable: false,
  },
};

/**
 * Tracks cumulative structural degradation per micro-voxel block.
 * When a voxel absorbs damage surpassing its durability threshold,
 * its structural integrity fails and it collapses or allows free penetration.
 */
export class StructuralDegradationTracker {
  private damageMap: Map<string, number> = new Map();

  private key(vx: number, vy: number, vz: number): string {
    return `${vx},${vy},${vz}`;
  }

  /**
   * Applies damage to a voxel and returns whether the voxel was structurally breached.
   */
  public applyDamage(
    vx: number,
    vy: number,
    vz: number,
    materialId: number,
    damageJoules: number
  ): { breached: boolean; remainingDurabilityRatio: number } {
    const mat = MATERIAL_REGISTRY[materialId] || MATERIAL_REGISTRY[MATERIAL_TYPES.CONCRETE];
    if (mat.durability <= 0) return { breached: true, remainingDurabilityRatio: 0 };

    const k = this.key(vx, vy, vz);
    const currentDamage = (this.damageMap.get(k) || 0) + damageJoules;
    this.damageMap.set(k, currentDamage);

    if (currentDamage >= mat.durability) {
      this.damageMap.delete(k);
      return { breached: true, remainingDurabilityRatio: 0 };
    }

    const remainingRatio = Math.max(0, 1 - currentDamage / mat.durability);
    return { breached: false, remainingDurabilityRatio: remainingRatio };
  }

  public getDamage(vx: number, vy: number, vz: number): number {
    return this.damageMap.get(this.key(vx, vy, vz)) || 0;
  }

  public reset() {
    this.damageMap.clear();
  }
}

export const structuralTracker = new StructuralDegradationTracker();
