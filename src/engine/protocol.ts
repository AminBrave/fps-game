import { PlayerInput } from './types';

/**
 * BreachPoint Bit-Packed Binary Protocol
 * Guarantees client movement updates fit strictly within 24 bytes per packet.
 */

export const PACKET_TYPES = {
  CLIENT_INPUT: 1,
  SERVER_TICK: 2,
  VOXEL_DESTRUCTION: 3,
  SPAWN_AIRDROP: 4,
  HITMARKER: 5,
  CHAT_MESSAGE: 6,
} as const;

export class BinaryProtocol {
  // --- Client Movement Input: 24 Bytes ---
  // [0..1]   Uint8: PacketType (1), weaponIndex (1)
  // [2..3]   Uint16: Input Sequence
  // [4..7]   Uint32: Timestamp (ms)
  // [8..9]   Int16: Position X (cm, /100)
  // [10..11] Int16: Position Y (cm, /100)
  // [12..13] Int16: Position Z (cm, /100)
  // [14..15] Int16: Yaw (-32768..32767 mapped to -PI..PI)
  // [16..17] Int16: Pitch (-32768..32767 mapped to -PI/2..PI/2)
  // [18..19] Uint16: Input Flags Bitfield
  // [20..21] Uint16: Delta Time (micro-seconds, /1000)
  // [22..23] Uint16: Checksum / reserved

  static packClientInput(
    input: PlayerInput,
    posX: number,
    posY: number,
    posZ: number
  ): ArrayBuffer {
    const buffer = new ArrayBuffer(24);
    const view = new DataView(buffer);

    view.setUint8(0, PACKET_TYPES.CLIENT_INPUT);
    view.setUint8(1, input.weaponIndex & 0xff);
    view.setUint16(2, input.seq & 0xffff, true);
    view.setUint32(4, Math.floor(performance.now()) & 0xffffffff, true);

    // Quantize 3D coordinates (1 cm resolution)
    view.setInt16(8, Math.round(Math.max(-320, Math.min(320, posX)) * 100), true);
    view.setInt16(10, Math.round(Math.max(-320, Math.min(320, posY)) * 100), true);
    view.setInt16(12, Math.round(Math.max(-320, Math.min(320, posZ)) * 100), true);

    // Quantize angles to 16-bit range
    const normYaw = Math.atan2(Math.sin(input.yaw), Math.cos(input.yaw)) / Math.PI; // -1 to 1
    const normPitch = Math.max(-1, Math.min(1, input.pitch / (Math.PI / 2))); // -1 to 1
    view.setInt16(14, Math.round(normYaw * 32767), true);
    view.setInt16(16, Math.round(normPitch * 32767), true);

    // Bitfield flags
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
    view.setUint16(20, Math.round(Math.min(input.dt * 10000, 65535)), true);
    view.setUint16(22, (flags ^ input.seq) & 0xffff, true); // Basic integrity check

    return buffer;
  }

  static unpackClientInput(buffer: ArrayBuffer): {
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
  } {
    const view = new DataView(buffer);
    const weaponIndex = view.getUint8(1);
    const seq = view.getUint16(2, true);
    const timestamp = view.getUint32(4, true);

    const x = view.getInt16(8, true) / 100;
    const y = view.getInt16(10, true) / 100;
    const z = view.getInt16(12, true) / 100;

    const yaw = (view.getInt16(14, true) / 32767) * Math.PI;
    const pitch = (view.getInt16(16, true) / 32767) * (Math.PI / 2);
    const flags = view.getUint16(18, true);
    const dt = view.getUint16(20, true) / 10000;

    return { seq, timestamp, x, y, z, yaw, pitch, flags, weaponIndex, dt };
  }

  // --- Micro-Voxel Destruction Delta: 12 Bytes ---
  // [0]    Uint8: PacketType (3)
  // [1]    Uint8: Radius in decimeters (/10)
  // [2..3] Int16: X (cm /100)
  // [4..5] Int16: Y (cm /100)
  // [6..7] Int16: Z (cm /100)
  // [8..11] Uint32: Timestamp
  static packVoxelDelta(x: number, y: number, z: number, radius: number): ArrayBuffer {
    const buffer = new ArrayBuffer(12);
    const view = new DataView(buffer);
    view.setUint8(0, PACKET_TYPES.VOXEL_DESTRUCTION);
    view.setUint8(1, Math.round(radius * 10));
    view.setInt16(2, Math.round(x * 100), true);
    view.setInt16(4, Math.round(y * 100), true);
    view.setInt16(6, Math.round(z * 100), true);
    view.setUint32(8, Math.floor(performance.now()) & 0xffffffff, true);
    return buffer;
  }

  static unpackVoxelDelta(buffer: ArrayBuffer): { x: number; y: number; z: number; radius: number } {
    const view = new DataView(buffer);
    const radius = view.getUint8(1) / 10;
    const x = view.getInt16(2, true) / 100;
    const y = view.getInt16(4, true) / 100;
    const z = view.getInt16(6, true) / 100;
    return { x, y, z, radius };
  }
}
