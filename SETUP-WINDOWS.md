# Configuración del Proyecto en Windows 64-bit

## Descargas Necesarias

1. **Node.js LTS** (v20 o superior)
   - https://nodejs.org/
   - Descargar: "Windows Installer (.msi)" - 64-bit

2. **Git for Windows**
   - https://git-scm.com/download/win
   - Descargar: "64-bit Git for Windows Setup"

3. **Visual Studio Code**
   - https://code.visualstudio.com/
   - Descargar: "Windows x64 User Installer"

4. **Claude Code CLI**
   - https://claude.com/claude-code
   - Seguir instrucciones de instalación para Windows

## Instalación en Windows

### 1. Instalar Software Base

Ejecutar instaladores en este orden:

```
1. Node.js → Siguiente → Siguiente → Instalar (usar opciones por defecto)
2. Git → Siguiente hasta finalizar (usar opciones por defecto)
3. Visual Studio Code → Siguiente hasta finalizar
4. Claude Code → Seguir instrucciones del sitio
```

### 2. Verificar Instalación

Abrir PowerShell o CMD y ejecutar:

```bash
node --version
npm --version
git --version
```

Debes ver las versiones instaladas.

### 3. Copiar Proyecto

Opción A - Con Git (si el código está en repositorio):
```bash
cd C:\Users\TuUsuario\Documents
git clone https://github.com/Brandongr90/la-gruta.git
cd la-gruta
```

Opción B - Sin Git (copiar carpeta desde USB):
```bash
# Copiar carpeta del proyecto desde USB a:
C:\Users\TuUsuario\Documents\lagruta-ticket-system
```

### 4. Instalar Dependencias

Abrir PowerShell o CMD en la carpeta del proyecto:

```bash
cd C:\Users\TuUsuario\Documents\lagruta-ticket-system
npm install
```

Esperar a que descargue todas las dependencias.

### 5. Construir Ejecutable

```bash
npm run build-win
```

El archivo .exe se genera en: `dist\La Gruta - Sistema de Taquilla Setup 1.0.5.exe`

## Comandos Útiles

```bash
# Ejecutar en modo desarrollo
npm start

# Construir .exe para Windows
npm run build-win

# Solo empaquetar sin instalador
npm run pack
```

## Abrir con Visual Studio Code

```bash
cd C:\Users\TuUsuario\Documents\lagruta-ticket-system
code .
```

O desde VS Code: File → Open Folder → Seleccionar carpeta del proyecto

## Usar Claude Code

En VS Code, abrir terminal integrada (Ctrl + `) y ejecutar:

```bash
claude code
```

## Notas

- Asegúrate de tener permisos de administrador para instalar software
- La primera vez que ejecutes `npm install` puede tardar varios minutos
- Si aparecen warnings durante `npm install`, generalmente se pueden ignorar
- Los errores durante el build aparecerán en la terminal, facilita debuggear en local
