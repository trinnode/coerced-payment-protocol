import { describe, expect, it } from "vitest";
import { canonicalize, signingPayload } from "@/lib/domain/canonical";

describe("canonical JSON", () => {
  it("sorts object keys regardless of insertion order", () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe(canonicalize({ a: 2, b: 1 }));
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("emits no insignificant whitespace", () => {
    expect(canonicalize({ a: [1, 2, { b: "x" }] })).toBe('{"a":[1,2,{"b":"x"}]}');
  });

  it("excludes the signature member from signed bytes", () => {
    const withSig = { event_id: "e", signature: { alg: "Ed25519", value: "abc" } };
    expect(signingPayload(withSig)).toBe('{"event_id":"e"}');
  });

  it("rejects values that would serialise differently across runtimes", () => {
    expect(() => canonicalize({ a: undefined })).toThrow();
    expect(() => canonicalize(NaN)).toThrow();
    expect(() => canonicalize(Infinity)).toThrow();
  });

  it("handles nested arrays and unicode deterministically", () => {
    const a = { z: "àgbà", a: [true, null, -0] };
    expect(canonicalize(a)).toBe('{"a":[true,null,0],"z":"àgbà"}');
  });
});
