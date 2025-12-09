const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
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

// Configuración de auto-updater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// Logs del auto-updater
autoUpdater.logger = require("electron-log");
autoUpdater.logger.transports.file.level = "info";

// Eventos del auto-updater
autoUpdater.on("checking-for-update", () => {
  console.log("🔍 Verificando actualizaciones...");
});

autoUpdater.on("update-available", (info) => {
  console.log("✅ Actualización disponible:", info.version);
  if (mainWindow) {
    mainWindow.webContents.send("update-available", info);
  }
});

autoUpdater.on("update-not-available", (info) => {
  console.log("✅ La aplicación está actualizada");
});

autoUpdater.on("error", (err) => {
  console.error("❌ Error en auto-updater:", err);
});

autoUpdater.on("download-progress", (progressObj) => {
  const logMessage = `📥 Descargando: ${progressObj.percent.toFixed(2)}%`;
  console.log(logMessage);
  if (mainWindow) {
    mainWindow.webContents.send("download-progress", progressObj);
  }
});

autoUpdater.on("update-downloaded", (info) => {
  console.log("✅ Actualización descargada - Se instalará al cerrar la app");
  if (mainWindow) {
    mainWindow.webContents.send("update-downloaded", info);
  }
});

// Este método será llamado cuando Electron termine de inicializar
app.whenReady().then(() => {
  createWindow();

  // Verificar actualizaciones después de 3 segundos (para dar tiempo a que cargue la app)
  setTimeout(() => {
    if (process.env.NODE_ENV !== "development") {
      autoUpdater.checkForUpdatesAndNotify();
    }
  }, 3000);

  // Verificar actualizaciones cada 2 horas
  setInterval(() => {
    if (process.env.NODE_ENV !== "development") {
      autoUpdater.checkForUpdatesAndNotify();
    }
  }, 2 * 60 * 60 * 1000);
});

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

// IPC Handler para actualizaciones
ipcMain.handle("app:check-for-updates", async () => {
  if (process.env.NODE_ENV !== "development") {
    return await autoUpdater.checkForUpdates();
  }
  return { updateInfo: null };
});

ipcMain.handle("app:install-update", () => {
  autoUpdater.quitAndInstall();
});

// IPC Handler para impresora térmica
ipcMain.handle("impresora:imprimir-ticket", async (event, datosImpresion) => {
  try {
    console.log("🖨️ Solicitud de impresión recibida");

    // TODO: Aquí va la integración con la impresora térmica real
    // Opciones comunes:
    //
    // 1. USB Serial Port (más común):
    //    const SerialPort = require('serialport');
    //    const port = new SerialPort('/dev/usb/lp0', { baudRate: 9600 });
    //    port.write(datosImpresion);
    //
    // 2. Librería node-escpos (recomendado):
    //    const escpos = require('escpos');
    //    const device = new escpos.USB();
    //    const printer = new escpos.Printer(device);
    //    device.open(() => {
    //      printer.text(datosImpresion).cut().close();
    //    });
    //
    // 3. Librería node-thermal-printer:
    //    const ThermalPrinter = require('node-thermal-printer').printer;
    //    const printer = new ThermalPrinter({...});
    //    printer.println(datosImpresion);
    //    printer.cut();
    //    printer.execute();

    // Por ahora, simular éxito
    console.log("📄 Datos listos para imprimir (impresora no configurada)");
    console.log("Longitud de datos:", datosImpresion.length, "bytes");

    return { success: true, message: "Impresión simulada (configurar impresora real)" };
  } catch (error) {
    console.error("Error al imprimir:", error);
    return { success: false, error: error.message };
  }
});
