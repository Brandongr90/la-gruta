// Módulo para manejar IndexedDB - Almacenamiento local offline
const DB_NAME = 'lagruta_taquilla_db';
const DB_VERSION = 1;
const STORE_NAME = 'ventas_pendientes';

class IndexedDBManager {
  constructor() {
    this.db = null;
  }

  // Inicializar la base de datos
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Error al abrir IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB inicializada correctamente');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Crear object store si no existe
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true
          });

          // Crear índices
          objectStore.createIndex('client_id', 'client_id', { unique: true });
          objectStore.createIndex('fecha_hora', 'fecha_hora', { unique: false });
          objectStore.createIndex('sincronizado', 'sincronizado', { unique: false });

          console.log('Object store creado:', STORE_NAME);
        }
      };
    });
  }

  // Guardar una venta localmente
  async guardarVentaLocal(ventaData) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB no inicializada'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);

      // Agregar marca de no sincronizado y timestamp
      const ventaConMetadata = {
        ...ventaData,
        sincronizado: false,
        fecha_hora: new Date().toISOString(),
        client_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      const request = objectStore.add(ventaConMetadata);

      request.onsuccess = () => {
        console.log('Venta guardada localmente:', request.result);
        resolve({ ...ventaConMetadata, id: request.result });
      };

      request.onerror = () => {
        console.error('Error al guardar venta local:', request.error);
        reject(request.error);
      };
    });
  }

  // Obtener todas las ventas pendientes de sincronizar
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
        const ventasPendientes = request.result.filter(venta => venta.sincronizado === false);
        console.log('Ventas pendientes obtenidas:', ventasPendientes.length);
        resolve(ventasPendientes);
      };

      request.onerror = () => {
        console.error('Error al obtener ventas pendientes:', request.error);
        reject(request.error);
      };
    });
  }

  // Marcar una venta como sincronizada
  async marcarComoSincronizada(id) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB no inicializada'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const getRequest = objectStore.get(id);

      getRequest.onsuccess = () => {
        const venta = getRequest.result;
        if (venta) {
          venta.sincronizado = true;
          const updateRequest = objectStore.put(venta);

          updateRequest.onsuccess = () => {
            console.log('Venta marcada como sincronizada:', id);
            resolve(venta);
          };

          updateRequest.onerror = () => {
            console.error('Error al actualizar venta:', updateRequest.error);
            reject(updateRequest.error);
          };
        } else {
          reject(new Error('Venta no encontrada'));
        }
      };

      getRequest.onerror = () => {
        console.error('Error al obtener venta:', getRequest.error);
        reject(getRequest.error);
      };
    });
  }

  // Eliminar una venta local (después de sincronizar exitosamente)
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
        console.log('Venta local eliminada:', id);
        resolve(true);
      };

      request.onerror = () => {
        console.error('Error al eliminar venta local:', request.error);
        reject(request.error);
      };
    });
  }

  // Obtener todas las ventas locales (sincronizadas y no sincronizadas)
  async obtenerTodasLasVentasLocales() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB no inicializada'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        console.log('Todas las ventas locales obtenidas:', request.result.length);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Error al obtener todas las ventas:', request.error);
        reject(request.error);
      };
    });
  }

  // Contar ventas pendientes de sincronizar
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
        const cantidad = request.result.filter(venta => venta.sincronizado === false).length;
        resolve(cantidad);
      };

      request.onerror = () => {
        console.error('Error al contar ventas pendientes:', request.error);
        reject(request.error);
      };
    });
  }
}

// Exportar una instancia única
const indexedDBManager = new IndexedDBManager();

module.exports = { indexedDBManager };
