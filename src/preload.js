const { contextBridge, ipcRenderer } = require("electron");

// Exponer APIs protegidas al renderer
contextBridge.exposeInMainWorld("electronAPI", {
  // Ejemplo de comunicación con el proceso principal
  sendMessage: (message) => ipcRenderer.invoke("send-message", message),

  // Escuchar eventos del proceso principal
  onUpdateAvailable: (callback) => ipcRenderer.on("update-available", callback),

  // Obtener información del sistema
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
});
