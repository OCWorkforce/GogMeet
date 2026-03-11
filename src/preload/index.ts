import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types.js';
import type { IpcRequest, IpcResponse } from '../shared/types.js';

const api = {
  calendar: {
    getEvents: (): Promise<IpcResponse<typeof IPC_CHANNELS.CALENDAR_GET_EVENTS>> =>
      ipcRenderer.invoke(IPC_CHANNELS.CALENDAR_GET_EVENTS),

    requestPermission: (): Promise<IpcResponse<typeof IPC_CHANNELS.CALENDAR_REQUEST_PERMISSION>> =>
      ipcRenderer.invoke(IPC_CHANNELS.CALENDAR_REQUEST_PERMISSION),

    getPermissionStatus: (): Promise<IpcResponse<typeof IPC_CHANNELS.CALENDAR_PERMISSION_STATUS>> =>
      ipcRenderer.invoke(IPC_CHANNELS.CALENDAR_PERMISSION_STATUS),
  },

  window: {
    setHeight: (height: IpcRequest<typeof IPC_CHANNELS.WINDOW_SET_HEIGHT>): void =>
      ipcRenderer.send(IPC_CHANNELS.WINDOW_SET_HEIGHT, height),
  },

  app: {
    openExternal: (url: IpcRequest<typeof IPC_CHANNELS.APP_OPEN_EXTERNAL>): Promise<IpcResponse<typeof IPC_CHANNELS.APP_OPEN_EXTERNAL>> =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_EXTERNAL, url),

    getVersion: (): Promise<IpcResponse<typeof IPC_CHANNELS.APP_GET_VERSION>> =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;

