# Contributing

This project is a **design record**, and its value depends on being attacked by informed people.

## The most useful contribution

A specific, evidenced objection. Examples:

- "The silent path cannot work on Android because `BiometricPrompt` returns a single success signal; here is the API surface that blocks your design."
- "Under NDPA 2023 s.2, your stated lawful basis fails for this purpose because…"
- "Fraud ops at a Nigerian bank cannot place a hold without X; here is the actual approval chain."
- "Your state machine double-counts because `UNKNOWN` can transition twice."

## The least useful contribution

- Enthusiasm without an artefact.
- "This is a great idea, you should raise money."
- Feature requests that expand authority over accounts.

## Ground rules

1. **No victim data.** Ever. No names, no screenshots of real transfers, no account numbers, no identifying locations.
2. **No beneficiary accusation.** A recipient is not a suspect. Do not name individuals or accounts.
3. **Separate fact from inference.** Mark claims as verified, reported, or unverified.
4. **No security detail in public.** Exploitable specifics go through `SECURITY.md`.
5. **Argue the invariant, not the vibe.** If you think an invariant is wrong, say which one and why, and what replaces it.

## How to propose a change

- **Editorial / clarity:** open a pull request.
- **Substantive change to an invariant, protocol field, or gate criterion:** open an issue titled `RFC: …` with the problem, the proposed change, the safety impact, and the rejected alternatives.
- **Changes touching:** no-auto-referral, no-blacklist, no-automated-freeze, forbidden protocol fields, or recipient rights — require external safety review sign-off and are never merged on a single maintainer's judgement.

## Style

- British spelling in prose.
- Define terms on first use; the glossary lives in the spec.
- Prefer tables and testable statements over adjectives.
- Never write "could potentially". Either it does, or say it does not.

## Review standard

A document is ready when a hostile reader can find the weakest claim in under five minutes — and it is still standing.
