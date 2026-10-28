# Aegis Protocol

An original browser-based tactical FPS project. The target is responsive first-person movement, readable tactical combat, strong audiovisual feedback, and eventually two selectable multiplayer session modes.

## Current repository status

This repository already contains a substantial Three.js/React single-browser FPS prototype (weapon handling, bots, HUD, ballistics and effects). It is **not yet evidence of a production-ready online multiplayer game**. This branch establishes the Aegis Protocol project identity and records the architecture and milestone constraints before online systems are added.

## Development

Use the repository's existing npm scripts:

```bash
npm install
npm run dev
npm run build
npm run lint
```

Run commands locally and report their actual results; a GitHub source edit alone does not prove that the project builds or runs.

## Architecture direction

- TypeScript + Vite; React for menus/HUD, not per-frame simulation state.
- Three.js / React Three Fiber for rendering; Rapier for collision and character-controller work where integrated.
- One renderer-independent, fixed-tick gameplay core shared by both session modes.
- Browser-host casual mode: WebRTC DataChannels, host-and-spoke topology, signaling plus STUN/TURN.
- Dedicated mode: Node.js + Colyseus with authoritative server-side validation and simulation.
- Static client deployment and realtime session hosting are separate deployment concerns.
- Original or appropriately licensed assets only.

## Milestone order

1. M0: browser foundation and stable playable graybox slice.
2. M1–M2: movement/combat foundation and local match lifecycle.
3. M3–M4: browser-host WebRTC mode and dedicated authoritative Colyseus mode.
4. M5+: prediction/reconciliation, presentation polish, public beta, tactical expansion and measured scale work.

Do not claim that multiplayer, anti-cheat, large-scale simulation, or production deployment exists until implemented and tested.

## Engineering guardrails

See [AGENTS.md](AGENTS.md) and [docs/current-milestone.md](docs/current-milestone.md). Keep changes small, test locally, preserve working behavior, document trust assumptions and limitations, and do not deploy cloud infrastructure without explicit approval.
