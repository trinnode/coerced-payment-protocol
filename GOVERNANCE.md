# Governance

A protocol that touches coercion, crime allegations and money cannot be governed by a single founder's judgement. This sets out the minimum structure.

## Principles

1. **The safety reviewer has an absolute veto over safety invariants.** Not advisory, not overridable. If a qualified safeguarding reviewer judges that a change increases the risk of harm to a person under coercion, it does not ship — and there is no dissent procedure that permits shipping anyway. A veto that can be outvoted is decoration.
2. **Institutions keep authority.** No governance decision may transfer decision rights over an account from the account's institution to the protocol steward.
3. **Publish the decision, not just the outcome.** Every substantive change gets an ADR with rejected alternatives.
4. **No silent expansion.** Any new capability that increases the platform's power over people or accounts is a new project requiring public argument.
5. **Recipients are participants, not data.** Their rights are represented in governance, not only in code.
6. **State the jurisdictional limit.** This body governs a design record. It does not govern an institution's hold rules, and it must not imply that it does.

## Roles

| Role | Responsibility | Authority |
|---|---|---|
| Maintainer | Day-to-day stewardship, spec releases | Merge editorial changes |
| Safety reviewer (independent, paid) | Victim-harm impact, invariant sign-off | **Absolute veto** |
| **Affected-person representative** (survivor or victim-support practitioner) | Speaks for people harmed by coercion *and* by the system | Veto on changes to recipient/victim interaction |
| Privacy counsel | Lawful basis, DPIA, recipient rights, breach | Blocks processing changes |
| Institutional advisory group | Feasibility, operational realism | Blocks unbuildable spec changes |
| Technical advisory group | Implementability, security | Blocks unsafe defaults |

Minimum viable board: maintainer + independent safety reviewer + affected-person representative + privacy counsel. Anything less is a press release.

## What governance does NOT cover

Hold rules, data-sharing agreements, and an institution's decision to act are **bilateral contracts between institutions**, outside this body's authority. Pretending otherwise would be a governance theatre that launders legitimacy onto decisions this group cannot see. The limit is stated in public, not buried.

## Decision classes

| Class | Example | Who decides |
|---|---|---|
| Editorial | Wording, structure | Maintainer |
| Protocol additive | New optional field | Maintainer + technical advisory |
| Protocol breaking | Field removal, semantic change | All roles; 6-month parallel run |
| Safety invariant | No-discretionary-referral, no-fabricated-balance, recipient rights | **Safety reviewer veto** |
| Victim/recipient interaction | Notification, challenge, contact | **Affected-person representative veto** |
| Institutional | Hold rules, data sharing | Outside this body — bilateral only |

## Transparency duties

- **Annual safety report**, published: incidents, unsafe-contact events, false activations, complaints, and what changed as a result. Negative outcomes included, not summarised away.
- **Harm grievance route.** A person harmed *by* the system — a recipient wrongly restricted, a victim exposed — has a named route to complain and a published outcome standard. Not a support inbox.
- **Incident disclosure.** Any safety incident is published within 90 days of resolution, redacted only for the safety of the people involved.

## Conflict of interest and funding

Disclose any relationship with an institution, vendor, or funder; abstain and record the abstention. If the project is funded by an institution subject to the protocol, that is published, and the safety reviewer's compensation is ring-fenced and disclosed. **A reviewer paid by the party the reviewer may have to block is not independent** — that arrangement is prohibited, not merely disclosed.

## Wind-down

If the project stops, participants are told, the protocol remains published under its licence, and all incident data is destroyed on a published schedule. A safety project that can disappear with people's incident records intact is a liability, not an infrastructure.

## Amending this document

By RFC, with the safety reviewer and affected-person representative sign-off, published with reasoning.
