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
document.addEventListener('DOMContentLoaded', () => {
  console.log('Sistema de Taquilla La Gruta - Iniciado');
  cargarDatosGuardados();
  actualizarCalculos();
  configurarNavegacionAutomatica();
  
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

function imprimirBoleto() {
  const entradas = parseInt(entradasInput.value) || 0;
  const cortesias = parseInt(cortesiasSelect.value) || 0;
  const entradasCobrar = entradas - cortesias;
  const total = entradasCobrar * PRECIO_ENTRADA;
  const selectedPayment = document.querySelector('input[name="payment"]:checked')?.value;
  const selectedTerminal = document.querySelector('input[name="terminal"]:checked')?.value;
  const efectivoRecibido = parseFloat(efectivoRecibidoInput.value) || 0;
  
  // Actualizar ventas del día
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
  
  // Guardar datos
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

function mostrarCierreVentas() {
  const cuentaFiscal = ventasDelDia.terminal1 + (ventasDelDia.efectivo * 0.1);
  
  const reporte = `
    <div style="text-align: left; line-height: 1.6;">
      <h4 style="margin-bottom: 1rem; color: #1a202c;">Cierre de Ventas del Día</h4>
      <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-MX')}</p>
      
      <div style="margin: 1.5rem 0; padding: 1rem; background: #f7fafc; border-radius: 8px;">
        <h5 style="color: #2d3748; margin-bottom: 0.75rem;">Cuenta Fiscal</h5>
        <p><strong>Terminal 1:</strong> $${ventasDelDia.terminal1.toFixed(2)}</p>
        <p><strong>10% Efectivo:</strong> $${(ventasDelDia.efectivo * 0.1).toFixed(2)}</p>
        <div style="border-top: 2px solid #4299e1; margin-top: 0.75rem; padding-top: 0.75rem;">
          <p style="font-size: 1.125rem;"><strong>Total a Reportar: $${cuentaFiscal.toFixed(2)}</strong></p>
        </div>
      </div>
      
      <div style="margin: 1.5rem 0; padding: 1rem; background: #f0fff4; border: 1px solid #68d391; border-radius: 8px;">
        <h5 style="color: #276749; margin-bottom: 0.75rem;">Resumen de Entradas</h5>
        <p><strong>Total Entradas:</strong> ${ventasDelDia.totalEntradas}</p>
        <p><strong>Cortesías:</strong> ${ventasDelDia.totalCortesias}</p>
        <p><strong>Entradas Cobradas:</strong> ${ventasDelDia.totalEntradas - ventasDelDia.totalCortesias}</p>
      </div>
    </div>
  `;
  
  modalTitle.textContent = 'Cierre de Ventas del Día';
  modalBody.innerHTML = reporte;
  reportModal.style.display = 'flex';
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

function mostrarReporteCompleto() {
  const totalGeneral = ventasDelDia.efectivo + ventasDelDia.transferencia + ventasDelDia.terminal1 + ventasDelDia.terminal2;
  const cuentaFiscal = ventasDelDia.terminal1 + (ventasDelDia.efectivo * 0.1);
  
  const reporte = `
    <div style="text-align: left; line-height: 1.6;">
      <h4 style="margin-bottom: 1rem; color: #1a202c;">Reporte Completo del Día</h4>
      <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-MX')}</p>
      
      <div style="margin: 1.5rem 0; padding: 1rem; background: #f7fafc; border-radius: 8px;">
        <h5 style="color: #2d3748; margin-bottom: 0.75rem;">Desglose por Forma de Pago</h5>
        <p><strong>Efectivo:</strong> $${ventasDelDia.efectivo.toFixed(2)}</p>
        <p><strong>Transferencia:</strong> $${ventasDelDia.transferencia.toFixed(2)}</p>
        <p><strong>Terminal 1:</strong> $${ventasDelDia.terminal1.toFixed(2)}</p>
        <p><strong>Terminal 2:</strong> $${ventasDelDia.terminal2.toFixed(2)}</p>
        <div style="border-top: 2px solid #e2e8f0; margin-top: 0.75rem; padding-top: 0.75rem;">
          <p style="font-size: 1.125rem;"><strong>Total General: $${totalGeneral.toFixed(2)}</strong></p>
        </div>
      </div>
      
      <div style="margin: 1.5rem 0; padding: 1rem; background: #ebf8ff; border: 1px solid #4299e1; border-radius: 8px;">
        <h5 style="color: #2c5282; margin-bottom: 0.75rem;">Cuenta Fiscal</h5>
        <p><strong>Terminal 1:</strong> $${ventasDelDia.terminal1.toFixed(2)}</p>
        <p><strong>10% Efectivo:</strong> $${(ventasDelDia.efectivo * 0.1).toFixed(2)}</p>
        <div style="border-top: 2px solid #4299e1; margin-top: 0.75rem; padding-top: 0.75rem;">
          <p style="font-size: 1.125rem;"><strong>Total Cuenta Fiscal: $${cuentaFiscal.toFixed(2)}</strong></p>
        </div>
      </div>
      
      <div style="margin: 1.5rem 0; padding: 1rem; background: #f0fff4; border: 1px solid #68d391; border-radius: 8px;">
        <h5 style="color: #276749; margin-bottom: 0.75rem;">Estadísticas de Entradas</h5>
        <p><strong>Total Entradas:</strong> ${ventasDelDia.totalEntradas}</p>
        <p><strong>Cortesías:</strong> ${ventasDelDia.totalCortesias}</p>
        <p><strong>Entradas Cobradas:</strong> ${ventasDelDia.totalEntradas - ventasDelDia.totalCortesias}</p>
        <p><strong>Folio Actual:</strong> ${folioActual.toString().padStart(6, '0')}</p>
      </div>
    </div>
  `;
  
  modalTitle.textContent = 'Reporte Completo del Día';
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
