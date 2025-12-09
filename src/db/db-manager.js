const { supabase } = require('./config');

class DatabaseManager {
  constructor() {
    this.isOnline = true;
  }

  // Verificar conexión a Supabase
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

  // Obtener el siguiente folio
  async obtenerSiguienteFolio() {
    try {
      const { data, error } = await supabase.rpc('obtener_siguiente_folio');

      if (error) {
        console.error('Error al obtener folio:', error);
        throw error;
      }

      return { success: true, folio: data || 1 };
    } catch (error) {
      console.error('Error en obtenerSiguienteFolio:', error);
      return { success: false, error: error.message, folio: 1 };
    }
  }

  // Guardar venta en Supabase
  async guardarVenta(ventaData) {
    try {
      // Obtener el siguiente folio
      const { data: folioData, error: folioError } = await supabase
        .rpc('obtener_siguiente_folio');

      if (folioError) {
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
        client_id: ventaData.client_id || `online-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      // Si viene fecha_hora de sincronización offline, usarla
      if (ventaData.fecha_hora) {
        ventaParaInsertar.fecha_hora = ventaData.fecha_hora;
      }

      const { data, error } = await supabase
        .from('ventas')
        .insert([ventaParaInsertar])
        .select()
        .single();

      if (error) {
        console.error('Error al insertar venta:', error);
        throw error;
      }

      return { success: true, data, folio };
    } catch (error) {
      console.error('Error en guardarVenta:', error);
      return { success: false, error: error.message };
    }
  }

  // Sincronizar múltiples ventas desde el cliente
  async sincronizarVentas(ventas) {
    try {
      const resultados = {
        exitosas: [],
        fallidas: []
      };

      for (const venta of ventas) {
        const resultado = await this.guardarVenta(venta);

        if (resultado.success) {
          resultados.exitosas.push({
            client_id: venta.client_id,
            folio: resultado.folio,
            data: resultado.data
          });
        } else {
          resultados.fallidas.push({
            client_id: venta.client_id,
            error: resultado.error
          });
        }
      }

      return {
        success: true,
        sincronizadas: resultados.exitosas.length,
        errores: resultados.fallidas.length,
        detalles: resultados
      };
    } catch (error) {
      console.error('Error en sincronizarVentas:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener reporte del día actual
  async obtenerReporteDiaActual() {
    try {
      const { data, error } = await supabase.rpc('obtener_reporte_dia_actual');

      if (error) throw error;

      return { success: true, data: data[0] || null };
    } catch (error) {
      console.error('Error al obtener reporte del día:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener reporte diario por fecha
  async obtenerReporteDiario(fecha) {
    try {
      const { data, error } = await supabase
        .from('reporte_diario')
        .select('*')
        .eq('fecha', fecha)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return { success: true, data: data || null };
    } catch (error) {
      console.error('Error al obtener reporte diario:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener reportes semanales
  async obtenerReportesSemanal(limite = 10) {
    try {
      const { data, error } = await supabase
        .from('reporte_semanal')
        .select('*')
        .order('semana_inicio', { ascending: false })
        .limit(limite);

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error al obtener reportes semanales:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener reportes mensuales
  async obtenerReportesMensual(limite = 12) {
    try {
      const { data, error } = await supabase
        .from('reporte_mensual')
        .select('*')
        .order('mes', { ascending: false })
        .limit(limite);

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error al obtener reportes mensuales:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener todas las ventas del día actual
  async obtenerVentasDelDia() {
    try {
      const hoy = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .gte('fecha_hora', `${hoy}T00:00:00`)
        .lte('fecha_hora', `${hoy}T23:59:59`)
        .order('fecha_hora', { ascending: false });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error al obtener ventas del día:', error);
      return { success: false, error: error.message };
    }
  }
}

// Exportar una instancia única
const dbManager = new DatabaseManager();

module.exports = { dbManager };
