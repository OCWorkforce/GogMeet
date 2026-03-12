# GogMeet

macOS tray app for Google Meet calendar reminders. Fetches events from macOS Calendar via EventKit and auto-opens meetings in your browser 1 minute before they start.

## Features

- **Tray-native** — Lives in the menu bar, no Dock icon
- **Calendar integration** — Reads Google Meet events from macOS Calendar via Swift EventKit
- **Auto-launch** — Opens meeting URLs automatically 1 minute before start
- **Popover UI** — Click the tray icon to see upcoming meetings

## Requirements

- macOS (Apple Silicon)
- Bun 1.3.10+ or Node.js 24.14.0+

## Development

```bash
bun install
bun run dev          # Start dev server + Electron
bun run build        # Build all processes
bun run test         # Run test suite
bun run typecheck    # TypeScript check
```

## Build

```bash
bun run package      # Build and create DMG/ZIP for macOS arm64
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Runtime | Electron 41 |
| Language | TypeScript 5.9 |
| Build | Rslib + Rsbuild |
| Calendar | Swift EventKit |
| Test | Vitest 4 |

## License

MIT