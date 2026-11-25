import { describe, expect, it } from "vitest";
import { STATES, TRANSITIONS, TERMINAL, canTransition, assertTransition, StateTransitionError } from "@/lib/domain/states";

describe("incident state machine", () => {
  it("treats UNKNOWN as a first-class state with real exits", () => {
    expect(STATES).toContain("UNKNOWN");
    expect(TRANSITIONS.UNKNOWN.length).toBeGreaterThan(0);
  });

  it("never lets RECEIVED jump straight to CLOSED", () => {
    expect(canTransition("RECEIVED", "CLOSED")).toBe(false);
  });

  it("never auto-closes an action outcome without investigation", () => {
    expect(canTransition("ACTION_ACCEPTED", "CLOSED")).toBe(false);
    expect(canTransition("ACTION_ACCEPTED", "INVESTIGATION")).toBe(true);
  });

  it("allows reopening a closed case", () => {
    expect(canTransition("CLOSED", "REOPENED")).toBe(true);
    expect(canTransition("REJECTED", "CLOSED")).toBe(false);
  });

  it("has only REJECTED as truly terminal", () => {
    expect(TERMINAL).toEqual(["REJECTED"]);
    expect(TRANSITIONS.REJECTED).toEqual([]);
  });

  it("throws a typed error for an illegal transition", () => {
    expect(() => assertTransition("RECEIVED", "RESOLVED")).toThrow(StateTransitionError);
  });
});
