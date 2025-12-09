# 🖨️ Configuración de Impresora Térmica

## Estado Actual

✅ **Comandos ESC/POS implementados** - El sistema ya tiene todos los comandos de impresión
✅ **Corte parcial configurado** - Los tickets se cortarán con pestaña pequeña
✅ **Multi-ticket automático** - Si compran 4 entradas, imprime 4 tickets separados
⏳ **Pendiente: Conectar impresora física**

---

## Configuración Rápida

### 1. Activar Modo Impresora

En el archivo `src/renderer.js`, línea 23:

```javascript
const CONFIG_IMPRESORA = {
  ANCHO_TICKET_MM: 80,
  CARACTERES_POR_LINEA: 32,
  USAR_IMPRESORA: true  // ⬅️ Cambiar a true
};
```

### 2. Instalar Librería de Impresión

**Opción A: node-thermal-printer (Recomendada)**
```bash
npm install node-thermal-printer
```

**Opción B: node-escpos**
```bash
npm install escpos escpos-usb
```

**Opción C: SerialPort (USB directo)**
```bash
npm install serialport
```

### 3. Configurar en `main.js`

Reemplazar el TODO en la línea 145 con la opción elegida:

#### Opción A: node-thermal-printer (Más fácil)

```javascript
const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');

ipcMain.handle("impresora:imprimir-ticket", async (event, datosImpresion) => {
  try {
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,  // O STAR, BIXOLON, etc
      interface: 'usb://04b8:0202', // Cambiar según tu impresora
      characterSet: 'SLOVENIA',
      removeSpecialCharacters: false,
      lineCharacter: "=",
      options:{
        timeout: 5000
      }
    });

    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      throw new Error('Impresora no conectada');
    }

    printer.println(datosImpresion);
    printer.partialCut();

    await printer.execute();
    console.log("✅ Ticket impreso correctamente");

    return { success: true };
  } catch (error) {
    console.error("Error al imprimir:", error);
    return { success: false, error: error.message };
  }
});
```

#### Opción B: node-escpos

```javascript
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

ipcMain.handle("impresora:imprimir-ticket", async (event, datosImpresion) => {
  try {
    const device = new escpos.USB();
    const printer = new escpos.Printer(device);

    device.open(function(error) {
      if (error) {
        console.error('Error al abrir impresora:', error);
        return { success: false, error: error.message };
      }

      printer
        .text(datosImpresion)
        .cut(true) // true = corte parcial
        .close();

      console.log("✅ Ticket impreso correctamente");
    });

    return { success: true };
  } catch (error) {
    console.error("Error al imprimir:", error);
    return { success: false, error: error.message };
  }
});
```

---

## Identificar tu Impresora

### En Windows:
```bash
# Listar impresoras USB
npx node-thermal-printer list
```

### En macOS:
```bash
# Ver dispositivos USB
system_profiler SPUSBDataType
```

### En Linux:
```bash
# Listar dispositivos USB
lsusb
```

---

## Modelos de Impresora Comunes

| Marca | Modelo | Type | Interface |
|-------|--------|------|-----------|
| Epson | TM-T20II | `PrinterTypes.EPSON` | `usb://04b8:0202` |
| Epson | TM-T88V | `PrinterTypes.EPSON` | `usb://04b8:0e15` |
| Star | TSP100 | `PrinterTypes.STAR` | `usb://0519:0001` |
| Bixolon | SRP-350 | `PrinterTypes.BIXOLON` | Consultar |

**Nota:** Los números USB (04b8:0202) varían por modelo. Usa el comando `lsusb` o equivalente para encontrar el tuyo.

---

## Comandos ESC/POS Implementados

El sistema ya incluye estos comandos (ver `renderer.js` línea 26-51):

| Comando | Función |
|---------|---------|
| `INIT` | Inicializa la impresora |
| `CORTE_PARCIAL` | Corta dejando pestaña |
| `CORTE_TOTAL` | Corte completo |
| `AVANZAR_3_LINEAS` | Avanza 3 líneas |
| `NEGRITA_ON/OFF` | Texto en negrita |
| `CENTRAR` | Alinea al centro |
| `TEXTO_DOBLE` | Texto doble tamaño |

---

## Flujo de Impresión

```
Cliente compra 4 entradas
        ↓
Sistema genera 4 tickets
        ↓
Para cada ticket:
  1. Inicializar impresora
  2. Enviar contenido del ticket
  3. Avanzar 3 líneas
  4. Corte parcial
        ↓
Resultado: 4 tickets físicos cortados
```

---

## Prueba sin Impresora

Actualmente, con `USAR_IMPRESORA: false`:
- Los tickets se muestran en la consola
- Verás `🔪 [CORTE PARCIAL]` entre cada ticket
- Perfecto para probar antes de conectar la impresora

---

## Solución de Problemas

### La impresora no se encuentra
1. Verificar que esté encendida y conectada
2. Revisar cable USB
3. Ejecutar comando de listado (ver arriba)
4. Probar con otro puerto USB

### Error de permisos (Linux)
```bash
sudo usermod -a -G lp $USER
sudo usermod -a -G dialout $USER
# Reiniciar sesión
```

### Caracteres extraños
- Verificar `characterSet` en la configuración
- Probar con `'PC437_USA'` o `'SLOVENIA'`

### No corta el papel
- Verificar que la impresora soporte corte automático
- Algunas impresoras económicas no tienen guillotina
- Cambiar a `CORTE_TOTAL` si falla `CORTE_PARCIAL`

---

## Contacto para Soporte

Si necesitas ayuda con la configuración:
1. Identifica el modelo exacto de tu impresora
2. Toma nota del sistema operativo (Windows/Mac/Linux)
3. Ejecuta el comando de listado de impresoras
4. Proporciona los logs de error si los hay

---

**Última actualización:** 8 de Diciembre, 2025
