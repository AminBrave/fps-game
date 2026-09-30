import assert from 'node:assert/strict';
import { inputFlagsToPlayerInput, simulatePlayer } from '../src/engine/simulation';
import { SnapshotInterpolationBuffer } from '../src/engine/interpolation';
import { RoomManager } from '../src/engine/rooms';
import { MATERIAL_REGISTRY, MATERIAL_TYPES } from '../src/engine/materials';

const input = inputFlagsToPlayerInput((1 << 0) | (1 << 7), 1, 1 / 30, 0, 0, 0);
let state = { position: [0, 1.7, 0] as [number, number, number], velocity: [0, 0, 0] as [number, number, number], grounded: true };
for (let i = 0; i < 30; i++) state = simulatePlayer(state, input, 1 / 30);
assert.ok(state.position[2] < 0, 'forward input must follow the camera -Z axis');
assert.ok(state.position[2] >= -47, 'expanded world bounds must be enforced');

const strafe = inputFlagsToPlayerInput(1 << 3, 2, 1 / 30, 0, 0, 0);
state = simulatePlayer({ position: [0, 1.7, 0], velocity: [0, 0, 0], grounded: true }, strafe, 1 / 30);
assert.ok(state.velocity[0] > 0, 'right input must move +X at yaw zero');

const jump = inputFlagsToPlayerInput(1 << 4, 3, 1 / 30, 0, 0, 0);
state = simulatePlayer(state, jump, 1 / 30);
assert.ok(state.velocity[1] > 0, 'jump input should add vertical velocity');

const makePlayer = (id: string, x: number) => ({
  id, name: id, position: [x, 1.7, 0] as [number, number, number],
  velocity: [2, 0, 0] as [number, number, number], yaw: 0, pitch: 0,
  health: 100, maxHealth: 100, armor: 150, maxArmor: 150, stateFlags: 0,
  currentWeaponId: 'm4a1', ammoInClip: 30, reserveAmmo: 180, kills: 0, deaths: 0, score: 0,
  ping: 20, team: 'spec_ops' as const,
});
const buffer = new SnapshotInterpolationBuffer(50);
buffer.push(1, makePlayer('p1', 0), 1000);
buffer.push(2, makePlayer('p1', 1), 1050);
const interpolated = buffer.sample(1075);
assert.ok(interpolated && interpolated.position[0] > 0 && interpolated.position[0] < 1, 'remote snapshots should interpolate inside the delay window');

const rooms = new RoomManager();
const room = rooms.create('host', { map: 'urban_industrial', weather: 'urban_clear', botCount: 4, maxPlayers: 2 });
assert.equal(room.playerCount, 0, 'hosted room starts empty until a socket joins');
assert.ok(rooms.join(room.id, 'p1'));
assert.equal(rooms.join(room.id, 'p2')?.playerCount, 2);
assert.equal(rooms.join(room.id, 'p3'), null, 'room capacity must be enforced');

assert.ok(MATERIAL_REGISTRY[MATERIAL_TYPES.CONCRETE].durability >= 8000, 'concrete durability must be scaled up');
assert.ok(MATERIAL_REGISTRY[MATERIAL_TYPES.ARMOR_STEEL].durability >= 19000, 'armor steel durability must be scaled up');

console.log('simulation, netcode interpolation, room isolation, and material scaling tests passed');
