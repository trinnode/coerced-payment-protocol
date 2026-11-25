# TODO 3 — Second wave: stress, judgement, redesign, and resolution

TODO 2 Phase A/B/C returned FAIL. Every finding was fixed and covered by a
test; the second wave returned PASS WITH FIXES and those were resolved too: audit chain HMAC + atomic writes, session revocation, sealed credentials,
concurrency locks, replay detection, role gates, constraints, body caps, and
accessibility blockers. 49 unit tests, 32 browser tests, verified audit chain.

This book of work is about **judgement**, not more bug hunting alone. Five
independent agents assess different lenses. The maintainer resolves every
finding, then re-runs everything and publishes.

## Agents

| # | Lens | Question it must answer |
|---|---|---|
| 1 | Stress / load | Does it stay correct and bounded under sustained and concurrent abuse? |
| 2 | UI design judgement | Is the interface actually good, and what should be redesigned? |
| 3 | Secure code + structure | Is the code structured so safety properties cannot be accidentally broken? |
| 4 | Product manager + UX | Is this a coherent product for a fraud operator, and what is the next release? |
| 5 | General engineer review | Independent correctness and maintainability review of the whole tree. |

Agents are read-only. They write reports to `/tmp/opencode/wave2-*.md` and
return a short summary. The maintainer applies fixes.

## Resolution gates

- [ ] Every agent finding triaged: fixed, rejected with reason, or deferred with owner
- [ ] No CRITICAL or HIGH left open
- [ ] Full suite re-run: typecheck, build, 32+ tests, 18+ browser tests, audit verify
- [ ] Evidence written to `docs/evidence/`
- [ ] `README`, `TODO-2`, `TODO-3` and deploy contract updated to match reality
- [ ] Committed and pushed
- [ ] Final summary produced

## Non-negotiable

Nothing in this wave may add a claim that the protocol is proven, deployed,
endorsed, or safe for a real victim. Gate −1 remains untested.
