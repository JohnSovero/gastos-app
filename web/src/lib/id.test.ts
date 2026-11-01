import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ supabase: {} }));
const { generarId } = await import("./api");

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("generarId", () => {
  it("funciona sin crypto.randomUUID (Safari por http://IP:5173)", () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      const a = generarId();
      const b = generarId();
      expect(a).toMatch(UUID_V4);
      expect(a).not.toBe(b);
    } finally {
      Object.defineProperty(crypto, "randomUUID", { value: original, configurable: true });
    }
  });

  it("usa crypto.randomUUID cuando existe", () => {
    expect(generarId()).toMatch(UUID_V4);
  });
});
