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
    titleBarStyle: "default",
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

// IPC Handler para impresora térmica - Impresión directa con Electron
ipcMain.handle("impresora:imprimir-ticket", async (event, datosImpresion) => {
  // Función helper para enviar logs al renderer
  const sendLog = (message, type = 'log') => {
    console[type](message);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.executeJavaScript(`console.${type}("${message.replace(/"/g, '\\"')}")`);
    }
  };

  try {
    sendLog("🖨️ Iniciando impresión directa a impresora térmica");
    sendLog(`📄 Longitud de datos: ${datosImpresion.length} bytes`);

    // Nombre exacto de la impresora en Windows
    const printerName = "EPSON TM-T20III Receipt";
    sendLog(`🔍 Impresora destino: ${printerName}`);

    // Obtener lista de impresoras disponibles para verificar
    try {
      const printers = await mainWindow.webContents.getPrintersAsync();
      sendLog(`   📋 Impresoras disponibles: ${printers.length}`);

      const targetPrinter = printers.find(p => p.name === printerName);
      if (targetPrinter) {
        sendLog(`   ✅ Impresora encontrada: ${targetPrinter.name}`);
        sendLog(`      Estado: ${targetPrinter.status === 0 ? 'Lista' : 'Ocupada/Error'}`);
        sendLog(`      Es predeterminada: ${targetPrinter.isDefault ? 'Sí' : 'No'}`);
      } else {
        sendLog(`   ⚠️ ADVERTENCIA: No se encontró la impresora "${printerName}"`, 'warn');
        sendLog(`   Impresoras disponibles:`, 'warn');
        printers.forEach(p => sendLog(`      - ${p.name}`, 'warn'));
      }
    } catch (getPrintersError) {
      sendLog(`   ⚠️ No se pudo obtener lista de impresoras: ${getPrintersError.message}`, 'warn');
    }

    // Crear una ventana invisible para renderizar el contenido
    sendLog("   1. Creando ventana de impresión...");
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Capturar errores de la ventana de impresión
    printWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      sendLog(`   ⚠️ Error al cargar contenido: ${errorCode} - ${errorDescription}`, 'warn');
    });

    printWindow.webContents.on('render-process-gone', (event, details) => {
      sendLog(`   ⚠️ Proceso de renderizado terminado: ${details.reason}`, 'warn');
    });

    // Convertir el contenido del ticket a HTML
    // Escapar caracteres especiales para HTML
    const contenidoEscapado = datosImpresion
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    // Agregar líneas en blanco al final para espacio antes del corte
    const contenidoFinal = contenidoEscapado + '<br><br><br>';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: 80mm auto;
            margin: 2mm 5mm;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
          }
          body {
            margin: 0;
            padding: 0;
            font-family: 'Courier New', Courier, monospace;
            font-size: 10px;
            white-space: pre-wrap;
            word-wrap: break-word;
            line-height: 1.3;
            width: 72mm;
          }
        </style>
      </head>
      <body>${contenidoFinal}</body>
      </html>
    `;

    sendLog("   2. Cargando contenido en ventana...");

    // Cargar el contenido y esperar a que esté listo
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    sendLog("   2.1. Contenido cargado, esperando renderizado...");

    // Esperar a que termine de cargar y renderizar completamente
    await new Promise(resolve => setTimeout(resolve, 1000));

    sendLog("   3. Enviando a impresora (impresión silenciosa)...");

    // Configuración de impresión para impresora térmica de 80mm
    const printOptions = {
      silent: true, // Imprimir sin mostrar el diálogo
      printBackground: false,
      deviceName: printerName, // Nombre exacto de la impresora
      color: false, // Impresión en blanco y negro
      margins: {
        marginType: 'custom',
        top: 0,
        bottom: 0,
        left: 2,
        right: 2
      },
      landscape: false,
      scaleFactor: 100,
      pagesPerSheet: 1,
      collate: false,
      copies: 1,
      pageSize: {
        height: 297000, // Altura automática (A4 height en micrómetros como fallback)
        width: 80000    // 80mm en micrómetros
      },
      dpi: {
        horizontal: 203,
        vertical: 203
      }
    };

    sendLog("   4. Llamando a webContents.print()...");

    // Retornar una promesa que se resuelva cuando termine la impresión
    return new Promise((resolve) => {
      try {
        printWindow.webContents.print(printOptions, (success, failureReason) => {
          sendLog(`   5. Callback de impresión ejecutado - Success: ${success}, Reason: ${failureReason || 'ninguno'}`);

          // Esperar un momento antes de cerrar la ventana
          setTimeout(() => {
            if (printWindow && !printWindow.isDestroyed()) {
              printWindow.close();
              sendLog("   6. Ventana de impresión cerrada");
            }
          }, 500);

          if (success) {
            sendLog("✅ Ticket enviado a la impresora correctamente");
            sendLog("   El ticket debería imprimirse y cortarse automáticamente");
            resolve({
              success: true,
              message: "Ticket impreso correctamente"
            });
          } else {
            sendLog(`❌ Error al imprimir: ${failureReason}`, 'error');

            // Mensajes de ayuda según el error
            if (failureReason === 'Failed to print') {
              sendLog("   Verifica que la impresora esté encendida y conectada", 'warn');
              sendLog("   Verifica que el nombre de la impresora sea exactamente: " + printerName, 'warn');
            }

            resolve({
              success: false,
              error: `Error al imprimir: ${failureReason}`,
              help: "Verifica que la impresora esté encendida, conectada y con el nombre correcto en Windows"
            });
          }
        });
        sendLog("   4.1. print() llamado, esperando respuesta...");
      } catch (printError) {
        sendLog(`❌ Excepción al llamar print(): ${printError.message}`, 'error');
        if (printWindow && !printWindow.isDestroyed()) {
          printWindow.close();
        }
        resolve({
          success: false,
          error: `Excepción al imprimir: ${printError.message}`
        });
      }
    });

  } catch (error) {
    sendLog(`❌ Error general: ${error.message}`, 'error');
    sendLog(`   Stack: ${error.stack || "No hay stack trace"}`, 'error');
    return {
      success: false,
      error: error.message || "Error desconocido al imprimir",
      details: error.stack || "No hay detalles adicionales"
    };
  }
});
