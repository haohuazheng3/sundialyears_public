import { describe, expect, it } from "vitest";
import { digestEmail, nextAlarm, REMINDER_MS, type AlarmState } from "./alerting";

const t0 = new Date("2026-11-06T10:00:00Z");
const at = (minutes: number) => new Date(t0.getTime() + minutes * 60_000);
const UP: AlarmState = { fails: 0, alertedAt: null };

/** Feed a sequence of probe results (every 30 min) and collect the emails the alarm would send. */
function run(probes: boolean[], start: AlarmState = UP) {
  let s = start;
  return probes.map((ok, i) => {
    const r = nextAlarm(s, ok, at(i * 30));
    s = r.next;
    return r.email;
  });
}

describe("nextAlarm (email on state change only)", () => {
  it("stays silent while healthy", () => {
    expect(run([true, true, true])).toEqual([null, null, null]);
  });

  it("ignores a single failed probe (debounce)", () => {
    expect(run([true, false, true, false, true])).toEqual([null, null, null, null, null]);
  });

  it("sends DOWN on the 2nd consecutive failure, then nothing while still down, then one RECOVERED", () => {
    expect(run([false, false, false, false, false, true, true])).toEqual([null, "down", null, null, null, "recovered", null]);
  });

  it("reminds at most once per 24 h while down", () => {
    const probes = Array.from({ length: 2 + 48 * 2 }, () => false); // 2 failures + 48 h more of failures every 30 min
    const emails = run(probes);
    expect(emails.filter((e) => e === "down")).toHaveLength(1);
    expect(emails.filter((e) => e === "reminder")).toHaveLength(2);
    expect(emails.indexOf("reminder") - emails.indexOf("down")).toBe(REMINDER_MS / (30 * 60_000));
  });

  it("a fresh failure after recovery needs two failures again", () => {
    expect(run([false, false, true, false, true, false, false])).toEqual([null, "down", "recovered", null, null, null, "down"]);
  });

  it("keeps the original alert time between reminders", () => {
    const down = nextAlarm({ fails: 1, alertedAt: null }, false, t0).next;
    expect(nextAlarm(down, false, at(60)).next.alertedAt).toEqual(t0);
  });
});

describe("digestEmail", () => {
  const item = {
    name: "Error",
    message: "Minified React error #418;\n  visit https://react.dev/errors/418",
    route: "/",
    source: "client",
    count: 3,
    firstSeen: new Date("2026-11-06T22:52:25Z"),
    lastSeen: new Date("2026-11-07T08:00:00Z"),
  };

  it("summarizes count, top items and the admin link", () => {
    const { subject, text } = digestEmail(1, [item], "https://sundialyears.com/admin#errors");
    expect(subject).toBe("Daily error digest: 1 unresolved error group");
    expect(text).toContain("1. Error: Minified React error #418; visit https://react.dev/errors/418");
    expect(text).toContain("client · / · 3× · first seen 2026-11-06 22:52 UTC · last seen 2026-11-07 08:00 UTC");
    expect(text).toContain("https://sundialyears.com/admin#errors");
    expect(text).toContain("not an outage alert");
  });

  it("says when only the top items are listed and pluralizes", () => {
    const { subject, text } = digestEmail(12, [item, { ...item, route: null, message: "x".repeat(400) }], "/admin");
    expect(subject).toBe("Daily error digest: 12 unresolved error groups");
    expect(text).toContain("(top 2 by occurrences)");
    expect(text).toContain("(no route)");
    expect(text).toContain(`${"x".repeat(199)}…`);
  });
});
