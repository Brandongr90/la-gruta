// Sistema de Taquilla La Gruta
// Estado de la aplicación
let ventasDelDia = {
  efectivo: 0,
  transferencia: 0,
  terminal1: 0,
  terminal2: 0,
  totalEntradas: 0,
  totalCortesias: 0
};

let folioActual = 1;
let dbInicializada = false;

// Constantes
const PRECIO_ENTRADA = 300;

// Referencias a elementos DOM
const paymentRadios = document.querySelectorAll('input[name="payment"]');
const terminalSelection = document.getElementById('terminalSelection');
const terminalRadios = document.querySelectorAll('input[name="terminal"]');
const entradasInput = document.getElementById('entradas');
const cortesiasSelect = document.getElementById('cortesias');
const entradasCobrarSpan = document.getElementById('entradasCobrar');
const totalSpan = document.getElementById('total');
const cashSection = document.getElementById('cashSection');
const efectivoRecibidoInput = document.getElementById('efectivoRecibido');
const changeDisplay = document.getElementById('changeDisplay');
const cambioSpan = document.getElementById('cambio');
const imprimirBoletoBtn = document.getElementById('imprimirBoleto');
const cierreVentasBtn = document.getElementById('cierreVentas');
const reporteCompletoBtn = document.getElementById('reporteCompleto');
const reportModal = document.getElementById('reportModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const closeModal = document.getElementById('closeModal');
const printReportBtn = document.getElementById('printReport');

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Sistema de Taquilla La Gruta - Iniciado');

  // Inicializar base de datos
  await inicializarBaseDeDatos();

  cargarDatosGuardados();
  actualizarCalculos();
  configurarNavegacionAutomatica();

  // Acceso oculto mediante click en logo
  const logoImage = document.querySelector('.logo-image');
  if (logoImage) {
    logoImage.addEventListener('click', mostrarReporteCompleto);
    logoImage.style.cursor = 'pointer';
  }

  // Sistema de atajos de teclado
  document.addEventListener('keydown', (e) => {
    // Activar botón oculto para reporte completo (combinación de teclas Ctrl+Shift+R)
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
      mostrarBotonReporteCompleto();
      return;
    }
    
    // No procesar atajos si estamos escribiendo en inputs de texto o selects
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'INPUT' && activeElement.type !== 'radio') {
      return;
    }
    if (activeElement.tagName === 'SELECT') {
      return;
    }
    
    // Solo procesar atajos si no hay modales abiertos
    if (reportModal.style.display === 'flex') {
      return;
    }
    
    manejarAtajosTeclado(e);
  });
});

// Gestión de formas de pago
paymentRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    const selectedPayment = e.target.value;
    
    if (selectedPayment === 'tarjeta') {
      terminalSelection.style.display = 'block';
    } else {
      terminalSelection.style.display = 'none';
      terminalRadios.forEach(tr => tr.checked = false);
    }
    
    if (selectedPayment === 'efectivo') {
      cashSection.style.display = 'block';
    } else {
      cashSection.style.display = 'none';
      efectivoRecibidoInput.value = '';
      changeDisplay.style.display = 'none';
    }
    
    actualizarBotonImprimir();
  });
});

// Gestión de terminales
terminalRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    actualizarBotonImprimir();
  });
});

// Gestión de entradas
entradasInput.addEventListener('input', () => {
  actualizarOpcionesCortesias();
  actualizarCalculos();
  actualizarBotonImprimir();
});

cortesiasSelect.addEventListener('change', () => {
  actualizarCalculos();
  actualizarBotonImprimir();
});

// Gestión de efectivo recibido
efectivoRecibidoInput.addEventListener('input', () => {
  calcularCambio();
  actualizarBotonImprimir();
});

// Botón imprimir boleto
imprimirBoletoBtn.addEventListener('click', () => {
  imprimirBoleto();
});

// Botones de reportes
cierreVentasBtn.addEventListener('click', () => {
  mostrarCierreVentas();
});

reporteCompletoBtn.addEventListener('click', () => {
  mostrarReporteCompleto();
});

// Modal
closeModal.addEventListener('click', () => {
  reportModal.style.display = 'none';
});

printReportBtn.addEventListener('click', () => {
  imprimirReporte();
});

// Click fuera del modal para cerrarlo
window.addEventListener('click', (e) => {
  if (e.target === reportModal) {
    reportModal.style.display = 'none';
  }
});

// Sistema de atajos de teclado
function manejarAtajosTeclado(e) {
  const key = e.key.toLowerCase();
  const selectedPayment = document.querySelector('input[name="payment"]:checked')?.value;
  const terminalVisible = terminalSelection.style.display !== 'none';
  
  // Atajos para terminales (solo cuando están visibles)
  if (terminalVisible) {
    if (key === 'q') {
      e.preventDefault();
      document.querySelector('input[value="terminal1"]').checked = true;
      actualizarBotonImprimir();
      setTimeout(() => {
        entradasInput.focus();
        entradasInput.select();
      }, 50);
      return;
    } else if (key === 'w') {
      e.preventDefault();
      document.querySelector('input[value="terminal2"]').checked = true;
      actualizarBotonImprimir();
      setTimeout(() => {
        entradasInput.focus();
        entradasInput.select();
      }, 50);
      return;
    }
  }
  
  // Atajos para métodos de pago (solo cuando no están visibles las terminales)
  if (!terminalVisible) {
    if (key === 'e') {
      e.preventDefault();
      document.querySelector('input[value="efectivo"]').checked = true;
      document.querySelector('input[value="efectivo"]').dispatchEvent(new Event('change'));
      setTimeout(() => {
        entradasInput.focus();
        entradasInput.select();
      }, 50);
    } else if (key === 't') {
      e.preventDefault();
      document.querySelector('input[value="tarjeta"]').checked = true;
      document.querySelector('input[value="tarjeta"]').dispatchEvent(new Event('change'));
      // Solo mostrar terminales, NO auto-seleccionar ni ir al input
      // La cajera debe presionar Q o W para elegir terminal
    } else if (key === 'r') {
      e.preventDefault();
      document.querySelector('input[value="transferencia"]').checked = true;
      document.querySelector('input[value="transferencia"]').dispatchEvent(new Event('change'));
      setTimeout(() => {
        entradasInput.focus();
        entradasInput.select();
      }, 50);
    }
  }
}

// Navegación automática con Enter
function configurarNavegacionAutomatica() {
  // Enter en campo de entradas va a cortesías
  entradasInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      cortesiasSelect.focus();
    }
  });
  
  // Enter en cortesías va al siguiente campo según el método de pago
  cortesiasSelect.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const selectedPayment = document.querySelector('input[name="payment"]:checked')?.value;
      
      if (selectedPayment === 'efectivo') {
        // Si es efectivo, ir al campo de efectivo recibido
        efectivoRecibidoInput.focus();
        efectivoRecibidoInput.select();
      } else {
        // Si es tarjeta o transferencia, intentar imprimir si está habilitado
        if (!imprimirBoletoBtn.disabled) {
          imprimirBoletoBtn.click();
        }
      }
    }
  });
  
  // Enter en efectivo recibido intenta imprimir
  efectivoRecibidoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!imprimirBoletoBtn.disabled) {
        imprimirBoletoBtn.click();
      }
    }
  });
}

// Funciones principales
function actualizarOpcionesCortesias() {
  const entradas = parseInt(entradasInput.value) || 0;
  const cortesiasActuales = parseInt(cortesiasSelect.value) || 0;
  
  cortesiasSelect.innerHTML = '';
  for (let i = 0; i <= entradas; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    if (i === Math.min(cortesiasActuales, entradas)) {
      option.selected = true;
    }
    cortesiasSelect.appendChild(option);
  }
}

function actualizarCalculos() {
  const entradas = parseInt(entradasInput.value) || 0;
  const cortesias = parseInt(cortesiasSelect.value) || 0;
  const entradasCobrar = Math.max(0, entradas - cortesias);
  const total = entradasCobrar * PRECIO_ENTRADA;
  
  entradasCobrarSpan.textContent = entradasCobrar;
  totalSpan.textContent = `$${total.toFixed(2)}`;
}

function calcularCambio() {
  const total = parseFloat(totalSpan.textContent.replace('$', ''));
  const efectivoRecibido = parseFloat(efectivoRecibidoInput.value) || 0;
  
  if (efectivoRecibido >= total && total > 0) {
    const cambio = efectivoRecibido - total;
    cambioSpan.textContent = `$${cambio.toFixed(2)}`;
    changeDisplay.style.display = 'flex';
  } else {
    changeDisplay.style.display = 'none';
  }
}

function actualizarBotonImprimir() {
  const entradas = parseInt(entradasInput.value) || 0;
  const selectedPayment = document.querySelector('input[name="payment"]:checked')?.value;
  const selectedTerminal = document.querySelector('input[name="terminal"]:checked')?.value;
  const total = parseFloat(totalSpan.textContent.replace('$', ''));
  const efectivoRecibido = parseFloat(efectivoRecibidoInput.value) || 0;
  
  let canPrint = entradas > 0 && total >= 0 && selectedPayment;
  
  if (selectedPayment === 'tarjeta') {
    canPrint = canPrint && selectedTerminal;
  }
  
  if (selectedPayment === 'efectivo' && total > 0) {
    canPrint = canPrint && efectivoRecibido >= total;
  }
  
  imprimirBoletoBtn.disabled = !canPrint;
}

async function imprimirBoleto() {
  const entradas = parseInt(entradasInput.value) || 0;
  const cortesias = parseInt(cortesiasSelect.value) || 0;
  const entradasCobrar = entradas - cortesias;
  const total = entradasCobrar * PRECIO_ENTRADA;
  const selectedPayment = document.querySelector('input[name="payment"]:checked')?.value;
  const selectedTerminal = document.querySelector('input[name="terminal"]:checked')?.value;
  const efectivoRecibido = parseFloat(efectivoRecibidoInput.value) || 0;

  // Actualizar ventas del día (local)
  ventasDelDia.totalEntradas += entradas;
  ventasDelDia.totalCortesias += cortesias;

  switch (selectedPayment) {
    case 'efectivo':
      ventasDelDia.efectivo += total;
      break;
    case 'transferencia':
      ventasDelDia.transferencia += total;
      break;
    case 'tarjeta':
      if (selectedTerminal === 'terminal1') {
        ventasDelDia.terminal1 += total;
      } else {
        ventasDelDia.terminal2 += total;
      }
      break;
  }

  // Preparar datos de la venta para la base de datos
  const ventaData = {
    entradas,
    cortesias,
    entradasCobrar,
    total,
    formaPago: selectedPayment,
    terminal: selectedTerminal,
    efectivoRecibido: selectedPayment === 'efectivo' ? efectivoRecibido : null,
    cambio: selectedPayment === 'efectivo' ? efectivoRecibido - total : null
  };

  // Guardar en la base de datos (online o offline)
  if (dbInicializada && window.clientDB) {
    try {
      const resultado = await window.clientDB.guardarVenta(ventaData);
      if (resultado.success) {
        if (resultado.mode === 'online' && resultado.folio) {
          folioActual = resultado.folio + 1;
        }
        console.log(`Venta guardada en modo ${resultado.mode}`);
      }
    } catch (error) {
      console.error('Error al guardar venta en BD:', error);
    }
  }

  // Generar ticket
  const ticket = generarTicket({
    folio: folioActual++,
    entradas,
    cortesias,
    entradasCobrar,
    total,
    formaPago: selectedPayment,
    terminal: selectedTerminal,
    efectivoRecibido: selectedPayment === 'efectivo' ? efectivoRecibido : null,
    cambio: selectedPayment === 'efectivo' ? efectivoRecibido - total : null
  });

  // Simular impresión (en una implementación real, aquí se enviaría a la impresora)
  console.log('TICKET IMPRESO:');
  console.log(ticket);

  // Mostrar confirmación visual
  mostrarConfirmacionImpresion();

  // Limpiar formulario
  limpiarFormulario();

  // Guardar datos localmente
  guardarDatos();
}

function generarTicket(datos) {
  const fecha = new Date().toLocaleString('es-MX');
  
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           LA GRUTA
       Balneario y Spa
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FOLIO: ${datos.folio.toString().padStart(6, '0')}
FECHA: ${fecha}

ENTRADAS GENERALES: ${datos.entradas}
CORTESÍAS: ${datos.cortesias}
ENTRADAS A COBRAR: ${datos.entradasCobrar}

PRECIO UNITARIO: $${PRECIO_ENTRADA.toFixed(2)}
TOTAL: $${datos.total.toFixed(2)}

FORMA DE PAGO: ${datos.formaPago.toUpperCase()}${datos.terminal ? ` (${datos.terminal.toUpperCase()})` : ''}

${datos.efectivoRecibido !== null ? `
EFECTIVO RECIBIDO: $${datos.efectivoRecibido.toFixed(2)}
CAMBIO: $${datos.cambio.toFixed(2)}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROHIBIDA LA ENTRADA DE:
• Alimentos
• Bebidas  
• Mascotas
USO EXCLUSIVO DE TRAJE DE BAÑO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

www.lagruta-spa.com.mx
Tel. 4151852162

Gracias por tu visita!

No válido como comprobante fiscal
Una vez pagado no hay devoluciones
Solicitar factura en el momento 
de la compra

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `;
}

function mostrarConfirmacionImpresion() {
  const originalText = imprimirBoletoBtn.textContent;
  imprimirBoletoBtn.textContent = '✅ Boleto Impreso';
  imprimirBoletoBtn.style.background = 'linear-gradient(135deg, #68d391 0%, #48bb78 100%)';
  
  setTimeout(() => {
    imprimirBoletoBtn.textContent = originalText;
    imprimirBoletoBtn.style.background = '';
  }, 2000);
}

function limpiarFormulario() {
  entradasInput.value = '0';
  cortesiasSelect.innerHTML = '<option value="0">0</option>';
  efectivoRecibidoInput.value = '';
  changeDisplay.style.display = 'none';
  
  // Resetear a efectivo
  document.querySelector('input[value="efectivo"]').checked = true;
  terminalSelection.style.display = 'none';
  cashSection.style.display = 'block';
  
  actualizarCalculos();
  actualizarBotonImprimir();
  
  // Después de limpiar, posicionar el cursor en el campo de entradas
  setTimeout(() => {
    entradasInput.focus();
    entradasInput.select();
  }, 100);
}

async function mostrarCierreVentas() {
  const fechaHoy = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Mostrar loading
  modalTitle.textContent = '📊 Cierre de Ventas del Día';
  modalBody.innerHTML = '<div style="text-align: center; padding: 40px;"><p>Cargando reporte desde la base de datos...</p></div>';
  reportModal.style.display = 'flex';

  let datosReporte = null;

  // Intentar obtener datos desde Supabase
  if (window.electronAPI?.db && navigator.onLine) {
    try {
      const resultado = await window.electronAPI.db.obtenerReporteDiaActual();
      if (resultado.success && resultado.data) {
        datosReporte = resultado.data;
        console.log('📊 Reporte obtenido desde Supabase');
      }
    } catch (error) {
      console.warn('Error al obtener reporte desde Supabase, usando datos locales:', error);
    }
  }

  // Fallback a datos locales si no hay conexión o falla Supabase
  if (!datosReporte) {
    console.log('📊 Usando datos locales para el reporte');
    datosReporte = {
      total_entradas: ventasDelDia.totalEntradas || 0,
      total_cortesias: ventasDelDia.totalCortesias || 0,
      total_efectivo: ventasDelDia.efectivo || 0,
      total_terminal1: ventasDelDia.terminal1 || 0
    };
  }

  const terminal1 = parseFloat(datosReporte.total_terminal1) || 0;
  const efectivo = parseFloat(datosReporte.total_efectivo) || 0;
  const cuentaFiscal = terminal1 + (efectivo * 0.1);
  const totalEntradas = parseInt(datosReporte.total_entradas) || 0;
  const totalCortesias = parseInt(datosReporte.total_cortesias) || 0;
  const entradasCobradas = totalEntradas - totalCortesias;

  const reporte = `
    <div class="report-container">
      <!-- Header del reporte -->
      <div class="report-header">
        <div class="report-icon">📊</div>
        <div class="report-title-section">
          <h2 class="report-title">Cierre de Ventas del Día</h2>
          <p class="report-date">📅 ${fechaHoy}</p>
        </div>
      </div>

      <!-- Cuenta Fiscal - Destacada -->
      <div class="report-card fiscal-card">
        <div class="card-header">
          <div class="card-icon">🏛️</div>
          <h3>Cuenta Fiscal</h3>
        </div>
        <div class="fiscal-items">
          <div class="fiscal-item">
            <div class="fiscal-item-info">
              <span class="fiscal-label">💳 Terminal 1</span>
              <span class="fiscal-amount">$${terminal1.toFixed(2)}</span>
            </div>
          </div>
          <div class="fiscal-item">
            <div class="fiscal-item-info">
              <span class="fiscal-label">💵 Efectivo</span>
              <span class="fiscal-amount">$${(efectivo * 0.1).toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div class="fiscal-total">
          <div class="total-line"></div>
          <div class="total-amount">
            <span class="total-label">Total a Reportar</span>
            <span class="total-value">$${cuentaFiscal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  modalBody.innerHTML = reporte;
}

function mostrarBotonReporteCompleto() {
  reporteCompletoBtn.style.opacity = '1';
  reporteCompletoBtn.style.height = 'auto';
  reporteCompletoBtn.style.overflow = 'visible';
  
  setTimeout(() => {
    reporteCompletoBtn.style.opacity = '0';
    reporteCompletoBtn.style.height = '0';
    reporteCompletoBtn.style.overflow = 'hidden';
  }, 5000);
}

async function mostrarReporteCompleto() {
  const fechaHoy = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Mostrar loading
  modalTitle.textContent = '📈 Reporte Completo del Día';
  modalBody.innerHTML = '<div style="text-align: center; padding: 40px;"><p>Cargando reporte completo desde la base de datos...</p></div>';
  reportModal.style.display = 'flex';

  let datosReporte = null;

  // Intentar obtener datos desde Supabase
  if (window.electronAPI?.db && navigator.onLine) {
    try {
      const resultado = await window.electronAPI.db.obtenerReporteDiaActual();
      if (resultado.success && resultado.data) {
        datosReporte = resultado.data;
        console.log('📈 Reporte completo obtenido desde Supabase');
      }
    } catch (error) {
      console.warn('Error al obtener reporte desde Supabase, usando datos locales:', error);
    }
  }

  // Fallback a datos locales si no hay conexión o falla Supabase
  if (!datosReporte) {
    console.log('📈 Usando datos locales para el reporte completo');
    datosReporte = {
      total_entradas: ventasDelDia.totalEntradas || 0,
      total_cortesias: ventasDelDia.totalCortesias || 0,
      total_efectivo: ventasDelDia.efectivo || 0,
      total_transferencia: ventasDelDia.transferencia || 0,
      total_terminal1: ventasDelDia.terminal1 || 0,
      total_terminal2: ventasDelDia.terminal2 || 0
    };
  }

  const efectivo = parseFloat(datosReporte.total_efectivo) || 0;
  const transferencia = parseFloat(datosReporte.total_transferencia) || 0;
  const terminal1 = parseFloat(datosReporte.total_terminal1) || 0;
  const terminal2 = parseFloat(datosReporte.total_terminal2) || 0;
  const totalGeneral = efectivo + transferencia + terminal1 + terminal2;
  const cuentaFiscal = terminal1 + (efectivo * 0.1);
  const totalEntradas = parseInt(datosReporte.total_entradas) || 0;
  const totalCortesias = parseInt(datosReporte.total_cortesias) || 0;
  const entradasCobradas = totalEntradas - totalCortesias;

  // Calcular porcentajes para gráfico visual
  const porcentajeEfectivo = totalGeneral > 0 ? (efectivo / totalGeneral * 100) : 0;
  const porcentajeTransferencia = totalGeneral > 0 ? (transferencia / totalGeneral * 100) : 0;
  const porcentajeTerminal1 = totalGeneral > 0 ? (terminal1 / totalGeneral * 100) : 0;
  const porcentajeTerminal2 = totalGeneral > 0 ? (terminal2 / totalGeneral * 100) : 0;
  
  const reporte = `
    <div class="report-container">
      <!-- Header del reporte -->
      <div class="report-header">
        <div class="report-icon">📈</div>
        <div class="report-title-section">
          <h2 class="report-title">Reporte Completo del Día</h2>
          <p class="report-date">📅 ${fechaHoy}</p>
        </div>
      </div>
      
      <!-- Resumen General -->
      <div class="report-summary">
        <div class="summary-item">
          <div class="summary-icon">💰</div>
          <div class="summary-info">
            <span class="summary-label">Total del Día</span>
            <span class="summary-value">$${totalGeneral.toFixed(2)}</span>
          </div>
        </div>
        <div class="summary-item">
          <div class="summary-icon">🎫</div>
          <div class="summary-info">
            <span class="summary-label">Entradas Vendidas</span>
            <span class="summary-value">${entradasCobradas}</span>
          </div>
        </div>
        <div class="summary-item">
          <div class="summary-icon">📋</div>
          <div class="summary-info">
            <span class="summary-label">Folio Actual</span>
            <span class="summary-value">${folioActual.toString().padStart(6, '0')}</span>
          </div>
        </div>
      </div>
      
      <!-- Desglose por Forma de Pago -->
      <div class="report-card payment-breakdown">
        <div class="card-header">
          <div class="card-icon">💳</div>
          <h3>Desglose por Forma de Pago</h3>
        </div>
        <div class="payment-items">
          <div class="payment-item">
            <div class="payment-info">
              <div class="payment-icon">💵</div>
              <span class="payment-label">Efectivo</span>
            </div>
            <div class="payment-amount">
              <span class="amount">$${efectivo.toFixed(2)}</span>
              <div class="progress-bar">
                <div class="progress-fill efectivo" style="width: ${porcentajeEfectivo}%"></div>
              </div>
              <span class="percentage">${porcentajeEfectivo.toFixed(1)}%</span>
            </div>
          </div>
          <div class="payment-item">
            <div class="payment-info">
              <div class="payment-icon">📱</div>
              <span class="payment-label">Transferencia</span>
            </div>
            <div class="payment-amount">
              <span class="amount">$${transferencia.toFixed(2)}</span>
              <div class="progress-bar">
                <div class="progress-fill transferencia" style="width: ${porcentajeTransferencia}%"></div>
              </div>
              <span class="percentage">${porcentajeTransferencia.toFixed(1)}%</span>
            </div>
          </div>
          <div class="payment-item">
            <div class="payment-info">
              <div class="payment-icon">💳</div>
              <span class="payment-label">Terminal 1</span>
            </div>
            <div class="payment-amount">
              <span class="amount">$${terminal1.toFixed(2)}</span>
              <div class="progress-bar">
                <div class="progress-fill terminal1" style="width: ${porcentajeTerminal1}%"></div>
              </div>
              <span class="percentage">${porcentajeTerminal1.toFixed(1)}%</span>
            </div>
          </div>
          <div class="payment-item">
            <div class="payment-info">
              <div class="payment-icon">💳</div>
              <span class="payment-label">Terminal 2</span>
            </div>
            <div class="payment-amount">
              <span class="amount">$${terminal2.toFixed(2)}</span>
              <div class="progress-bar">
                <div class="progress-fill terminal2" style="width: ${porcentajeTerminal2}%"></div>
              </div>
              <span class="percentage">${porcentajeTerminal2.toFixed(1)}%</span>
            </div>
          </div>
        </div>
        <div class="payment-total">
          <div class="total-line"></div>
          <div class="total-amount">
            <span class="total-label">Total General</span>
            <span class="total-value">$${totalGeneral.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      <!-- Cuenta Fiscal y Entradas en Grid -->
      <div class="report-grid">
        <!-- Cuenta Fiscal -->
        <div class="report-card fiscal-card">
          <div class="card-header">
            <div class="card-icon">🏛️</div>
            <h3>Cuenta Fiscal</h3>
          </div>
          <div class="fiscal-items">
            <div class="fiscal-item">
              <div class="fiscal-item-info">
                <span class="fiscal-label">💳 Terminal 1</span>
                <span class="fiscal-amount">$${terminal1.toFixed(2)}</span>
              </div>
            </div>
            <div class="fiscal-item">
              <div class="fiscal-item-info">
                <span class="fiscal-label">💵 Efectivo</span>
                <span class="fiscal-amount">$${(efectivo * 0.1).toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div class="fiscal-total">
            <div class="total-line"></div>
            <div class="total-amount">
              <span class="total-label">Total Fiscal</span>
              <span class="total-value">$${cuentaFiscal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <!-- Estadísticas de Entradas -->
        <div class="report-card entries-card">
          <div class="card-header">
            <div class="card-icon">🎫</div>
            <h3>Estadísticas de Entradas</h3>
          </div>
          <div class="entries-stats">
            <div class="stat-item">
              <div class="stat-icon">🎟️</div>
              <div class="stat-info">
                <span class="stat-label">Total Entradas</span>
                <span class="stat-value">${totalEntradas}</span>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon">🎁</div>
              <div class="stat-info">
                <span class="stat-label">Cortesías</span>
                <span class="stat-value">${totalCortesias}</span>
              </div>
            </div>
            <div class="stat-item highlight">
              <div class="stat-icon">💰</div>
              <div class="stat-info">
                <span class="stat-label">Entradas Cobradas</span>
                <span class="stat-value">${entradasCobradas}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  modalTitle.textContent = '📈 Reporte Completo del Día';
  modalBody.innerHTML = reporte;
  reportModal.style.display = 'flex';
}

function imprimirReporte() {
  window.print();
}

function guardarDatos() {
  localStorage.setItem('ventasDelDia', JSON.stringify(ventasDelDia));
  localStorage.setItem('folioActual', folioActual.toString());
}

function cargarDatosGuardados() {
  const ventasGuardadas = localStorage.getItem('ventasDelDia');
  const folioGuardado = localStorage.getItem('folioActual');
  
  if (ventasGuardadas) {
    ventasDelDia = JSON.parse(ventasGuardadas);
  }
  
  if (folioGuardado) {
    folioActual = parseInt(folioGuardado);
  }
}

// Reiniciar datos del día (función para desarrollo/testing)
function reiniciarDia() {
  if (confirm('¿Estás seguro de que deseas reiniciar los datos del día?')) {
    ventasDelDia = {
      efectivo: 0,
      transferencia: 0,
      terminal1: 0,
      terminal2: 0,
      totalEntradas: 0,
      totalCortesias: 0
    };
    folioActual = 1;
    guardarDatos();
    alert('Datos reiniciados correctamente');
  }
}

// Exponer función para debugging (opcional)
window.reiniciarDia = reiniciarDia;

// ============================================
// Funciones de Base de Datos
// ============================================

async function inicializarBaseDeDatos() {
  try {
    if (window.clientDB) {
      console.log('📦 Inicializando base de datos local...');
      await window.clientDB.init();
      dbInicializada = true;

      // Configurar listener para estado de conexión
      window.clientDB.agregarSyncListener((estado) => {
        actualizarIndicadorEstado(estado);
      });

      // Verificar si hay ventas pendientes de sincronizar
      const pendientes = await window.clientDB.contarVentasPendientes();
      if (pendientes > 0) {
        console.log(`⚠️ Hay ${pendientes} ventas pendientes de sincronizar`);
        mostrarNotificacionSincronizacion(pendientes);
      }

      // Obtener folio actual desde Supabase si estamos online
      if (navigator.onLine && window.electronAPI?.db) {
        try {
          const resultado = await window.electronAPI.db.obtenerSiguienteFolio();
          if (resultado.success && resultado.folio) {
            folioActual = resultado.folio;
            console.log(`📋 Folio actual desde BD: ${folioActual}`);
          }
        } catch (error) {
          console.warn('No se pudo obtener folio desde BD, usando local');
        }
      }

      console.log('✅ Base de datos inicializada correctamente');
    }
  } catch (error) {
    console.error('Error al inicializar base de datos:', error);
    dbInicializada = false;
  }
}

function actualizarIndicadorEstado(estado) {
  // Aquí puedes agregar un indicador visual en la UI
  if (estado.online !== undefined) {
    if (estado.online) {
      console.log('🟢 Estado: ONLINE');
    } else {
      console.log('🔴 Estado: OFFLINE');
    }
  }

  if (estado.syncing !== undefined) {
    if (estado.syncing) {
      console.log('🔄 Sincronizando...');
    } else if (estado.sincronizadas !== undefined) {
      console.log(`✅ Sincronizadas: ${estado.sincronizadas} ventas`);
    }
  }
}

function mostrarNotificacionSincronizacion(cantidad) {
  console.log(`📢 Notificación: ${cantidad} ventas pendientes de sincronización`);
  // Aquí podrías mostrar una notificación visual al usuario
}

// Función para sincronizar manualmente
async function sincronizarManualmente() {
  if (window.clientDB) {
    console.log('🔄 Iniciando sincronización manual...');
    const resultado = await window.clientDB.sincronizar();
    if (resultado.success) {
      alert(`Sincronización completada: ${resultado.sincronizadas} ventas sincronizadas`);
    } else {
      alert(`Error en sincronización: ${resultado.message || resultado.error}`);
    }
  }
}

// Función para obtener reportes desde Supabase
async function obtenerReporteDesdeSupabase(tipo = 'dia') {
  if (!window.electronAPI?.db) {
    console.warn('API de base de datos no disponible');
    return null;
  }

  try {
    let resultado;

    switch (tipo) {
      case 'dia':
        resultado = await window.electronAPI.db.obtenerReporteDiaActual();
        break;
      case 'semana':
        resultado = await window.electronAPI.db.obtenerReportesSemanal(10);
        break;
      case 'mes':
        resultado = await window.electronAPI.db.obtenerReportesMensual(12);
        break;
      default:
        return null;
    }

    if (resultado.success && resultado.data) {
      return resultado.data;
    }

    return null;
  } catch (error) {
    console.error('Error al obtener reporte desde Supabase:', error);
    return null;
  }
}

// Exponer funciones para debugging
window.sincronizarManualmente = sincronizarManualmente;
window.obtenerReporteDesdeSupabase = obtenerReporteDesdeSupabase;
