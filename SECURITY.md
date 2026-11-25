# Security policy

## Reporting a vulnerability

Do **not** open a public issue for anything exploitable.

Send a private report to the maintainer with:

1. The component (protocol field, state transition, workflow step).
2. The attack scenario and the attacker model it assumes (see `docs/03-threat-model-and-safety.md`).
3. Impact: whose safety, whose data, whose money.
4. Suggested mitigation, if you have one.

Expect acknowledgement within 7 days. There is no bug bounty and no payment; this is a pre-implementation design record.

## Scope

| In scope | Out of scope |
|---|---|
| Protocol design flaws (replay, spoofing, correlation abuse) | Third-party bank systems |
| Threat-model gaps and undefended abuse cases | Social engineering of real institutions |
| Safety-control bypasses (notification, referral, tenant isolation) | Physical security |
| Privacy failures in the data model | Anything requiring access to real victim data |

## What we will do

- Publish the fix and the reasoning, with credit unless you ask otherwise.
- If a flaw invalidates a safety invariant, we will mark the affected document as **unfit** until corrected, rather than quietly patching it.

## What we will not do

- Accept reports containing real victim or beneficiary data.
- Test against live institutional systems.
- Treat a design flaw as a "known limitation" to be deferred without a written ADR.

## Research ethics

Any testing against a real institution requires that institution's written authorisation. No exceptions, no "just checking", no scanning. If you are unsure whether something is authorised, it is not.
