import * as THREE from 'three';
import { PlayerState } from './types';

export interface SnapshotSample { tick: number; time: number; state: PlayerState; }

function cloneState(s: PlayerState): PlayerState {
  return { ...s, position: [...s.position] as [number, number, number], velocity: [...s.velocity] as [number, number, number] };
}

function angleLerp(a: number, b: number, t: number) {
  const d = (b - a + Math.PI) % (Math.PI * 2) - Math.PI;
  return a + d * t;
}

export class SnapshotInterpolationBuffer {
  private samples: SnapshotSample[] = [];
  constructor(private readonly delayMs = 75, private readonly maxSamples = 32) {}

  push(tick: number, state: PlayerState, time = performance.now()) {
    const sample = { tick, time, state: cloneState(state) };
    const index = this.samples.findIndex(s => s.tick === tick);
    if (index >= 0) this.samples[index] = sample;
    else this.samples.push(sample);
    this.samples.sort((a, b) => a.time - b.time);
    if (this.samples.length > this.maxSamples) this.samples.splice(0, this.samples.length - this.maxSamples);
  }

  sample(time = performance.now()): PlayerState | null {
    if (!this.samples.length) return null;
    if (this.samples.length === 1) return cloneState(this.samples[0].state);

    const target = time - this.delayMs;
    let a = this.samples[0];
    let b = this.samples[this.samples.length - 1];

    for (let i = 0; i < this.samples.length - 1; i++) {
      if (this.samples[i].time <= target && target <= this.samples[i + 1].time) {
        a = this.samples[i]; b = this.samples[i + 1]; break;
      }
    }

    if (target < a.time) return cloneState(a.state);

    if (target >= b.time) {
      const dt = THREE.MathUtils.clamp((target - b.time) / 1000, 0, 0.10);
      return {
        ...b.state,
        position: [
          b.state.position[0] + b.state.velocity[0] * dt,
          b.state.position[1] + b.state.velocity[1] * dt,
          b.state.position[2] + b.state.velocity[2] * dt,
        ],
      };
    }

    const raw = THREE.MathUtils.clamp((target - a.time) / Math.max(1, b.time - a.time), 0, 1);
    const alpha = raw * raw * (3 - 2 * raw);
    return {
      ...b.state,
      position: [
        THREE.MathUtils.lerp(a.state.position[0], b.state.position[0], alpha),
        THREE.MathUtils.lerp(a.state.position[1], b.state.position[1], alpha),
        THREE.MathUtils.lerp(a.state.position[2], b.state.position[2], alpha),
      ],
      velocity: [
        THREE.MathUtils.lerp(a.state.velocity[0], b.state.velocity[0], alpha),
        THREE.MathUtils.lerp(a.state.velocity[1], b.state.velocity[1], alpha),
        THREE.MathUtils.lerp(a.state.velocity[2], b.state.velocity[2], alpha),
      ],
      yaw: angleLerp(a.state.yaw, b.state.yaw, alpha),
      pitch: THREE.MathUtils.lerp(a.state.pitch, b.state.pitch, alpha),
    };
  }

  clear() { this.samples.length = 0; }
  get size() { return this.samples.length; }
}

export class RemoteSnapshotStore {
  private buffers = new Map<string, SnapshotInterpolationBuffer>();

  push(tick: number, players: PlayerState[], time = performance.now()) {
    for (const p of players) {
      let buffer = this.buffers.get(p.id);
      if (!buffer) { buffer = new SnapshotInterpolationBuffer(); this.buffers.set(p.id, buffer); }
      buffer.push(tick, p, time);
    }
  }

  sample(time = performance.now()): PlayerState[] {
    const result: PlayerState[] = [];
    for (const [id, buffer] of this.buffers) {
      const state = buffer.sample(time);
      if (state) result.push(state);
      if (!state) this.buffers.delete(id);
    }
    return result;
  }

  removeMissing(ids: Set<string>) {
    for (const id of this.buffers.keys()) if (!ids.has(id)) this.buffers.delete(id);
  }

  clear() { this.buffers.clear(); }
}
