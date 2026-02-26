# Main Process — Electron Main

Electron main process (Node.js). Handles app lifecycle, system tray, IPC, and macOS Calendar via Swift EventKit.

## FILES

| File          | Role                                                   |
| ------------- | ------------------------------------------------------ |
| `index.ts`    | App bootstrap, BrowserWindow factory, lifecycle events |
| `calendar.ts`         | Swift EventKit calendar queries (compiles/caches `gimeet-events` binary) |
| `tray.ts`     | System tray icon, context menu, window positioning     |
| `ipc.ts`      | IPC handlers for renderer communication                |

## ENTRY POINT

`index.ts:13` — `createWindow()` called on `app.whenReady()`

## WINDOW CONFIG

```typescript
// index.ts:14-34
{
  width: 360, height: 480,
  frame: false, resizable: false, movable: false,
  alwaysOnTop: true, skipTaskbar: true,
  vibrancy: 'popover', transparent: true, hasShadow: true,
  webPreferences: { sandbox: true, contextIsolation: true }
}
```

## SWIFT EVENTKIT PATTERNS

- **Helper**: `gimeet-events.swift` compiled to `/tmp/gimeet/gimeet-events` on first call
- **Compile time**: <1s (`swiftc` invoked at runtime, cached)
- **Query time**: ~0.7s (EventKit indexed queries, no network waits)
- **Output format**: Pipe-delimited `id||title||startISO||endISO||url||calendar||allDay`
- **Date range**: Today midnight → +2 days
- **Permission checks**: Still use fast AppleScript (no event queries)
## IPC HANDLERS

| Channel                       | Handler                           |
| ----------------------------- | --------------------------------- |
| `calendar:get-events`         | `getCalendarEvents()`             |
| `calendar:request-permission` | `requestCalendarPermission()`     |
| `calendar:permission-status`  | `getCalendarPermissionStatus()`   |
| `window:minimize-to-tray`     | `win.hide()` + `app.dock?.hide()` |
| `window:restore`              | `win.show()` + `win.focus()`      |
| `app:open-external`           | `shell.openExternal(url)`         |
| `app:get-version`             | `app.getVersion()`                |

## TRAY BEHAVIOR

- Left/right click → pop up context menu
- Menu: Open, About, Quit (Cmd+Q)
- Window positioned below tray icon, clamped to screen bounds

## LIFECYCLE

- `close` event → `preventDefault()` + hide (never actually closes)
- `blur` event → hide (dev mode exempt)
- `before-quit` → destroy window, allow exit
- `window-all-closed` → no-op (tray-only app stays alive)
