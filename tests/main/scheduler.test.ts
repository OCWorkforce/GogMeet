import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { MeetingEvent } from "../../src/shared/types.js";

// Mock electron before importing scheduler
vi.mock("electron", () => ({
  shell: { openExternal: vi.fn().mockResolvedValue(undefined) },
}));

// Mock calendar module
vi.mock("../../src/main/calendar.js", () => ({
  getCalendarEvents: vi.fn().mockResolvedValue([]),
}));

const { scheduleEvents, firedEvents, scheduledStartMs, timers } =
  await import("../../src/main/scheduler.js");

function makeEvent(overrides: Partial<MeetingEvent> = {}): MeetingEvent {
  return {
    id: "test-id",
    title: "Test Meeting",
    startDate: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min from now
    endDate: new Date(Date.now() + 35 * 60 * 1000).toISOString(),
    meetUrl: "https://meet.google.com/abc-def-ghi",
    calendarName: "Work",
    isAllDay: false,
    userEmail: "user@example.com",
    ...overrides,
  };
}

describe("scheduleEvents", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    timers.clear();
    firedEvents.clear();
    scheduledStartMs.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    timers.clear();
    firedEvents.clear();
    scheduledStartMs.clear();
  });

  it("rescheduled event gets a new timer at the new start time", () => {
    const originalStart = new Date(Date.now() + 5 * 60 * 1000);
    const newStart = new Date(Date.now() + 10 * 60 * 1000);

    const event = makeEvent({
      id: "A",
      startDate: originalStart.toISOString(),
    });
    scheduleEvents([event]);

    expect(timers.has("A")).toBe(true);
    expect(scheduledStartMs.get("A")).toBe(originalStart.getTime());

    // Reschedule to new time
    const rescheduled = makeEvent({
      id: "A",
      startDate: newStart.toISOString(),
    });
    scheduleEvents([rescheduled]);

    expect(timers.has("A")).toBe(true);
    expect(scheduledStartMs.get("A")).toBe(newStart.getTime());
    expect(firedEvents.has("A")).toBe(false);
  });

  it("firedEvents entries for removed events are pruned on each poll", () => {
    firedEvents.add("B");
    expect(firedEvents.has("B")).toBe(true);

    // Call with empty list — 'B' is no longer active
    scheduleEvents([]);

    expect(firedEvents.has("B")).toBe(false);
  });

  it("already-fired event at the same start time is not rescheduled", () => {
    const startDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const event = makeEvent({ id: "C", startDate });
    const startMs = new Date(startDate).getTime();

    // Mark as already fired
    firedEvents.add("C");
    scheduledStartMs.set("C", startMs);

    scheduleEvents([event]);

    expect(timers.has("C")).toBe(false);
    expect(firedEvents.has("C")).toBe(true);
  });
});
