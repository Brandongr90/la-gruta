const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");
const { dbManager } = require("./db/db-manager");

// Mantener referencia global de la ventana
let mainWindow;

function createWindow() {
  // Crear la ventana del navegador
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1440,
    minHeight: 900,
    maxWidth: 1440,
    maxHeight: 900,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "../assets/icon.png"),
    show: false, // No mostrar hasta que esté lista
    center: true,
    titleBarStyle: 'default'
  });

  // Cargar el archivo HTML
  mainWindow.loadFile(path.join(__dirname, "index.html"));

  // Mostrar ventana cuando esté lista
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Abrir DevTools en desarrollo
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }

  // Evento cuando se cierra la ventana
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Este método será llamado cuando Electron termine de inicializar
app.whenReady().then(createWindow);

// Salir cuando todas las ventanas estén cerradas
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Crear menú personalizado
const template = [
  {
    label: "Archivo",
    submenu: [
      {
        label: "Nuevo",
        accelerator: "CmdOrCtrl+N",
        click: () => {
          console.log("Nuevo archivo");
        },
      },
      { type: "separator" },
      {
        label: "Salir",
        accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
        click: () => {
          app.quit();
        },
      },
    ],
  },
  {
    label: "Ver",
    submenu: [
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
    ],
  },
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

// IPC Handlers para operaciones de base de datos
ipcMain.handle("db:verificar-conexion", async () => {
  return await dbManager.verificarConexion();
});

ipcMain.handle("db:obtener-siguiente-folio", async () => {
  return await dbManager.obtenerSiguienteFolio();
});

ipcMain.handle("db:guardar-venta", async (event, ventaData) => {
  return await dbManager.guardarVenta(ventaData);
});

ipcMain.handle("db:sincronizar-ventas", async (event, ventas) => {
  return await dbManager.sincronizarVentas(ventas);
});

ipcMain.handle("db:obtener-reporte-dia-actual", async () => {
  return await dbManager.obtenerReporteDiaActual();
});

ipcMain.handle("db:obtener-reporte-diario", async (event, fecha) => {
  return await dbManager.obtenerReporteDiario(fecha);
});

ipcMain.handle("db:obtener-reportes-semanal", async (event, limite) => {
  return await dbManager.obtenerReportesSemanal(limite);
});

ipcMain.handle("db:obtener-reportes-mensual", async (event, limite) => {
  return await dbManager.obtenerReportesMensual(limite);
});

ipcMain.handle("db:obtener-ventas-del-dia", async () => {
  return await dbManager.obtenerVentasDelDia();
});
