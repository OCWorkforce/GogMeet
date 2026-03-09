import { ipcMain, shell, app } from 'electron';
import { IPC_CHANNELS } from '../shared/types.js';
import { getCalendarEventsResult, requestCalendarPermission, getCalendarPermissionStatus } from './calendar.js';
/** Accepted URL origins for IPC senders (renderer served from file:// or localhost in dev) */
const ALLOWED_ORIGINS = new Set(['http://localhost:5173', 'http://127.0.0.1:5173']);
/** Returns true if the sender's origin is the app's own renderer */
function validateSender(event) {
    const senderUrl = event.senderFrame?.url ?? '';
    // file:// origin check (packaged app)
    if (senderUrl.startsWith('file://'))
        return true;
    // Dev server origins
    for (const origin of ALLOWED_ORIGINS) {
        if (senderUrl.startsWith(origin))
            return true;
    }
    return false;
}
/** Allowlisted Meet URL prefixes */
const MEET_URL_ALLOWLIST = [
    'https://meet.google.com/',
    'https://calendar.google.com/',
    'https://accounts.google.com/',
];
function isAllowedMeetUrl(url) {
    return MEET_URL_ALLOWLIST.some((prefix) => url.startsWith(prefix));
}
export function registerIpcHandlers(win) {
    // Calendar
    ipcMain.handle(IPC_CHANNELS.CALENDAR_GET_EVENTS, async (event) => {
        if (!validateSender(event))
            return { error: 'unauthorized' };
        return getCalendarEventsResult();
    });
    ipcMain.handle(IPC_CHANNELS.CALENDAR_REQUEST_PERMISSION, async (event) => {
        if (!validateSender(event))
            return 'denied';
        return requestCalendarPermission();
    });
    ipcMain.handle(IPC_CHANNELS.CALENDAR_PERMISSION_STATUS, async (event) => {
        if (!validateSender(event))
            return 'denied';
        return getCalendarPermissionStatus();
    });
    ipcMain.on(IPC_CHANNELS.WINDOW_SET_HEIGHT, (_event, height) => {
        if (typeof height === 'number' && height > 0) {
            win.setSize(360, Math.round(height), true);
        }
    });
    // App utilities
    ipcMain.handle(IPC_CHANNELS.APP_OPEN_EXTERNAL, async (event, url) => {
        if (!validateSender(event))
            return;
        if (typeof url === 'string' && isAllowedMeetUrl(url)) {
            await shell.openExternal(url);
        }
    });
    ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, (event) => {
        if (!validateSender(event))
            return '';
        return app.getVersion();
    });
}
