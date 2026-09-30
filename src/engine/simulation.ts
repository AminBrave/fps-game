import { PlayerInput } from './types';

export const SIMULATION_HZ = 30;
export const FIXED_DT = 1 / SIMULATION_HZ;
export const GRAVITY = -18;
export const WALK_SPEED = 4.8;
export const SPRINT_SPEED = 8.5;
export const ADS_SPEED = 2.4;
export const CROUCH_SPEED = 2.2;
export const JUMP_SPEED = 5.6;
export const WORLD_LIMIT = 23;

export interface SimulationState {
  position: [number, number, number];
  velocity: [number, number, number];
  grounded: boolean;
}

export function simulatePlayer(state: SimulationState, input: PlayerInput, dt: number): SimulationState {
  const step = Math.max(0, Math.min(dt, 0.05));
  const next: SimulationState = {
    position: [...state.position],
    velocity: [...state.velocity],
    grounded: state.grounded,
  };

  const moveX = (input.right ? -1 : 0) + (input.left ? 1 : 0);
  const moveZ = (input.forward ? 1 : 0) + (input.backward ? -1 : 0);
  const length = Math.hypot(moveX, moveZ) || 1;
  const nx = moveX / length;
  const nz = moveZ / length;

  const speed = input.ads
    ? ADS_SPEED
    : input.crouch
      ? CROUCH_SPEED
      : input.tacSprint
        ? SPRINT_SPEED
        : WALK_SPEED;

  const yawSin = Math.sin(input.yaw);
  const yawCos = Math.cos(input.yaw);
  const worldX = nx * yawCos + nz * yawSin;
  const worldZ = nz * yawCos - nx * yawSin;

  const response = 1 - Math.exp(-12 * step);
  next.velocity[0] += (worldX * speed - next.velocity[0]) * response;
  next.velocity[2] += (worldZ * speed - next.velocity[2]) * response;

  if (input.jump && next.grounded && !input.crouch) {
    next.velocity[1] = JUMP_SPEED;
    next.grounded = false;
  }

  if (!next.grounded) {
    next.velocity[1] += GRAVITY * step;
  }

  next.position[0] += next.velocity[0] * step;
  next.position[1] += next.velocity[1] * step;
  next.position[2] += next.velocity[2] * step;

  const standingHeight = input.crouch ? 1.15 : 1.7;
  if (next.position[1] <= standingHeight) {
    next.position[1] = standingHeight;
    next.velocity[1] = 0;
    next.grounded = true;
  }

  next.position[0] = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, next.position[0]));
  next.position[2] = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, next.position[2]));

  return next;
}

export function inputFlagsToPlayerInput(flags: number, seq: number, dt: number, yaw: number, pitch: number, weaponIndex: number): PlayerInput {
  return {
    seq, dt, yaw, pitch, weaponIndex,
    forward: Boolean(flags & (1 << 0)),
    backward: Boolean(flags & (1 << 1)),
    left: Boolean(flags & (1 << 2)),
    right: Boolean(flags & (1 << 3)),
    jump: Boolean(flags & (1 << 4)),
    crouch: Boolean(flags & (1 << 5)),
    slide: Boolean(flags & (1 << 6)),
    tacSprint: Boolean(flags & (1 << 7)),
    ads: Boolean(flags & (1 << 8)),
    fire: Boolean(flags & (1 << 9)),
    reload: Boolean(flags & (1 << 10)),
    leanLeft: Boolean(flags & (1 << 11)),
    leanRight: Boolean(flags & (1 << 12)),
  };
}
