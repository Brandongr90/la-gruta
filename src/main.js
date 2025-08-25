const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");

// Mantener referencia global de la ventana
let mainWindow;

function createWindow() {
  // Crear la ventana del navegador
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "../assets/icon.png"),
    show: false, // No mostrar hasta que esté lista
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
