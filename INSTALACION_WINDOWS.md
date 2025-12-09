# Instalación en Windows - La Gruta Sistema de Taquilla

## 1. Preparación del Build desde Mac

### Requisitos en tu Mac
```bash
# Instalar Wine (necesario para compilar para Windows desde Mac)
brew install --cask wine-stable

# Verificar que electron-builder esté instalado
npm install
```

### Generar el instalador para Windows
```bash
# Esto creará un .exe instalable para Windows
npm run build-win
```

El instalador se generará en: `dist/La Gruta - Sistema de Taquilla Setup 1.0.0.exe`

## 2. Instalación en Windows

### Pasos para el usuario final:

1. **Transferir el archivo**
   - Copia el archivo `.exe` desde `dist/` a una USB o envíalo por correo
   - Tamaño aproximado: ~150-200 MB

2. **Ejecutar el instalador**
   - Doble clic en `La Gruta - Sistema de Taquilla Setup 1.0.0.exe`
   - Windows puede mostrar advertencia de "Publisher desconocido" (normal si no tienes certificado de código)
   - Clic en "Más información" → "Ejecutar de todas formas"

3. **Ubicación de instalación**
   - Por defecto: `C:\Users\{Usuario}\AppData\Local\Programs\lagruta-ticket-system`
   - Creará acceso directo en el Escritorio y Menú Inicio

4. **Primera ejecución**
   - La aplicación se conectará automáticamente a Supabase
   - Verificar que haya conexión a internet

## 3. Compatibilidad Mac → Windows

### ✅ Funcionará sin problemas:
- Toda la lógica de JavaScript/Electron
- Conexión a Supabase
- Almacenamiento local
- Interfaz de usuario

### ⚠️ Posibles diferencias:

1. **Rutas de archivo** (ya manejadas correctamente en tu código con `path.join()`)
2. **Atajos de teclado**: `Cmd` → `Ctrl` (ya manejado con `CmdOrCtrl`)
3. **Iconos**: Asegúrate de tener `assets/icon.ico` para Windows

### Verificar antes del build:
```bash
# Asegúrate de tener el ícono de Windows
ls -la assets/icon.ico
```

Si no tienes `icon.ico`, puedes convertir tu PNG/ICNS:
```bash
# Usando ImageMagick
brew install imagemagick
convert assets/icon.png -resize 256x256 assets/icon.ico
```

## 4. Actualizaciones Remotas (Auto-Update)

### Opción 1: electron-updater (Recomendada)

#### A. Instalar dependencia
```bash
npm install electron-updater
```

#### B. Modificar `package.json`
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "tu-usuario",
      "repo": "lagruta-ticket-system"
    }
  }
}
```

#### C. Agregar código de auto-update en `src/main.js`
```javascript
const { autoUpdater } = require("electron-updater");

// Después de app.whenReady()
app.whenReady().then(() => {
  createWindow();

  // Configurar auto-updater
  autoUpdater.checkForUpdatesAndNotify();

  // Opcional: verificar cada hora
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 60 * 60 * 1000);
});

// Eventos del updater
autoUpdater.on('update-available', () => {
  console.log('Actualización disponible');
});

autoUpdater.on('update-downloaded', () => {
  console.log('Actualización descargada, se instalará al reiniciar');
  // Opcional: mostrar notificación al usuario
});
```

#### D. Publicar actualizaciones
```bash
# 1. Actualizar versión en package.json
# 2. Crear release en GitHub
npm run build-win

# 3. Subir el .exe a GitHub Releases
# El auto-updater lo detectará automáticamente
```

### Opción 2: Servidor propio (Sin GitHub)

#### A. Usar un servidor web simple
```javascript
// En package.json
{
  "build": {
    "publish": {
      "provider": "generic",
      "url": "https://tu-servidor.com/updates"
    }
  }
}
```

#### B. Estructura del servidor
```
https://tu-servidor.com/updates/
├── latest.yml                    # Metadata de la última versión
└── La-Gruta-Setup-1.0.1.exe     # Instalador
```

Ejemplo de `latest.yml`:
```yaml
version: 1.0.1
files:
  - url: La-Gruta-Setup-1.0.1.exe
    sha512: [hash del archivo]
    size: 123456789
path: La-Gruta-Setup-1.0.1.exe
sha512: [hash del archivo]
releaseDate: '2024-01-15T10:00:00.000Z'
```

### Opción 3: Actualizaciones manuales vía Supabase

Puedes crear una tabla en Supabase para notificaciones:

```sql
CREATE TABLE app_updates (
  id SERIAL PRIMARY KEY,
  version VARCHAR(20) NOT NULL,
  download_url TEXT NOT NULL,
  release_notes TEXT,
  mandatory BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Y en tu app verificar periódicamente:
```javascript
// En renderer.js
async function checkForUpdates() {
  const { data } = await supabase
    .from('app_updates')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (data[0].version > currentVersion) {
    // Mostrar notificación y link de descarga
  }
}
```

## 5. Recomendaciones

### Para distribución inicial:
1. ✅ Usar el instalador NSIS (ya configurado)
2. ✅ Incluir archivo README con instrucciones
3. ✅ Probar en máquina virtual Windows antes de distribuir
4. ⚠️ Considerar certificado de firma de código (evita advertencias de Windows)

### Para actualizaciones:
1. **Si tienes < 10 usuarios**: Actualización manual con notificación vía Supabase
2. **Si tienes 10-100 usuarios**: electron-updater con GitHub Releases
3. **Si tienes > 100 usuarios**: electron-updater con servidor propio + CDN

### Certificado de código (opcional pero recomendado)
- **Costo**: ~$100-400 USD/año
- **Proveedores**: Sectigo, DigiCert, GlobalSign
- **Beneficio**: Elimina advertencias de Windows Defender
- **Proceso**: Firmar el .exe con `electron-builder` configurado con el certificado

```json
{
  "win": {
    "target": "nsis",
    "icon": "assets/icon.ico",
    "certificateFile": "certificado.pfx",
    "certificatePassword": "tu-password"
  }
}
```

## 6. Testing en Windows

### Opción A: Máquina virtual
```bash
# Descargar Windows 10/11 VM gratis (90 días)
# https://developer.microsoft.com/en-us/windows/downloads/virtual-machines/

# Usar con VirtualBox o Parallels
```

### Opción B: Compartir con beta tester
- Enviar el .exe a alguien con Windows
- Pedir que pruebe: instalación, uso normal, cierre, reinicio

## 7. Checklist pre-distribución

- [ ] Verificar que `assets/icon.ico` existe
- [ ] Probar build: `npm run build-win`
- [ ] Verificar tamaño del instalador (debería ser ~150-200 MB)
- [ ] Probar en Windows (VM o usuario real)
- [ ] Documentar versión y cambios
- [ ] Tener plan de actualización decidido
- [ ] Configurar auto-updater si es necesario
- [ ] Crear documentación para usuarios finales

## 8. Solución de problemas comunes

### "La aplicación no abre"
- Verificar que hay conexión a internet (para Supabase)
- Revisar en `%APPDATA%/lagruta-ticket-system/logs`

### "No se puede instalar"
- Desactivar antivirus temporalmente
- Ejecutar como Administrador

### "Advertencia de seguridad"
- Normal si no hay certificado de código
- Clic en "Más información" → "Ejecutar de todas formas"

### "No conecta con Supabase"
- Verificar credenciales en el código
- Verificar firewall de Windows
- Verificar que las credenciales de Supabase no están hardcodeadas en variables de entorno específicas de Mac
