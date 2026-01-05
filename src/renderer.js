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
let tipoReporteActual = null; // 'publico' o 'privado'

// Constantes
const PRECIO_ENTRADA = 350;

// Configuración de Impresora Térmica
const CONFIG_IMPRESORA = {
  ANCHO_TICKET_MM: 100,  // Ancho del ticket en milímetros
  CARACTERES_POR_LINEA: 42,  // Aproximadamente para 100mm
  USAR_IMPRESORA: true  // Impresora EPSON TM-T20II (M267D) activada
};

// Comandos ESC/POS para Impresoras Térmicas
const COMANDOS_ESC_POS = {
  // Comandos de inicialización
  INIT: '\x1B\x40',                    // Inicializar impresora

  // Comandos de corte
  CORTE_PARCIAL: '\x1B\x6D',           // Corte parcial (deja pestaña pequeña)
  CORTE_TOTAL: '\x1B\x69',             // Corte total

  // Comandos de avance de papel
  AVANZAR_3_LINEAS: '\x1B\x64\x03',   // Avanzar 3 líneas
  AVANZAR_5_LINEAS: '\x1B\x64\x05',   // Avanzar 5 líneas

  // Comandos de formato
  NEGRITA_ON: '\x1B\x45\x01',          // Activar negrita
  NEGRITA_OFF: '\x1B\x45\x00',         // Desactivar negrita
  CENTRAR: '\x1B\x61\x01',             // Alinear al centro
  IZQUIERDA: '\x1B\x61\x00',           // Alinear a la izquierda

  // Tamaños de texto
  TEXTO_NORMAL: '\x1D\x21\x00',        // Texto tamaño normal
  TEXTO_DOBLE: '\x1D\x21\x11',         // Texto doble (ancho y alto)

  // Comandos de calidad de impresión
  ENFASIS_ON: '\x1B\x45\x01',          // Activar énfasis (mayor densidad)
  ENFASIS_OFF: '\x1B\x45\x00',         // Desactivar énfasis
  DOBLE_STRIKE_ON: '\x1B\x47\x01',    // Doble golpe (más oscuro)
  DOBLE_STRIKE_OFF: '\x1B\x47\x00',   // Desactivar doble golpe

  // Comandos de densidad de impresión (EPSON específico)
  DENSIDAD_MAX: '\x1D\x7C\x00',        // Densidad de impresión máxima
  CALOR_MAX: '\x1B\x37\x0F\x40\x03',  // Calor máximo (heating time, heating interval, heat dots)

  // Código de barras (opcional para futuro)
  CODIGO_BARRAS_128: '\x1D\x6B\x49',  // Código de barras CODE128
};

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
const printingModal = document.getElementById('printingModal');
const printingTitle = document.getElementById('printingTitle');
const printingProgress = document.getElementById('printingProgress');
const fiscalModal = document.getElementById('fiscalModal');
const closeFiscalModal = document.getElementById('closeFiscalModal');
const entradasFiscalesInput = document.getElementById('entradasFiscalesInput');
const fiscalPreview = document.getElementById('fiscalPreview');
const fiscalPreviewAmount = document.getElementById('fiscalPreviewAmount');
const saveFiscalEntriesBtn = document.getElementById('saveFiscalEntries');

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Sistema de Taquilla La Gruta - Iniciado');

  // Inicializar base de datos
  await inicializarBaseDeDatos();

  await cargarDatosGuardados();
  actualizarCalculos();
  configurarNavegacionAutomatica();

  // Acceso oculto mediante click en logo
  const logoImage = document.querySelector('.logo-image');
  if (logoImage) {
    logoImage.addEventListener('click', mostrarReporteCompleto);
    logoImage.style.cursor = 'pointer';
  }

  // Acceso oculto mediante click en "Datos del Boleto" (sin cambiar cursor)
  const datosBoletoHeader = document.getElementById('datosBoletoHeader');
  if (datosBoletoHeader) {
    datosBoletoHeader.addEventListener('click', abrirModalEntradrasFiscales);
    // NO cambiar el cursor para mantenerlo oculto
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
    
    // Campo de efectivo recibido desactivado permanentemente
    cashSection.style.display = 'none';
    efectivoRecibidoInput.value = '';
    changeDisplay.style.display = 'none';
    
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

// Limpiar el 0 cuando se hace click/focus en el campo de entradas
entradasInput.addEventListener('focus', () => {
  // Seleccionar todo el texto para que sea fácil reemplazarlo
  setTimeout(() => {
    entradasInput.select();
  }, 10);
});

// Si el usuario sale sin escribir nada, volver a poner 0
entradasInput.addEventListener('blur', () => {
  // Solo resetear si el campo está vacío o tiene valor inválido
  // Y no estamos en medio de una impresión
  if (!printingModal || printingModal.style.display === 'none') {
    if (entradasInput.value === '' || parseInt(entradasInput.value) < 0) {
      entradasInput.value = '0';
      actualizarOpcionesCortesias();
      actualizarCalculos();
      actualizarBotonImprimir();
    }
  }
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

// Botón 
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
  if (e.target === fiscalModal) {
    fiscalModal.style.display = 'none';
  }
});

// Event listeners para modal de entradas fiscales
closeFiscalModal.addEventListener('click', () => {
  fiscalModal.style.display = 'none';
});

entradasFiscalesInput.addEventListener('input', () => {
  actualizarPreviewFiscal();
});

saveFiscalEntriesBtn.addEventListener('click', () => {
  guardarEntradasFiscales();
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
  // Enter en campo de entradas intenta imprimir directamente
  entradasInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Intentar imprimir si el botón está habilitado
      if (!imprimirBoletoBtn.disabled) {
        imprimirBoletoBtn.click();
      }
    }
  });
  
  // Enter en cortesías va al siguiente campo según el método de pago
  cortesiasSelect.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Para cualquier forma de pago, intentar imprimir si está habilitado
      if (!imprimirBoletoBtn.disabled) {
        imprimirBoletoBtn.click();
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

  let canPrint = entradas > 0 && total >= 0 && selectedPayment;

  if (selectedPayment === 'tarjeta') {
    canPrint = canPrint && selectedTerminal;
  }

  // Ya no se requiere validar efectivo recibido para pagos en efectivo

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

  // Mostrar modal de loading
  printingTitle.textContent = entradas === 1 ? 'Imprimiendo boleto...' : 'Imprimiendo boletos...';
  printingProgress.textContent = `0 de ${entradas}`;
  printingModal.style.display = 'flex';

  // Pequeña pausa para que se muestre el modal
  await new Promise(resolve => setTimeout(resolve, 100));

  try {

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
    // Para pagos en efectivo, registrar el monto exacto (sin cambio)
    efectivoRecibido: selectedPayment === 'efectivo' ? total : null,
    cambio: selectedPayment === 'efectivo' ? 0 : null
  };

  // Guardar en la base de datos (online o offline)
  if (dbInicializada && window.clientDB) {
    try {
      console.log('💾 Intentando guardar venta:', {
        formaPago: ventaData.formaPago,
        total: ventaData.total,
        entradas: ventaData.entradas
      });

      const resultado = await window.clientDB.guardarVenta(ventaData);

      if (resultado.success) {
        if (resultado.mode === 'online' && resultado.folio) {
          folioActual = resultado.folio + 1;
        }
        console.log(`✅ Venta guardada exitosamente en modo ${resultado.mode}`, {
          formaPago: ventaData.formaPago,
          total: ventaData.total,
          folio: resultado.folio || 'N/A (offline)'
        });
      } else {
        console.error('❌ Error: La venta NO se guardó exitosamente', resultado);
      }
    } catch (error) {
      console.error('❌ Excepción al guardar venta en BD:', error);
      console.error('   Detalles de la venta que falló:', ventaData);
    }
  } else {
    console.error('❌ No se puede guardar: DB no inicializada o clientDB no disponible', {
      dbInicializada,
      clientDBDisponible: !!window.clientDB
    });
  }

  // Generar e imprimir tickets individuales (uno por cada entrada)
  const folioBase = folioActual++;
  const precioPorEntrada = PRECIO_ENTRADA;

  console.log('╔════════════════════════════════════════╗');
  console.log('║         TICKETS IMPRESOS               ║');
  console.log(`║   Total de entradas: ${entradas.toString().padStart(2, ' ')}            ║`);
  console.log(`║   Cortesías: ${cortesias.toString().padStart(2, ' ')}                    ║`);
  console.log(`║   Cobradas: ${entradasCobrar.toString().padStart(2, ' ')}                     ║`);
  console.log('╚════════════════════════════════════════╝');
  console.log('');

  // Imprimir tickets individualmente (uno por uno) para que la impresora corte entre cada uno
  for (let i = 0; i < entradas; i++) {
    const numEntrada = i + 1;
    const esCortesia = i >= entradasCobrar; // Las últimas 'cortesias' entradas son cortesía

    // Actualizar progreso en el modal
    printingProgress.textContent = `Imprimiendo ${numEntrada} de ${entradas}`;

    const ticket = generarTicketIndividual({
      folio: folioBase,
      numEntrada: numEntrada,
      totalEntradas: entradas,
      precioPorEntrada: precioPorEntrada,
      esCortesia: esCortesia,
      formaPago: selectedPayment,
      terminal: selectedTerminal,
      // Solo mostrar info de pago en el primer ticket
      mostrarPago: i === 0,
      totalVenta: total,
      efectivoRecibido: selectedPayment === 'efectivo' ? total : null,
      cambio: selectedPayment === 'efectivo' ? 0 : null
    });

    // Imprimir CADA ticket individualmente para que la impresora corte después de cada uno
    if (CONFIG_IMPRESORA.USAR_IMPRESORA) {
      await imprimirTicketTermico(ticket);
      // Pequeña pausa entre impresiones para que la impresora procese
      await new Promise(resolve => setTimeout(resolve, 500));
    } else {
      console.log(ticket);
    }
  }

  // Actualizar progreso final
  printingProgress.textContent = `${entradas} de ${entradas} completados`;

  console.log('══════════════════════════════════════════');
  console.log(`Total de tickets impresos: ${entradas}`);
  console.log(`  - Pagadas: ${entradasCobrar}`);
  console.log(`  - Cortesías: ${cortesias}`);
  console.log('══════════════════════════════════════════');

  // Mostrar confirmación visual
  mostrarConfirmacionImpresion();

  // Limpiar formulario
  limpiarFormulario();

  // Guardar datos localmente
  guardarDatos();

  } catch (error) {
    console.error('Error durante la impresión:', error);
    alert(`Error al imprimir boletos: ${error.message}`);
  } finally {
    // Siempre ocultar modal de loading, incluso si hay error
    printingModal.style.display = 'none';
  }
}

function generarTicketIndividual(datos) {
  const fecha = new Date().toLocaleString('es-MX');

  let ticket = `        LA GRUTA SPA
CARR. SAN MIGUEL-DOLORES KM 10
FECHA: ${fecha}
-------------------------------------
ENTRADA GENERAL $ ${datos.precioPorEntrada.toFixed(2)} FOLIO ${datos.folio.toString().padStart(4, '0')}
-------------------------------------`;

  // Solo mostrar información de pago en el primer ticket Y si no es cortesía
  if (datos.mostrarPago && !datos.esCortesia) {
    ticket += `
PAGO: ${datos.formaPago.toUpperCase()}${datos.terminal ? ` (${datos.terminal.toUpperCase()})` : ''}
TOTAL VENTA: $${datos.totalVenta.toFixed(2)}`;
    if (datos.efectivoRecibido !== null) {
      ticket += `
EFECTIVO: $${datos.efectivoRecibido.toFixed(2)}`;
    }
    ticket += `
-------------------------------------`;
  }

  if (datos.esCortesia) {
    ticket += `
*** CORTESÍA ***
-------------------------------------`;
  }

  ticket += `
ENTRADA ${datos.numEntrada} de ${datos.totalEntradas}

PROHIBIDA ENTRADA: ALIMENTOS, BEBIDAS
Y MASCOTAS
USO EXCLUSIVO DE TRAJE DE BAÑO
www.lagruta-spa.com.mx
GRACIAS POR TU VISITA!!
NO VALIDO COMO COMPROBANTE FISCAL
UNA VEZ PAGADO NO HAY DEVOLUCIONES
TEL. 4151852162
SOLICITAR FACTURA EL DIA DE TU VISITA
-------------------------------------`;

  return ticket;
}

// Función para enviar datos a la impresora térmica
async function imprimirTicketTermico(contenidoTicket) {
  try {
    console.log('🖨️ Enviando a impresora térmica...');

    // El sistema convierte a HTML, no usamos comandos ESC/POS
    // La densidad se controla desde el CSS en main.js
    const datosImpresion = contenidoTicket;

    // Enviar a la impresora vía Electron IPC
    if (window.electronAPI?.imprimirTicket) {
      const resultado = await window.electronAPI.imprimirTicket(datosImpresion);
      if (resultado.success) {
        console.log('✅ Ticket impreso correctamente');
      } else {
        console.error('❌ Error al imprimir:', resultado.error);
      }
    } else {
      // Si no está configurado el IPC, mostrar en consola
      console.log('📋 Simulación de impresión:');
      console.log(contenidoTicket);
      console.log('🔪 [CORTE PARCIAL]');
      console.log('');
    }

  } catch (error) {
    console.error('Error al imprimir ticket:', error);
    // Fallback: mostrar en consola
    console.log(contenidoTicket);
  }
}

function mostrarConfirmacionImpresion() {
  const originalText = imprimirBoletoBtn.textContent;
  const entradas = parseInt(entradasInput.value) || 0;
  const cortesias = parseInt(cortesiasSelect.value) || 0;
  const entradasCobrar = entradas - cortesias;

  imprimirBoletoBtn.textContent = `✅ ${entradasCobrar} Ticket${entradasCobrar !== 1 ? 's' : ''} Impreso${entradasCobrar !== 1 ? 's' : ''}`;
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
  cashSection.style.display = 'none';  // Campo desactivado permanentemente

  actualizarCalculos();
  actualizarBotonImprimir();
  
  // Después de limpiar, posicionar el cursor en el campo de entradas
  setTimeout(() => {
    entradasInput.focus();
    entradasInput.select();
  }, 100);
}

async function mostrarCierreVentas() {
  tipoReporteActual = 'publico'; // Marcar como reporte público

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
    console.warn('⚠️ Datos locales pueden no reflejar el día completo si la app se reinició');
    datosReporte = {
      total_entradas: ventasDelDia.totalEntradas || 0,
      total_cortesias: ventasDelDia.totalCortesias || 0,
      total_efectivo: ventasDelDia.efectivo || 0,
      total_transferencia: ventasDelDia.transferencia || 0,
      total_terminal1: ventasDelDia.terminal1 || 0,
      total_ventas: 0 // No se puede calcular el total de ventas sin acceso a la BD
    };
  }

  const terminal1 = parseFloat(datosReporte.total_terminal1) || 0;
  const transferencia = parseFloat(datosReporte.total_transferencia) || 0;
  const efectivo = parseFloat(datosReporte.total_efectivo) || 0;

  // Obtener entradas fiscales configuradas manualmente
  const entradasFiscales = obtenerEntradasFiscales();
  const montoEfectivo = entradasFiscales * PRECIO_ENTRADA;

  const cuentaFiscal = terminal1 + transferencia + montoEfectivo;
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
              <span class="fiscal-label">📱 Transferencias</span>
              <span class="fiscal-amount">$${transferencia.toFixed(2)}</span>
            </div>
          </div>
          <div class="fiscal-item">
            <div class="fiscal-item-info">
              <span class="fiscal-label">💵 Efectivo</span>
              <span class="fiscal-amount">$${montoEfectivo.toFixed(2)}</span>
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
  tipoReporteActual = 'privado'; // Marcar como reporte privado

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
    console.warn('⚠️ Datos locales pueden no reflejar el día completo si la app se reinició');
    datosReporte = {
      total_entradas: ventasDelDia.totalEntradas || 0,
      total_cortesias: ventasDelDia.totalCortesias || 0,
      total_efectivo: ventasDelDia.efectivo || 0,
      total_transferencia: ventasDelDia.transferencia || 0,
      total_terminal1: ventasDelDia.terminal1 || 0,
      total_terminal2: ventasDelDia.terminal2 || 0,
      total_ventas: 0 // No se puede calcular el total de ventas sin acceso a la BD
    };
  }

  const efectivo = parseFloat(datosReporte.total_efectivo) || 0;
  const transferencia = parseFloat(datosReporte.total_transferencia) || 0;
  const terminal1 = parseFloat(datosReporte.total_terminal1) || 0;
  const terminal2 = parseFloat(datosReporte.total_terminal2) || 0;
  const totalGeneral = efectivo + transferencia + terminal1 + terminal2;

  // Obtener entradas fiscales configuradas manualmente
  const entradasFiscales = obtenerEntradasFiscales();
  const montoEfectivo = entradasFiscales * PRECIO_ENTRADA;

  const cuentaFiscal = terminal1 + transferencia + montoEfectivo;
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
                <span class="fiscal-label">📱 Transferencias</span>
                <span class="fiscal-amount">$${transferencia.toFixed(2)}</span>
              </div>
            </div>
            <div class="fiscal-item">
              <div class="fiscal-item-info">
                <span class="fiscal-label">💵 Efectivo</span>
                <span class="fiscal-amount">${entradasFiscales} entrada${entradasFiscales !== 1 ? 's' : ''} - $${montoEfectivo.toFixed(2)}</span>
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

// ============================================
// Funciones de Entradas Fiscales Manuales
// ============================================

function abrirModalEntradrasFiscales() {
  // Cargar el valor actual si existe
  const entradasFiscales = obtenerEntradasFiscales();
  entradasFiscalesInput.value = entradasFiscales || 0;

  // Actualizar preview
  actualizarPreviewFiscal();

  // Mostrar modal
  fiscalModal.style.display = 'flex';

  // Focus en el input
  setTimeout(() => {
    entradasFiscalesInput.focus();
    entradasFiscalesInput.select();
  }, 100);
}

function actualizarPreviewFiscal() {
  const entradas = parseInt(entradasFiscalesInput.value) || 0;
  const monto = entradas * PRECIO_ENTRADA;

  if (entradas > 0) {
    fiscalPreviewAmount.textContent = `$${monto.toFixed(2)}`;
    fiscalPreview.style.display = 'block';
  } else {
    fiscalPreview.style.display = 'none';
  }
}

function guardarEntradasFiscales() {
  const entradas = parseInt(entradasFiscalesInput.value) || 0;

  // Obtener fecha actual en zona horaria de México
  const mexicoDate = new Date().toLocaleString("en-US", {
    timeZone: "America/Mexico_City",
  });
  const fechaHoy = new Date(mexicoDate).toISOString().split('T')[0];

  // Guardar en localStorage con fecha
  const datosEntradasFiscales = {
    entradas: entradas,
    fecha: fechaHoy,
    monto: entradas * PRECIO_ENTRADA
  };

  localStorage.setItem('entradasFiscales', JSON.stringify(datosEntradasFiscales));

  // Mostrar confirmación
  const monto = entradas * PRECIO_ENTRADA;
  alert(`✅ Configuración guardada:\n\n${entradas} entrada${entradas !== 1 ? 's' : ''} en efectivo\nMonto a reportar: $${monto.toFixed(2)}\n\nEste valor se usará en el reporte fiscal.`);

  // Cerrar modal
  fiscalModal.style.display = 'none';

  console.log('💾 Entradas fiscales guardadas:', datosEntradasFiscales);
}

function obtenerEntradasFiscales() {
  try {
    // Limpiar si es un nuevo día antes de obtener
    limpiarEntradasFiscalesSiEsNuevoDia();

    const datosGuardados = localStorage.getItem('entradasFiscales');
    if (!datosGuardados) {
      return 0;
    }

    const datos = JSON.parse(datosGuardados);
    return parseInt(datos.entradas) || 0;
  } catch (error) {
    console.error('Error al obtener entradas fiscales:', error);
    return 0;
  }
}

function limpiarEntradasFiscalesSiEsNuevoDia() {
  try {
    const datosGuardados = localStorage.getItem('entradasFiscales');
    if (!datosGuardados) {
      return;
    }

    const datos = JSON.parse(datosGuardados);

    // Obtener fecha actual en zona horaria de México
    const mexicoDate = new Date().toLocaleString("en-US", {
      timeZone: "America/Mexico_City",
    });
    const fechaHoy = new Date(mexicoDate).toISOString().split('T')[0];

    // Si la fecha guardada es diferente a hoy, limpiar
    if (datos.fecha !== fechaHoy) {
      console.log('🔄 Nuevo día detectado, limpiando entradas fiscales...');
      localStorage.removeItem('entradasFiscales');
    }
  } catch (error) {
    console.error('Error al verificar fecha de entradas fiscales:', error);
  }
}

async function imprimirReporte() {
  if (tipoReporteActual === 'publico') {
    await imprimirReportePublico();
  } else if (tipoReporteActual === 'privado') {
    await imprimirReportePrivado();
  }
}

function guardarDatos() {
  // Obtener fecha actual en zona horaria de México
  const mexicoDate = new Date().toLocaleString("en-US", {
    timeZone: "America/Mexico_City",
  });
  const fechaHoy = new Date(mexicoDate).toISOString().split('T')[0];

  localStorage.setItem('ventasDelDia', JSON.stringify(ventasDelDia));
  localStorage.setItem('folioActual', folioActual.toString());
  localStorage.setItem('ultimaFecha', fechaHoy);
}

async function cargarDatosGuardados() {
  // Obtener fecha actual en zona horaria de México
  const mexicoDate = new Date().toLocaleString("en-US", {
    timeZone: "America/Mexico_City",
  });
  const fechaHoy = new Date(mexicoDate).toISOString().split('T')[0];
  const ultimaFecha = localStorage.getItem('ultimaFecha');

  // Si es un nuevo día, reiniciar datos locales
  if (ultimaFecha && ultimaFecha !== fechaHoy) {
    console.log('🔄 Nuevo día detectado, reiniciando datos locales...');
    ventasDelDia = {
      efectivo: 0,
      transferencia: 0,
      terminal1: 0,
      terminal2: 0,
      totalEntradas: 0,
      totalCortesias: 0
    };
    // No reiniciamos folioActual porque viene del servidor
    localStorage.setItem('ultimaFecha', fechaHoy);
    localStorage.setItem('ventasDelDia', JSON.stringify(ventasDelDia));
    return;
  }

  // Verificar datos de Supabase si estamos online
  if (window.electronAPI?.db && navigator.onLine) {
    try {
      const resultado = await window.electronAPI.db.obtenerReporteDiaActual();

      // Si Supabase tiene datos, validar contra localStorage
      if (resultado.success) {
        if (resultado.data) {
          // Hay datos en Supabase - usar esos datos como fuente de verdad
          console.log('📊 Sincronizando con datos de Supabase');
          ventasDelDia = {
            efectivo: parseFloat(resultado.data.total_efectivo) || 0,
            transferencia: parseFloat(resultado.data.total_transferencia) || 0,
            terminal1: parseFloat(resultado.data.total_terminal1) || 0,
            terminal2: parseFloat(resultado.data.total_terminal2) || 0,
            totalEntradas: parseInt(resultado.data.total_entradas) || 0,
            totalCortesias: parseInt(resultado.data.total_cortesias) || 0
          };
          guardarDatos();
          return;
        } else {
          // No hay datos en Supabase para hoy - limpiar localStorage si tiene datos viejos
          const ventasGuardadas = localStorage.getItem('ventasDelDia');
          if (ventasGuardadas) {
            const datosLocales = JSON.parse(ventasGuardadas);
            const tieneVentasLocales = Object.values(datosLocales).some(val => val > 0);

            if (tieneVentasLocales) {
              console.log('⚠️ Detectados datos locales sin respaldo en Supabase - limpiando...');
              ventasDelDia = {
                efectivo: 0,
                transferencia: 0,
                terminal1: 0,
                terminal2: 0,
                totalEntradas: 0,
                totalCortesias: 0
              };
              localStorage.setItem('ultimaFecha', fechaHoy);
              localStorage.setItem('ventasDelDia', JSON.stringify(ventasDelDia));
              return;
            }
          }
        }
      }
    } catch (error) {
      console.warn('No se pudo verificar datos en Supabase, usando localStorage:', error);
    }
  }

  // Si es el mismo día y no pudimos verificar con Supabase, cargar datos guardados
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
// Funciones de Impresión de Reportes
// ============================================

async function imprimirReportePublico() {
  console.log('🖨️ Imprimiendo Reporte Público (Cuenta Fiscal)...');

  // Obtener datos desde Supabase
  let datosReporte = null;
  if (window.electronAPI?.db && navigator.onLine) {
    try {
      const resultado = await window.electronAPI.db.obtenerReporteDiaActual();
      if (resultado.success && resultado.data) {
        datosReporte = resultado.data;
      }
    } catch (error) {
      console.warn('Usando datos locales para imprimir');
    }
  }

  if (!datosReporte) {
    datosReporte = {
      total_efectivo: ventasDelDia.efectivo || 0,
      total_transferencia: ventasDelDia.transferencia || 0,
      total_terminal1: ventasDelDia.terminal1 || 0
    };
  }

  const terminal1 = parseFloat(datosReporte.total_terminal1) || 0;
  const transferencia = parseFloat(datosReporte.total_transferencia) || 0;
  const efectivo = parseFloat(datosReporte.total_efectivo) || 0;

  // Obtener entradas fiscales configuradas manualmente
  const entradasFiscales = obtenerEntradasFiscales();
  const montoEfectivo = entradasFiscales * PRECIO_ENTRADA;

  const cuentaFiscal = terminal1 + transferencia + montoEfectivo;

  const fecha = new Date().toLocaleString('es-MX');
  const fechaSolo = new Date().toLocaleDateString('es-MX');

  const ticket = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           LA GRUTA
       Balneario y Spa
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   CIERRE DE VENTAS DEL DÍA

FECHA: ${fechaSolo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DESGLOSE:

💳 Terminal
$${terminal1.toFixed(2)}

📱 Transferencias
$${transferencia.toFixed(2)}

💵 Efectivo
${entradasFiscales} entrada${entradasFiscales !== 1 ? 's' : ''}
$${montoEfectivo.toFixed(2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOTAL:
$${cuentaFiscal.toFixed(2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
www.lagruta-spa.com.mx
Tel. 4151852162
${fechaSolo}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  // Mostrar en consola primero
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║    VISTA PREVIA DE IMPRESIÓN           ║');
  console.log('║       REPORTE FISCAL                   ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(ticket);
  console.log('══════════════════════════════════════════');
  console.log('');

  // Imprimir en impresora térmica usando la misma lógica que los tickets
  if (CONFIG_IMPRESORA.USAR_IMPRESORA) {
    try {
      console.log('📄 Enviando reporte fiscal a impresora térmica...');
      await imprimirTicketTermico(ticket);
      console.log('✅ Reporte fiscal impreso correctamente');
      alert('Reporte fiscal impreso correctamente');
    } catch (error) {
      console.error('❌ Error al imprimir reporte:', error);
      alert(`Error al imprimir reporte: ${error.message}`);
    }
  } else {
    console.log('📋 Modo simulación (impresora desactivada)');
  }
}

async function imprimirReportePrivado() {
  console.log('🖨️ Imprimiendo Reporte Privado (Completo)...');

  // Obtener datos del resumen
  let datosReporte = null;
  if (window.electronAPI?.db && navigator.onLine) {
    try {
      const resultado = await window.electronAPI.db.obtenerReporteDiaActual();
      if (resultado.success && resultado.data) {
        datosReporte = resultado.data;
      }
    } catch (error) {
      console.warn('Usando datos locales para imprimir');
    }
  }

  if (!datosReporte) {
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

  // Obtener entradas fiscales configuradas manualmente
  const entradasFiscales = obtenerEntradasFiscales();
  const montoEfectivo = entradasFiscales * PRECIO_ENTRADA;

  const cuentaFiscal = terminal1 + transferencia + montoEfectivo;
  const totalEntradas = parseInt(datosReporte.total_entradas) || 0;
  const totalCortesias = parseInt(datosReporte.total_cortesias) || 0;
  const entradasCobradas = totalEntradas - totalCortesias;

  const fecha = new Date().toLocaleString('es-MX');
  const fechaSolo = new Date().toLocaleDateString('es-MX');

  // Obtener todas las ventas del día
  let ventasDelDiaDetalle = [];
  if (window.electronAPI?.db && navigator.onLine) {
    try {
      const resultado = await window.electronAPI.db.obtenerVentasDelDia();
      if (resultado.success && resultado.data) {
        ventasDelDiaDetalle = resultado.data;
        console.log(`📋 ${ventasDelDiaDetalle.length} ventas obtenidas para el reporte`);
      }
    } catch (error) {
      console.warn('No se pudieron obtener ventas detalladas');
    }
  }

  let ticket = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           LA GRUTA
       Balneario y Spa
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

     REPORTE COMPLETO DEL DÍA
         (CONFIDENCIAL)

FECHA: ${fechaSolo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         RESUMEN GENERAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ENTRADAS:
Total vendidas: ${totalEntradas}
Cortesías: ${totalCortesias}
Cobradas: ${entradasCobradas}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       DESGLOSE POR PAGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💵 Efectivo
$${efectivo.toFixed(2)}

📱 Transferencia
$${transferencia.toFixed(2)}

💳 Terminal 1
$${terminal1.toFixed(2)}

💳 Terminal 2
$${terminal2.toFixed(2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOTAL GENERAL:
$${totalGeneral.toFixed(2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        DETALLE DE VENTAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  // Agregar detalle de cada venta
  if (ventasDelDiaDetalle.length > 0) {
    ventasDelDiaDetalle.forEach((venta, index) => {
      const fechaVenta = new Date(venta.fecha_hora).toLocaleString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
      });

      const formaPagoTexto = venta.forma_pago.toUpperCase();
      const terminalTexto = venta.terminal ? ` (${venta.terminal.toUpperCase()})` : '';

      ticket += `
VENTA #${index + 1} - FOLIO ${venta.folio.toString().padStart(6, '0')}
Hora: ${fechaVenta}
Entradas: ${venta.entradas_totales} | Cortesías: ${venta.cortesias}
Cobradas: ${venta.entradas_cobradas}
Pago: ${formaPagoTexto}${terminalTexto}
Total: $${parseFloat(venta.monto_total).toFixed(2)}
${venta.efectivo_recibido ? `Efectivo: $${parseFloat(venta.efectivo_recibido).toFixed(2)} | Cambio: $${parseFloat(venta.cambio).toFixed(2)}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    });
  } else {
    ticket += `
No hay ventas registradas en la
base de datos para el día de hoy.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  ticket += `

DOCUMENTO CONFIDENCIAL
Solo para uso administrativo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
www.lagruta-spa.com.mx
Tel. 4151852162

${fechaSolo}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `;

  // Mostrar en consola primero
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║    VISTA PREVIA DE IMPRESIÓN           ║');
  console.log('║       REPORTE COMPLETO                 ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(ticket);
  console.log('══════════════════════════════════════════');
  console.log('');

  // Imprimir en impresora térmica usando la misma lógica que los tickets
  if (CONFIG_IMPRESORA.USAR_IMPRESORA) {
    try {
      console.log('📄 Enviando reporte completo a impresora térmica...');
      await imprimirTicketTermico(ticket);
      console.log('✅ Reporte completo impreso correctamente');
      alert('Reporte completo impreso correctamente');
    } catch (error) {
      console.error('❌ Error al imprimir reporte:', error);
      alert(`Error al imprimir reporte: ${error.message}`);
    }
  } else {
    console.log('📋 Modo simulación (impresora desactivada)');
  }
}

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

        // Intentar sincronizar automáticamente si estamos online
        if (navigator.onLine) {
          console.log('🔄 Iniciando sincronización automática al detectar ventas pendientes...');
          setTimeout(async () => {
            const resultado = await window.clientDB.sincronizar();
            if (resultado.success && resultado.sincronizadas > 0) {
              console.log(`✅ Sincronización automática completada: ${resultado.sincronizadas} ventas`);
            }
          }, 2000); // Esperar 2 segundos para que la app termine de cargar
        }
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

// Función de diagnóstico completa
async function diagnosticarVentas() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🔍 DIAGNÓSTICO DE VENTAS');
  console.log('═══════════════════════════════════════════════════');

  // 1. Estado de la base de datos
  console.log('\n📊 Estado de la Base de Datos:');
  console.log('   - DB Inicializada:', dbInicializada);
  console.log('   - ClientDB disponible:', !!window.clientDB);
  console.log('   - ElectronAPI disponible:', !!window.electronAPI?.db);
  console.log('   - Conexión online:', navigator.onLine);

  // 2. Ventas locales del día (en memoria)
  console.log('\n💰 Ventas del Día (en memoria):');
  console.log('   - Efectivo: $' + ventasDelDia.efectivo.toFixed(2));
  console.log('   - Transferencia: $' + ventasDelDia.transferencia.toFixed(2));
  console.log('   - Terminal 1: $' + ventasDelDia.terminal1.toFixed(2));
  console.log('   - Terminal 2: $' + ventasDelDia.terminal2.toFixed(2));
  console.log('   - Total Entradas:', ventasDelDia.totalEntradas);
  console.log('   - Total Cortesías:', ventasDelDia.totalCortesias);

  // 3. Ventas pendientes de sincronizar (IndexedDB)
  if (window.clientDB) {
    try {
      const pendientes = await window.clientDB.obtenerVentasPendientes();
      console.log('\n📦 Ventas Pendientes de Sincronizar (IndexedDB):');
      console.log('   - Cantidad:', pendientes.length);

      if (pendientes.length > 0) {
        console.log('   - Detalle de ventas pendientes:');
        pendientes.forEach((venta, index) => {
          console.log(`      ${index + 1}. Forma Pago: ${venta.formaPago}, Total: $${venta.total}, Entradas: ${venta.entradas}, Fecha: ${venta.fecha_hora}`);
        });

        // Resumen por forma de pago
        const resumenPendientes = pendientes.reduce((acc, venta) => {
          acc[venta.formaPago] = (acc[venta.formaPago] || 0) + parseFloat(venta.total);
          return acc;
        }, {});

        console.log('\n   - Resumen por forma de pago:');
        Object.entries(resumenPendientes).forEach(([formaPago, total]) => {
          console.log(`      ${formaPago}: $${total.toFixed(2)}`);
        });
      }
    } catch (error) {
      console.error('   ❌ Error al obtener ventas pendientes:', error);
    }
  }

  // 4. Ventas en Supabase (día actual)
  if (window.electronAPI?.db && navigator.onLine) {
    try {
      console.log('\n☁️  Verificando Ventas en Supabase...');
      const resultado = await window.electronAPI.db.obtenerVentasDelDia();

      if (resultado.success && resultado.data) {
        console.log('   - Total de ventas en Supabase hoy:', resultado.data.length);

        // Resumen por forma de pago
        const resumenSupabase = resultado.data.reduce((acc, venta) => {
          acc[venta.forma_pago] = (acc[venta.forma_pago] || 0) + parseFloat(venta.monto_total);
          return acc;
        }, {});

        console.log('   - Resumen por forma de pago:');
        Object.entries(resumenSupabase).forEach(([formaPago, total]) => {
          console.log(`      ${formaPago}: $${total.toFixed(2)}`);
        });

        // Mostrar últimas 5 ventas
        console.log('\n   - Últimas 5 ventas:');
        resultado.data.slice(0, 5).forEach((venta, index) => {
          console.log(`      ${index + 1}. Folio: ${venta.folio}, Forma Pago: ${venta.forma_pago}, Total: $${venta.monto_total}, Entradas: ${venta.entradas_totales}`);
        });
      }
    } catch (error) {
      console.error('   ❌ Error al obtener ventas de Supabase:', error);
    }
  } else {
    console.log('\n☁️  No se puede verificar Supabase (sin conexión o API no disponible)');
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('✅ Diagnóstico completado');
  console.log('═══════════════════════════════════════════════════');
}

// Exponer funciones para debugging
window.sincronizarManualmente = sincronizarManualmente;
window.obtenerReporteDesdeSupabase = obtenerReporteDesdeSupabase;
window.diagnosticarVentas = diagnosticarVentas;
