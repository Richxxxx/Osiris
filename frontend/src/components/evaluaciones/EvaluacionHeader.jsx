import React from 'react';
import { Typography, Space } from 'antd';
import { calcularPeriodoReal } from '../../utils/periodoCalculo';

const { Title, Text } = Typography;

const EvaluacionHeader = ({ evaluacion, formulario }) => {
  // Valores por defecto para información que puede cambiar
  const controlado = evaluacion?.controlado || 'SI';
  const codigo = evaluacion?.codigo || 'GH-FO12';
  const vigencia = evaluacion?.vigencia || '2023-11-07';
  const version = evaluacion?.version || '02';
  
  // Período evaluado - calcular basado en fecha de ingreso del evaluado
  const fechaIngresoEvaluado = evaluacion?.evaluado?.fecha_ingreso_empresa;
  const periodoReal = calcularPeriodoReal(fechaIngresoEvaluado, formulario?.periodicidad);
  const fechaInicio = periodoReal.inicio;
  const fechaFin = periodoReal.fin;

  // Determinar texto del período basado en la periodicidad del formulario
  const periodicidad = formulario?.periodicidad || 'trimestral';
  const textoPeriodo = periodicidad === 'anual' ? 'AÑO DE' : 'DE';
  
  // Datos del evaluado - extraídos desde el ID
  const evaluadoNombre = evaluacion?.evaluado?.nombre || 'Edwin';
  const evaluadoApellido = evaluacion?.evaluado?.apellido || 'Hernandez';
  const evaluadoCargo = evaluacion?.evaluado?.cargo?.nombre || 'Ingeniero Infraestructura';
  
  // Datos del evaluador - extraídos desde el ID
  const evaluadorNombre = evaluacion?.evaluador?.nombre || 'Rulexor';
  const evaluadorApellido = evaluacion?.evaluador?.apellido || 'Monasterios';
  const evaluadorCargo = evaluacion?.evaluador?.cargo?.nombre || 'Coordinador de Sistemas';

  // Fechas de ingreso - solo para evaluaciones trimestrales
  const mostrarFechasIngreso = formulario?.periodicidad === 'trimestral';
  const evaluadoFechaIngreso = evaluacion?.evaluado?.fecha_ingreso_empresa ? 
    new Date(evaluacion.evaluado.fecha_ingreso_empresa).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 
    'No registrada';
  const evaluadorFechaIngreso = evaluacion?.evaluador?.fecha_ingreso_empresa ? 
    new Date(evaluacion.evaluador.fecha_ingreso_empresa).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 
    'No registrada';

  // Datos del proceso unificados
  const procesoDepartamento = evaluacion?.evaluado?.departamento?.nombre || 'Innovacion Tecnologica';

  return (
    <div className="evaluacion-header">
      {/* Primera fila - Información superior */}
      <div className="header-top-row">
        {/* Columna izquierda - Información de control en columna */}
        <div className="header-left">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Controlado:</span>
              <span className="info-value">{controlado}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Código:</span>
              <span className="info-value">{codigo}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Vigencia:</span>
              <span className="info-value">{vigencia}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Versión:</span>
              <span className="info-value">{version}</span>
            </div>
          </div>
        </div>
        
        {/* Columna central - Título principal */}
        <div className="header-center">
          <Title level={2} className="main-title">
            EVALUACIÓN DE DESEMPEÑO LABORAL
          </Title>
        </div>
        
        {/* Columna derecha - Logo real */}
        <div className="header-right">
          <div className="logo-container">
            <img 
              src="/LOGO.png" 
              alt="Soluciones Corporativas Integrales" 
              className="company-logo"
            />
          </div>
        </div>
      </div>
      
      {/* Segunda fila - Información general con fondo azul */}
      <div className="header-info-row">
        <div className="info-general-content">
          <span className="info-label">PERÍODO EVALUADO:</span>
          <span className="info-value">
            {textoPeriodo} {fechaInicio} HASTA {fechaFin}
          </span>
        </div>
      </div>
      
      {/* Tercera fila - Información de evaluado y evaluador sin departamento */}
      <div className="header-people-row">
        {/* Sección Evaluado */}
        <div className="person-section evaluado-section">
          <div className="person-title">Evaluado</div>
          <div className="person-info-grid">
            <div className="info-row">
              <span className="info-label">Nombres:</span>
              <span className="info-value">{evaluadoNombre}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Apellidos:</span>
              <span className="info-value">{evaluadoApellido}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Cargo:</span>
              <span className="info-value">{evaluadoCargo}</span>
            </div>
            {mostrarFechasIngreso && (
              <div className="info-row">
                <span className="info-label">F. Ingreso:</span>
                <span className="info-value">{evaluadoFechaIngreso}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Sección Evaluador */}
        <div className="person-section evaluador-section">
          <div className="person-title">Evaluador</div>
          <div className="person-info-grid">
            <div className="info-row">
              <span className="info-label">Nombres:</span>
              <span className="info-value">{evaluadorNombre}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Apellidos:</span>
              <span className="info-value">{evaluadorApellido}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Cargo:</span>
              <span className="info-value">{evaluadorCargo}</span>
            </div>
            {mostrarFechasIngreso && (
              <div className="info-row">
                <span className="info-label">F. Ingreso:</span>
                <span className="info-value">{evaluadorFechaIngreso}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cuarta fila - Sección unificada de PROCESO */}
      <div className="header-proceso-row">
        <div className="proceso-section">
          <div className="proceso-title">PROCESO</div>
          <div className="proceso-content">
            <span className="proceso-value">{procesoDepartamento}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluacionHeader;
