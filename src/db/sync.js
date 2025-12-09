const { supabase } = require('./config');
const { indexedDBManager } = require('./indexeddb');

class SyncManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
    this.syncInterval = null;
    this.listeners = [];

    // Escuchar cambios en el estado de la conexión
    window.addEventListener('online', () => {
      console.log('Conexión a internet restaurada');
      this.isOnline = true;
      this.notificarCambioEstado({ online: true });
      this.sincronizar();
    });

    window.addEventListener('offline', () => {
      console.log('Conexión a internet perdida');
      this.isOnline = false;
      this.notificarCambioEstado({ online: false });
    });
  }

  // Agregar listener para cambios de estado
  agregarListener(callback) {
    this.listeners.push(callback);
  }

  // Notificar a todos los listeners
  notificarCambioEstado(estado) {
    this.listeners.forEach(callback => callback(estado));
  }

  // Verificar conexión a internet intentando hacer ping a Supabase
  async verificarConexion() {
    try {
      const { error } = await supabase.from('ventas').select('id').limit(1);
      if (error && error.message.includes('fetch')) {
        this.isOnline = false;
        return false;
      }
      this.isOnline = true;
      return true;
    } catch (error) {
      console.error('Error al verificar conexión:', error);
      this.isOnline = false;
      return false;
    }
  }

  // Guardar una venta (intenta online primero, luego offline)
  async guardarVenta(ventaData) {
    try {
      // Intentar guardar online primero
      if (this.isOnline) {
        const resultado = await this.guardarVentaOnline(ventaData);
        if (resultado.success) {
          console.log('Venta guardada online exitosamente');
          return { success: true, mode: 'online', data: resultado.data };
        }
      }

      // Si falla o estamos offline, guardar localmente
      console.log('Guardando venta en modo offline');
      const ventaLocal = await indexedDBManager.guardarVentaLocal(ventaData);

      // Intentar sincronizar inmediatamente si estamos online
      if (this.isOnline) {
        setTimeout(() => this.sincronizar(), 1000);
      }

      return { success: true, mode: 'offline', data: ventaLocal };
    } catch (error) {
      console.error('Error al guardar venta:', error);
      throw error;
    }
  }

  // Guardar venta directamente en Supabase
  async guardarVentaOnline(ventaData) {
    try {
      // Obtener el siguiente folio
      const { data: folioData, error: folioError } = await supabase
        .rpc('obtener_siguiente_folio');

      if (folioError) {
        console.error('Error al obtener folio:', folioError);
        throw folioError;
      }

      const folio = folioData || 1;

      // Preparar datos para insertar
      const ventaParaInsertar = {
        folio: folio,
        entradas_totales: ventaData.entradas,
        cortesias: ventaData.cortesias,
        entradas_cobradas: ventaData.entradasCobrar,
        forma_pago: ventaData.formaPago,
        terminal: ventaData.terminal || null,
        monto_total: ventaData.total,
        efectivo_recibido: ventaData.efectivoRecibido || null,
        cambio: ventaData.cambio || null,
        precio_unitario: 300,
        sincronizado: true,
        client_id: `online-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      const { data, error } = await supabase
        .from('ventas')
        .insert([ventaParaInsertar])
        .select()
        .single();

      if (error) {
        console.error('Error al insertar venta en Supabase:', error);
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error en guardarVentaOnline:', error);
      return { success: false, error };
    }
  }

  // Sincronizar ventas pendientes
  async sincronizar() {
    if (this.isSyncing) {
      console.log('Ya hay una sincronización en progreso');
      return { success: false, message: 'Sincronización en progreso' };
    }

    if (!this.isOnline) {
      console.log('Sin conexión a internet, no se puede sincronizar');
      return { success: false, message: 'Sin conexión' };
    }

    this.isSyncing = true;
    this.notificarCambioEstado({ syncing: true });

    try {
      // Verificar conexión real
      const conexionActiva = await this.verificarConexion();
      if (!conexionActiva) {
        throw new Error('No se pudo conectar a Supabase');
      }

      const ventasPendientes = await indexedDBManager.obtenerVentasPendientes();

      if (ventasPendientes.length === 0) {
        console.log('No hay ventas pendientes de sincronizar');
        this.isSyncing = false;
        this.notificarCambioEstado({ syncing: false });
        return { success: true, sincronizadas: 0 };
      }

      console.log(`Sincronizando ${ventasPendientes.length} ventas pendientes...`);

      let sincronizadas = 0;
      let errores = 0;

      for (const venta of ventasPendientes) {
        try {
          // Preparar datos para Supabase
          const ventaParaSupabase = {
            entradas_totales: venta.entradas,
            cortesias: venta.cortesias,
            entradas_cobradas: venta.entradasCobrar,
            forma_pago: venta.formaPago,
            terminal: venta.terminal || null,
            monto_total: venta.total,
            efectivo_recibido: venta.efectivoRecibido || null,
            cambio: venta.cambio || null,
            precio_unitario: 300,
            sincronizado: true,
            client_id: venta.client_id,
            fecha_hora: venta.fecha_hora
          };

          // Insertar en Supabase
          const { data, error } = await supabase
            .from('ventas')
            .insert([ventaParaSupabase])
            .select()
            .single();

          if (error) {
            console.error('Error al sincronizar venta:', error);
            errores++;
            continue;
          }

          // Eliminar de IndexedDB después de sincronizar exitosamente
          await indexedDBManager.eliminarVentaLocal(venta.id);
          sincronizadas++;

          console.log(`Venta ${venta.id} sincronizada exitosamente`);
        } catch (error) {
          console.error(`Error al sincronizar venta ${venta.id}:`, error);
          errores++;
        }
      }

      this.isSyncing = false;
      this.notificarCambioEstado({ syncing: false, sincronizadas, errores });

      console.log(`Sincronización completada: ${sincronizadas} exitosas, ${errores} errores`);

      return { success: true, sincronizadas, errores };
    } catch (error) {
      console.error('Error durante la sincronización:', error);
      this.isSyncing = false;
      this.notificarCambioEstado({ syncing: false, error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Iniciar sincronización automática cada X minutos
  iniciarSincronizacionAutomatica(intervaloMinutos = 5) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        console.log('Ejecutando sincronización automática...');
        this.sincronizar();
      }
    }, intervaloMinutos * 60 * 1000);

    console.log(`Sincronización automática configurada cada ${intervaloMinutos} minutos`);
  }

  // Detener sincronización automática
  detenerSincronizacionAutomatica() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Sincronización automática detenida');
    }
  }

  // Obtener reportes desde Supabase
  async obtenerReporteDiario(fecha = null) {
    try {
      if (!fecha) {
        // Reporte del día actual
        const { data, error } = await supabase
          .rpc('obtener_reporte_dia_actual');

        if (error) throw error;
        return { success: true, data: data[0] || null };
      } else {
        // Reporte de una fecha específica
        const { data, error } = await supabase
          .from('reporte_diario')
          .select('*')
          .eq('fecha', fecha)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        return { success: true, data: data || null };
      }
    } catch (error) {
      console.error('Error al obtener reporte diario:', error);
      return { success: false, error: error.message };
    }
  }

  async obtenerReporteSemanal() {
    try {
      const { data, error } = await supabase
        .from('reporte_semanal')
        .select('*')
        .order('semana_inicio', { ascending: false })
        .limit(10);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error al obtener reporte semanal:', error);
      return { success: false, error: error.message };
    }
  }

  async obtenerReporteMensual() {
    try {
      const { data, error } = await supabase
        .from('reporte_mensual')
        .select('*')
        .order('mes', { ascending: false })
        .limit(12);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error al obtener reporte mensual:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener estado actual
  obtenerEstado() {
    return {
      online: this.isOnline,
      syncing: this.isSyncing,
      autoSyncEnabled: this.syncInterval !== null
    };
  }
}

// Exportar una instancia única
const syncManager = new SyncManager();

module.exports = { syncManager };
