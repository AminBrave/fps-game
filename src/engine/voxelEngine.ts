import * as THREE from 'three';
import { soundEngine } from './audio';

export const VOXEL_SIZE = 0.25; // 0.25m micro-voxel scale
export const CHUNK_SIZE = 16;   // 16x16x16 voxels = 4m x 4m x 4m per chunk

export const VOXEL_TYPES = {
  AIR: 0,
  CONCRETE: 1,
  WOOD: 2,
  METAL: 3,
  BRICK: 4,
} as const;

export type VoxelType = typeof VOXEL_TYPES[keyof typeof VOXEL_TYPES];

// Voxel PBR Palette Colors
const VOXEL_COLORS: Record<number, THREE.Color> = {
  [VOXEL_TYPES.CONCRETE]: new THREE.Color(0x82888f),
  [VOXEL_TYPES.WOOD]: new THREE.Color(0x8a6240),
  [VOXEL_TYPES.METAL]: new THREE.Color(0x3a424a),
  [VOXEL_TYPES.BRICK]: new THREE.Color(0x944a3d),
};

export interface DebrisParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotVelocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

export class VoxelChunk {
  public cx: number;
  public cy: number;
  public cz: number;
  public voxels: Uint8Array;
  public mesh: THREE.Mesh | null = null;
  public isDirty: boolean = true;
  public hasSolidVoxels: boolean = false;

  constructor(cx: number, cy: number, cz: number) {
    this.cx = cx;
    this.cy = cy;
    this.cz = cz;
    this.voxels = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE);
  }

  public getIndex(lx: number, ly: number, lz: number): number {
    return lx + ly * CHUNK_SIZE + lz * CHUNK_SIZE * CHUNK_SIZE;
  }

  public getVoxel(lx: number, ly: number, lz: number): number {
    if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE) {
      return VOXEL_TYPES.AIR;
    }
    return this.voxels[this.getIndex(lx, ly, lz)];
  }

  public setVoxel(lx: number, ly: number, lz: number, type: number): boolean {
    if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE) {
      return false;
    }
    const idx = this.getIndex(lx, ly, lz);
    if (this.voxels[idx] !== type) {
      this.voxels[idx] = type;
      this.isDirty = true;
      if (type !== VOXEL_TYPES.AIR) this.hasSolidVoxels = true;
      return true;
    }
    return false;
  }
}

export class VoxelEngine {
  public scene: THREE.Scene;
  public chunks: Map<string, VoxelChunk> = new Map();
  public material: THREE.MeshStandardMaterial;

  // Debris Object Pool
  private debrisPool: DebrisParticle[] = [];
  private readonly MAX_DEBRIS = 150;
  private debrisGeometry: THREE.BoxGeometry;
  private debrisMaterial: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.15,
      flatShading: true,
    });

    this.debrisGeometry = new THREE.BoxGeometry(VOXEL_SIZE * 0.9, VOXEL_SIZE * 0.9, VOXEL_SIZE * 0.9);
    this.debrisMaterial = new THREE.MeshStandardMaterial({
      color: 0x7a7e85,
      roughness: 0.9,
      metalness: 0.1,
    });

    this.initDebrisPool();
  }

  private initDebrisPool() {
    for (let i = 0; i < this.MAX_DEBRIS; i++) {
      const mesh = new THREE.Mesh(this.debrisGeometry, this.debrisMaterial);
      mesh.visible = false;
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.debrisPool.push({
        mesh,
        velocity: new THREE.Vector3(),
        rotVelocity: new THREE.Vector3(),
        life: 0,
        maxLife: 2.5,
        active: false,
      });
    }
  }

  public getChunkKey(cx: number, cy: number, cz: number): string {
    return `${cx},${cy},${cz}`;
  }

  public getOrCreateChunk(cx: number, cy: number, cz: number): VoxelChunk {
    const key = this.getChunkKey(cx, cy, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new VoxelChunk(cx, cy, cz);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  public worldToVoxel(wx: number, wy: number, wz: number): {
    cx: number; cy: number; cz: number;
    lx: number; ly: number; lz: number;
  } {
    const vx = Math.floor(wx / VOXEL_SIZE);
    const vy = Math.floor(wy / VOXEL_SIZE);
    const vz = Math.floor(wz / VOXEL_SIZE);

    const cx = Math.floor(vx / CHUNK_SIZE);
    const cy = Math.floor(vy / CHUNK_SIZE);
    const cz = Math.floor(vz / CHUNK_SIZE);

    let lx = vx % CHUNK_SIZE;
    let ly = vy % CHUNK_SIZE;
    let lz = vz % CHUNK_SIZE;
    if (lx < 0) lx += CHUNK_SIZE;
    if (ly < 0) ly += CHUNK_SIZE;
    if (lz < 0) lz += CHUNK_SIZE;

    return { cx, cy, cz, lx, ly, lz };
  }

  public getVoxelAtWorld(wx: number, wy: number, wz: number): number {
    const { cx, cy, cz, lx, ly, lz } = this.worldToVoxel(wx, wy, wz);
    const chunk = this.chunks.get(this.getChunkKey(cx, cy, cz));
    if (!chunk) return VOXEL_TYPES.AIR;
    return chunk.getVoxel(lx, ly, lz);
  }

  public setVoxelAtWorld(wx: number, wy: number, wz: number, type: number): boolean {
    const { cx, cy, cz, lx, ly, lz } = this.worldToVoxel(wx, wy, wz);
    const chunk = this.getOrCreateChunk(cx, cy, cz);
    return chunk.setVoxel(lx, ly, lz, type);
  }

  /**
   * Destructive Carving: Carves a sphere of radius r at (wx, wy, wz).
   * Spawns physical dislodged debris, triggers audio, and updates greedy mesh.
   */
  public carveSphere(wx: number, wy: number, wz: number, radiusMeters: number): number {
    const rVoxels = Math.ceil(radiusMeters / VOXEL_SIZE);
    const centerVx = Math.floor(wx / VOXEL_SIZE);
    const centerVy = Math.floor(wy / VOXEL_SIZE);
    const centerVz = Math.floor(wz / VOXEL_SIZE);

    let destroyedCount = 0;
    const modifiedChunks = new Set<VoxelChunk>();

    for (let dx = -rVoxels; dx <= rVoxels; dx++) {
      for (let dy = -rVoxels; dy <= rVoxels; dy++) {
        for (let dz = -rVoxels; dz <= rVoxels; dz++) {
          const distSq = (dx * dx + dy * dy + dz * dz) * (VOXEL_SIZE * VOXEL_SIZE);
          if (distSq <= radiusMeters * radiusMeters) {
            const vx = centerVx + dx;
            const vy = centerVy + dy;
            const vz = centerVz + dz;

            // Never carve floor foundation (y <= 0)
            if (vy <= 0) continue;

            const cx = Math.floor(vx / CHUNK_SIZE);
            const cy = Math.floor(vy / CHUNK_SIZE);
            const cz = Math.floor(vz / CHUNK_SIZE);
            let lx = vx % CHUNK_SIZE;
            let ly = vy % CHUNK_SIZE;
            let lz = vz % CHUNK_SIZE;
            if (lx < 0) lx += CHUNK_SIZE;
            if (ly < 0) ly += CHUNK_SIZE;
            if (lz < 0) lz += CHUNK_SIZE;

            const chunkKey = this.getChunkKey(cx, cy, cz);
            const chunk = this.chunks.get(chunkKey);
            if (chunk) {
              const currentType = chunk.getVoxel(lx, ly, lz);
              if (currentType !== VOXEL_TYPES.AIR) {
                chunk.setVoxel(lx, ly, lz, VOXEL_TYPES.AIR);
                modifiedChunks.add(chunk);
                destroyedCount++;

                // Spawn dislodged debris for outer edge voxels
                if (destroyedCount % 4 === 0) {
                  this.spawnDebris(
                    (vx + 0.5) * VOXEL_SIZE,
                    (vy + 0.5) * VOXEL_SIZE,
                    (vz + 0.5) * VOXEL_SIZE,
                    dx, dy, dz
                  );
                }
              }
            }
          }
        }
      }
    }

    if (destroyedCount > 0) {
      soundEngine.playDestructionSound(radiusMeters);
      for (const chunk of modifiedChunks) {
        this.updateChunkMesh(chunk);
      }
    }

    return destroyedCount;
  }

  private spawnDebris(x: number, y: number, z: number, dirX: number, dirY: number, dirZ: number) {
    const particle = this.debrisPool.find(p => !p.active);
    if (!particle) return;

    particle.active = true;
    particle.life = 0;
    particle.mesh.position.set(x, y, z);
    particle.mesh.visible = true;

    // Explosive impulse away from center
    const speed = 3.0 + Math.random() * 5.0;
    const len = Math.hypot(dirX, dirY, dirZ) || 1;
    particle.velocity.set(
      (dirX / len) * speed + (Math.random() - 0.5) * 2,
      (dirY / len) * speed + Math.random() * 3 + 1,
      (dirZ / len) * speed + (Math.random() - 0.5) * 2
    );

    particle.rotVelocity.set(
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 15
    );
  }

  public updateDebris(dt: number) {
    const gravity = -18.0;
    for (const p of this.debrisPool) {
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      p.velocity.y += gravity * dt;
      p.mesh.position.x += p.velocity.x * dt;
      p.mesh.position.y += p.velocity.y * dt;
      p.mesh.position.z += p.velocity.z * dt;

      p.mesh.rotation.x += p.rotVelocity.x * dt;
      p.mesh.rotation.y += p.rotVelocity.y * dt;
      p.mesh.rotation.z += p.rotVelocity.z * dt;

      // Simple ground bounce
      if (p.mesh.position.y <= VOXEL_SIZE * 0.5) {
        p.mesh.position.y = VOXEL_SIZE * 0.5;
        p.velocity.y = -p.velocity.y * 0.35;
        p.velocity.x *= 0.6;
        p.velocity.z *= 0.6;
      }
    }
  }

  /**
   * Greedy Meshing Implementation:
   * Merges contiguous identical voxel faces into minimal quad polygons.
   */
  public updateChunkMesh(chunk: VoxelChunk) {
    chunk.isDirty = false;

    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    let vertexCount = 0;

    const CHUNK = CHUNK_SIZE;
    const originX = chunk.cx * CHUNK * VOXEL_SIZE;
    const originY = chunk.cy * CHUNK * VOXEL_SIZE;
    const originZ = chunk.cz * CHUNK * VOXEL_SIZE;

    // Iterate 3 main axes: 0=X, 1=Y, 2=Z
    for (let d = 0; d < 3; d++) {
      const u = (d + 1) % 3;
      const v = (d + 2) % 3;

      const x = [0, 0, 0];
      const q = [0, 0, 0];
      q[d] = 1;

      // 2D mask slice
      const mask = new Int32Array(CHUNK * CHUNK);

      for (x[d] = -1; x[d] < CHUNK;) {
        let n = 0;
        for (x[v] = 0; x[v] < CHUNK; x[v]++) {
          for (x[u] = 0; x[u] < CHUNK; x[u]++) {
            const a = (x[d] >= 0) ? chunk.getVoxel(x[0], x[1], x[2]) : VOXEL_TYPES.AIR;
            const b = (x[d] < CHUNK - 1) ? chunk.getVoxel(x[0] + q[0], x[1] + q[1], x[2] + q[2]) : VOXEL_TYPES.AIR;

            if (Boolean(a) === Boolean(b)) {
              mask[n++] = 0;
            } else if (a) {
              mask[n++] = a; // Face points toward positive direction
            } else {
              mask[n++] = -b; // Face points toward negative direction
            }
          }
        }

        x[d]++;
        n = 0;

        // Generate greedy quads from mask
        for (let j = 0; j < CHUNK; j++) {
          for (let i = 0; i < CHUNK;) {
            const c = mask[n];
            if (c !== 0) {
              // Compute quad width
              let w = 1;
              while (i + w < CHUNK && mask[n + w] === c) {
                w++;
              }

              // Compute quad height
              let h = 1;
              let done = false;
              while (j + h < CHUNK) {
                for (let k = 0; k < w; k++) {
                  if (mask[n + k + h * CHUNK] !== c) {
                    done = true;
                    break;
                  }
                }
                if (done) break;
                h++;
              }

              // Clear mask for this quad
              for (let l = 0; l < h; l++) {
                for (let k = 0; k < w; k++) {
                  mask[n + k + l * CHUNK] = 0;
                }
              }

              // Quad geometry coordinates
              x[u] = i;
              x[v] = j;

              const du = [0, 0, 0];
              const dv = [0, 0, 0];
              du[u] = w;
              dv[v] = h;

              const norm = [0, 0, 0];
              norm[d] = c > 0 ? 1 : -1;

              const typeId = Math.abs(c);
              const color = VOXEL_COLORS[typeId] || VOXEL_COLORS[VOXEL_TYPES.CONCRETE];

              // 4 corners of the quad
              const p0 = [
                originX + x[0] * VOXEL_SIZE,
                originY + x[1] * VOXEL_SIZE,
                originZ + x[2] * VOXEL_SIZE,
              ];
              const p1 = [
                p0[0] + du[0] * VOXEL_SIZE,
                p0[1] + du[1] * VOXEL_SIZE,
                p0[2] + du[2] * VOXEL_SIZE,
              ];
              const p2 = [
                p0[0] + (du[0] + dv[0]) * VOXEL_SIZE,
                p0[1] + (du[1] + dv[1]) * VOXEL_SIZE,
                p0[2] + (du[2] + dv[2]) * VOXEL_SIZE,
              ];
              const p3 = [
                p0[0] + dv[0] * VOXEL_SIZE,
                p0[1] + dv[1] * VOXEL_SIZE,
                p0[2] + dv[2] * VOXEL_SIZE,
              ];

              if (c > 0) {
                positions.push(...p0, ...p1, ...p2, ...p3);
                indices.push(vertexCount, vertexCount + 1, vertexCount + 2, vertexCount, vertexCount + 2, vertexCount + 3);
              } else {
                positions.push(...p0, ...p3, ...p2, ...p1);
                indices.push(vertexCount, vertexCount + 1, vertexCount + 2, vertexCount, vertexCount + 2, vertexCount + 3);
              }

              for (let k = 0; k < 4; k++) {
                normals.push(norm[0], norm[1], norm[2]);
                colors.push(color.r, color.g, color.b);
              }
              vertexCount += 4;

              i += w;
              n += w;
            } else {
              i++;
              n++;
            }
          }
        }
      }
    }

    if (positions.length === 0) {
      if (chunk.mesh) {
        this.scene.remove(chunk.mesh);
        chunk.mesh.geometry.dispose();
        chunk.mesh = null;
      }
      return;
    }

    let geometry = chunk.mesh ? chunk.mesh.geometry : new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    if (!chunk.mesh) {
      chunk.mesh = new THREE.Mesh(geometry, this.material);
      chunk.mesh.castShadow = true;
      chunk.mesh.receiveShadow = true;
      this.scene.add(chunk.mesh);
    }
  }

  /**
   * Generates the Tactical Urban Killhouse Compound
   * Warehouse perimeter, central tactical breaching rooms, sandbag clusters,
   * elevated catwalks, and breachable concrete/plywood walls.
   */
  public generateMapPreset(id: 'urban_industrial' | 'desert_outpost' | 'night_operations') {
    // Geometry is shared at the voxel layer; the preset changes traversal density and
    // cover dressing without creating a second renderer/world implementation.
    this.generateKillhouseCompound();
    if (id === 'desert_outpost') {
      for (let x = -42; x <= 42; x += 6) {
        for (let z = -42; z <= 42; z += 6) {
          if (Math.abs(x) < 12 && Math.abs(z) < 12) continue;
          this.setVoxelAtWorld(x, 0.5, z, VOXEL_TYPES.SAND);
          this.setVoxelAtWorld(x, 0.75, z, VOXEL_TYPES.SAND);
        }
      }
    } else if (id === 'night_operations') {
      // Night geometry favors tighter lanes and artificial-light cover positions.
      for (let x = -36; x <= 36; x += 12) {
        for (let z = -36; z <= 36; z += 12) {
          for (let y = 0.25; y <= 1.25; y += VOXEL_SIZE) {
            this.setVoxelAtWorld(x, y, z, VOXEL_TYPES.CONCRETE);
          }
        }
      }
    }
    for (const chunk of this.chunks.values()) this.updateChunkMesh(chunk);
  }

  public generateKillhouseCompound() {
    // 1. Expanded 96m x 96m tactical perimeter with vertical and subterranean routes.
    for (let x = -48; x <= 48; x += VOXEL_SIZE) {
      for (let z = -48; z <= 48; z += VOXEL_SIZE) {
        this.setVoxelAtWorld(x, 0, z, VOXEL_TYPES.CONCRETE);
      }
    }

    // 2. Outer Warehouse Boundary Walls (4m high)
    const wallH = 4.0;
    for (let h = VOXEL_SIZE; h <= wallH; h += VOXEL_SIZE) {
      for (let i = -48; i <= 48; i += VOXEL_SIZE) {
        // North & South walls
        this.setVoxelAtWorld(i, h, -48, VOXEL_TYPES.CONCRETE);
        this.setVoxelAtWorld(i, h, 48, VOXEL_TYPES.CONCRETE);
        // East & West walls
        this.setVoxelAtWorld(-48, h, i, VOXEL_TYPES.CONCRETE);
        this.setVoxelAtWorld(48, h, i, VOXEL_TYPES.CONCRETE);
      }
    }

    // 3. Central Killhouse Structure (Building A: 12m x 10m x 3.5m)
    // Concrete lower structure with destructible wood barricades & metal blast doors
    for (let h = VOXEL_SIZE; h <= 3.5; h += VOXEL_SIZE) {
      for (let x = -8; x <= 8; x += VOXEL_SIZE) {
        // Leave doorway breaches
        const isDoor = Math.abs(x) < 1.0 && h <= 2.2;
        if (!isDoor) {
          // North facade: Brick & concrete
          this.setVoxelAtWorld(x, h, -6, VOXEL_TYPES.BRICK);
          // South facade
          this.setVoxelAtWorld(x, h, 6, VOXEL_TYPES.CONCRETE);
        } else if (h <= 2.0) {
          // Destructible wood barrier across door
          this.setVoxelAtWorld(x, h, -6, VOXEL_TYPES.WOOD);
        }
      }

      for (let z = -6; z <= 6; z += VOXEL_SIZE) {
        const isWindow = (z === -2 || z === 2) && h >= 1.0 && h <= 2.0;
        if (!isWindow) {
          this.setVoxelAtWorld(-8, h, z, VOXEL_TYPES.CONCRETE);
          this.setVoxelAtWorld(8, h, z, VOXEL_TYPES.CONCRETE);
        } else {
          // Breachable plywood window boards
          this.setVoxelAtWorld(-8, h, z, VOXEL_TYPES.WOOD);
          this.setVoxelAtWorld(8, h, z, VOXEL_TYPES.WOOD);
        }
      }
    }

    // Central dividing interior partition wall (breachable)
    for (let h = VOXEL_SIZE; h <= 3.0; h += VOXEL_SIZE) {
      for (let z = -6; z <= 6; z += VOXEL_SIZE) {
        if (Math.abs(z) > 1.5) {
          this.setVoxelAtWorld(0, h, z, VOXEL_TYPES.WOOD);
        }
      }
    }

    // 4. Tactical Container / Bunker Structures (Building B & C)
    const createBunker = (bx: number, bz: number, w: number, d: number, material: number) => {
      for (let h = VOXEL_SIZE; h <= 2.5; h += VOXEL_SIZE) {
        for (let x = bx - w / 2; x <= bx + w / 2; x += VOXEL_SIZE) {
          for (let z = bz - d / 2; z <= bz + d / 2; z += VOXEL_SIZE) {
            const isBorder =
              Math.abs(x - (bx - w / 2)) < VOXEL_SIZE ||
              Math.abs(x - (bx + w / 2)) < VOXEL_SIZE ||
              Math.abs(z - (bz - d / 2)) < VOXEL_SIZE ||
              Math.abs(z - (bz + d / 2)) < VOXEL_SIZE;
            if (isBorder && !(x > bx && z > bz && h < 2.0)) {
              this.setVoxelAtWorld(x, h, z, material);
            }
          }
        }
      }
    };

    createBunker(-15, 14, 6, 8, VOXEL_TYPES.METAL);
    createBunker(15, -14, 7, 6, VOXEL_TYPES.CONCRETE);

    // 5. Destructible Sandbag Clusters & Tactical Cover
    const createCoverCrates = (cx: number, cz: number) => {
      for (let x = -0.75; x <= 0.75; x += VOXEL_SIZE) {
        for (let z = -0.75; z <= 0.75; z += VOXEL_SIZE) {
          for (let y = VOXEL_SIZE; y <= 1.25; y += VOXEL_SIZE) {
            this.setVoxelAtWorld(cx + x, y, cz + z, VOXEL_TYPES.WOOD);
          }
        }
      }
    };

    createCoverCrates(-5, 12);
    createCoverCrates(6, 14);
    createCoverCrates(-12, -8);
    createCoverCrates(12, 8);
    createCoverCrates(0, -14);

    // 6. Elevated catwalk network: long sightlines with alternating cover.
    for (let x = -30; x <= 30; x += VOXEL_SIZE) {
      for (let z = -0.75; z <= 0.75; z += VOXEL_SIZE) {
        for (let y = 5.0; y <= 5.25; y += VOXEL_SIZE) this.setVoxelAtWorld(x, y, z, VOXEL_TYPES.METAL);
      }
    }
    for (let x = -30; x <= 30; x += 6) {
      for (let y = 0.25; y <= 5.0; y += VOXEL_SIZE) {
        for (let z = -0.35; z <= 0.35; z += VOXEL_SIZE) this.setVoxelAtWorld(x, y, z, VOXEL_TYPES.METAL);
      }
    }

    // 7. Subterranean tunnel and reinforced access shafts.
    for (let x = -22; x <= 22; x += VOXEL_SIZE) {
      for (let z = 20; z <= 23; z += VOXEL_SIZE) {
        for (let y = 0.25; y <= 2.25; y += VOXEL_SIZE) {
          const shell = z < 20.5 || z > 22.5 || y > 1.9;
          if (shell) this.setVoxelAtWorld(x, y, z, VOXEL_TYPES.CONCRETE);
        }
      }
    }

    // Initial meshing for all chunks
    for (const chunk of this.chunks.values()) {
      this.updateChunkMesh(chunk);
    }
  }

  public resetCompound() {
    for (const chunk of this.chunks.values()) {
      if (chunk.mesh) {
        this.scene.remove(chunk.mesh);
        chunk.mesh.geometry.dispose();
      }
    }
    this.chunks.clear();
    this.generateKillhouseCompound();
  }
}
