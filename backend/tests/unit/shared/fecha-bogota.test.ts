import { describe, it, expect } from "vitest";
import { startOfDayBogota, todayBogota, toDateOnly } from "../../../src/shared/utils/fecha-bogota.js";

describe("todayBogota", () => {
  it("uses the Bogota calendar day, not UTC (UTC-5)", () => {
    expect(todayBogota(new Date("2026-10-02T03:30:00Z"))).toBe("2026-10-01");
  });

  it("rolls to the next day at 05:00 UTC", () => {
    expect(todayBogota(new Date("2026-10-02T05:00:00Z"))).toBe("2026-10-02");
  });
});

describe("toDateOnly", () => {
  it("returns UTC midnight for the given day", () => {
    expect(toDateOnly("2026-10-01").toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });
});

describe("startOfDayBogota", () => {
  it("returns the instant Bogota's day starts (05:00 UTC)", () => {
    expect(startOfDayBogota("2026-08-07").toISOString()).toBe("2026-08-07T05:00:00.000Z");
  });
});
