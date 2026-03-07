import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types.js';
const api = {
    calendar: {
        getEvents: () => ipcRenderer.invoke(IPC_CHANNELS.CALENDAR_GET_EVENTS),
        requestPermission: () => ipcRenderer.invoke(IPC_CHANNELS.CALENDAR_REQUEST_PERMISSION),
        getPermissionStatus: () => ipcRenderer.invoke(IPC_CHANNELS.CALENDAR_PERMISSION_STATUS),
    },
    window: {
        minimizeToTray: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE_TO_TRAY),
        restore: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_RESTORE),
    },
    app: {
        openExternal: (url) => ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_EXTERNAL, url),
        getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
    },
};
contextBridge.exposeInMainWorld('api', api);
