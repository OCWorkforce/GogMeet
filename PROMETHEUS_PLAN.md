# GiMeet Prometheus Plan

**Created:** 2026-03-10
**Branch:** develop
**Commit:** HEAD
**Total Effort:** ~4-5 days (parallelizable to ~3 days with 2 workers)

---

## Architecture

```
WAVE 1 (Security Hardening)     WAVE 2 (Refactoring)           WAVE 3 (Tests)
┌─────────────────────────┐    ┌────────────────────────┐     ┌─────────────────────────┐
│ T1: IPC sender validate │    │ T5: clearAllDisplay    │     │ T9:  tray.ts tests      │
│ T2: Height bounds       │──→ │     Timers()           │──→  │ T10: meet-url.ts tests  │
│ T3: Log unauthorized    │    │ T6: cleanupStaleTimers │     │ T11: index.ts tests     │
│ T4: Fix test endMs      │    │ T7: Non-null removals  │     │ T12: Fix inline copies  │
│                         │    │ T8: URL allowlist in   │     │ T13: Add missing mocks  │
│                         │    │     buildMeetUrl()      │     │                         │
└─────────────────────────┘    └────────────────────────┘     └─────────────────────────┘
         ↓ all                          ↓ all                          ↓ all
    typecheck + test              typecheck + test               typecheck + test
```

---

## WAVE 1 — Security Hardening (2-3h)

**Risk:** LOW — all changes are additive guards; no logic restructuring.
**Parallelism:** T1+T2+T3 can run as single task (same file). T4 independent.

### T1: Add sender validation to WINDOW_SET_HEIGHT

| Field                  | Value                                                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **File**               | `src/main/ipc.ts:76`                                                                                                                                                                                                     |
| **Priority**           | HIGH (security)                                                                                                                                                                                                          |
| **Effort**             | Quick (15 min)                                                                                                                                                                                                           |
| **What**               | `ipcMain.on(WINDOW_SET_HEIGHT)` lacks `validateSender()` check. All other IPC handlers have it.                                                                                                                          |
| **Change**             | Convert from `ipcMain.on` → `ipcMain.handle` with `validateSender(event)` guard, OR add manual `event.senderFrame.url` check inside `ipcMain.on` callback (since `.on` receives `IpcMainEvent` not `IpcMainInvokeEvent`) |
| **Preferred approach** | Keep `ipcMain.on` (fire-and-forget is correct for height), but add sender frame URL validation inline. The `_event` parameter already receives `IpcMainEvent` which has `senderFrame`.                                   |
| **Success criteria**   | Unauthorized senders get rejected; existing height-setting still works                                                                                                                                                   |
| **Verification**       | `bun run typecheck && bun run test` — ipc.test.ts passes. Add new test case for rejected sender.                                                                                                                         |

**Specific code change:**

```typescript
// Line 76: Change _event to event, add validation
ipcMain.on(IPC_CHANNELS.WINDOW_SET_HEIGHT, (event, height: number) => {
  // Validate sender (same logic as validateSender but for IpcMainEvent)
  const senderUrl = event.senderFrame?.url ?? "";
  const isAllowed =
    senderUrl.startsWith("file://") ||
    ALLOWED_ORIGINS.has(senderUrl.split("/").slice(0, 3).join("/")) ||
    [...ALLOWED_ORIGINS].some((o) => senderUrl.startsWith(o));
  if (!isAllowed) return;
  // ... existing logic
});
```

**NOTE:** Since `IpcMainEvent` and `IpcMainInvokeEvent` share `senderFrame`, the cleanest approach is to extract the URL check from `validateSender` into a shared helper, or simply reuse `validateSender` by casting (both have compatible `senderFrame` shape). Implementer should check the actual type compatibility.

---

### T2: Add height bounds to WINDOW_SET_HEIGHT

| Field                | Value                                                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**             | `src/main/ipc.ts:78-80`                                                                                                                               |
| **Priority**         | HIGH (security)                                                                                                                                       |
| **Effort**           | Quick (10 min)                                                                                                                                        |
| **What**             | Currently accepts any positive number. Should be clamped to reasonable bounds.                                                                        |
| **Change**           | Add `MIN_HEIGHT = 220` and `MAX_HEIGHT = 480` constants. Clamp height: `Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.round(height)))`               |
| **Success criteria** | Heights outside 220-480 are clamped, not rejected (graceful degradation). Window config in `index.ts:43` uses `height: 480` as initial — MAX matches. |
| **Verification**     | Add test cases: height=100 → clamped to 220, height=1000 → clamped to 480, height=300 → passes through.                                               |

**Constants location:** Top of `ipc.ts` near `ALLOWED_ORIGINS`:

```typescript
/** Acceptable height bounds for the popover window */
const MIN_WINDOW_HEIGHT = 220;
const MAX_WINDOW_HEIGHT = 480;
```

---

### T3: Log unauthorized IPC attempts

| Field                | Value                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| **File**             | `src/main/ipc.ts:22-31` (validateSender)                                                              |
| **Priority**         | MEDIUM (observability)                                                                                |
| **Effort**           | Quick (10 min)                                                                                        |
| **What**             | `validateSender` silently returns `false`. Should log rejected attempts for debugging/security audit. |
| **Change**           | Add `console.warn("[ipc] Rejected IPC from unauthorized sender:", senderUrl)` before `return false`   |
| **Success criteria** | Unauthorized attempts produce a warning log                                                           |
| **Verification**     | Manual — check log output. Existing tests unaffected (they test return value, not console output).    |

---

### T4: Fix test helper missing endMs

| Field                | Value                                                                                                                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**             | `tests/main/scheduler.test.ts:104-108`                                                                                                                                                   |
| **Priority**         | MEDIUM (test correctness)                                                                                                                                                                |
| **Effort**           | Quick (5 min)                                                                                                                                                                            |
| **What**             | `scheduledEventData.set("C", {...})` in test "C" is missing `endMs` field. Production `scheduledEventData` always stores `{title, meetUrl, startMs, endMs}`. Test uses incomplete shape. |
| **Change**           | Add `endMs: startMs + 30 * 60 * 1000` to the test data object                                                                                                                            |
| **Success criteria** | Test still passes. Type error would surface if scheduledEventData had stricter typing.                                                                                                   |
| **Verification**     | `bun run test`                                                                                                                                                                           |

**Specific change:**

```typescript
// Line 104-108
scheduledEventData.set("C", {
  title: "Test Meeting",
  meetUrl: "https://meet.google.com/abc-def-ghi",
  startMs,
  endMs: startMs + 30 * 60 * 1000, // ← ADD THIS
});
```

---

### Wave 1 Definition of Done

- [ ] All IPC handlers validate sender (including `WINDOW_SET_HEIGHT`)
- [ ] Window height is clamped to [220, 480]
- [ ] Unauthorized IPC attempts produce `console.warn`
- [ ] Test data matches production shape (endMs present)
- [ ] `bun run typecheck` passes
- [ ] `bun run test` passes (all existing + new tests)

---

## WAVE 2 — Structural Refactoring (1-2 days)

**Risk:** MEDIUM — refactoring timer cleanup logic touches critical scheduler paths. Must preserve exact behavior.
**Parallelism:** T5+T6 are tightly coupled (same file, same concern). T7 can partly overlap. T8 is independent.
**Dependency:** T5 and T6 depend on Wave 1 being complete (test infrastructure must be clean first).

### T5: Extract duplicated error cleanup to clearAllDisplayTimers()

| Field                | Value                                                                                                                                                                                                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**             | `src/main/scheduler.ts:449-462` and `468-482`                                                                                                                                                                                                                                                             |
| **Priority**         | HIGH (DRY, maintainability)                                                                                                                                                                                                                                                                               |
| **Effort**           | Short (30 min)                                                                                                                                                                                                                                                                                            |
| **What**             | The `poll()` function has **identical 8-line cleanup blocks** in both `if (result.error)` and `catch` branches (lines 449-462 ≡ 468-482). Both clear `countdownIntervals`, `clearTimers`, `inMeetingIntervals`, `inMeetingEndTimers`, reset `activeInMeetingEventId`, and call `resolveActiveTitleEvent`. |
| **Change**           | Extract to `function clearAllDisplayTimers(): void`                                                                                                                                                                                                                                                       |
| **Success criteria** | `poll()` calls `clearAllDisplayTimers()` in both error paths. No behavior change.                                                                                                                                                                                                                         |
| **Verification**     | `bun run test` — all scheduler E16/E17/E18 tests pass unchanged                                                                                                                                                                                                                                           |

**Extracted function:**

```typescript
/** Clear all display-related timers (countdown, clear, in-meeting) — used on consecutive errors */
function clearAllDisplayTimers(): void {
  for (const handle of countdownIntervals.values()) clearInterval(handle);
  countdownIntervals.clear();
  for (const handle of clearTimers.values()) clearTimeout(handle);
  clearTimers.clear();
  for (const handle of inMeetingIntervals.values()) clearInterval(handle);
  inMeetingIntervals.clear();
  for (const handle of inMeetingEndTimers.values()) clearTimeout(handle);
  inMeetingEndTimers.clear();
  activeInMeetingEventId = null;
  resolveActiveTitleEvent();
}
```

**poll() becomes:**

```typescript
if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
  clearAllDisplayTimers();
  console.error(
    `[scheduler] ${MAX_CONSECUTIVE_ERRORS} consecutive errors — cleared tray title`,
  );
}
```

---

### T6: Extract 6 timer-cleanup loops to cleanupStaleTimers()

| Field                | Value                                                                                                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**             | `src/main/scheduler.ts:383-420`                                                                                                                                                                             |
| **Priority**         | HIGH (DRY, maintainability)                                                                                                                                                                                 |
| **Effort**           | Short (45 min)                                                                                                                                                                                              |
| **What**             | Six nearly-identical `for..of` loops delete stale entries from 6 different Maps. Each follows the pattern: `for (const [id, handle] of map) { if (!activeIds.has(id)) { clear(handle); map.delete(id); } }` |
| **Change**           | Extract to a generic helper. Note: 4 use `clearTimeout`, 2 use `clearInterval` — the helper needs to accept the clear function.                                                                             |
| **Success criteria** | `scheduleEvents()` cleanup section reduced from 38 lines to ~8 lines. No behavior change.                                                                                                                   |
| **Verification**     | `bun run test` — all tests pass unchanged                                                                                                                                                                   |

**Helper function:**

```typescript
/** Remove entries from a timer map whose keys are not in activeIds */
function cleanupStaleEntries(
  map: Map<string, ReturnType<typeof setTimeout>>,
  activeIds: Set<string>,
  clearFn: typeof clearTimeout,
): void {
  for (const [id, handle] of map) {
    if (!activeIds.has(id)) {
      clearFn(handle);
      map.delete(id);
    }
  }
}
```

**Usage (replaces lines 383-420):**

```typescript
cleanupStaleEntries(timers, activeIds, clearTimeout);
cleanupStaleEntries(titleTimers, activeIds, clearTimeout);
cleanupStaleEntries(countdownIntervals, activeIds, clearInterval);
cleanupStaleEntries(clearTimers, activeIds, clearTimeout);
cleanupStaleEntries(inMeetingIntervals, activeIds, clearInterval);
cleanupStaleEntries(inMeetingEndTimers, activeIds, clearTimeout);
```

---

### T7: Replace non-null assertions with null checks

| Field                    | Value                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| **File**                 | `src/main/scheduler.ts` (9 locations)                                                           |
| **Priority**             | MEDIUM (robustness)                                                                             |
| **Effort**               | Short (30 min)                                                                                  |
| **What**                 | 9 `!` (non-null assertion) uses. Some are safe (guarded by `.has()` check above), some are not. |
| **Locations & changes:** |

| Line | Expression                          | Safe?                                     | Fix                                                                                 |
| ---- | ----------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------- |
| 93   | `scheduledEventData.get(bestId)!`   | YES (bestId set from `.keys()` iteration) | Add early return: `const data = scheduledEventData.get(bestId); if (!data) return;` |
| 122  | `scheduledEventData.get(bestId)!`   | YES (same pattern)                        | Same fix                                                                            |
| 162  | `inMeetingIntervals.get(eventId)!`  | YES (set on line 153)                     | Use optional: `const h = inMeetingIntervals.get(eventId); if (h) clearInterval(h);` |
| 238  | `timers.get(event.id)!`             | YES (guarded by `timers.has()` on 218)    | `const h = timers.get(event.id); if (h) clearTimeout(h);`                           |
| 255  | `timers.get(event.id)!`             | YES (same guard)                          | Same pattern                                                                        |
| 299  | `titleTimers.get(event.id)!`        | YES (guarded by `.has()` on 298)          | Same pattern                                                                        |
| 303  | `countdownIntervals.get(event.id)!` | YES (guarded by `.has()` on 302)          | Same pattern                                                                        |
| 307  | `clearTimers.get(event.id)!`        | YES (guarded by `.has()` on 306)          | Same pattern                                                                        |
| 341  | `countdownIntervals.get(event.id)!` | MEDIUM (set earlier in function)          | Same pattern                                                                        |

| **Success criteria** | Zero `!` assertions in scheduler.ts. All guarded by null checks. |
| **Verification** | `bun run typecheck && bun run test` |

**NOTE:** For the `.has()` + `.get()!` pattern, the idiomatic fix is to use `.get()` once and check the result. This also avoids the double-lookup performance cost.

---

### T8: Add URL allowlist check in buildMeetUrl()

| Field                | Value                                                                                                                                                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**             | `src/main/utils/meet-url.ts:7-16`                                                                                                                                                                                                                     |
| **Priority**         | HIGH (security)                                                                                                                                                                                                                                       |
| **Effort**           | Quick (20 min)                                                                                                                                                                                                                                        |
| **What**             | `buildMeetUrl()` constructs a URL from `event.meetUrl` without validating the domain. It prepends `https://` if missing but doesn't verify the URL is actually a Google Meet URL. A malicious calendar event could contain `evil.com` as the meetUrl. |
| **Change**           | Import `isAllowedMeetUrl` from `../ipc.js` (or extract to a shared util) and validate the constructed URL before returning it. Return empty string or throw if invalid.                                                                               |
| **Consideration**    | `isAllowedMeetUrl` lives in `ipc.ts`. It should be extracted to a shared location (e.g., `utils/url-validation.ts`) to avoid circular dependency `meet-url → ipc → ... → meet-url`.                                                                   |
| **Success criteria** | `buildMeetUrl({ meetUrl: "https://evil.com/..." })` returns empty string or throws                                                                                                                                                                    |
| **Verification**     | New tests in `tests/main/meet-url.test.ts`                                                                                                                                                                                                            |

**Recommended approach:**

1. Create `src/main/utils/url-validation.ts` with `isAllowedMeetUrl()` + `MEET_URL_ALLOWLIST`
2. Import in both `ipc.ts` and `meet-url.ts`
3. In `buildMeetUrl()`, validate after URL construction:

```typescript
export function buildMeetUrl(event: MeetingEvent): string {
  if (!event.meetUrl) return "";
  const base = event.meetUrl.startsWith("https://")
    ? event.meetUrl
    : `https://${event.meetUrl}`;
  if (!isAllowedMeetUrl(base)) return "";
  // ... rest of function
}
```

---

### Wave 2 Definition of Done

- [ ] `clearAllDisplayTimers()` extracted; used in both `poll()` error paths
- [ ] `cleanupStaleEntries()` extracted; 6 cleanup loops replaced with 6 calls
- [ ] Zero `!` non-null assertions in `scheduler.ts`
- [ ] `buildMeetUrl()` validates URL domain before construction
- [ ] `isAllowedMeetUrl()` moved to shared utility (no circular deps)
- [ ] Net code reduction: ~60 lines removed
- [ ] `bun run typecheck` passes
- [ ] `bun run test` passes (all existing tests unchanged)

---

## WAVE 3 — Test Coverage (2-3 days)

**Risk:** LOW — additive only, no production code changes (except T12 which refactors test imports).
**Parallelism:** T9, T10, T11 are fully independent. T12+T13 can run together.
**Dependency:** Must run AFTER Wave 2 (tests should cover refactored code, not pre-refactored).

### T9: Write tests for tray.ts (224 lines)

| Field         | Value                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Files**     | Create `tests/main/tray.test.ts`                                                                                                                       |
| **Priority**  | HIGH (largest untested file)                                                                                                                           |
| **Effort**    | Medium (4-6h)                                                                                                                                          |
| **What**      | `tray.ts` has 224 lines and zero test coverage. Contains `setupTray`, `updateTrayTitle`, `formatRemainingTime`, `buildMeetingMenuTemplate` (internal). |
| **Test plan** |                                                                                                                                                        |

**`formatRemainingTime()` — exported, pure function (easy):**

- 0 → "0m"
- 45 → "45m"
- 60 → "1h"
- 90 → "1h 30m"
- Negative → "0m"

**`updateTrayTitle()` — exported, depends on tray singleton:**

- null → `tray.setTitle("")`
- Long title → truncated to 12 chars + "…"
- Short title → not truncated
- With minsRemaining → appends " in X mins"
- minsRemaining=1 → appends " in 1 min" (singular)
- inMeeting=true → uses "Xh Ym" format

**`setupTray()` — integration-level, needs Electron mocks:**

- Creates Tray instance
- Registers click handler
- Theme change updates icon
- Click populates context menu with events

**`buildMeetingMenuTemplate()` — internal (test via setupTray click simulation):**

- No events → "No upcoming meetings" + About + Quit
- Today events grouped under "Today"
- Tomorrow events grouped under "Tomorrow"
- All-day events excluded
- Events without meetUrl excluded

| **Success criteria** | >80% line coverage of tray.ts |
| **Verification** | `bun run test` |
| **Mock needs** | `Tray` (already in setup.main.ts — add `setTitle`, `setImage`), `nativeTheme`, `Menu`, `getCalendarEventsResult` |

**Missing mock additions to `tests/setup.main.ts`:**

- `Tray` needs: `setTitle: vi.fn()`, `setImage: vi.fn()` (currently missing)
- `nativeTheme`: `shouldUseDarkColors: false`, `on: vi.fn()` (currently missing from setup)
- `BrowserWindow.getAllWindows`: `vi.fn().mockReturnValue([])` (currently missing)
- `dialog`: `showErrorBox: vi.fn()` (currently missing — used by `index.ts`)

---

### T10: Write tests for meet-url.ts (17 lines)

| Field         | Value                                                        |
| ------------- | ------------------------------------------------------------ |
| **Files**     | Create `tests/main/meet-url.test.ts`                         |
| **Priority**  | MEDIUM (small but security-relevant after T8)                |
| **Effort**    | Short (1-2h)                                                 |
| **What**      | `buildMeetUrl()` — 17 lines, pure function, no current tests |
| **Test plan** |                                                              |

**Core behavior:**

- Event with meetUrl starting with `https://` → returned as-is (with authuser)
- Event with meetUrl without `https://` → prepended
- Event with email → `?authuser=email@example.com` appended
- Event without email → no query param
- Event with empty email → no query param
- Email with special chars → properly encoded

**After T8 (URL validation):**

- Event with `meetUrl: "https://evil.com/"` → returns `""`
- Event with `meetUrl: "https://meet.google.com/abc"` → returns valid URL
- Event without meetUrl → returns `""` (or handles gracefully)

| **Success criteria** | 100% line coverage of meet-url.ts |
| **Verification** | `bun run test` |
| **Mock needs** | None — pure function. After T8, may need `isAllowedMeetUrl` to be non-mocked or tested alongside. |

---

### T11: Write tests for main/index.ts (115 lines)

| Field         | Value                                                    |
| ------------- | -------------------------------------------------------- |
| **Files**     | Create `tests/main/index.test.ts`                        |
| **Priority**  | MEDIUM (app lifecycle)                                   |
| **Effort**    | Medium (3-4h)                                            |
| **What**      | `createWindow()`, app lifecycle handlers, error handlers |
| **Test plan** |                                                          |

**`createWindow()`:**

- Creates BrowserWindow with correct config (width=360, height=480, sandbox=true, etc.)
- Dev mode → `loadURL` with `VITE_DEV_SERVER_URL`
- Production → `loadFile` with renderer path
- Close event → prevented, window hidden, dock hidden
- Blur event → hides in production, no-op in dev
- Minimize event → hides window

**App lifecycle:**

- `whenReady` → calls `createWindow`, `registerIpcHandlers`, `setupTray`, `startScheduler`
- `before-quit` → calls `stopScheduler`, destroys window
- `window-all-closed` → no-op (tray-only)

**Error handlers:**

- `uncaughtException` in prod → `dialog.showErrorBox` + `app.exit(1)`
- `uncaughtException` in dev → logs only
- `unhandledRejection` → logs only, no exit

| **Success criteria** | >70% line coverage of index.ts |
| **Verification** | `bun run test` |
| **Mock needs** | `dialog.showErrorBox` (add to setup.main.ts), `BrowserWindow.getAllWindows` (add), `process.on` override |

---

### T12: Fix tests that test inline copies instead of actual code

| Field                | Value                                                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Files**            | `tests/renderer/escape-html.test.ts`, `tests/renderer/delegation.test.ts`                                                                                                                              |
| **Priority**         | MEDIUM (test integrity)                                                                                                                                                                                |
| **Effort**           | Short (1-2h)                                                                                                                                                                                           |
| **What**             | Renderer tests may define inline copies of functions (e.g., `escapeHtml`) rather than importing from source. Changes to source won't break these tests — false confidence.                             |
| **Change**           | Import actual functions from `src/renderer/index.ts` (may need to export them). If functions are deeply embedded in the renderer module, extract to `src/renderer/utils.ts` and import in both places. |
| **Success criteria** | Test files import from source — no inline reimplementations                                                                                                                                            |
| **Verification**     | `bun run test`                                                                                                                                                                                         |

---

### T13: Add missing Electron mocks

| Field             | Value                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| **Files**         | `tests/setup.main.ts`                                                                                     |
| **Priority**      | LOW (enables T9, T11)                                                                                     |
| **Effort**        | Quick (30 min)                                                                                            |
| **What**          | Several Electron APIs used in production are not mocked, preventing test coverage of tray.ts and index.ts |
| **Missing mocks** |                                                                                                           |

```typescript
// Add to existing BrowserWindow mock:
getAllWindows: vi.fn().mockReturnValue([]),
setSize: vi.fn(),
setAlwaysOnTop: vi.fn(),

// Add to existing Tray mock:
setTitle: vi.fn(),
setImage: vi.fn(),

// Add new:
dialog: {
  showErrorBox: vi.fn(),
  showMessageBox: vi.fn().mockResolvedValue({ response: 0 }),
},
nativeTheme: {
  shouldUseDarkColors: false,
  on: vi.fn(),
},
```

| **Success criteria** | All mocks used by T9 and T11 are available |
| **Verification** | `bun run typecheck && bun run test` |

---

### Wave 3 Definition of Done

- [ ] `tests/main/tray.test.ts` exists with >80% coverage of tray.ts
- [ ] `tests/main/meet-url.test.ts` exists with 100% coverage of meet-url.ts
- [ ] `tests/main/index.test.ts` exists with >70% coverage of index.ts
- [ ] Renderer tests import from source, not inline copies
- [ ] `setup.main.ts` has all necessary Electron mocks
- [ ] `bun run test` passes (all tests)
- [ ] Total test lines: ~1,600+ (up from 1,127)

---

## WAVE 4 — Modern Patterns (Optional, 1-2 days)

**Risk:** LOW-MEDIUM — optional improvements, can be skipped.
**Dependency:** After Waves 1-3.

### T14: Replace node:crypto with Bun-native hashing

| Field        | Value                                                                                                                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**     | `src/main/calendar.ts:4,27-30`                                                                                                                                                                                                                                |
| **Effort**   | Quick (15 min)                                                                                                                                                                                                                                                |
| **What**     | Uses `createHash('sha256').update(content).digest('hex')` from `node:crypto`. Bun supports `Bun.sha()` or `new Bun.CryptoHasher("sha256")` which is faster.                                                                                                   |
| **Change**   | Replace with `new Bun.CryptoHasher("sha256").update(content).digest("hex")` or `Bun.hash(content)` (xxhash64 — different algorithm but faster and sufficient for cache invalidation).                                                                         |
| **Caveat**   | Must ensure Electron's Node.js runtime supports Bun APIs. If running in Electron (not Bun runtime), `Bun.sha()` won't exist. **This may not be viable** — Electron uses Node.js, not Bun. Only viable if using Bun as the runtime instead of Electron's Node. |
| **Decision** | SKIP unless confirmed that main process runs on Bun runtime.                                                                                                                                                                                                  |

### T15: Stricter TypeScript config

| Field      | Value                                                                                                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**   | `tsconfig.json`                                                                                                                                                            |
| **Effort** | Quick (30 min + fixing errors)                                                                                                                                             |
| **Change** | Add `"exactOptionalPropertyTypes": true`, `"verbatimModuleSyntax": true`                                                                                                   |
| **Risk**   | `exactOptionalPropertyTypes` may cause many errors where `undefined` is assigned to optional props. `verbatimModuleSyntax` requires all type imports to use `import type`. |

### T16: Type-safe IPC wrapper

| Field      | Value                                                                                   |
| ---------- | --------------------------------------------------------------------------------------- |
| **Files**  | `src/shared/types.ts`, `src/main/ipc.ts`, `src/preload/index.ts`                        |
| **Effort** | Medium (4-6h)                                                                           |
| **What**   | Create a type-safe IPC channel map that enforces request/response types at compile time |

### T17: Sentry integration

| **Effort** | Medium (3-4h) |
| **What** | Add `@sentry/electron` for crash reporting |

### T18: LSUIElement in build config

| **Effort** | Quick (5 min) |
| **What** | Verify `LSUIElement: true` is in electron-builder config (may already be via `extendInfo` in `electron-builder.yml`) |

---

## Dependency Graph

```
T4 (test fix) ──────────────────┐
                                │
T1+T2+T3 (IPC security) ───────┤
                                │
                     ┌──────────┴──────────┐
                     │    Wave 1 Gate       │
                     │  typecheck + test    │
                     └──────────┬──────────┘
                                │
              ┌─────────────────┼────────────────┐
              │                 │                 │
        T5+T6 (DRY)      T7 (non-null)     T8 (URL valid)
              │                 │                 │
              └─────────────────┼────────────────┘
                                │
                     ┌──────────┴──────────┐
                     │    Wave 2 Gate       │
                     │  typecheck + test    │
                     └──────────┬──────────┘
                                │
         ┌──────────────────────┼───────────────────┐
         │                      │                    │
   T13 (mocks)            T12 (fix tests)           │
         │                      │                    │
    ┌────┴────┐                 │                    │
    │         │                 │                    │
 T9 (tray) T11 (index)   T10 (meet-url)             │
    │         │                 │                    │
    └─────────┴─────────────────┘                    │
                                │                    │
                     ┌──────────┴──────────┐         │
                     │    Wave 3 Gate       │         │
                     │  typecheck + test    │         │
                     └──────────┬──────────┘         │
                                │                    │
                          T14-T18 (optional) ────────┘
```

---

## Implementation Order for Single Worker

If executing sequentially with one worker:

```
Day 1 (Morning):  T1+T2+T3 → T4 → verify Wave 1
Day 1 (Afternoon): T8 → T5+T6 → T7 → verify Wave 2
Day 2:            T13 → T10 → T12 → T9 (start)
Day 3:            T9 (finish) → T11 → verify Wave 3
Day 4 (optional): T14-T18
```

## Implementation Order for Two Workers

```
Worker A                          Worker B
────────                          ────────
Day 1: T1+T2+T3 (IPC)            T4 (test fix)
       Wave 1 gate                Wave 1 gate
       T5+T6 (DRY extraction)    T8 (URL allowlist)
       T7 (non-null)
       Wave 2 gate                Wave 2 gate
Day 2: T13 (mocks) → T9 (tray)   T12 (fix tests) → T10 (meet-url)
Day 3: T9 (finish) → T11         Wave 3 gate
```

---

## Risk Matrix

| Wave                  | Risk                                                       | Mitigation                                                                                          |
| --------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1 - IPC Security      | LOW: additive guards only                                  | Each handler already has the pattern; just extending to WINDOW_SET_HEIGHT                           |
| 2 - Timer refactoring | MEDIUM: scheduler.ts is complex state machine              | Existing 445-line test suite covers all edge cases. Run tests after each atomic change.             |
| 2 - URL validation    | LOW-MEDIUM: new validation could reject valid URLs         | Only reject non-allowlisted domains. Google Meet URLs always start with `https://meet.google.com/`. |
| 3 - Tray tests        | LOW: additive tests                                        | May uncover bugs in tray.ts but won't break production                                              |
| 3 - Index tests       | LOW-MEDIUM: testing app lifecycle requires careful mocking | Process-level handlers (uncaughtException) are tricky to test safely                                |
| 4 - Bun.sha()         | HIGH: may not work in Electron's Node.js runtime           | Validate before implementing; likely SKIP                                                           |

---

## Global Success Criteria

1. **Security:** All IPC handlers validate sender. Window height bounded. Meet URLs domain-checked.
2. **Code quality:** Zero duplicated cleanup blocks. Zero `!` assertions in scheduler. Net -60 lines.
3. **Test coverage:** 3 new test files. ~500+ new test lines. All files >70% coverage.
4. **Stability:** `bun run typecheck && bun run test` passes at every wave gate.
5. **No regressions:** All 1,127 existing test lines continue to pass.
