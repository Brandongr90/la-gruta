# Sistema de Taquilla La Gruta - Documentación de Base de Datos

## Índice
1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Estructura de la Base de Datos](#estructura-de-la-base-de-datos)
4. [Funcionalidad Offline-First](#funcionalidad-offline-first)
5. [Flujo de Datos](#flujo-de-datos)
6. [Reportes](#reportes)
7. [Uso y Comandos](#uso-y-comandos)
8. [Mantenimiento](#mantenimiento)

---

## Descripción General

El Sistema de Taquilla La Gruta ahora incluye persistencia de datos con **Supabase** (PostgreSQL) y funcionalidad **offline-first** utilizando **IndexedDB**.

### Características Principales:
- ✅ Guardado automático de cada venta en Supabase
- ✅ Funcionalidad offline: si no hay internet, las ventas se guardan localmente
- ✅ Sincronización automática cuando se restaura la conexión
- ✅ Reportes diarios, semanales y mensuales desde la base de datos
- ✅ Sin pérdida de datos en caso de fallas de conexión

---

## Arquitectura del Sistema

### Componentes del Sistema

```
┌─────────────────────────────────────────┐
│         Renderer Process                │
│  (Frontend - UI de Taquilla)            │
│                                         │
│  - renderer.js                          │
│  - client-db.js (IndexedDB)             │
└────────────┬────────────────────────────┘
             │
             │ IPC Communication
             │
┌────────────▼────────────────────────────┐
│          Main Process                   │
│   (Backend - Node.js)                   │
│                                         │
│  - main.js                              │
│  - db/db-manager.js                     │
│  - db/config.js (Supabase Client)       │
└────────────┬────────────────────────────┘
             │
             │ HTTPS
             │
┌────────────▼────────────────────────────┐
│         Supabase Cloud                  │
│      (PostgreSQL Database)              │
│                                         │
│  - Tabla: ventas                        │
│  - Vistas: reportes                     │
│  - Funciones: RPC                       │
└─────────────────────────────────────────┘
```

### Tecnologías Utilizadas

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| Frontend | Electron Renderer | Interfaz de usuario |
| Almacenamiento Local | IndexedDB | Base de datos offline |
| Backend | Node.js (Electron Main) | Lógica de servidor |
| Base de Datos | Supabase (PostgreSQL) | Almacenamiento persistente |
| Comunicación | IPC (Electron) | Comunicación entre procesos |

---

## Estructura de la Base de Datos

### Tabla Principal: `ventas`

```sql
CREATE TABLE ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio BIGSERIAL UNIQUE NOT NULL,
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entradas_totales INTEGER NOT NULL,
  cortesias INTEGER NOT NULL DEFAULT 0,
  entradas_cobradas INTEGER NOT NULL,
  forma_pago forma_pago_enum NOT NULL,  -- 'efectivo', 'tarjeta', 'transferencia'
  terminal TEXT,                          -- 'terminal1', 'terminal2' (solo para tarjeta)
  monto_total DECIMAL(10, 2) NOT NULL,
  efectivo_recibido DECIMAL(10, 2),
  cambio DECIMAL(10, 2),
  precio_unitario DECIMAL(10, 2) NOT NULL DEFAULT 300.00,
  sincronizado BOOLEAN DEFAULT TRUE,
  client_id TEXT,                         -- ID único para evitar duplicados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Campos Importantes

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `folio` | BIGSERIAL | Número de folio secuencial único |
| `fecha_hora` | TIMESTAMPTZ | Fecha y hora de la venta |
| `forma_pago` | ENUM | Método de pago utilizado |
| `terminal` | TEXT | Terminal usada (solo para tarjeta) |
| `monto_total` | DECIMAL | Monto total de la venta |
| `sincronizado` | BOOLEAN | Indica si fue sincronizada desde offline |
| `client_id` | TEXT | ID único para prevenir duplicados |

### Índices

```sql
CREATE INDEX idx_ventas_fecha_hora ON ventas(fecha_hora DESC);
CREATE INDEX idx_ventas_forma_pago ON ventas(forma_pago);
CREATE INDEX idx_ventas_fecha_forma_pago ON ventas(fecha_hora, forma_pago);
CREATE INDEX idx_ventas_sincronizado ON ventas(sincronizado) WHERE sincronizado = FALSE;
CREATE INDEX idx_ventas_folio ON ventas(folio);
```

Estos índices optimizan las consultas de reportes por fecha y forma de pago.

---

## Funcionalidad Offline-First

### Cómo Funciona

1. **Modo Online** (con internet):
   - La venta se guarda directamente en Supabase
   - Se obtiene un folio desde la base de datos
   - Confirmación inmediata

2. **Modo Offline** (sin internet):
   - La venta se guarda en IndexedDB local
   - Se genera un `client_id` único
   - Se marca como "pendiente de sincronizar"

3. **Sincronización Automática**:
   - Cuando se restaura la conexión, se detecta automáticamente
   - Las ventas pendientes se sincronizan a Supabase
   - Se eliminan de IndexedDB después de sincronizar exitosamente
   - No hay duplicados gracias al `client_id` único

### Flujo de Sincronización

```
┌─────────────────┐
│  Venta Nueva    │
└────────┬────────┘
         │
         ▼
    ¿Online?
         │
    ┌────┴────┐
    │         │
   Sí        No
    │         │
    ▼         ▼
┌────────┐  ┌──────────────┐
│Supabase│  │ IndexedDB    │
│        │  │ (Pendiente)  │
└────────┘  └──────┬───────┘
                   │
                   │ Conexión
                   │ Restaurada
                   │
                   ▼
            ┌──────────────┐
            │ Sincronizar  │
            │  a Supabase  │
            └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │  Eliminar    │
            │  de IndexDB  │
            └──────────────┘
```

---

## Flujo de Datos

### 1. Guardar Venta

**Frontend (renderer.js)**
```javascript
async function imprimirBoleto() {
  const ventaData = {
    entradas,
    cortesias,
    entradasCobrar,
    total,
    formaPago,
    terminal,
    efectivoRecibido,
    cambio
  };

  // Intenta guardar (online o offline)
  const resultado = await window.clientDB.guardarVenta(ventaData);
}
```

**Cliente (client-db.js)**
```javascript
async guardarVenta(ventaData) {
  // Intenta guardar online
  if (this.isOnline) {
    const resultado = await window.electronAPI.db.guardarVenta(ventaData);
    if (resultado.success) return resultado;
  }

  // Si falla, guarda offline
  return await this.guardarVentaLocal(ventaData);
}
```

**Backend (db-manager.js)**
```javascript
async guardarVenta(ventaData) {
  // Obtiene siguiente folio
  const folio = await obtenerSiguienteFolio();

  // Inserta en Supabase
  const { data, error } = await supabase
    .from('ventas')
    .insert([ventaParaInsertar]);

  return { success: true, data, folio };
}
```

### 2. Sincronización

**Detectar Reconexión**
```javascript
window.addEventListener('online', () => {
  this.isOnline = true;
  this.sincronizarAutomaticamente();
});
```

**Sincronizar Ventas Pendientes**
```javascript
async sincronizar() {
  const ventasPendientes = await this.obtenerVentasPendientes();

  // Enviar todas las ventas a Supabase
  const resultado = await window.electronAPI.db.sincronizarVentas(ventasPendientes);

  // Eliminar las sincronizadas de IndexedDB
  for (const venta of resultado.detalles.exitosas) {
    await this.eliminarVentaLocal(venta.id);
  }
}
```

---

## Reportes

### Vistas Disponibles

#### 1. Reporte Diario

```sql
SELECT * FROM reporte_diario WHERE fecha = CURRENT_DATE;
```

**Campos:**
- `fecha`: Fecha del reporte
- `total_ventas`: Número de transacciones
- `total_entradas`: Total de entradas vendidas
- `total_cortesias`: Total de cortesías
- `total_efectivo`: Ventas en efectivo
- `total_transferencia`: Ventas por transferencia
- `total_terminal1`: Ventas en Terminal 1
- `total_terminal2`: Ventas en Terminal 2
- `total_general`: Suma de todas las ventas
- `cuenta_fiscal`: Terminal 1 + 10% de efectivo

#### 2. Reporte Semanal

```sql
SELECT * FROM reporte_semanal
ORDER BY semana_inicio DESC
LIMIT 10;
```

**Campos adicionales:**
- `semana_inicio`: Inicio de la semana
- `semana_fin`: Fin de la semana
- `numero_semana`: Número de semana del año
- `anio`: Año

#### 3. Reporte Mensual

```sql
SELECT * FROM reporte_mensual
ORDER BY mes DESC
LIMIT 12;
```

**Campos adicionales:**
- `mes`: Inicio del mes
- `numero_mes`: Número de mes (1-12)
- `anio`: Año
- `mes_nombre`: Nombre del mes en español

### Funciones RPC

#### `obtener_siguiente_folio()`
Obtiene el siguiente número de folio disponible.

```javascript
const { data } = await supabase.rpc('obtener_siguiente_folio');
```

#### `obtener_reporte_dia_actual()`
Obtiene el reporte del día actual.

```javascript
const { data } = await supabase.rpc('obtener_reporte_dia_actual');
```

---

## Uso y Comandos

### Comandos de Consola (Debugging)

#### Sincronizar Manualmente
```javascript
window.sincronizarManualmente()
```
Sincroniza todas las ventas pendientes manualmente.

#### Obtener Reporte desde Supabase
```javascript
// Reporte del día
await window.obtenerReporteDesdeSupabase('dia')

// Reporte semanal
await window.obtenerReporteDesdeSupabase('semana')

// Reporte mensual
await window.obtenerReporteDesdeSupabase('mes')
```

#### Ver Ventas Pendientes
```javascript
const pendientes = await window.clientDB.obtenerVentasPendientes()
console.table(pendientes)
```

#### Contar Ventas Pendientes
```javascript
const cantidad = await window.clientDB.contarVentasPendientes()
console.log(`Ventas pendientes: ${cantidad}`)
```

#### Ver Estado de Conexión
```javascript
const estado = window.clientDB.obtenerEstado()
console.log(estado)
// { online: true, syncing: false }
```

### Consultas SQL Útiles

#### Ver todas las ventas del día
```sql
SELECT * FROM ventas
WHERE DATE(fecha_hora) = CURRENT_DATE
ORDER BY fecha_hora DESC;
```

#### Ver ventas por forma de pago
```sql
SELECT forma_pago, COUNT(*) as cantidad, SUM(monto_total) as total
FROM ventas
WHERE DATE(fecha_hora) = CURRENT_DATE
GROUP BY forma_pago;
```

#### Ver ventas sincronizadas desde offline
```sql
SELECT * FROM ventas
WHERE sincronizado = TRUE
AND client_id LIKE '%-offline-%'
ORDER BY fecha_hora DESC;
```

---

## Mantenimiento

### Respaldos

**Supabase** realiza respaldos automáticos diarios. Para respaldos adicionales:

```bash
# Exportar ventas del mes actual
supabase db dump --file backup_ventas_$(date +%Y%m).sql
```

### Limpieza de Datos Antiguos

Para mantener el rendimiento, puedes archivar ventas antiguas:

```sql
-- Mover ventas de hace más de 1 año a tabla de archivo
INSERT INTO ventas_archivo
SELECT * FROM ventas
WHERE fecha_hora < NOW() - INTERVAL '1 year';

DELETE FROM ventas
WHERE fecha_hora < NOW() - INTERVAL '1 year';
```

### Monitoreo

#### Verificar Ventas sin Sincronizar
```sql
SELECT COUNT(*) FROM ventas WHERE sincronizado = FALSE;
```

#### Verificar Rendimiento de Índices
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE tablename = 'ventas'
ORDER BY idx_scan DESC;
```

---

## Seguridad

### Row Level Security (RLS)

La tabla `ventas` tiene RLS habilitado. Actualmente permite todas las operaciones, pero puedes configurar políticas más restrictivas:

```sql
-- Ejemplo: Solo permitir inserción y lectura
DROP POLICY "Permitir todas las operaciones en ventas" ON ventas;

CREATE POLICY "Permitir inserción de ventas" ON ventas
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir lectura de ventas" ON ventas
  FOR SELECT
  USING (true);
```

### Credenciales

Las credenciales de Supabase están en:
- `src/db/config.js`

**⚠️ IMPORTANTE:** Nunca compartas las credenciales públicamente. Considera usar variables de entorno para producción.

---

## Solución de Problemas

### Problema: Ventas no se sincronizan

**Solución:**
1. Verificar conexión a internet
2. Abrir consola de desarrollador (Ctrl+Shift+I)
3. Ejecutar: `window.sincronizarManualmente()`
4. Verificar errores en la consola

### Problema: Folios duplicados

**Solución:**
```javascript
// Obtener folio actual desde BD
const resultado = await window.electronAPI.db.obtenerSiguienteFolio()
console.log('Folio actual:', resultado.folio)
```

### Problema: IndexedDB no inicializa

**Solución:**
1. Cerrar la aplicación
2. Limpiar caché del navegador
3. Reiniciar la aplicación

---

## Mejoras Futuras

- [ ] Indicador visual de estado de conexión en la UI
- [ ] Notificaciones cuando hay ventas pendientes de sincronizar
- [ ] Exportación de reportes a PDF/Excel
- [ ] Dashboard de ventas en tiempo real
- [ ] Múltiples puntos de venta sincronizados
- [ ] Autenticación de usuarios

---

## Contacto y Soporte

Para soporte técnico o preguntas, contacta al equipo de desarrollo.

**Versión de Documentación:** 1.0
**Última Actualización:** 8 de Diciembre, 2025
