import { StateTransitionError } from "./errors";
export { StateTransitionError } from "./errors";
export const STATES = [
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
] as const;

export type State = (typeof STATES)[number];

/**
 * Normative transitions from spec v0.1. `REJECTED` and `CLOSED` are the only
 * near-terminal states; CLOSED may reopen with a reason.
 */
export const TRANSITIONS: Record<State, readonly State[]> = {
  RECEIVED: ["AUTHENTICATED", "REJECTED"],
  AUTHENTICATED: ["CORRELATION_PENDING"],
  CORRELATION_PENDING: ["CORRELATED", "NOT_CORRELATED", "UNKNOWN"],
  CORRELATED: ["REVIEW_PENDING"],
  NOT_CORRELATED: ["CLOSED", "REVIEW_PENDING"],
  UNKNOWN: ["CORRELATION_PENDING", "REVIEW_PENDING", "CLOSED"],
  REVIEW_PENDING: ["NOTIFIED", "INVESTIGATION", "CLOSED"],
  NOTIFIED: ["ACTION_REQUESTED", "INVESTIGATION", "CLOSED"],
  ACTION_REQUESTED: ["ACTION_ACCEPTED", "ACTION_DECLINED", "ACTION_NOT_PERMITTED"],
  ACTION_ACCEPTED: ["INVESTIGATION", "RESOLVED"],
  ACTION_DECLINED: ["INVESTIGATION", "RESOLVED"],
  ACTION_NOT_PERMITTED: ["INVESTIGATION", "RESOLVED"],
  INVESTIGATION: ["RECIPIENT_CHALLENGE", "RESOLVED", "REFERRED", "CLOSED"],
  RECIPIENT_CHALLENGE: ["INVESTIGATION", "RESOLVED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  REFERRED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["INVESTIGATION"],
  REJECTED: [],
};

export const TERMINAL: readonly State[] = ["REJECTED"];

export function canTransition(from: State, to: State): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: State, to: State): void {
  if (!canTransition(from, to)) {
    throw new StateTransitionError(from, to);
  }
}

/** States that mean the incident still needs a human. */
export const OPEN_STATES: readonly State[] = [
  "RECEIVED",
  "AUTHENTICATED",
  "CORRELATION_PENDING",
  "CORRELATED",
  "UNKNOWN",
  "REVIEW_PENDING",
  "NOTIFIED",
  "ACTION_REQUESTED",
  "INVESTIGATION",
  "RECIPIENT_CHALLENGE",
  "REOPENED",
];

export const STATE_LABEL: Record<State, string> = {
  RECEIVED: "Received",
  AUTHENTICATED: "Authenticated",
  CORRELATION_PENDING: "Correlating",
  CORRELATED: "Correlated",
  NOT_CORRELATED: "Not correlated",
  UNKNOWN: "Status unknown",
  REVIEW_PENDING: "Needs review",
  NOTIFIED: "Receiving bank notified",
  ACTION_REQUESTED: "Action requested",
  ACTION_ACCEPTED: "Action accepted",
  ACTION_DECLINED: "Action declined",
  ACTION_NOT_PERMITTED: "Not permitted",
  INVESTIGATION: "Under investigation",
  RECIPIENT_CHALLENGE: "Recipient challenge",
  RESOLVED: "Resolved",
  REFERRED: "Referred",
  CLOSED: "Closed",
  REOPENED: "Reopened",
  REJECTED: "Rejected",
};

/** Tone mapping for the UI. No state is ever rendered as "guilty". */
export const STATE_TONE: Record<State, "neutral" | "guard" | "signal" | "critical"> = {
  RECEIVED: "neutral",
  AUTHENTICATED: "neutral",
  CORRELATION_PENDING: "signal",
  CORRELATED: "guard",
  NOT_CORRELATED: "neutral",
  UNKNOWN: "signal",
  REVIEW_PENDING: "signal",
  NOTIFIED: "guard",
  ACTION_REQUESTED: "signal",
  ACTION_ACCEPTED: "guard",
  ACTION_DECLINED: "neutral",
  ACTION_NOT_PERMITTED: "neutral",
  INVESTIGATION: "neutral",
  RECIPIENT_CHALLENGE: "signal",
  RESOLVED: "guard",
  REFERRED: "neutral",
  CLOSED: "neutral",
  REOPENED: "signal",
  REJECTED: "critical",
};
