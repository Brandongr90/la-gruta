// Módulo para manejar IndexedDB en el cliente (renderer process)
// Este archivo se ejecuta en el contexto del renderer donde IndexedDB está disponible

const DB_NAME = 'lagruta_taquilla_db';
const DB_VERSION = 1;
const STORE_NAME = 'ventas_pendientes';

class ClientDatabase {
  constructor() {
    this.db = null;
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
    this.syncListeners = [];

    // Escuchar cambios de conexión
    window.addEventListener('online', () => {
      console.log('✅ Conexión restaurada');
      this.isOnline = true;
      this.notificarCambioEstado({ online: true });
      this.sincronizarAutomaticamente();
    });

    window.addEventListener('offline', () => {
      console.log('⚠️ Sin conexión a internet');
      this.isOnline = false;
      this.notificarCambioEstado({ online: false });
    });
  }

  // Inicializar IndexedDB
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Error al abrir IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB inicializada');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true
          });

          objectStore.createIndex('client_id', 'client_id', { unique: true });
          objectStore.createIndex('fecha_hora', 'fecha_hora', { unique: false });
          objectStore.createIndex('sincronizado', 'sincronizado', { unique: false });

          console.log('Object store creado');
        }
      };
    });
  }

  // Agregar listener para cambios de estado
  agregarSyncListener(callback) {
    this.syncListeners.push(callback);
  }

  // Notificar cambios de estado
  notificarCambioEstado(estado) {
    this.syncListeners.forEach(callback => {
      try {
        callback(estado);
      } catch (error) {
        console.error('Error en listener:', error);
      }
    });
  }

  // Guardar venta localmente
  async guardarVentaLocal(ventaData) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB no inicializada'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);

      const ventaConMetadata = {
        ...ventaData,
        sincronizado: false,
        fecha_hora: new Date().toISOString(),
        client_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      const request = objectStore.add(ventaConMetadata);

      request.onsuccess = () => {
        console.log('📦 Venta guardada localmente (offline)');
        resolve({ ...ventaConMetadata, id: request.result });
      };

      request.onerror = () => {
        console.error('Error al guardar venta local:', request.error);
        reject(request.error);
      };
    });
  }

  // Obtener ventas pendientes de sincronizar
  async obtenerVentasPendientes() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB no inicializada'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        // Filtrar solo las ventas no sincronizadas
        const ventasPendientes = request.result.filter(venta => venta.sincronizado === false);
        resolve(ventasPendientes);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Eliminar venta local después de sincronizar
  async eliminarVentaLocal(id) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB no inicializada'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.delete(id);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Contar ventas pendientes
  async contarVentasPendientes() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB no inicializada'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        // Contar solo las ventas no sincronizadas
        const cantidad = request.result.filter(venta => venta.sincronizado === false).length;
        resolve(cantidad);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Guardar venta (intenta online primero, luego offline)
  async guardarVenta(ventaData) {
    try {
      // Intentar guardar online primero
      if (this.isOnline && window.electronAPI?.db) {
        const resultado = await window.electronAPI.db.guardarVenta(ventaData);

        if (resultado.success) {
          console.log('✅ Venta guardada en Supabase', resultado.folio);
          return { success: true, mode: 'online', data: resultado.data, folio: resultado.folio };
        }
      }

      // Si falla o estamos offline, guardar localmente
      console.log('💾 Guardando venta offline...');
      const ventaLocal = await this.guardarVentaLocal(ventaData);

      // Intentar sincronizar después de un segundo
      if (this.isOnline) {
        setTimeout(() => this.sincronizar(), 1000);
      }

      return { success: true, mode: 'offline', data: ventaLocal };
    } catch (error) {
      console.error('Error al guardar venta:', error);
      throw error;
    }
  }

  // Sincronizar ventas pendientes
  async sincronizar() {
    if (this.isSyncing) {
      console.log('⏳ Sincronización ya en progreso');
      return { success: false, message: 'Sincronización en progreso' };
    }

    if (!this.isOnline) {
      console.log('📡 Sin conexión, no se puede sincronizar');
      return { success: false, message: 'Sin conexión' };
    }

    this.isSyncing = true;
    this.notificarCambioEstado({ syncing: true });

    try {
      const ventasPendientes = await this.obtenerVentasPendientes();

      if (ventasPendientes.length === 0) {
        this.isSyncing = false;
        this.notificarCambioEstado({ syncing: false });
        return { success: true, sincronizadas: 0 };
      }

      console.log(`🔄 Sincronizando ${ventasPendientes.length} ventas...`);

      // Sincronizar todas las ventas
      const resultado = await window.electronAPI.db.sincronizarVentas(ventasPendientes);

      if (resultado.success) {
        // Eliminar las ventas sincronizadas exitosamente
        for (const venta of resultado.detalles.exitosas) {
          const ventaLocal = ventasPendientes.find(v => v.client_id === venta.client_id);
          if (ventaLocal) {
            await this.eliminarVentaLocal(ventaLocal.id);
          }
        }

        console.log(`✅ Sincronización completada: ${resultado.sincronizadas} exitosas`);

        this.isSyncing = false;
        this.notificarCambioEstado({
          syncing: false,
          sincronizadas: resultado.sincronizadas,
          errores: resultado.errores
        });

        return resultado;
      } else {
        throw new Error(resultado.error);
      }
    } catch (error) {
      console.error('Error durante sincronización:', error);
      this.isSyncing = false;
      this.notificarCambioEstado({ syncing: false, error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Sincronizar automáticamente si hay ventas pendientes
  async sincronizarAutomaticamente() {
    const pendientes = await this.contarVentasPendientes();
    if (pendientes > 0) {
      console.log(`🔄 Iniciando sincronización automática (${pendientes} ventas pendientes)`);
      await this.sincronizar();
    }
  }

  // Obtener estado actual
  obtenerEstado() {
    return {
      online: this.isOnline,
      syncing: this.isSyncing
    };
  }
}

// Crear instancia global
const clientDB = new ClientDatabase();

// Exportar para uso en el renderer
window.clientDB = clientDB;
