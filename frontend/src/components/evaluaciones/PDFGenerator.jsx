import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { calcularPeriodoReal } from '../../utils/periodoCalculo';

const PDFGenerator = {
  // Método auxiliar para generar contenido de preguntas
  _generarContenidoPreguntas(esTrimestral, seccionesTrimestrales, formulario, respuestas) {
    if (esTrimestral) {
      // Instrucciones para evaluaciones trimestrales
      let instruccionesHtml = `
        <div class="apartado" style="background: #e6f7ff; border: 1px solid #91d5ff;">
          <div class="apartado-header">
            <div class="apartado-title" style="color: #0050b3;">INSTRUCCIONES DE EVALUACIÓN TRIMESTRAL</div>
          </div>
          <div style="font-size: 10px; margin-bottom: 8px;">
            <strong>Escala de evaluación:</strong><br>
            <span style="display: inline-block; margin-right: 15px;">4 - Sobresaliente</span>
            <span style="display: inline-block; margin-right: 15px;">3 - Bueno</span>
            <span style="display: inline-block; margin-right: 15px;">2 - Regular</span>
            <span style="display: inline-block;">1 - Necesita Mejorar</span>
          </div>
        </div>
      `;
      
      // Renderizado para trimestrales con estructura mejorada
      let seccionesHtml = '';
      Object.entries(seccionesTrimestrales).forEach(([seccionId, seccion]) => {
        let preguntasHtml = '';
        seccion.preguntas.forEach((pregunta, index) => {
          const respuesta = respuestas[pregunta.id] || 'No respondido';
          preguntasHtml += `
            <div class="pregunta-row">
              <div class="pregunta-numero">${index + 1}</div>
              <div class="pregunta-texto">${pregunta.enunciado}</div>
              <div class="pregunta-respuesta">
                ${pregunta.tipo === 'escala' ? 
                  `<span class="respuesta-escala">${respuesta} / 4</span>` : 
                  `<span class="respuesta-texto">${respuesta}</span>`
                }
              </div>
            </div>
          `;
        });
        
        seccionesHtml += `
          <div class="apartado">
            <div class="apartado-header">
              <div class="apartado-title">${seccion.titulo.toUpperCase()}</div>
              <div class="apartado-info">${seccion.preguntas.length} pregunta${seccion.preguntas.length !== 1 ? 's' : ''}</div>
            </div>
            <div class="preguntas-container">
              ${preguntasHtml}
            </div>
          </div>
        `;
      });
      
      return instruccionesHtml + seccionesHtml;
    } else {
      // Renderizado para anuales (existente)
      let apartadosHtml = '';
      const apartados = ['competencias', 'experiencia', 'convivencia', 'desempeno'];
      
      apartados.forEach(apartado => {
        const preguntasApartado = formulario?.preguntas?.filter(p => p.apartado === apartado) || [];
        if (preguntasApartado.length === 0) return;
        
        let preguntasHtml = '';
        preguntasApartado.forEach((pregunta, index) => {
          const respuesta = respuestas[pregunta.id];
          
          let opcionesHtml = '';
          if (pregunta.opciones) {
            pregunta.opciones.forEach((opcion, idx) => {
              const esSeleccionada = opcion.valor === respuesta;
              opcionesHtml += `
                <div class="opcion-item ${esSeleccionada ? 'seleccionada' : 'no-seleccionada'}">
                  <div class="opcion-texto">${opcion.valor}</div>
                  <div class="opcion-derecha">
                    ${esSeleccionada ? '<span class="check-verde">✓</span>' : ''}
                    <span class="puntos">${opcion.puntuacion || 0} pts</span>
                  </div>
                </div>
              `;
            });
          }
          
          preguntasHtml += `
            <div class="pregunta">
              <div class="pregunta-texto">${index + 1}. ${pregunta.enunciado}</div>
              ${opcionesHtml ? `
                <div class="opciones-container">
                  ${opcionesHtml}
                </div>
              ` : ''}
              ${!respuesta && pregunta.opciones ? '<div class="sin-respuesta">Sin respuesta registrada</div>' : ''}
            </div>
          `;
        });
        
        apartadosHtml += `
          <div class="apartado">
            <div class="apartado-title">${apartado.charAt(0).toUpperCase() + apartado.slice(1)}</div>
            ${preguntasHtml}
          </div>
        `;
      });
      
      return apartadosHtml;
    }
  },

  // Generar PDF con estilos completos (método unificado)
  async generateStyledPDF(evaluacion, formulario, respuestas, tipo = 'completo') {
    try {
      // Datos comunes
      const evaluadoNombre = evaluacion?.evaluado?.nombre || 'N/A';
      const evaluadoApellido = evaluacion?.evaluado?.apellido || '';
      const evaluadoCargo = evaluacion?.evaluado?.cargo?.nombre || 'N/A';
      const evaluadorNombre = evaluacion?.evaluador?.nombre || 'N/A';
      const evaluadorApellido = evaluacion?.evaluador?.apellido || '';
      const evaluadorCargo = evaluacion?.evaluador?.cargo?.nombre || 'N/A';
      const procesoDepartamento = evaluacion?.evaluado?.departamento?.nombre || 'N/A';

      // Obtener puntuación y valoración (buscar en múltiples campos posibles)
      const esTrimestral = formulario?.periodicidad === 'trimestral';
      let puntuacion = null;
      let valoracion = null;
      
      if (esTrimestral) {
        puntuacion = evaluacion?.puntuacionTotal || evaluacion?.puntuacion_total || evaluacion?.calificacion;
        valoracion = evaluacion?.valoracionTrimestral || evaluacion?.valoracion_trimestral || evaluacion?.valoracion;
      } else {
        puntuacion = evaluacion?.puntuacionTotal || evaluacion?.puntuacion_total || evaluacion?.calificacion;
        valoracion = evaluacion?.valoracionAnual || evaluacion?.valoracion_anual || evaluacion?.valoracion;
      }

      // Calcular automáticamente si no hay datos
      if (!puntuacion || !valoracion) {
        if (esTrimestral) {
          const preguntasEscala = formulario?.preguntas?.filter(p => p.tipo === 'escala') || [];
          if (preguntasEscala.length > 0 && Object.keys(respuestas).length > 0) {
            const respuestasEscala = Object.keys(respuestas).filter(preguntaId => 
              preguntasEscala.some(p => p.id === preguntaId)
            );
            const sumaCalificaciones = respuestasEscala.reduce((sum, preguntaId) => {
              return sum + parseFloat(respuestas[preguntaId] || 0);
            }, 0);
            const maximoPosible = preguntasEscala.length * 4;
            const calificacionCalculada = (sumaCalificaciones * 100) / maximoPosible;
            puntuacion = calificacionCalculada.toFixed(2);
            
            // Calcular valoración trimestral
            if (puntuacion >= 80 && puntuacion <= 100) valoracion = 'DESTACADO';
            else if (puntuacion >= 60 && puntuacion <= 79) valoracion = 'BUENO';
            else valoracion = 'BAJO';
          }
        } else {
          // Lógica para anuales (simplificada)
          const apartados = ['competencias', 'experiencia', 'convivencia', 'desempeno'];
          const porcentajes = formulario?.porcentajes_apartados || {};
          let calificacionTotalCalculada = 0;

          apartados.forEach(apartado => {
            const preguntasApartado = formulario?.preguntas?.filter(p => p.apartado === apartado) || [];
            if (preguntasApartado.length > 0) {
              let sumaPuntos = 0;
              let cantidadPreguntas = 0;

              preguntasApartado.forEach(pregunta => {
                const respuesta = respuestas[pregunta.id];
                if (respuesta && pregunta.opciones) {
                  const opcionSeleccionada = pregunta.opciones.find(op => op.valor === respuesta);
                  if (opcionSeleccionada && opcionSeleccionada.puntuacion) {
                    sumaPuntos += parseFloat(opcionSeleccionada.puntuacion);
                    cantidadPreguntas++;
                  }
                }
              });

              if (cantidadPreguntas > 0) {
                const promedio = sumaPuntos / cantidadPreguntas;
                const porcentajeApartado = (porcentajes[apartado] || 0) * 100;
                const puntajeFinal = promedio * (porcentajeApartado / 100);
                calificacionTotalCalculada += puntajeFinal;
              }
            }
          });

          if (calificacionTotalCalculada > 0) {
            puntuacion = calificacionTotalCalculada.toFixed(2);
            // Calcular valoración anual
            if (puntuacion == 5) valoracion = 'EXCELENTE';
            else if (puntuacion >= 4) valoracion = 'SOBRESALIENTE';
            else if (puntuacion >= 3) valoracion = 'BUENO';
            else if (puntuacion >= 2.6) valoracion = 'ACEPTABLE';
            else valoracion = 'DEFICIENTE';
          }
        }
      }

      
      // Datos del encabezado
      const controlado = evaluacion?.controlado || 'SI';
      const codigo = evaluacion?.codigo || 'GH-FO12';
      const vigencia = evaluacion?.vigencia || '2023-11-07';
      const version = evaluacion?.version || '02';

      // Calcular período real
      const fechaIngresoEvaluado = evaluacion?.evaluado?.fecha_ingreso_empresa;
      const periodoReal = calcularPeriodoReal(fechaIngresoEvaluado, formulario?.periodicidad);
      const fechaInicio = periodoReal.inicio;
      const fechaFin = periodoReal.fin;

      // Determinar texto del período basado en la periodicidad del formulario
      const periodicidad = formulario?.periodicidad || 'trimestral';
      const textoPeriodo = periodicidad === 'anual' ? 'AÑO DE' : 'DE';

      // Determinar si es trimestral (ya declarado arriba)
      // esTrimestral ya existe como const
      
      // Agrupar preguntas para formularios trimestrales por sección
      const seccionesTrimestrales = {};
      if (esTrimestral && formulario?.preguntas) {
        formulario.preguntas.forEach(pregunta => {
          if (pregunta.tipo === 'titulo_seccion') {
            if (!seccionesTrimestrales[pregunta.id]) {
              seccionesTrimestrales[pregunta.id] = {
                titulo: pregunta.enunciado,
                preguntas: []
              };
            }
          } else if (pregunta.seccion_id) {
            if (!seccionesTrimestrales[pregunta.seccion_id]) {
              seccionesTrimestrales[pregunta.seccion_id] = {
                titulo: 'Sin título',
                preguntas: []
              };
            }
            seccionesTrimestrales[pregunta.seccion_id].preguntas.push(pregunta);
          }
        });
      }

      // HTML unificado con estilos consistentes
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Evaluación - ${evaluadoNombre} ${evaluadoApellido}</title>
            <style>
              @page {
                size: A4;
                margin: 15mm; /* Márgenes de 1.5cm para trimestrales */
              }
              body {
                font-family: Arial, sans-serif;
                font-size: 11px;
                line-height: 1.3;
                color: #000;
                margin: 0;
                padding: 0; /* Sin padding extra para usar márgenes de página */
                width: 100%;
                background: white;
                box-sizing: border-box;
              }
              
              /* Contenedor principal centrado con márgenes generosos */
              .pdf-container {
                width: 100%;
                max-width: 180mm; /* Dejar más espacio para márgenes */
                margin: 0 auto;
                padding: 15px; /* Padding generoso */
                background: white;
                box-sizing: border-box;
                font-size: 9px;
                line-height: 1.2;
                overflow: hidden;
                min-height: calc(100vh - 30mm); /* Asegurar espacio para márgenes inferior y superior */
              }
              
              /* Encabezado exactamente igual al modal */
              .evaluacion-header {
                width: 100%;
                border: 1px solid #000;
                margin-bottom: 20px;
                background: white;
                font-family: 'Arial', sans-serif;
              }
              
              .header-top-row {
                display: grid;
                grid-template-columns: 180px 1fr 180px; /* Espacios equilibrados */
                gap: 15px;
                padding: 10px;
                padding-left: 0;
                border-bottom: 1px solid #000;
                align-items: center;
                justify-items: center; /* Centrar horizontalmente */
              }
              
              .header-left {
                display: flex;
                align-items: center;
                justify-content: flex-start;
                padding-left: 16px;
                width: 180px;
                justify-self: start; /* Alinear a la izquierda */
              }
              
              .info-grid {
                display: flex;
                flex-direction: column;
                gap: 2px;
                width: 100%;
                max-width: 160px; /* Reducido */
                border: 1px solid #000;
                padding: 5px; /* Reducido padding */
                background: #f9f9f9;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                margin: 0;
              }
              
              .info-item {
                display: flex;
                align-items: center;
                gap: 6px;
                border-bottom: 1px solid #ccc;
                padding: 2px 4px;
                background: white;
              }
              
              .info-item:last-child {
                border-bottom: none;
              }
              
              .info-label {
                font-weight: bold;
                font-size: 9px; /* Reducido */
                color: #000;
                min-width: 50px; /* Reducido */
                text-transform: uppercase;
              }
              
              .info-value {
                font-size: 9px; /* Reducido */
                color: #000;
                font-weight: 600;
                flex: 1;
              }
              
              .header-center {
                display: flex;
                justify-content: center;
                align-items: center;
                text-align: center;
                justify-self: center; /* Centrar perfectamente */
                width: 100%;
              }
              
              .main-title {
                margin: 0;
                font-size: 18px; /* Reducido para que quepa en una línea */
                font-weight: bold;
                color: #000;
                line-height: 1.1;
                text-transform: uppercase;
                letter-spacing: 1px; /* Reducido espaciado */
                text-align: center;
                white-space: nowrap; /* Forzar una línea */
              }
              
              .header-right {
                display: flex;
                justify-content: flex-end;
                align-items: center;
                width: 180px;
                justify-self: end; /* Alinear a la derecha */
              }
              
              .logo-container {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                width: 100%;
                max-width: 280px;
              }
              
              .company-logo {
                width: 100%;
                max-height: 70px;
                object-fit: contain;
              }
              
              .header-info-row {
                background-color: #ff8c2e;
                padding: 8px 16px;
                border-bottom: 1px solid #000;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 20px;
              }
              
              .info-general-content {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
              }
              
              .header-people-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 2px;
                padding: 0;
                border-bottom: 1px solid #000;
              }
              
              .person-section {
                padding: 12px;
                border-right: 1px solid #000;
              }
              
              .person-section:last-child {
                border-right: none;
              }
              
              .person-title {
                font-weight: bold;
                font-size: 14px;
                color: #000;
                margin-bottom: 8px;
                text-align: center;
                text-transform: uppercase;
                background: #f0f0f0;
                padding: 4px 6px;
                border-radius: 4px;
                border: 1px solid #ddd;
              }
              
              .person-info-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 6px;
              }
              
              .info-row {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 4px 6px;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                background: #fafafa;
              }
              
              .header-proceso-row {
                padding: 10px 16px;
                border-bottom: 1px solid #000;
                background: #f8f9fa;
              }
              
              .proceso-section {
                max-width: 600px;
                margin: 0 auto;
                text-align: center;
              }
              
              .proceso-title {
                font-weight: bold;
                font-size: 12px;
                color: #000;
                text-transform: uppercase;
                background: #e9ecef;
                padding: 4px 8px;
                border-radius: 4px;
                border: 1px solid #ddd;
                display: inline-block;
                margin-right: 12px;
              }
              
              .proceso-content {
                display: inline-block;
                padding: 4px 8px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 4px;
                vertical-align: middle;
              }
              
              /* Apartados compactos */
              .apartado { 
                margin-bottom: 12px; /* Reducido de 20px */
                border: 1px solid #ddd; 
                padding: 10px; /* Reducido de 15px */
                page-break-inside: avoid;
                background: white;
                border-radius: 4px;
              }
              
              .apartado-title { 
                font-size: 13px; /* Reducido */
                font-weight: bold; 
                margin-bottom: 8px; /* Reducido de 12px */
                border-bottom: 1px solid #000;
                padding-bottom: 4px; /* Reducido de 6px */
                color: #000;
              }
              
              .pregunta { 
                margin-bottom: 8px; /* Reducido de 12px */
                page-break-inside: avoid;
              }
              
              .pregunta-texto { 
                border-radius: 2px; 
                font-size: 9px; /* Reducido */
                margin-left: 6px;
                font-weight: bold;
              }
              
              /* Estilos para opciones múltiples */
              .opciones-container {
                margin-top: 6px;
              }
              
              .opcion-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 4px 6px;
                margin-bottom: 3px;
                border-radius: 3px;
                font-size: 9px;
                line-height: 1.2;
              }
              
              .opcion-item.seleccionada {
                background: #e6f7ff;
                border: 1px solid #91d5ff;
              }
              
              .opcion-item.no-seleccionada {
                background: #ffffff;
                border: 1px solid #d9d9d9;
              }
              
              .opcion-texto {
                flex: 1;
                font-weight: normal;
                color: #333;
              }
              
              .opcion-item.seleccionada .opcion-texto {
                font-weight: bold;
                color: #000;
              }
              
              /* Estilos específicos para preguntas trimestrales */
              .preguntas-container {
                margin-top: 8px;
              }
              
              .pregunta-row {
                display: flex;
                align-items: center;  /* Cambiado de flex-start a center */
                margin-bottom: 8px;
                padding: 8px 0;       /* Aumentado padding */
                border-bottom: 1px solid #f0f0f0;
                page-break-inside: avoid;
              }
              
              .pregunta-numero {
                width: 20px;          /* Aumentado a 20px */
                height: 20px;         /* Aumentado a 20px */
                background: #1890ff;
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;       /* Aumentado a 10px */
                font-weight: bold;
                margin-right: 8px;
                flex-shrink: 0;
                line-height: 1;
                padding: 0;
                box-sizing: border-box;
                vertical-align: middle;
              }
              
              .pregunta-texto {
                flex: 1;
                font-size: 10px;
                line-height: 1.3;
                margin-right: 12px;
                font-weight: 500;
                color: #000;
                align-self: center;  /* Centrar verticalmente */
              }
              
              .pregunta-respuesta {
                flex-shrink: 0;
                min-width: 60px;
                text-align: right;
                align-self: center;  /* Centrar verticalmente */
              }
              
              .respuesta-escala {
                font-size: 12px;
                font-weight: bold;
                color: #1890ff;
                background: #e6f7ff;
                padding: 2px 6px;
                border-radius: 3px;
                border: 1px solid #91d5ff;
              }
              
              .respuesta-texto {
                font-size: 9px;
                color: #666;
                font-style: italic;
              }
              
              .apartado-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                padding-bottom: 6px;
                border-bottom: 2px solid #000;
              }
              
              .apartado-info {
                font-size: 10px;
                color: #666;
                background: #f5f5f5;
                padding: 2px 6px;
                border-radius: 3px;
                border: 1px solid #d9d9d9;
              }
              
              /* Estilos para comentarios */
              .respuesta {
                margin-top: 6px;
                padding: 8px;
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 4px;
                font-size: 10px;
                line-height: 1.4;
                color: #333;
                page-break-inside: avoid;
                margin-bottom: 10px;
              }
              
              .opcion-derecha {
                display: flex;
                align-items: center;
                gap: 4px;
                flex-shrink: 0;
              }
              
              .check-verde {
                color: #52c41a;
                font-weight: bold;
                font-size: 10px;
              }
              
              .sin-respuesta {
                font-size: 8px;
                color: #999;
                font-style: italic;
                margin-top: 4px;
              }
              
              /* Evitar cortes de página y márgenes de impresión */
              @media print {
                @page {
                  size: A4;
                  margin: 15mm; /* Márgenes generosos de 15mm */
                }
                body { 
                  margin: 0;
                  padding: 0;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .pdf-container {
                  margin: 0;
                  padding: 12px; /* Padding interno */
                  max-width: 100%;
                  min-height: calc(100vh - 30mm); /* Asegurar espacio para márgenes */
                  box-sizing: border-box;
                }
                /* Evitar cortes y asegurar saltos de página correctos */
                .evaluacion-header {
                  page-break-inside: avoid;
                  margin-bottom: 15px !important;
                }
                .apartado {
                  page-break-inside: avoid;
                  margin-bottom: 15px !important;
                  page-break-after: auto;
                }
                .apartado:last-child {
                  page-break-after: avoid;
                }
                .pregunta {
                  page-break-inside: avoid;
                  margin-bottom: 8px !important;
                }
                .preguntas-container {
                  page-break-inside: avoid;
                }
                /* Pie de página siempre al final con margen */
                div[style*="Generado el"] {
                  page-break-inside: avoid;
                  page-break-after: avoid;
                  margin-top: 20px !important;
                  padding-top: 10px !important;
                  margin-bottom: 15px !important;
                  border-top: 1px solid #ccc;
                }
                /* Resumen de calificaciones nunca se corta */
                div[style*="RESUMEN DE CALIFICACIONES"] {
                  page-break-inside: avoid;
                  page-break-after: auto;
                }
                /* Forzar espacio al final de cada página */
                @page {
                  margin-bottom: 15mm;
                }
              }
            </style>
          </head>
          <body>
            <div class="pdf-container">
              <!-- Encabezado completo igual que en el modal -->
              <div class="evaluacion-header">
              <!-- Primera fila -->
              <div class="header-top-row">
                <div class="header-left">
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="info-label">Controlado:</span>
                      <span class="info-value">${controlado}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Código:</span>
                      <span class="info-value">${codigo}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Vigencia:</span>
                      <span class="info-value">${vigencia}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Versión:</span>
                      <span class="info-value">${version}</span>
                    </div>
                  </div>
                </div>
                <div class="header-center">
                  <h1 class="main-title">EVALUACIÓN DE DESEMPEÑO</h1>
                </div>
                <div class="header-right">
                  <div class="logo-container">
                    <img src="/LOGO.png" alt="Soluciones Corporativas Integrales" class="company-logo" onerror="this.style.display='none'" />
                  </div>
                </div>
              </div>
              
              <!-- Segunda fila -->
              <div class="header-info-row">
                <div class="info-general-content">
                  <span class="info-label">PERÍODO EVALUADO:</span>
                  <span class="info-value">${textoPeriodo} ${fechaInicio} HASTA ${fechaFin}</span>
                </div>
              </div>
              
              <!-- Tercera fila -->
              <div class="header-people-row">
                <div class="person-section evaluado-section">
                  <div class="person-title">Evaluado</div>
                  <div class="person-info-grid">
                    <div class="info-row">
                      <span class="info-label">Nombres:</span>
                      <span class="info-value">${evaluadoNombre}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Apellidos:</span>
                      <span class="info-value">${evaluadoApellido}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Cargo:</span>
                      <span class="info-value">${evaluadoCargo}</span>
                    </div>
                    ${esTrimestral && evaluacion?.evaluado?.fecha_ingreso_empresa ? `
                      <div class="info-row">
                        <span class="info-label">F. Ingreso:</span>
                        <span class="info-value">${new Date(evaluacion.evaluado.fecha_ingreso_empresa).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                    ` : ''}
                  </div>
                </div>
                <div class="person-section evaluador-section">
                  <div class="person-title">Evaluador</div>
                  <div class="person-info-grid">
                    <div class="info-row">
                      <span class="info-label">Nombres:</span>
                      <span class="info-value">${evaluadorNombre}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Apellidos:</span>
                      <span class="info-value">${evaluadorApellido}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Cargo:</span>
                      <span class="info-value">${evaluadorCargo}</span>
                    </div>
                    ${esTrimestral && evaluacion?.evaluador?.fecha_ingreso_empresa ? `
                      <div class="info-row">
                        <span class="info-label">F. Ingreso:</span>
                        <span class="info-value">${new Date(evaluacion.evaluador.fecha_ingreso_empresa).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                    ` : ''}
                  </div>
                </div>
              </div>
              
              <!-- Cuarta fila -->
              <div class="header-proceso-row">
                <div class="proceso-section">
                  <span class="proceso-title">PROCESO</span>
                  <span class="proceso-content">${procesoDepartamento}</span>
                </div>
              </div>
            </div>

            <!-- Resumen de calificaciones -->
            ${puntuacion && valoracion ? `
              <div class="apartado" style="background: linear-gradient(135deg, #e6f7ff 0%, #f0f8ff 100%); border: 2px solid #000; margin-bottom: 20px;">
                <div class="apartado-header" style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
                  <div class="apartado-title" style="color: #000; font-size: 16px; margin: 0;">RESUMEN DE CALIFICACIONES</div>
                </div>
                <div style="display: flex; justify-content: space-around; align-items: center; text-align: center;">
                  <div style="flex: 1; padding: 10px; border-right: 1px solid #000;">
                    <div style="font-size: 12px; font-weight: bold; color: #000; margin-bottom: 4px;">
                      ${esTrimestral ? 'DEFINITIVA' : 'CALIFICACIÓN TOTAL'}
                    </div>
                    <div style="font-size: 24px; font-weight: bold; color: #000;">
                      ${esTrimestral ? puntuacion : `${puntuacion} / 5.00`}
                    </div>
                  </div>
                  <div style="flex: 1; padding: 10px;">
                    <div style="font-size: 12px; font-weight: bold; color: #000; margin-bottom: 4px;">
                      VALORACIÓN FINAL
                    </div>
                    <div style="font-size: 24px; font-weight: bold; padding: 4px 8px; border-radius: 4px; ${
                      esTrimestral ? 
                        (valoracion === 'DESTACADO' ? 'background: #f6ffed; color: #52c41a;' :
                         valoracion === 'BUENO' ? 'background: #e6f7ff; color: #1890ff;' :
                         'background: #fff7e6; color: #fa8c16;') :
                        (valoracion === 'EXCELENTE' ? 'background: #f6ffed; color: #52c41a;' :
                         valoracion === 'SOBRESALIENTE' ? 'background: #e6f7ff; color: #1890ff;' :
                         valoracion === 'BUENO' ? 'background: #f6ffed; color: #52c41a;' :
                         valoracion === 'ACEPTABLE' ? 'background: #fff7e6; color: #fa8c16;' :
                         'background: #fff2f0; color: #f5222d;')
                    }">
                      ${valoracion}
                    </div>
                  </div>
                </div>
              </div>
            ` : ''}

            <!-- Contenido de preguntas -->
            ${PDFGenerator._generarContenidoPreguntas(esTrimestral, seccionesTrimestrales, formulario, respuestas)}
            
            <!-- Sección de comentarios -->
            ${formulario?.preguntas?.filter(p => p.apartado === 'comentarios').length > 0 ? `
              <div class="apartado" style="margin-bottom: 20px; page-break-inside: avoid;">
                <div class="apartado-title" style="border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 12px;">COMENTARIOS ADICIONALES</div>
                ${formulario.preguntas.filter(p => p.apartado === 'comentarios').map((pregunta, index) => `
                  <div class="pregunta" style="margin-bottom: 15px; page-break-inside: avoid;">
                    <div class="pregunta-texto" style="font-weight: bold; margin-bottom: 6px; color: #000;">${index + 1}. ${pregunta.enunciado}</div>
                    ${respuestas[pregunta.id] ? 
                      '<div class="respuesta">' + respuestas[pregunta.id] + '</div>' : 
                      '<div class="respuesta" style="font-style: italic; color: #666;">Sin comentarios registrados</div>'
                    }
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            <!-- Pie de página -->
            <div style="margin-top: 30px; padding: 15px 10px; border-top: 1px solid #ccc; text-align: center; font-size: 8px; color: #666; page-break-inside: avoid; margin-bottom: 20px; background: #f9f9f9;">
              Generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}
            </div>
            </div> <!-- Cerrar pdf-container -->
          </body>
        </html>
      `;

      return { htmlContent, fileName: `Evaluacion_${evaluadoNombre}_${evaluadoApellido}_${new Date().toISOString().split('T')[0]}.pdf` };

    } catch (error) {
      console.error('Error generando PDF:', error);
      throw error;
    }
  },

  // Imprimir directamente sin preview
  async printDirect(htmlContent) {
    try {
      // Crear ventana temporal para imprimir
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Imprimir Evaluación</title>
            <style>
              @page {
                size: A4;
                margin: 10mm; /* Márgenes de 1cm */
              }
              body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
              }
              ${htmlContent.match(/<style>([\s\S]*?)<\/style>/)[1]}
            </style>
          </head>
          <body>
            ${htmlContent.match(/<body>([\s\S]*?)<\/body>/)[1]}
          </body>
        </html>
      `);
      printWindow.document.close();
      
      // Esperar a que cargue y abrir diálogo de impresión
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };
      
      return printWindow;
    } catch (error) {
      console.error('Error al imprimir:', error);
      throw error;
    }
  },

  // Generar PDF descargable con html2canvas
  async downloadPDF(htmlContent, fileName) {
    try {
      // Crear ventana temporal para renderizar
      const tempWindow = window.open('', '_blank', 'width=800,height=1100');
      tempWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { 
                margin: 0; 
                padding: 0;
                width: 210mm;
                background: white;
              }
            </style>
        </head>
        <body>
          ${htmlContent.replace('<body>', '<body>').replace('</body>', '</body>')}
        </body>
        </html>
      `);
      tempWindow.document.close();

      // Esperar a que cargue y capturar
      await new Promise(resolve => {
        tempWindow.addEventListener('load', resolve);
      });

      const canvas = await html2canvas(tempWindow.document.body, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      // Crear PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // Ancho A4 en mm
      const pageHeight = 297; // Alto A4 en mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Calcular cuántas páginas se necesitan
      const totalPages = Math.ceil(imgHeight / pageHeight);
      
      // Agregar cada página con la porción correcta del contenido
      for (let i = 0; i < totalPages; i++) {
        if (i > 0) {
          pdf.addPage();
        }
        
        // Calcular la posición Y para esta página
        const position = -(i * pageHeight);
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      }

      // Guardar PDF
      pdf.save(fileName);

      // Cerrar ventana temporal
      tempWindow.close();

      return true;
    } catch (error) {
      console.error('Error descargando PDF:', error);
      throw error;
    }
  }
};

export default PDFGenerator;
