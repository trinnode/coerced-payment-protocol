/**
 * Seed: two institutions, three roles, and a realistic incident corpus.
 *
 * The corpus is synthetic but shaped like the real thing: multiple events per
 * episode, late delivery, an uncorrelated transfer, and one case where the
 * receiving institution declined because no standing rule existed. A demo that
 * only contains happy paths teaches the wrong lesson.
 */
import { randomUUID } from "node:crypto";
import { generateKeyPairSync } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { hashPassword } from "../lib/auth/password";
import {
  actions,
  auditEvents,
  challenges,
  episodes,
  incidents,
  institutionKeys,
  institutions,
  rawEvents,
  transactions,
  users,
} from "../lib/db/schema";

const url = process.env.DATABASE_URL ?? "postgres://phylax:phylax@localhost:5433/phylax";
const sql = postgres(url, { max: 1 });
const db = drizzle(sql);

const mins = (n: number) => new Date(Date.now() - n * 60_000);

function ed25519() {
  const { publicKey } = generateKeyPairSync("ed25519");
  return publicKey.export({ type: "spki", format: "pem" }).toString();
}

async function main() {
  console.log("clearing");
  await sql`truncate table audit_events, analytics_events, web_vitals, challenges, actions, transactions, raw_events, incidents, episodes, institution_keys, users, institutions restart identity cascade`;

  console.log("institutions");
  await db.insert(institutions).values([
    {
      id: "bank_kite",
      legalName: "Kite Commercial Bank Plc",
      shortName: "Kite Bank",
      code: "000123",
      kind: "bank",
      status: "active",
      webhookUrl: "https://kite.example.ng/webhooks/phylax",
    },
    {
      id: "mmo_adaeze",
      legalName: "Adaeze Money Services Ltd",
      shortName: "Adaeze Money",
      code: "MMO-4471",
      kind: "mmo",
      status: "active",
      webhookUrl: "https://adaeze.example.ng/webhooks/phylax",
    },
    {
      id: "bank_oreva",
      legalName: "Oreva Microfinance Bank",
      shortName: "Oreva MFB",
      code: "000871",
      kind: "bank",
      status: "sandbox",
      webhookUrl: null,
    },
  ]);

  for (const [id, keyId] of [
    ["bank_kite", "kite-2026-11"],
    ["mmo_adaeze", "adaeze-2026-11"],
    ["bank_oreva", "oreva-2026-11"],
  ] as const) {
    await db.insert(institutionKeys).values({
      institutionId: id,
      keyId,
      publicKeyPem: ed25519(),
      expiresAt: new Date(Date.now() + 90 * 86400_000),
    });
  }

  console.log("users");
  const pw = await hashPassword("phylax-demo-2026");
  await db.insert(users).values([
    {
      institutionId: "bank_kite",
      email: "ada.analyst@kite.example.ng",
      name: "Ada Nwachukwu",
      role: "analyst",
      passwordHash: pw,
    },
    {
      institutionId: "bank_kite",
      email: "tunde.supervisor@kite.example.ng",
      name: "Tunde Bakare",
      role: "supervisor",
      passwordHash: pw,
    },
    {
      institutionId: "bank_kite",
      email: "zainab.compliance@kite.example.ng",
      name: "Zainab Yusuf",
      role: "compliance",
      passwordHash: pw,
    },
    {
      institutionId: "mmo_adaeze",
      email: "emeka.ops@adaeze.example.ng",
      name: "Emeka Obi",
      role: "supervisor",
      passwordHash: pw,
    },
  ]);

  console.log("episodes + incidents");

  type Seed = {
    episode: string;
    customer: string;
    contact: "SAFE" | "UNSAFE" | "UNKNOWN";
    incidents: Array<{
      state: string;
      correlation: string;
      band: string;
      minutesAgo: number;
      amount: number;
      beneficiary?: string;
      beneficiaryInst?: string;
      notified?: number;
      actionStatus?: string;
      authorityRef?: string;
      decisionNote?: string;
      txnStatus?: string;
      delayed?: "PHONE_SEIZED" | "NO_NETWORK" | "LEFT_DETENTION" | "REPORTED_BY_THIRD_PARTY" | "OTHER";
      method?: string;
      confidence?: "BANK_AUTHENTICATED" | "BANK_HEURISTIC";
    }>;
  };

  const seeds: Seed[] = [
    {
      episode: "ep-8841",
      customer: "cust_9f21",
      contact: "UNSAFE",
      incidents: [
        {
          state: "NOTIFIED",
          correlation: "CORRELATED",
          band: "PIN_ONLY_TIER_1",
          minutesAgo: 34,
          amount: 48_000_00,
          beneficiary: "ben_7712",
          beneficiaryInst: "mmo_adaeze",
          notified: 31,
          txnStatus: "COMPLETED",
          method: "PIN_DURESS_ENTRY",
          confidence: "BANK_AUTHENTICATED",
        },
        {
          state: "CORRELATED",
          correlation: "CORRELATED",
          band: "PIN_ONLY_TIER_1",
          minutesAgo: 12,
          amount: 50_000_00,
          beneficiary: "ben_7712",
          beneficiaryInst: "mmo_adaeze",
          txnStatus: "COMPLETED",
          method: "PIN_DURESS_ENTRY",
          confidence: "BANK_AUTHENTICATED",
        },
      ],
    },
    {
      episode: "ep-8842",
      customer: "cust_2c77",
      contact: "UNKNOWN",
      incidents: [
        {
          state: "REVIEW_PENDING",
          correlation: "CORRELATED",
          band: "PIN_ONLY_TIER_1",
          minutesAgo: 9,
          amount: 25_000_00,
          beneficiary: "ben_3390",
          beneficiaryInst: "bank_oreva",
          txnStatus: "PENDING",
          method: "PIN_DURESS_ENTRY",
          confidence: "BANK_AUTHENTICATED",
        },
      ],
    },
    {
      episode: "ep-8843",
      customer: "cust_5510",
      contact: "SAFE",
      incidents: [
        {
          state: "ACTION_DECLINED",
          correlation: "CORRELATED",
          band: "PIN_ONLY_TIER_1",
          minutesAgo: 190,
          amount: 96_500_00,
          beneficiary: "ben_1120",
          beneficiaryInst: "mmo_adaeze",
          notified: 185,
          actionStatus: "DECLINED",
          authorityRef: "PND-2022/44 (expired)",
          decisionNote: "Standing rule lapsed on 30 Sep. No live power to hold. Referred to fraud desk.",
          txnStatus: "COMPLETED",
          method: "PIN_DURESS_ENTRY",
          confidence: "BANK_AUTHENTICATED",
        },
      ],
    },
    {
      episode: "ep-8844",
      customer: "cust_7b03",
      contact: "UNSAFE",
      incidents: [
        {
          state: "CORRELATION_PENDING",
          correlation: "PENDING",
          band: "PIN_ONLY_TIER_2",
          minutesAgo: 4,
          amount: 150_000_00,
          txnStatus: "UNKNOWN",
          method: "PIN_DURESS_ENTRY",
          confidence: "BANK_AUTHENTICATED",
        },
      ],
    },
    {
      episode: "ep-8845",
      customer: "cust_0a19",
      contact: "UNKNOWN",
      incidents: [
        {
          state: "UNKNOWN",
          correlation: "UNKNOWN",
          band: "PIN_ONLY_TIER_1",
          minutesAgo: 420,
          amount: 18_000_00,
          beneficiary: "ben_5540",
          beneficiaryInst: "mmo_adaeze",
          txnStatus: "COMPLETED",
          delayed: "REPORTED_BY_THIRD_PARTY",
          method: "SILENT_CHECK_IN",
          confidence: "BANK_HEURISTIC",
        },
      ],
    },
    {
      episode: "ep-8846",
      customer: "cust_44de",
      contact: "SAFE",
      incidents: [
        {
          state: "CLOSED",
          correlation: "NOT_CORRELATED",
          band: "PIN_ONLY_TIER_1",
          minutesAgo: 1400,
          amount: 12_000_00,
          txnStatus: "FAILED",
          method: "PIN_DURESS_ENTRY",
          confidence: "BANK_AUTHENTICATED",
        },
      ],
    },
  ];

  for (const s of seeds) {
    const [ep] = await db
      .insert(episodes)
      .values({
        institutionId: "bank_kite",
        externalEpisodeId: s.episode,
        customerRef: s.customer,
        contactState: s.contact,
        openedAt: mins(s.incidents[0].minutesAgo + 5),
        closedAt: s.incidents.every((i) => i.state === "CLOSED") ? mins(s.incidents[0].minutesAgo - 60) : null,
      })
      .returning({ id: episodes.id });

    for (const i of s.incidents) {
      const eventId = randomUUID();
      const [inc] = await db
        .insert(incidents)
        .values({
          institutionId: "bank_kite",
          episodeId: ep.id,
          eventId,
          state: i.state as never,
          eventType: "SUSPECTED_DURESS",
          activationMethod: i.method ?? "PIN_DURESS_ENTRY",
          activationConfidence: i.confidence ?? "BANK_AUTHENTICATED",
          band: i.band,
          occurredAt: mins(i.minutesAgo),
          correlation: i.correlation as never,
          correlationNote:
            i.correlation === "NOT_CORRELATED"
              ? "No matching NIP transaction within the 15-minute window; customer confirmed the transfer never left."
              : i.correlation === "UNKNOWN"
                ? "NIP reconciliation has not returned a verdict for this reference."
                : null,
          receivingInstitutionId: i.beneficiaryInst ?? null,
          notifiedAt: i.notified ? mins(i.notified) : null,
          actionStatus: (i.actionStatus ?? "NONE") as never,
          authorityRef: i.authorityRef ?? null,
          decisionNote: i.decisionNote ?? null,
          closedAt: i.state === "CLOSED" ? mins(i.minutesAgo - 60) : null,
          closeReason: i.state === "CLOSED" ? "No matching transfer; customer confirmed safe at follow-up." : null,
        })
        .returning({ id: incidents.id });

      const envelope = {
        schema_version: "0.1",
        event_id: eventId,
        episode_id: randomUUID(),
        institution_id: "bank_kite",
        event_type: "SUSPECTED_DURESS",
        occurred_at: mins(i.minutesAgo).toISOString(),
        transaction: { ref: `NIP-${eventId.slice(0, 8)}`, status: i.txnStatus ?? "UNKNOWN" },
        customer: { ref: s.customer },
        activation: {
          method: i.method ?? "PIN_DURESS_ENTRY",
          confidence: i.confidence ?? "BANK_AUTHENTICATED",
          band: i.band,
        },
        ...(i.delayed
          ? {
              delayed_delivery: {
                reason_code: i.delayed,
                original_occurred_at: mins(i.minutesAgo + 300).toISOString(),
              },
            }
          : {}),
      };

      await db.insert(rawEvents).values({
        incidentId: inc.id,
        institutionId: "bank_kite",
        eventId,
        payload: envelope,
        payloadHash: `sha256:${eventId.replace(/-/g, "")}`,
        signatureValid: true,
        receivedAt: mins(i.minutesAgo - (i.delayed ? 0 : 0.2)),
      });

      if (i.beneficiary) {
        await db.insert(transactions).values({
          incidentId: inc.id,
          institutionId: "bank_kite",
          ref: envelope.transaction.ref,
          status: (i.txnStatus ?? "UNKNOWN") as never,
          amountMinor: i.amount,
          beneficiaryInstitutionId: i.beneficiaryInst ?? null,
          beneficiaryToken: i.beneficiary,
          createdAt: mins(i.minutesAgo),
        });
      }

      if (i.actionStatus && i.actionStatus !== "NONE") {
        await db.insert(actions).values({
          incidentId: inc.id,
          type: "HOLD_REQUEST",
          status: i.actionStatus as never,
          authorityRef: i.authorityRef ?? null,
          rationale: i.decisionNote ?? null,
          requestedAt: mins(i.minutesAgo - 1),
          decidedAt: mins(i.minutesAgo - 2),
        });
      }

      if (i.state === "RECIPIENT_CHALLENGE") {
        await db.insert(challenges).values({
          incidentId: inc.id,
          institutionId: "bank_kite",
          deferredUntil: new Date(Date.now() + 6 * 3600_000),
          recipientNotified: false,
        });
      }
    }
  }

  console.log("audit trail");
  const auditSeed = [
    ["incident.received", "bank_kite", 34],
    ["incident.correlate.correlated", "bank_kite", 33],
    ["incident.notified", "bank_kite", 31],
    ["action.hold_request.declined", "bank_kite", 185],
    ["challenge.opened", "bank_kite", 120],
  ] as const;
  for (const [action, inst, ago] of auditSeed) {
    await db.insert(auditEvents).values({
      institutionId: inst,
      actorLabel: "analyst:ada.nwachukwu",
      action,
      objectType: "incident",
      objectId: randomUUID(),
      reasonCode: action.includes("declined") ? "NO_LIVE_POWER" : null,
      hash: randomUUID().replace(/-/g, ""),
      createdAt: mins(ago),
    });
  }

  console.log("analytics");
  await sql`insert into analytics_events (name, path, props) values
    ('page.view', '/', '{"referrer":"direct"}'),
    ('page.view', '/protocol', '{"referrer":"/"}'),
    ('page.view', '/safety', '{"referrer":"/protocol"}')`;

  const counts = await sql`
    select
      (select count(*) from institutions) as institutions,
      (select count(*) from incidents) as incidents,
      (select count(*) from episodes) as episodes,
      (select count(*) from transactions) as transactions`;

  console.log(counts[0]);
  await sql.end();
}

await main();
