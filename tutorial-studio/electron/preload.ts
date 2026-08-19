import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('tutorialStudio', {
  openImage: () => ipcRenderer.invoke('files:open-image'),
  openJson: () => ipcRenderer.invoke('files:open-json'),
  saveJson: (payload: { defaultPath: string; content: string }) => ipcRenderer.invoke('files:save-json', payload),
  listScreens: () => ipcRenderer.invoke('screens:list'),
  openExternal: (url: string) => ipcRenderer.invoke('system:open-external', url),
});
