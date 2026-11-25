import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ── Enums ───────────────────────────────────────────────────────────────── */

export const institutionKind = pgEnum("institution_kind", ["bank", "mmo", "psp", "insurer"]);
export const institutionStatus = pgEnum("institution_status", ["sandbox", "active", "suspended"]);
export const userRole = pgEnum("user_role", ["analyst", "supervisor", "compliance"]);

export const incidentState = pgEnum("incident_state", [
  "RECEIVED",
  "AUTHENTICATED",
  "CORRELATION_PENDING",
  "CORRELATED",
  "NOT_CORRELATED",
  "UNKNOWN",
  "REVIEW_PENDING",
  "NOTIFIED",
  "ACTION_REQUESTED",
  "ACTION_ACCEPTED",
  "ACTION_DECLINED",
  "ACTION_NOT_PERMITTED",
  "INVESTIGATION",
  "RECIPIENT_CHALLENGE",
  "RESOLVED",
  "REFERRED",
  "CLOSED",
  "REOPENED",
  "REJECTED",
]);

export const correlationStatus = pgEnum("correlation_status", [
  "PENDING",
  "CORRELATED",
  "NOT_CORRELATED",
  "UNKNOWN",
]);

export const actionStatus = pgEnum("action_status", [
  "NONE",
  "REQUESTED",
  "ACCEPTED",
  "DECLINED",
  "NOT_PERMITTED",
]);

export const txnStatus = pgEnum("txn_status", [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "REVERSED",
  "UNKNOWN",
]);

export const challengeStatus = pgEnum("challenge_status", [
  "OPEN",
  "UPHELD",
  "RELEASED",
  "REJECTED",
]);

export const contactState = pgEnum("contact_state", ["SAFE", "UNSAFE", "UNKNOWN"]);

/* ── Tenancy and identity ────────────────────────────────────────────────── */

export const institutions = pgTable(
  "institutions",
  {
    id: text("id").primaryKey(), // e.g. bank_a
    legalName: text("legal_name").notNull(),
    shortName: text("short_name").notNull(),
    code: text("code").notNull(), // NIP institution code
    kind: institutionKind("kind").notNull(),
    status: institutionStatus("status").notNull().default("sandbox"),
    webhookUrl: text("webhook_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("institutions_code_uq").on(t.code)],
);

export const institutionKeys = pgTable(
  "institution_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    institutionId: text("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "cascade" }),
    keyId: text("key_id").notNull(),
    publicKeyPem: text("public_key_pem").notNull(),
    algorithm: text("algorithm").notNull().default("Ed25519"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("institution_keys_key_uq").on(t.institutionId, t.keyId),
    index("institution_keys_inst_idx").on(t.institutionId),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    institutionId: text("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: userRole("role").notNull().default("analyst"),
    passwordHash: text("password_hash").notNull(),
    active: boolean("active").notNull().default(true),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email), index("users_inst_idx").on(t.institutionId)],
);

/* ── Incident domain ─────────────────────────────────────────────────────── */

export const episodes = pgTable(
  "episodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    institutionId: text("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "cascade" }),
    externalEpisodeId: text("external_episode_id").notNull(),
    customerRef: text("customer_ref").notNull(),
    contactState: contactState("contact_state").notNull().default("UNKNOWN"),
    openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("episodes_ext_uq").on(t.institutionId, t.externalEpisodeId),
    index("episodes_inst_idx").on(t.institutionId),
  ],
);

export const incidents = pgTable(
  "incidents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    institutionId: text("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "cascade" }),
    episodeId: uuid("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    eventId: text("event_id").notNull(),
    state: incidentState("state").notNull().default("RECEIVED"),
    eventType: text("event_type").notNull(),
    activationMethod: text("activation_method").notNull(),
    activationConfidence: text("activation_confidence").notNull(),
    band: text("band"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),

    correlation: correlationStatus("correlation").notNull().default("PENDING"),
    correlationNote: text("correlation_note"),
    receivingInstitutionId: text("receiving_institution_id").references(() => institutions.id),

    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    actionStatus: actionStatus("action_status").notNull().default("NONE"),
    authorityRef: text("authority_ref"),
    decisionNote: text("decision_note"),

    assignedTo: uuid("assigned_to").references(() => users.id),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closeReason: text("close_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("incidents_event_uq").on(t.institutionId, t.eventId),
    index("incidents_inst_state_idx").on(t.institutionId, t.state),
    index("incidents_episode_idx").on(t.episodeId),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    institutionId: text("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "cascade" }),
    ref: text("ref").notNull(),
    status: txnStatus("status").notNull().default("UNKNOWN"),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("NGN"),
    beneficiaryInstitutionId: text("beneficiary_institution_id").references(() => institutions.id),
    beneficiaryToken: text("beneficiary_token"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("txn_ref_uq").on(t.institutionId, t.ref),
    index("txn_incident_idx").on(t.incidentId),
  ],
);

export const rawEvents = pgTable(
  "raw_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    incidentId: uuid("incident_id").references(() => incidents.id, { onDelete: "cascade" }),
    institutionId: text("institution_id").notNull(),
    eventId: text("event_id").notNull(),
    payload: jsonb("payload").notNull(),
    payloadHash: text("payload_hash").notNull(),
    signatureValid: boolean("signature_valid").notNull().default(false),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("raw_events_event_idx").on(t.institutionId, t.eventId)],
);

export const actions = pgTable(
  "actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // NOTIFY | HOLD_REQUEST | RELEASE | CORRECTION | CLOSE | ESCALATE
    status: actionStatus("status").notNull().default("REQUESTED"),
    requestedBy: uuid("requested_by").references(() => users.id),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    authorityRef: text("authority_ref"),
    standingRuleId: text("standing_rule_id"),
    rationale: text("rationale"),
  },
  (t) => [index("actions_incident_idx").on(t.incidentId)],
);

export const challenges = pgTable(
  "challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    institutionId: text("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "cascade" }),
    status: challengeStatus("status").notNull().default("OPEN"),
    // PHYLAX: notification to the recipient is deferred while the sender may be at risk.
    recipientNotified: boolean("recipient_notified").notNull().default(false),
    deferredUntil: timestamp("deferred_until", { withTimezone: true }),
    openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNote: text("resolution_note"),
  },
  (t) => [index("challenges_incident_idx").on(t.incidentId)],
);

/* ── Audit and telemetry ─────────────────────────────────────────────────── */

export const auditEvents = pgTable(
  "audit_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    institutionId: text("institution_id"),
    actorId: uuid("actor_id"),
    actorLabel: text("actor_label").notNull(),
    action: text("action").notNull(),
    objectType: text("object_type").notNull(),
    objectId: text("object_id").notNull(),
    reasonCode: text("reason_code"),
    metadata: jsonb("metadata"),
    prevHash: text("prev_hash"),
    hash: text("hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("audit_inst_idx").on(t.institutionId, t.createdAt)],
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    name: text("name").notNull(),
    path: text("path"),
    props: jsonb("props"),
    sessionId: text("session_id"),
    institutionId: text("institution_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("analytics_name_idx").on(t.name, t.createdAt)],
);

export const webVitals = pgTable("web_vitals", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  metric: text("metric").notNull(),
  value: integer("value").notNull(),
  path: text("path"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
