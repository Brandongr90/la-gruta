# Guía de Actualizaciones Automáticas - La Gruta

## Cómo Funciona

Tu aplicación ahora tiene actualizaciones automáticas configuradas con **electron-updater** y **GitHub Releases**.

### Flujo de Actualización:

1. La app verifica actualizaciones al iniciar (después de 3 segundos)
2. También verifica cada 2 horas mientras está abierta
3. Si hay una nueva versión, la descarga automáticamente
4. La instalación se completa cuando el usuario cierra la app
5. Al volver a abrir, ya tiene la nueva versión instalada

## Publicar una Nueva Versión (Release)

### Paso 1: Actualizar el código

Haz los cambios que necesites en el código (correcciones, nuevas funcionalidades, etc.)

### Paso 2: Incrementar la versión en package.json

```json
{
  "version": "1.0.1"  // Cambiar de 1.0.0 a 1.0.1
}
```

Reglas de versionado (Semantic Versioning):
- **1.0.X** → Parches/correcciones (bugs)
- **1.X.0** → Nuevas funcionalidades menores
- **X.0.0** → Cambios mayores que rompen compatibilidad

### Paso 3: Hacer commit y push de los cambios

```bash
git add .
git commit -m "Release v1.0.1 - Descripción de cambios"
git push origin main
```

### Paso 4: Crear el build para Windows

```bash
npm run build-win
```

Esto generará el instalador en: `dist/La Gruta - Sistema de Taquilla Setup 1.0.1.exe`

### Paso 5: Crear un Release en GitHub

#### Opción A: Desde GitHub Web (Recomendado)

1. Ve a tu repositorio: https://github.com/Brandongr90/la-gruta
2. Clic en "Releases" (en la barra lateral derecha)
3. Clic en "Create a new release" o "Draft a new release"
4. En "Choose a tag", escribe: `v1.0.1` (debe coincidir con package.json)
5. Clic en "Create new tag: v1.0.1 on publish"
6. Título: `v1.0.1` o `Versión 1.0.1`
7. Descripción: Explica qué cambió en esta versión

   Ejemplo:
   ```
   ## Cambios en v1.0.1

   ### Nuevas funcionalidades
   - Se agregó soporte para impresora térmica
   - Nuevo reporte de ventas semanal

   ### Correcciones
   - Se corrigió el cálculo de cambio en efectivo
   - Se mejoró la sincronización con Supabase

   ### Mejoras
   - Interfaz más responsiva
   - Actualizaciones automáticas configuradas
   ```

8. En "Attach binaries", arrastra o selecciona el archivo:
   - `dist/La Gruta - Sistema de Taquilla Setup 1.0.1.exe`
   - También puedes subir: `dist/latest.yml` (lo genera electron-builder)

9. Marca "Set as the latest release"
10. Clic en "Publish release"

#### Opción B: Desde línea de comandos con GitHub CLI

```bash
# Instalar GitHub CLI si no lo tienes
brew install gh

# Autenticarte
gh auth login

# Crear release y subir el .exe
gh release create v1.0.1 \
  "dist/La Gruta - Sistema de Taquilla Setup 1.0.1.exe" \
  "dist/latest.yml" \
  --title "v1.0.1" \
  --notes "Descripción de los cambios"
```

#### Opción C: Publicación automática con electron-builder

```bash
# IMPORTANTE: Necesitas crear un token de GitHub primero

# 1. Crear token en: https://github.com/settings/tokens
#    - Scope necesario: "repo" (full control)
#    - Copiar el token

# 2. Exportar el token en tu terminal
export GH_TOKEN="tu_token_de_github_aquí"

# 3. Ejecutar el comando de release (hace build + publish)
npm run release
```

Este método automáticamente:
- Crea el build
- Crea el tag en git
- Crea el release en GitHub
- Sube los archivos

### Paso 6: Verificar que funcionó

1. Ve a https://github.com/Brandongr90/la-gruta/releases
2. Deberías ver tu nuevo release v1.0.1 con el instalador
3. Los usuarios con la versión anterior recibirán la actualización automáticamente

## Probar las Actualizaciones

### En desarrollo:

Las actualizaciones NO se activan en modo desarrollo (está configurado así para evitar problemas).

### En producción:

1. Instala la versión 1.0.0 en una máquina de prueba
2. Publica la versión 1.0.1 como release
3. Abre la app v1.0.0
4. Espera 3 segundos (o cierra y abre de nuevo)
5. Verás en los logs: "✅ Actualización disponible: 1.0.1"
6. La descarga comenzará automáticamente
7. Cuando termina: "✅ Actualización descargada - Se instalará al cerrar la app"
8. Cierra la app
9. Vuelve a abrir → ¡Ahora tienes v1.0.1!

## Notificaciones al Usuario (Opcional)

Si quieres mostrar notificaciones visuales al usuario cuando hay actualizaciones, puedes agregar esto en tu `renderer.js`:

```javascript
// Escuchar cuando hay una actualización disponible
window.electronAPI.onUpdateAvailable((info) => {
  console.log('Nueva versión disponible:', info.version);

  // Mostrar notificación al usuario
  // Ejemplo: modal, toast, banner, etc.
  alert(`Nueva versión ${info.version} disponible. Se descargará automáticamente.`);
});

// Escuchar el progreso de descarga
window.electronAPI.onDownloadProgress((progress) => {
  console.log(`Descargando actualización: ${progress.percent.toFixed(2)}%`);

  // Opcional: mostrar barra de progreso
});

// Escuchar cuando la actualización ya está descargada
window.electronAPI.onUpdateDownloaded((info) => {
  console.log('Actualización lista para instalar');

  // Opcional: ofrecer reiniciar ahora
  const reiniciar = confirm(
    `Versión ${info.version} descargada. ¿Reiniciar ahora para actualizar?`
  );

  if (reiniciar) {
    window.electronAPI.app.installUpdate();
  }
});

// Verificar actualizaciones manualmente (opcional)
async function verificarActualizaciones() {
  const result = await window.electronAPI.app.checkForUpdates();
  console.log('Resultado de verificación:', result);
}
```

## Estructura de Archivos en GitHub Release

Cada release debe contener:

```
v1.0.1/
├── La Gruta - Sistema de Taquilla Setup 1.0.1.exe  (Instalador)
└── latest.yml                                       (Metadata - autogenerado)
```

El archivo `latest.yml` lo genera electron-builder automáticamente y contiene:
- Versión
- Hash SHA512 del instalador
- Tamaño del archivo
- Fecha de lanzamiento

## Solución de Problemas

### "La app no detecta actualizaciones"

1. Verifica que el release esté marcado como "Latest release" en GitHub
2. Verifica que la versión en GitHub sea mayor que la instalada
3. Verifica que los archivos `latest.yml` y el `.exe` estén en el release
4. Revisa los logs de electron-log (ubicación varía según OS)

### "Error al descargar actualización"

1. Verifica que el repositorio sea público o que tengas acceso
2. Verifica tu conexión a internet
3. Revisa que el archivo `.exe` no esté corrupto

### "La actualización se descarga pero no se instala"

1. La instalación es automática al cerrar la app
2. Si usas `installUpdate()`, se cerrará inmediatamente
3. Verifica permisos de escritura en el directorio de instalación

## Logs de Actualización

Los logs se guardan automáticamente en:

**Windows:**
```
C:\Users\{Usuario}\AppData\Roaming\lagruta-ticket-system\logs\main.log
```

**macOS:**
```
~/Library/Logs/lagruta-ticket-system/main.log
```

Puedes revisar estos logs para debuggear problemas de actualización.

## Mejores Prácticas

1. **Siempre prueba en local antes de publicar**
   - Corre `npm run build-win` y prueba el .exe
   - Verifica que todo funcione correctamente

2. **Escribe buenos release notes**
   - Explica qué cambió
   - Menciona bugs corregidos
   - Destaca nuevas funcionalidades

3. **Usa versionado semántico**
   - v1.0.0 → v1.0.1 (bug fix)
   - v1.0.1 → v1.1.0 (nueva funcionalidad)
   - v1.1.0 → v2.0.0 (cambio mayor)

4. **Haz releases pequeños y frecuentes**
   - Mejor v1.0.1, v1.0.2, v1.0.3 que esperar a v2.0.0
   - Más fácil de debuggear si algo falla

5. **Mantén un CHANGELOG.md**
   - Documenta todos los cambios
   - Ayuda a ti y a los usuarios

6. **No borres releases antiguos**
   - Permite rollback si algo sale mal
   - Los usuarios pueden descargar versiones anteriores

## Rollback (Volver a Versión Anterior)

Si una actualización causa problemas:

1. Ve a GitHub Releases
2. Marca una versión anterior como "Latest release"
3. Los usuarios recibirán la versión anterior como "actualización"
4. O puedes desinstalar y reinstalar el .exe de la versión anterior

## Checklist de Release

Antes de publicar:

- [ ] Código probado y funcionando
- [ ] Versión actualizada en package.json
- [ ] Commit y push a GitHub
- [ ] Build generado: `npm run build-win`
- [ ] Instalador probado en Windows
- [ ] Release notes escritos
- [ ] Tag correcto (v1.0.X)
- [ ] Archivos subidos (.exe y latest.yml)
- [ ] Marcado como "Latest release"
- [ ] Probado en una instalación existente

## Resumen Rápido

```bash
# 1. Actualizar versión en package.json (ej: 1.0.0 → 1.0.1)

# 2. Commit
git add .
git commit -m "Release v1.0.1"
git push

# 3. Build
npm run build-win

# 4. Subir a GitHub Releases
# - Tag: v1.0.1
# - Archivos: dist/La Gruta - Sistema de Taquilla Setup 1.0.1.exe
# - Marcar como "Latest release"

# ¡Listo! Las apps instaladas se actualizarán automáticamente
```

## Configuración Actual

Tu aplicación está configurada con:

- ✅ electron-updater instalado
- ✅ Verificación cada 2 horas
- ✅ Descarga automática
- ✅ Instalación al cerrar app
- ✅ Logs automáticos
- ✅ GitHub como proveedor
- ✅ Solo activo en producción (no en desarrollo)

## Recursos Adicionales

- [Documentación electron-updater](https://www.electron.build/auto-update)
- [Semantic Versioning](https://semver.org/)
- [GitHub Releases Guide](https://docs.github.com/en/repositories/releasing-projects-on-github)
