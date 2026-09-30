import RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsEngine {
  private world: RAPIER.World | null = null;
  public initialized: boolean = false;

  public async init() {
    if (this.initialized) return;
    try {
      await RAPIER.init();
      const gravity = { x: 0.0, y: -18.0, z: 0.0 };
      this.world = new RAPIER.World(gravity);
      this.initialized = true;

      // Ground plane collider
      const groundDesc = RAPIER.ColliderDesc.cuboid(30.0, 0.1, 30.0)
        .setTranslation(0.0, 0.0, 0.0);
      this.world.createCollider(groundDesc);
    } catch (err) {
      console.warn('Rapier WASM initialization fell back to kinematic physics:', err);
    }
  }

  public step(dt: number) {
    if (this.world) {
      this.world.timestep = Math.min(dt, 0.05);
      this.world.step();
    }
  }

  public createPlayerBody(startX: number, startY: number, startZ: number): {
    body: RAPIER.RigidBody | null;
    collider: RAPIER.Collider | null;
  } {
    if (!this.world) return { body: null, collider: null };

    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(startX, startY, startZ);
    const body = this.world.createRigidBody(bodyDesc);

    // Player capsule collider: 1.8m height, 0.35m radius
    const colliderDesc = RAPIER.ColliderDesc.capsule(0.6, 0.35);
    const collider = this.world.createCollider(colliderDesc, body);

    return { body, collider };
  }

  public createDebrisRigidBody(x: number, y: number, z: number, vx: number, vy: number, vz: number): RAPIER.RigidBody | null {
    if (!this.world) return null;

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .setLinvel(vx, vy, vz)
      .setCanSleep(true);
    const body = this.world.createRigidBody(bodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(0.12, 0.12, 0.12)
      .setRestitution(0.4)
      .setFriction(0.6);
    this.world.createCollider(colliderDesc, body);

    return body;
  }

  public raycast(
    origin: { x: number; y: number; z: number },
    dir: { x: number; y: number; z: number },
    maxToi: number = 100
  ): { toi: number; hitPoint: { x: number; y: number; z: number } } | null {
    if (!this.world) return null;

    const ray = new RAPIER.Ray(origin, dir);
    const hit = this.world.castRay(ray, maxToi, true);
    if (hit) {
      const hitPoint = ray.pointAt(hit.timeOfImpact);
      return {
        toi: hit.timeOfImpact,
        hitPoint: { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z },
      };
    }
    return null;
  }
}

export const physicsEngine = new PhysicsEngine();
