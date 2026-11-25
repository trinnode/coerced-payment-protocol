export class DomainError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class StateTransitionError extends DomainError {
  constructor(
    readonly from: string,
    readonly to: string,
  ) {
    super("E_INVALID_TRANSITION", `Illegal transition ${from} → ${to}`);
    this.name = "StateTransitionError";
  }
}
