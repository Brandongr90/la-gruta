const { contextBridge, ipcRenderer } = require("electron");

// Exponer APIs protegidas al renderer
contextBridge.exposeInMainWorld("electronAPI", {
  // Ejemplo de comunicación con el proceso principal
  sendMessage: (message) => ipcRenderer.invoke("send-message", message),

  // Escuchar eventos del proceso principal
  onUpdateAvailable: (callback) => ipcRenderer.on("update-available", callback),

  // Obtener información del sistema
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  // APIs de base de datos
  db: {
    verificarConexion: () => ipcRenderer.invoke("db:verificar-conexion"),
    obtenerSiguienteFolio: () => ipcRenderer.invoke("db:obtener-siguiente-folio"),
    guardarVenta: (ventaData) => ipcRenderer.invoke("db:guardar-venta", ventaData),
    sincronizarVentas: (ventas) => ipcRenderer.invoke("db:sincronizar-ventas", ventas),
    obtenerReporteDiaActual: () => ipcRenderer.invoke("db:obtener-reporte-dia-actual"),
    obtenerReporteDiario: (fecha) => ipcRenderer.invoke("db:obtener-reporte-diario", fecha),
    obtenerReportesSemanal: (limite) => ipcRenderer.invoke("db:obtener-reportes-semanal", limite),
    obtenerReportesMensual: (limite) => ipcRenderer.invoke("db:obtener-reportes-mensual", limite),
    obtenerVentasDelDia: () => ipcRenderer.invoke("db:obtener-ventas-del-dia"),
  },

  // API de impresora térmica
  imprimirTicket: (datosImpresion) => ipcRenderer.invoke("impresora:imprimir-ticket", datosImpresion),
});
