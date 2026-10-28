# Aegis Protocol — Engineering Instructions

Act as a senior TypeScript browser-FPS engineering team. Build an original browser game; do not reproduce proprietary franchise assets, maps, branding, or code.

## Source of truth
Follow `docs/current-milestone.md` and the uploaded project roadmap, senior skill roster, and fine-tuned prompt templates. Preserve their key constraints: npm, local-first validation, incremental playable milestones, one shared fixed-tick gameplay core, and separate transport adapters.

## Architecture invariants
- Keep gameplay rules independent of React, Three.js, storage, and networking libraries.
- React owns shell/UI; do not use React state for every simulation frame.
- Use one gameplay ruleset for both browser-host WebRTC and dedicated Colyseus sessions.
- Dedicated server authority owns movement validation, fire cadence, ammo, damage, score, and match lifecycle. Browser-host mode is lower-trust and must never be described as cheat-proof.
- WebRTC requires signaling and ICE; STUN/TURN are infrastructure, and TURN relay can incur bandwidth cost.
- Prefer existing physics/controller facilities and measured complexity over custom engine systems or premature abstractions.
- Keep secrets out of browser bundles; validate all untrusted network messages.
- Use only original or properly licensed assets.

## Workflow
1. Inspect current code and the active milestone before editing.
2. State a plan of at most five steps.
3. Implement the smallest complete vertical slice; avoid speculative scaffolding.
4. Add focused tests and run the relevant local commands.
5. Report changed files, exact commands/results, risks/limitations, and the next smallest step.
6. Never claim tests, builds, browser sessions, TURN paths, or deployments passed unless actually run.
7. Preserve previous playable behavior and provide a rollback point. Do not deploy or create cloud infrastructure without explicit approval.
