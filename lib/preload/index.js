import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types.js';
const api = {
    calendar: {
        getEvents: () => ipcRenderer.invoke(IPC_CHANNELS.CALENDAR_GET_EVENTS),
        requestPermission: () => ipcRenderer.invoke(IPC_CHANNELS.CALENDAR_REQUEST_PERMISSION),
        getPermissionStatus: () => ipcRenderer.invoke(IPC_CHANNELS.CALENDAR_PERMISSION_STATUS),
    },
    window: {
        setHeight: (height) => ipcRenderer.send(IPC_CHANNELS.WINDOW_SET_HEIGHT, height),
    },
    app: {
        openExternal: (url) => ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_EXTERNAL, url),
        getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
    },
};
contextBridge.exposeInMainWorld('api', api);
