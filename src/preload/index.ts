import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types.js';
import type { CalendarPermission, CalendarResult } from '../shared/types.js';

const api = {
  calendar: {
    getEvents: (): Promise<CalendarResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.CALENDAR_GET_EVENTS) as Promise<CalendarResult>,

    requestPermission: (): Promise<CalendarPermission> =>
      ipcRenderer.invoke(IPC_CHANNELS.CALENDAR_REQUEST_PERMISSION),

    getPermissionStatus: (): Promise<CalendarPermission> =>
      ipcRenderer.invoke(IPC_CHANNELS.CALENDAR_PERMISSION_STATUS),
  },

  window: {

    setHeight: (height: number): void =>
      ipcRenderer.send(IPC_CHANNELS.WINDOW_SET_HEIGHT, height),
  },

  app: {
    openExternal: (url: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_EXTERNAL, url),

    getVersion: (): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
