import assert from 'node:assert/strict';
import { inputFlagsToPlayerInput, simulatePlayer } from '../src/engine/simulation';

const input = inputFlagsToPlayerInput(
  (1 << 0) | (1 << 7),
  1,
  1 / 30,
  0,
  0,
  0,
);

let state = {
  position: [0, 1.7, 0] as [number, number, number],
  velocity: [0, 0, 0] as [number, number, number],
  grounded: true,
};

for (let i = 0; i < 30; i++) {
  state = simulatePlayer(state, input, 1 / 30);
}

assert.ok(state.position[2] > 0, 'forward input should move the player');
assert.ok(state.position[2] <= 23, 'world bounds must be enforced');

const jump = inputFlagsToPlayerInput(1 << 4, 2, 1 / 30, 0, 0, 0);
state = simulatePlayer(state, jump, 1 / 30);
assert.ok(state.velocity[1] > 0, 'jump input should add vertical velocity');

console.log('simulation tests passed');
