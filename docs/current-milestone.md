# Current Milestone

**Project:** Aegis Protocol  
**Milestone:** M0 baseline / repository alignment  
**Branch:** `aegis-protocol-m0`

## Goal
Establish a clearly named, documented baseline for the existing browser FPS prototype, then validate its current behavior before adding new systems.

## Scope
- Set the package and browser metadata to the new original project identity.
- Document architecture boundaries, multiplayer trust model, and milestone order.
- Preserve the existing prototype rather than replacing its working systems blindly.
- Next implementation gate: inspect the complete source and run install, typecheck/lint, build, and browser smoke checks in a local environment.

## Explicitly out of scope for this step
- No new networking implementation, login, database, deployment, ranking, or cloud infrastructure.
- No claim that the existing prototype is already online multiplayer.
- No new custom physics engine, advanced destruction, or scale optimizations without profiling.

## Acceptance checklist
- [x] Dedicated project identity in package metadata and browser metadata.
- [x] Architecture guardrails and current milestone documented.
- [ ] `npm install` / `npm ci` completed locally.
- [ ] `npm run lint` completed locally.
- [ ] `npm run build` completed locally.
- [ ] Browser smoke test on the current baseline.
- [ ] Record actual performance baseline and hardware/browser.
