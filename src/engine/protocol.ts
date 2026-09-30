import { PlayerInput } from './types';

export const PACKET_TYPES = {
  CLIENT_INPUT: 1,
  SERVER_TICK: 2,
  VOXEL_DESTRUCTION: 3,
  SPAWN_AIRDROP: 4,
  HITMARKER: 5,
  CHAT_MESSAGE: 6,
} as const;

export interface UnpackedClientInput {
  seq: number;
  timestamp: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  flags: number;
  weaponIndex: number;
  dt: number;
}

export class BinaryProtocol {
  static readonly CLIENT_INPUT_BYTES = 24;

  static packClientInput(input: PlayerInput, posX: number, posY: number, posZ: number): ArrayBuffer {
    const buffer = new ArrayBuffer(BinaryProtocol.CLIENT_INPUT_BYTES);
    const view = new DataView(buffer);

    view.setUint8(0, PACKET_TYPES.CLIENT_INPUT);
    view.setUint8(1, input.weaponIndex & 0xff);
    view.setUint16(2, input.seq & 0xffff, true);
    view.setUint32(4, Math.floor(performance.now()) >>> 0, true);

    // These fields are retained for backwards compatibility/telemetry only.
    // The authoritative server MUST NOT use them for simulation.
    view.setInt16(8, Math.round(Math.max(-320, Math.min(320, posX)) * 100), true);
    view.setInt16(10, Math.round(Math.max(-320, Math.min(320, posY)) * 100), true);
    view.setInt16(12, Math.round(Math.max(-320, Math.min(320, posZ)) * 100), true);

    const normYaw = Math.atan2(Math.sin(input.yaw), Math.cos(input.yaw)) / Math.PI;
    const normPitch = Math.max(-1, Math.min(1, input.pitch / (Math.PI / 2)));
    view.setInt16(14, Math.round(normYaw * 32767), true);
    view.setInt16(16, Math.round(normPitch * 32767), true);

    let flags = 0;
    if (input.forward) flags |= 1 << 0;
    if (input.backward) flags |= 1 << 1;
    if (input.left) flags |= 1 << 2;
    if (input.right) flags |= 1 << 3;
    if (input.jump) flags |= 1 << 4;
    if (input.crouch) flags |= 1 << 5;
    if (input.slide) flags |= 1 << 6;
    if (input.tacSprint) flags |= 1 << 7;
    if (input.ads) flags |= 1 << 8;
    if (input.fire) flags |= 1 << 9;
    if (input.reload) flags |= 1 << 10;
    if (input.leanLeft) flags |= 1 << 11;
    if (input.leanRight) flags |= 1 << 12;

    view.setUint16(18, flags, true);
    view.setUint16(20, Math.round(Math.max(0, Math.min(0.25, input.dt)) * 10000), true);
    view.setUint16(22, (flags ^ input.seq) & 0xffff, true);

    return buffer;
  }

  static unpackClientInput(buffer: ArrayBufferLike): UnpackedClientInput | null {
    if (buffer.byteLength < BinaryProtocol.CLIENT_INPUT_BYTES) return null;
    const view = new DataView(buffer);
    if (view.getUint8(0) !== PACKET_TYPES.CLIENT_INPUT) return null;

    const seq = view.getUint16(2, true);
    const flags = view.getUint16(18, true);
    const checksum = view.getUint16(22, true);
    if (((flags ^ seq) & 0xffff) !== checksum) return null;

    return {
      seq,
      timestamp: view.getUint32(4, true),
      x: view.getInt16(8, true) / 100,
      y: view.getInt16(10, true) / 100,
      z: view.getInt16(12, true) / 100,
      yaw: (view.getInt16(14, true) / 32767) * Math.PI,
      pitch: (view.getInt16(16, true) / 32767) * (Math.PI / 2),
      flags,
      weaponIndex: view.getUint8(1),
      dt: view.getUint16(20, true) / 10000,
    };
  }

  static packVoxelDelta(x: number, y: number, z: number, radius: number): ArrayBuffer {
    const buffer = new ArrayBuffer(12);
    const view = new DataView(buffer);
    view.setUint8(0, PACKET_TYPES.VOXEL_DESTRUCTION);
    view.setUint8(1, Math.max(0, Math.min(255, Math.round(radius * 10))));
    view.setInt16(2, Math.round(x * 100), true);
    view.setInt16(4, Math.round(y * 100), true);
    view.setInt16(6, Math.round(z * 100), true);
    view.setUint32(8, Date.now() >>> 0, true);
    return buffer;
  }

  static unpackVoxelDelta(buffer: ArrayBufferLike) {
    if (buffer.byteLength < 12) return null;
    const view = new DataView(buffer);
    if (view.getUint8(0) !== PACKET_TYPES.VOXEL_DESTRUCTION) return null;
    return {
      x: view.getInt16(2, true) / 100,
      y: view.getInt16(4, true) / 100,
      z: view.getInt16(6, true) / 100,
      radius: view.getUint8(1) / 10,
    };
  }
}
