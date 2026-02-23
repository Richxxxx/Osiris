const nodemailer = require('nodemailer');
const { Usuario, Evaluacion, Formulario, Departamento } = require('../models');
const AppError = require('../utils/appError');
const { format, addDays, differenceInDays } = require('date-fns');
class NotificationService {
  constructor() {
    this.transporter = this.createTransporter();
  }
  createTransporter() {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  // ✅ NUEVO: Notificación de primer día de ventana de evaluación
  async notificarNuevaVentanaEvaluacion(employeeId, evaluatorId, window) {
    try {
      const employee = await Usuario.findByPk(employeeId, {
        include: [
          { model: Departamento, as: 'departamento', attributes: ['nombre'] }
        ]
      });
      const evaluator = await Usuario.findByPk(evaluatorId);
      if (!employee || !evaluator) {
        throw new Error('Empleado o evaluador no encontrado');
      }
      const base = this.getBaseTemplate();
      const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
          <div style="background-color: ${base.primaryColor}; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">📋 Nueva Ventana de Evaluación</h1>
          </div>
          <div style="padding: 30px; background-color: white;">
            <h2 style="color: ${base.secondaryColor}; margin-top: 0;">
              ¡Hola ${evaluator.nombre} ${evaluator.apellido}!
            </h2>
            <p style="font-size: 16px; line-height: 1.6;">
              Se ha abierto una nueva ventana de evaluación para el empleado:
            </p>
            <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${base.primaryColor};">
              <h3 style="color: #1565c0; margin-top: 0;">👤 Datos del Empleado</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Nombre:</strong> ${employee.nombre} ${employee.apellido}</li>
                <li><strong>Departamento:</strong> ${employee.departamento?.nombre || 'No asignado'}</li>
                <li><strong>Email:</strong> ${employee.email}</li>
              </ul>
            </div>
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f39c12;">
              <h3 style="color: #856404; margin-top: 0;">📅 Fechas Importantes</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Inicio de ventana:</strong> ${window.start.toLocaleDateString('es-ES')}</li>
                <li><strong>Fecha de evaluación:</strong> ${window.evaluationDate.toLocaleDateString('es-ES')}</li>
                <li><strong>Cierre de ventana:</strong> ${window.end.toLocaleDateString('es-ES')}</li>
                <li><strong>Total días:</strong> ${window.totalDays} días</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="background-color: ${base.primaryColor}; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 6px; display: inline-block; 
                        font-weight: bold; font-size: 16px;">
                Acceder al Sistema
              </a>
            </div>
          </div>
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
            <p style="margin: 0; color: #6c757d; font-size: 12px;">
              Este es un mensaje automático de ${base.organization}.<br>
              Por favor no respondas a este correo.
            </p>
          </div>
        </div>
      `;
      await this.transporter.sendMail({
        from: base.from,
        to: evaluator.email,
        subject: `📋 Nueva Ventana de Evaluación - ${employee.nombre} ${employee.apellido}`,
        html: htmlContent
      });
    } catch (error) {
      console.error('❌ Error enviando notificación de nueva ventana:', error);
      throw error;
    }
  }
  // ✅ NUEVO: Notificación de cierre de ventana
  async notificarCierreVentana(employeeId, window) {
    try {
      const employee = await Usuario.findByPk(employeeId, {
        include: [
          { model: Departamento, as: 'departamento', attributes: ['nombre'] }
        ]
      });
      if (!employee) {
        throw new Error('Empleado no encontrado');
      }
      // Buscar evaluador del departamento
      const evaluator = await Usuario.findOne({
        where: {
          departamento_id: employee.departamento_id,
          rol_id: 2, // Rol evaluador
          estado: 'activo'
        }
      });
      if (!evaluator) {
        return;
      }
      const base = this.getBaseTemplate();
      const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
          <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🔒 Cierre de Ventana de Evaluación</h1>
          </div>
          <div style="padding: 30px; background-color: white;">
            <h2 style="color: ${base.secondaryColor}; margin-top: 0;">
              ¡Hola ${evaluator.nombre} ${evaluator.apellido}!
            </h2>
            <p style="font-size: 16px; line-height: 1.6;">
              La ventana de evaluación para el siguiente empleado cierra HOY:
            </p>
            <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <h3 style="color: #721c24; margin-top: 0;">👤 Datos del Empleado</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Nombre:</strong> ${employee.nombre} ${employee.apellido}</li>
                <li><strong>Departamento:</strong> ${employee.departamento?.nombre || 'No asignado'}</li>
                <li><strong>Email:</strong> ${employee.email}</li>
              </ul>
            </div>
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f39c12;">
              <h3 style="color: #856404; margin-top: 0;">⏰ Información de la Ventana</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Fecha de cierre:</strong> ${window.end.toLocaleDateString('es-ES')}</li>
                <li><strong>Fecha de evaluación:</strong> ${window.evaluationDate.toLocaleDateString('es-ES')}</li>
                <li><strong>Estado:</strong> <span style="color: #dc3545; font-weight: bold;">CIERRE HOY</span></li>
              </ul>
            </div>
            <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
              <p style="margin: 0; color: #0c5460;">
                <strong>⚠️ Importante:</strong> Si la evaluación no se completa hoy, la ventana se cerrará y deberá reportarse como ventana vencida.
                <br><br>
                <strong>✅ Si ya has realizado la evaluación de este empleado, por favor ignora esta notificación.</strong>
              </p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="background-color: #dc3545; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 6px; display: inline-block; 
                        font-weight: bold; font-size: 16px;">
                Completar Evaluación Ahora
              </a>
            </div>
          </div>
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
            <p style="margin: 0; color: #6c757d; font-size: 12px;">
              Este es un mensaje automático de ${base.organization}.<br>
              Por favor no respondas a este correo.
            </p>
          </div>
        </div>
      `;
      await this.transporter.sendMail({
        from: base.from,
        to: evaluator.email,
        subject: `🔒 Cierre de Ventana - ${employee.nombre} ${employee.apellido}`,
        html: htmlContent
      });
    } catch (error) {
      console.error('❌ Error enviando notificación de cierre:', error);
      throw error;
    }
  }
  // ✅ NUEVO: Notificación de "Quedan 5 días para evaluar"
  async notificarQuedan5DiasVentana(employeeId, window) {
    try {
      const employee = await Usuario.findByPk(employeeId, {
        include: [
          { model: Departamento, as: 'departamento', attributes: ['nombre'] }
        ]
      });
      if (!employee) {
        throw new Error('Empleado no encontrado');
      }
      // Buscar evaluador del departamento
      const evaluator = await Usuario.findOne({
        where: {
          departamento_id: employee.departamento_id,
          rol_id: 2, // Rol evaluador
          estado: 'activo'
        }
      });
      if (!evaluator) {
        return;
      }
      const base = this.getBaseTemplate();
      const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
          <div style="background-color: #f39c12; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">⚠️ Quedan 5 días para evaluar</h1>
          </div>
          <div style="padding: 30px; background-color: white;">
            <h2 style="color: ${base.secondaryColor}; margin-top: 0;">
              ¡Hola ${evaluator.nombre} ${evaluator.apellido}!
            </h2>
            <p style="font-size: 16px; line-height: 1.6;">
              Te recordamos que quedan <strong>5 días</strong> para completar la evaluación del siguiente empleado:
            </p>
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f39c12;">
              <h3 style="color: #856404; margin-top: 0;">👤 Datos del Empleado</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Nombre:</strong> ${employee.nombre} ${employee.apellido}</li>
                <li><strong>Departamento:</strong> ${employee.departamento?.nombre || 'No asignado'}</li>
                <li><strong>Email:</strong> ${employee.email}</li>
              </ul>
            </div>
            <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
              <h3 style="color: #0c5460; margin-top: 0;">📅 Fechas Importantes</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Fecha de evaluación:</strong> ${window.evaluationDate.toLocaleDateString('es-ES')}</li>
                <li><strong>Inicio ventana:</strong> ${window.start.toLocaleDateString('es-ES')}</li>
                <li><strong><span style="color: #f39c12; font-weight: bold;">Cierre ventana:</span></strong> ${window.end.toLocaleDateString('es-ES')}</li>
                <li><strong>Días restantes:</strong> <span style="color: #dc3545; font-weight: bold;">5 días</span></li>
              </ul>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="background-color: #f39c12; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 6px; display: inline-block; 
                        font-weight: bold; font-size: 16px;">
                Evaluar Ahora
              </a>
            </div>
          </div>
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
            <p style="margin: 0; color: #6c757d; font-size: 12px;">
              Este es un mensaje automático de ${base.organization}.<br>
              Por favor no respondas a este correo.
            </p>
          </div>
        </div>
      `;
      await this.transporter.sendMail({
        from: base.from,
        to: evaluator.email,
        subject: `⚠️ Quedan 5 días para evaluar - ${employee.nombre} ${employee.apellido}`,
        html: htmlContent
      });
    } catch (error) {
      console.error('❌ Error enviando notificación de 5 días:', error);
      throw error;
    }
  }
  // ✅ NUEVO: Notificación de "Último día para evaluar"
  async notificarUltimoDiaVentana(employeeId, window) {
    try {
      const employee = await Usuario.findByPk(employeeId, {
        include: [
          { model: Departamento, as: 'departamento', attributes: ['nombre'] }
        ]
      });
      if (!employee) {
        throw new Error('Empleado no encontrado');
      }
      // Buscar evaluador del departamento
      const evaluator = await Usuario.findOne({
        where: {
          departamento_id: employee.departamento_id,
          rol_id: 2, // Rol evaluador
          estado: 'activo'
        }
      });
      if (!evaluator) {
        return;
      }
      const base = this.getBaseTemplate();
      const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
          <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🔒 Último día para evaluar</h1>
          </div>
          <div style="padding: 30px; background-color: white;">
            <h2 style="color: ${base.secondaryColor}; margin-top: 0;">
              ¡Hola ${evaluator.nombre} ${evaluator.apellido}!
            </h2>
            <p style="font-size: 16px; line-height: 1.6;">
              <strong>HOY es el último día</strong> para completar la evaluación del siguiente empleado:
            </p>
            <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <h3 style="color: #721c24; margin-top: 0;">👤 Datos del Empleado</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Nombre:</strong> ${employee.nombre} ${employee.apellido}</li>
                <li><strong>Departamento:</strong> ${employee.departamento?.nombre || 'No asignado'}</li>
                <li><strong>Email:</strong> ${employee.email}</li>
              </ul>
            </div>
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f39c12;">
              <h3 style="color: #856404; margin-top: 0;">⏰ Información de la Ventana</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Fecha de evaluación:</strong> ${window.evaluationDate.toLocaleDateString('es-ES')}</li>
                <li><strong>Inicio ventana:</strong> ${window.start.toLocaleDateString('es-ES')}</li>
                <li><strong><span style="color: #dc3545; font-weight: bold;">Cierre ventana:</span></strong> ${window.end.toLocaleDateString('es-ES')}</li>
                <li><strong>Estado:</strong> <span style="color: #dc3545; font-weight: bold;">CIERRE HOY</span></li>
              </ul>
            </div>
            <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
              <p style="margin: 0; color: #0c5460;">
                <strong>⚠️ Importante:</strong> Si la evaluación no se completa hoy, la ventana se cerrará y deberá reportarse como ventana vencida.
                <br><br>
                <strong>✅ Si ya has realizado la evaluación de este empleado, por favor ignora esta notificación.</strong>
              </p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="background-color: #dc3545; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 6px; display: inline-block; 
                        font-weight: bold; font-size: 16px;">
                Completar Evaluación Ahora
              </a>
            </div>
          </div>
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
            <p style="margin: 0; color: #6c757d; font-size: 12px;">
              Este es un mensaje automático de ${base.organization}.<br>
              Por favor no respondas a este correo.
            </p>
          </div>
        </div>
      `;
      await this.transporter.sendMail({
        from: base.from,
        to: evaluator.email,
        subject: `🔒 Último día para evaluar - ${employee.nombre} ${employee.apellido}`,
        html: htmlContent
      });
    } catch (error) {
      console.error('❌ Error enviando notificación de último día:', error);
      throw error;
    }
  }
  // Plantillas base
  getBaseTemplate() {
    return {
      from: `"${process.env.APP_NAME || 'Sistema de Evaluación de Desempeño'}" <${process.env.EMAIL_USER}>`,
      organization: process.env.APP_NAME || 'Sistema de Evaluación de Desempeño',
      primaryColor: '#3498db',
      secondaryColor: '#2c3e50'
    };
  }
  // Notificación de nueva evaluación asignada (solo al líder del departamento)
  async notificarNuevaEvaluacionAsignada(evaluacionId) {
    try {
      const evaluacion = await Evaluacion.findByPk(evaluacionId, {
        include: [
          { model: Usuario, as: 'evaluador', attributes: ['id', 'nombre', 'apellido', 'email', 'departamento_id'] },
          { model: Usuario, as: 'evaluado', attributes: ['id', 'nombre', 'apellido', 'email', 'departamento_id'] },
          { model: Formulario, as: 'formulario', attributes: ['id', 'nombre', 'descripcion'] },
          { model: Departamento, as: 'departamento', attributes: ['id', 'nombre'] }
        ]
      });
      if (!evaluacion) throw new Error('Evaluación no encontrada');
      const { evaluado, formulario, departamento } = evaluacion;
      const base = this.getBaseTemplate();
      // Buscar líder/evaluador del departamento del evaluado
      const liderDepartamento = await Usuario.findOne({
        where: {
          departamento_id: evaluado.departamento_id,
          rol_id: 2, // rol evaluador
          estado: 'activo'
        },
        attributes: ['id', 'nombre', 'apellido', 'email']
      });
      if (liderDepartamento?.email) {
        const mailOptions = {
          ...base,
          to: liderDepartamento.email,
          subject: `Nueva Evaluación Asignada - ${evaluado.nombre} ${evaluado.apellido}`,
          html: this.generarPlantillaEvaluacionAsignadaGestion({
            evaluacion,
            destinatario: liderDepartamento,
            evaluado,
            formulario,
            departamento
          })
        };
        await this.transporter.sendMail(mailOptions);
      }
      return true;
    } catch (error) {
      console.error('Error al notificar nueva evaluación asignada:', error);
      throw new AppError('Error al enviar notificación de evaluación asignada', 500);
    }
  }
  // Notificación de primer día de evaluaciones (dashboard evaluador)
  async notificarPrimerDiaEvaluaciones(evaluadorId, evaluacionesNuevas) {
    try {
      const evaluador = await Usuario.findByPk(evaluadorId, {
        attributes: ['id', 'nombre', 'apellido', 'email']
      });
      if (!evaluador || !evaluador.email) return false;
      const base = this.getBaseTemplate();
      const mailOptions = {
        ...base,
        to: evaluador.email,
        subject: `Nuevas Evaluaciones Disponibles - ${evaluacionesNuevas.length} evaluaciones`,
        html: this.generarPlantillaPrimerDiaEvaluaciones({
          destinatario: evaluador,
          evaluaciones: evaluacionesNuevas
        })
      };
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error al notificar primer día de evaluaciones:', error);
      throw new AppError('Error al enviar notificación de primer día', 500);
    }
  }
  // Notificación de evaluación por vencer (5 días antes)
  async notificarEvaluacionPorVencer(evaluacionId) {
    try {
      const evaluacion = await Evaluacion.findByPk(evaluacionId, {
        include: [
          { model: Usuario, as: 'evaluador', attributes: ['id', 'nombre', 'apellido', 'email'] },
          { model: Usuario, as: 'evaluado', attributes: ['id', 'nombre', 'apellido', 'email'] }
        ]
      });
      if (!evaluacion || !evaluacion.evaluador) return false;
      const { evaluador, evaluado } = evaluacion;
      const base = this.getBaseTemplate();
      const mailOptions = {
        ...base,
        to: evaluador.email,
        subject: `⚠️ Evaluación por Vencer - ${evaluado.nombre} ${evaluado.apellido}`,
        html: this.generarPlantillaEvaluacionPorVencer({
          evaluacion,
          destinatario: evaluador,
          evaluado
        })
      };
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error al notificar evaluación por vencer:', error);
      throw new AppError('Error al enviar notificación de evaluación por vencer', 500);
    }
  }
  // Notificación de ventana vencida (para gestión)
  async notificarVentanaVencida(empleadoId, fechaVencimiento) {
    try {
      const empleado = await Usuario.findByPk(empleadoId, {
        include: [
          { model: Departamento, as: 'departamento', attributes: ['id', 'nombre'] }
        ],
        attributes: ['id', 'nombre', 'apellido', 'email', 'fecha_ingreso_empresa']
      });
      if (!empleado) return false;
      // ✅ CORRECCIÓN: Determinar tipo de evaluación
      const today = new Date();
      const hireDate = new Date(empleado.fecha_ingreso_empresa);
      const monthsSinceHire = (today - hireDate) / (1000 * 60 * 60 * 24 * 30);
      const tipoEvaluacion = monthsSinceHire >= 12 ? 'Anual' : 'Trimestral';
      // Buscar usuarios de rol gestión
      const usuariosGestion = await Usuario.findAll({
        where: {
          rol_id: 4, // rol gestión
          estado: 'activo'
        },
        attributes: ['id', 'nombre', 'apellido', 'email']
      });
      const base = this.getBaseTemplate();
      for (const usuarioGestion of usuariosGestion) {
        if (usuarioGestion.email) {
          const mailOptions = {
            ...base,
            to: usuarioGestion.email,
            subject: `⚠️ Ventana de Evaluación Vencida - ${empleado.nombre} ${empleado.apellido}`,
            html: this.generarPlantillaVentanaVencida({
              empleado,
              tipoEvaluacion,
              destinatario: usuarioGestion
            })
          };
          await this.transporter.sendMail(mailOptions);
        }
      }
      return true;
    } catch (error) {
      console.error('Error al notificar ventana vencida:', error);
      throw new AppError('Error al enviar notificación de ventana vencida', 500);
    }
  }
  // Notificación de evaluación asignada finalizada (para gestión)
  async notificarEvaluacionAsignadaFinalizada(evaluacionId) {
    try {
      const evaluacion = await Evaluacion.findByPk(evaluacionId, {
        include: [
          { model: Usuario, as: 'evaluador', attributes: ['id', 'nombre', 'apellido', 'email'] },
          { model: Usuario, as: 'evaluado', attributes: ['id', 'nombre', 'apellido', 'email'] }
        ]
      });
      if (!evaluacion) return false;
      // Buscar usuarios de rol gestión
      const usuariosGestion = await Usuario.findAll({
        where: {
          rol_id: 4, // rol gestión
          estado: 'activo'
        },
        attributes: ['id', 'nombre', 'apellido', 'email']
      });
      const base = this.getBaseTemplate();
      for (const usuarioGestion of usuariosGestion) {
        if (usuarioGestion.email) {
          const mailOptions = {
            ...base,
            to: usuarioGestion.email,
            subject: `✅ Evaluación Asignada Finalizada - ${evaluacion.evaluado.nombre} ${evaluacion.evaluado.apellido}`,
            html: this.generarPlantillaEvaluacionAsignadaFinalizada({
              evaluacion,
              destinatario: usuarioGestion
            })
          };
          await this.transporter.sendMail(mailOptions);
        }
      }
      return true;
    } catch (error) {
      console.error('Error al notificar evaluación asignada finalizada:', error);
      throw new AppError('Error al enviar notificación de evaluación asignada finalizada', 500);
    }
  }
  // Notificación de nuevo usuario (para administración)
  async notificarAdminNuevoUsuario(usuarioId) {
    try {
      const usuario = await Usuario.findByPk(usuarioId, {
        include: [
          { model: require('../models').Rol, as: 'rol', attributes: ['id', 'nombre'] },
          { model: require('../models').Departamento, as: 'departamento', attributes: ['id', 'nombre'] }
        ],
        attributes: ['id', 'nombre', 'apellido', 'email', 'rol_id', 'departamento_id']
      });
      if (!usuario) return false;
      // Buscar administradores
      const administradores = await Usuario.findAll({
        where: {
          rol_id: 1, // rol administrador
          estado: 'activo'
        },
        attributes: ['id', 'nombre', 'apellido', 'email']
      });
      const base = this.getBaseTemplate();
      for (const admin of administradores) {
        if (admin.email) {
          const mailOptions = {
            ...base,
            to: admin.email,
            subject: `👤 Nuevo Usuario Creado - ${usuario.nombre} ${usuario.apellido}`,
            html: this.generarPlantillaNuevoUsuarioAdmin({
              usuario,
              destinatario: admin
            })
          };
          await this.transporter.sendMail(mailOptions);
        }
      }
      return true;
    } catch (error) {
      console.error('Error al notificar admin nuevo usuario:', error);
      throw new AppError('Error al enviar notificación de nuevo usuario', 500);
    }
  }
  // Notificación de nueva evaluación asignada (método original para compatibilidad)
  async notificarNuevaEvaluacion(evaluacionId) {
    try {
      const evaluacion = await Evaluacion.findByPk(evaluacionId, {
        include: [
          { model: Usuario, as: 'evaluador', attributes: ['id', 'nombre', 'apellido', 'email'] },
          { model: Usuario, as: 'evaluado', attributes: ['id', 'nombre', 'apellido', 'email'] },
          { model: Formulario, as: 'formulario', attributes: ['id', 'nombre', 'descripcion'] }
        ]
      });
      if (!evaluacion) throw new Error('Evaluación no encontrada');
      const { evaluador, evaluado, formulario } = evaluacion;
      const base = this.getBaseTemplate();
      // Notificar al evaluador
      if (evaluador?.email) {
        const mailOptions = {
          ...base,
          to: evaluador.email,
          subject: `Nueva Evaluación de Desempeño Asignada - ${evaluado.nombre} ${evaluado.apellido}`,
          html: this.generarPlantillaEvaluacionAsignada({
            tipo: 'evaluador',
            evaluacion,
            destinatario: evaluador,
            evaluado,
            formulario
          })
        };
        await this.transporter.sendMail(mailOptions);
      }
      // Notificar al evaluado
      if (evaluado?.email) {
        const mailOptions = {
          ...base,
          to: evaluado.email,
          subject: 'Tienes una nueva evaluación programada',
          html: this.generarPlantillaEvaluacionAsignada({
            tipo: 'evaluado',
            evaluacion,
            destinatario: evaluado,
            evaluador,
            formulario
          })
        };
        await this.transporter.sendMail(mailOptions);
      }
      return true;
    } catch (error) {
      console.error('Error al notificar nueva evaluación:', error);
      throw new AppError('Error al enviar notificación de evaluación', 500);
    }
  }
  // Notificación de recordatorio de evaluación
  async notificarRecordatorioEvaluacion(evaluacionId) {
    try {
      const evaluacion = await Evaluacion.findByPk(evaluacionId, {
        include: [
          { model: Usuario, as: 'evaluador', attributes: ['id', 'nombre', 'apellido', 'email'] },
          { model: Usuario, as: 'evaluado', attributes: ['id', 'nombre', 'apellido', 'email'] }
        ]
      });
      if (!evaluacion || evaluacion.estado === 'completada') return false;
      const base = this.getBaseTemplate();
      if (evaluacion.evaluador?.email) {
        const mailOptions = {
          ...base,
          to: evaluacion.evaluador.email,
          subject: `Recordatorio: Evaluación pendiente de ${evaluacion.evaluado.nombre} ${evaluacion.evaluado.apellido}`,
          html: this.generarPlantillaRecordatorio({
            evaluacion,
            destinatario: evaluacion.evaluador,
            evaluado: evaluacion.evaluado
          })
        };
        await this.transporter.sendMail(mailOptions);
      }
      return true;
    } catch (error) {
      console.error('Error al enviar recordatorio:', error);
      throw new AppError('Error al enviar recordatorio de evaluación', 500);
    }
  }
  // Notificación de evaluación completada
  async notificarEvaluacionCompletada(evaluacionId) {
    try {
      const evaluacion = await Evaluacion.findByPk(evaluacionId, {
        include: [
          { model: Usuario, as: 'evaluador', attributes: ['id', 'nombre', 'apellido', 'email'] },
          { model: Usuario, as: 'evaluado', attributes: ['id', 'nombre', 'apellido', 'email'] }
        ]
      });
      if (!evaluacion) throw new Error('Evaluación no encontrada');
      const base = this.getBaseTemplate();
      // Notificar al evaluado que su evaluación fue completada
      if (evaluacion.evaluado?.email) {
        const mailOptions = {
          ...base,
          to: evaluacion.evaluado.email,
          subject: 'Tu evaluación ha sido completada',
          html: this.generarPlantillaEvaluacionCompletada({
            evaluacion,
            evaluador: evaluacion.evaluador,
            destinatario: evaluacion.evaluado
          })
        };
        await this.transporter.sendMail(mailOptions);
      }
      return true;
    } catch (error) {
      console.error('Error al notificar evaluación completada:', error);
      throw new AppError('Error al enviar notificación de evaluación completada', 500);
    }
  }
  // Notificación de progreso de evaluación
  async notificarProgresoEvaluacion(evaluacionId) {
    try {
      const evaluacion = await Evaluacion.findByPk(evaluacionId, {
        include: [
          { model: Usuario, as: 'evaluador', attributes: ['id', 'nombre', 'apellido', 'email'] },
          { model: Usuario, as: 'evaluado', attributes: ['id', 'nombre', 'apellido', 'email'] },
          { model: Formulario, as: 'formulario', attributes: ['id', 'nombre'] }
        ]
      });
      if (!evaluacion) throw new Error('Evaluación no encontrada');
      const base = this.getBaseTemplate();
      // Notificar al evaluado que su evaluación ha comenzado
      if (evaluacion.evaluado?.email) {
        const mailOptions = {
          ...base,
          to: evaluacion.evaluado.email,
          subject: 'Tu evaluación ha comenzado',
          html: this.generarPlantillaProgresoEvaluacion({
            evaluacion,
            evaluador: evaluacion.evaluador,
            destinatario: evaluacion.evaluado,
            formulario: evaluacion.formulario
          })
        };
        await this.transporter.sendMail(mailOptions);
      }
      return true;
    } catch (error) {
      console.error('Error al notificar progreso de evaluación:', error);
      throw new AppError('Error al enviar notificación de progreso de evaluación', 500);
    }
  }
  // Notificación de nuevo usuario creado
  async notificarNuevoUsuario(usuarioId, passwordTemporal) {
    try {
      // Obtener usuario básico sin asociaciones complejas
      const usuario = await Usuario.findByPk(usuarioId, {
        attributes: ['id', 'nombre', 'apellido', 'email', 'rol_id', 'departamento_id']
      });
      if (!usuario) throw new Error('Usuario no encontrado');
      // Obtener rol y departamento por separado si se necesitan
      let rolNombre = 'No asignado';
      let deptoNombre = 'No asignado';
      if (usuario.rol_id) {
        const rol = await require('../models').Rol.findByPk(usuario.rol_id, { attributes: ['nombre'] });
        rolNombre = rol?.nombre || 'No asignado';
      }
      if (usuario.departamento_id) {
        const depto = await require('../models').Departamento.findByPk(usuario.departamento_id, { attributes: ['nombre'] });
        deptoNombre = depto?.nombre || 'No asignado';
      }
      // Agregar la información al objeto usuario
      usuario.dataValues.rol = { nombre: rolNombre };
      usuario.dataValues.departamento = { nombre: deptoNombre };
      const base = this.getBaseTemplate();
      const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const mailOptions = {
        ...base,
        to: usuario.email,
        subject: 'Bienvenido al Sistema de Evaluación de Desempeño',
        html: this.generarPlantillaBienvenida({
          usuario,
          passwordTemporal,
          loginUrl
        })
      };
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error al notificar nuevo usuario:', error);
      throw new AppError('Error al enviar notificación de bienvenida', 500);
    }
  }
  // Plantilla para evaluación asignada a gestión
  generarPlantillaEvaluacionAsignadaGestion({ evaluacion, destinatario, evaluado, formulario, departamento }) {
    const base = this.getBaseTemplate();
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
        <div style="background-color: #e74c3c; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">📋 Nueva Evaluación Asignada</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
          <h2 style="color: ${base.secondaryColor}; margin-top: 0;">
            ¡Hola ${destinatario.nombre} ${destinatario.apellido}!
          </h2>
          <p style="font-size: 16px; line-height: 1.6;">
            Se ha asignado una nueva evaluación para un empleado de tu departamento.
          </p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: ${base.secondaryColor}; margin-top: 0;">📊 Detalles de la Evaluación</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Empleado:</strong> ${evaluado.nombre} ${evaluado.apellido}</li>
              <li><strong>Departamento:</strong> ${departamento?.nombre || 'N/A'}</li>
              <li><strong>Formulario:</strong> ${formulario?.nombre || 'No asignado'}</li>
              <li><strong>Período:</strong> ${evaluacion.periodo} - ${evaluacion.anio}</li>
              <li><strong>Estado:</strong> <span style="color: #f39c12;">${evaluacion.estado}</span></li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/evaluaciones" 
               style="background-color: #e74c3c; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; display: inline-block; 
                      font-weight: bold; font-size: 16px;">
              Gestionar Evaluación
            </a>
          </div>
          <p style="color: #6c757d; font-size: 14px; text-align: center; margin-top: 30px;">
            Por favor, gestiona esta evaluación a la brevedad posible.
          </p>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
          <p style="margin: 0; color: #6c757d; font-size: 12px;">
            Este es un mensaje automático de ${base.organization}.<br>
            Por favor no respondas a este correo.
          </p>
        </div>
      </div>
    `;
  }
  // Plantilla para primer día de evaluaciones
  generarPlantillaPrimerDiaEvaluaciones({ destinatario, evaluaciones }) {
    const base = this.getBaseTemplate();
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
        <div style="background-color: #27ae60; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">📅 Nuevas Evaluaciones Disponibles</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
          <h2 style="color: ${base.secondaryColor}; margin-top: 0;">
            ¡Hola ${destinatario.nombre} ${destinatario.apellido}!
          </h2>
          <p style="font-size: 16px; line-height: 1.6;">
            Tienes <strong>${evaluaciones.length} nuevas evaluaciones</strong> disponibles para realizar.
          </p>
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #155724; margin-top: 0;">📋 Evaluaciones Disponibles</h3>
            ${evaluaciones.map(ev => `
              <div style="border-bottom: 1px solid #c3e6cb; padding: 10px 0;">
                <strong>${ev.evaluado?.nombre} ${ev.evaluado?.apellido}</strong><br>
                <small style="color: #6c757d;">
                  Período: ${ev.periodo} - ${ev.anio} | 
                  Ventana: 20 días (15 antes + 5 después)
                </small>
              </div>
            `).join('')}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/evaluaciones" 
               style="background-color: #27ae60; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; display: inline-block; 
                      font-weight: bold; font-size: 16px;">
              Comenzar Evaluaciones
            </a>
          </div>
          <p style="color: #6c757d; font-size: 14px; text-align: center; margin-top: 30px;">
            Recuerda que tienes 20 días para completar estas evaluaciones.
          </p>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
          <p style="margin: 0; color: #6c757d; font-size: 12px;">
            Este es un mensaje automático de ${base.organization}.<br>
            Por favor no respondas a este correo.
          </p>
        </div>
      </div>
    `;
  }
  // Plantilla para evaluación por vencer
  generarPlantillaEvaluacionPorVencer({ evaluacion, destinatario, evaluado }) {
    const base = this.getBaseTemplate();
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
        <div style="background-color: #f39c12; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">⚠️ Evaluación por Vencer</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
          <h2 style="color: ${base.secondaryColor}; margin-top: 0;">
            ¡Hola ${destinatario.nombre} ${destinatario.apellido}!
          </h2>
          <p style="font-size: 16px; line-height: 1.6;">
            Tienes una evaluación que está por vencer. Quedan <strong>5 días</strong> para completarla.
          </p>
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f39c12;">
            <h3 style="color: #856404; margin-top: 0;">📋 Evaluación por Vencer</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Empleado:</strong> ${evaluado.nombre} ${evaluado.apellido}</li>
              <li><strong>Período:</strong> ${evaluacion.periodo} - ${evaluacion.anio}</li>
              <li><strong>Estado:</strong> <span style="color: #f39c12;">${evaluacion.estado}</span></li>
              <li><strong>Tiempo restante:</strong> <span style="color: #dc3545; font-weight: bold;">5 días</span></li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/evaluaciones" 
               style="background-color: #f39c12; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; display: inline-block; 
                      font-weight: bold; font-size: 16px;">
              Completar Evaluación Ahora
            </a>
          </div>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
          <p style="margin: 0; color: #6c757d; font-size: 12px;">
            Este es un mensaje automático de ${base.organization}.<br>
            Por favor no respondas a este correo.
          </p>
        </div>
      </div>
    `;
  }
  // Plantilla para ventana vencida
  generarPlantillaVentanaVencida({ empleado, tipoEvaluacion, destinatario }) {
    const base = this.getBaseTemplate();
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
        <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">⚠️ Ventana de Evaluación Vencida</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
          <h2 style="color: ${base.secondaryColor}; margin-top: 0;">
            ¡Hola ${destinatario.nombre} ${destinatario.apellido}!
          </h2>
          <p style="font-size: 16px; line-height: 1.6;">
            La ventana de evaluación ha vencido para el siguiente empleado.
          </p>
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <h3 style="color: #721c24; margin-top: 0;">👤 Empleado Afectado</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Nombre:</strong> ${empleado.nombre} ${empleado.apellido}</li>
              <li><strong>Departamento:</strong> ${empleado.departamento?.nombre || 'N/A'}</li>
              <li><strong>Tipo de evaluación:</strong> ${tipoEvaluacion}</li>
              <li><strong>Fecha de ingreso:</strong> ${format(new Date(empleado.fecha_ingreso_empresa), 'dd/MM/yyyy')}</li>
              <li><strong>Estado:</strong> <span style="color: #dc3545; font-weight: bold;">Ventana vencida</span></li>
            </ul>
          </div>
          <p style="font-size: 16px; line-height: 1.6; color: #6c757d;">
            Este empleado ya no puede ser evaluado en el período actual. 
            Deberá esperar al próximo período de evaluación.
          </p>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
          <p style="margin: 0; color: #6c757d; font-size: 12px;">
            Este es un mensaje automático de ${base.organization}.<br>
            Por favor no respondas a este correo.
          </p>
        </div>
      </div>
    `;
  }
  // Plantilla para evaluación asignada finalizada
  generarPlantillaEvaluacionAsignadaFinalizada({ evaluacion, destinatario }) {
    const base = this.getBaseTemplate();
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
        <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">✅ Evaluación Asignada Finalizada</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
          <h2 style="color: ${base.secondaryColor}; margin-top: 0;">
            ¡Hola ${destinatario.nombre} ${destinatario.apellido}!
          </h2>
          <p style="font-size: 16px; line-height: 1.6;">
            Una evaluación asignada ha sido completada exitosamente.
          </p>
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="color: #155724; margin-top: 0;">📊 Detalles de la Evaluación</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Empleado:</strong> ${evaluacion.evaluado.nombre} ${evaluacion.evaluado.apellido}</li>
              <li><strong>Evaluador:</strong> ${evaluacion.evaluador.nombre} ${evaluacion.evaluador.apellido}</li>
              <li><strong>Período:</strong> ${evaluacion.periodo} - ${evaluacion.anio}</li>
              <li><strong>Estado anterior:</strong> <span style="color: #f39c12;">Asignada</span></li>
              <li><strong>Estado actual:</strong> <span style="color: #28a745; font-weight: bold;">Completada</span></li>
              ${evaluacion.puntuacionTotal ? `<li><strong>Puntuación:</strong> ${evaluacion.puntuacionTotal}</li>` : ''}
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/gestion/evaluaciones" 
               style="background-color: #28a745; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; display: inline-block; 
                      font-weight: bold; font-size: 16px;">
              Ver Detalles
            </a>
          </div>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
          <p style="margin: 0; color: #6c757d; font-size: 12px;">
            Este es un mensaje automático de ${base.organization}.<br>
            Por favor no respondas a este correo.
          </p>
        </div>
      </div>
    `;
  }
  // Plantilla para nuevo usuario (admin)
  generarPlantillaNuevoUsuarioAdmin({ usuario, destinatario }) {
    const base = this.getBaseTemplate();
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
        <div style="background-color: #17a2b8; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">👤 Nuevo Usuario Creado</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
          <h2 style="color: ${base.secondaryColor}; margin-top: 0;">
            ¡Hola ${destinatario.nombre} ${destinatario.apellido}!
          </h2>
          <p style="font-size: 16px; line-height: 1.6;">
            Se ha creado un nuevo usuario en el sistema.
          </p>
          <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
            <h3 style="color: #0c5460; margin-top: 0;">📋 Detalles del Usuario</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Nombre:</strong> ${usuario.nombre} ${usuario.apellido}</li>
              <li><strong>Email:</strong> ${usuario.email}</li>
              <li><strong>Rol:</strong> ${usuario.rol?.nombre || 'N/A'}</li>
              <li><strong>Departamento:</strong> ${usuario.departamento?.nombre || 'N/A'}</li>
              <li><strong>Estado:</strong> <span style="color: #28a745; font-weight: bold;">Activo</span></li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/usuarios" 
               style="background-color: #17a2b8; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; display: inline-block; 
                      font-weight: bold; font-size: 16px;">
              Gestionar Usuarios
            </a>
          </div>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
          <p style="margin: 0; color: #6c757d; font-size: 12px;">
            Este es un mensaje automático de ${base.organization}.<br>
            Por favor no respondas a este correo.
          </p>
        </div>
      </div>
    `;
  }
  // Plantillas HTML
  generarPlantillaEvaluacionAsignada({ tipo, evaluacion, destinatario, evaluado, evaluador, formulario }) {
    const base = this.getBaseTemplate();
    const esEvaluador = tipo === 'evaluador';
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
        <div style="background-color: ${base.primaryColor}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">📋 Nueva Evaluación de Desempeño Asignada</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
          <h2 style="color: ${base.secondaryColor}; margin-top: 0;">
            ¡Hola ${destinatario.nombre} ${destinatario.apellido}!
          </h2>
          <p style="font-size: 16px; line-height: 1.6;">
            ${esEvaluador 
              ? `Te ha sido asignada una nueva evaluación de desempeño para realizar a <strong>${evaluado.nombre} ${evaluado.apellido}</strong>.`
              : `Se ha programado una nueva evaluación para ti, que será realizada por <strong>${evaluador.nombre} ${evaluador.apellido}</strong>.`
            }
          </p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: ${base.secondaryColor}; margin-top: 0;">📊 Detalles de la Evaluación de Desempeño</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Formulario:</strong> ${formulario?.nombre || 'No asignado'}</li>
              <li><strong>Período:</strong> ${evaluacion.periodo} - ${evaluacion.anio}</li>
              <li><strong>Estado:</strong> <span style="color: #f39c12;">${evaluacion.estado}</span></li>
              <li><strong>Fecha de inicio:</strong> ${format(new Date(evaluacion.fechaInicio), 'dd/MM/yyyy')}</li>
              ${evaluacion.fechaFin ? `<li><strong>Fecha límite:</strong> ${format(new Date(evaluacion.fechaFin), 'dd/MM/yyyy')}</li>` : ''}
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/evaluaciones" 
               style="background-color: ${base.primaryColor}; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; display: inline-block; 
                      font-weight: bold; font-size: 16px;">
              ${esEvaluador ? 'Comenzar Evaluación' : 'Ver Detalles'}
            </a>
          </div>
          <p style="color: #6c757d; font-size: 14px; text-align: center; margin-top: 30px;">
            ${esEvaluador 
              ? 'Por favor, completa la evaluación antes de la fecha límite indicada.'
              : 'Podrás ver los resultados una vez que la evaluación sea completada.'
            }
          </p>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
          <p style="margin: 0; color: #6c757d; font-size: 12px;">
            Este es un mensaje automático de ${base.organization}.<br>
            Por favor no respondas a este correo.
          </p>
        </div>
      </div>
    `;
  }
  generarPlantillaRecordatorio({ evaluacion, destinatario, evaluado }) {
    const base = this.getBaseTemplate();
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
        <div style="background-color: #f39c12; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">⏰ Recordatorio de Evaluación de Desempeño</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
          <h2 style="color: ${base.secondaryColor}; margin-top: 0;">
            ¡Hola ${destinatario.nombre} ${destinatario.apellido}!
          </h2>
          <p style="font-size: 16px; line-height: 1.6;">
            Este es un recordatorio amistoso de que tienes una evaluación pendiente de completar.
          </p>
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f39c12;">
            <h3 style="color: #856404; margin-top: 0;">📋 Evaluación Pendiente</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Evaluado:</strong> ${evaluado.nombre} ${evaluado.apellido}</li>
              <li><strong>Período:</strong> ${evaluacion.periodo} - ${evaluacion.anio}</li>
              <li><strong>Estado:</strong> <span style="color: #f39c12;">${evaluacion.estado}</span></li>
              ${evaluacion.fechaFin ? `<li><strong>Fecha límite:</strong> ${format(new Date(evaluacion.fechaFin), 'dd/MM/yyyy')}</li>` : ''}
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/evaluaciones" 
               style="background-color: #f39c12; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; display: inline-block; 
                      font-weight: bold; font-size: 16px;">
              Completar Evaluación Ahora
            </a>
          </div>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
          <p style="margin: 0; color: #6c757d; font-size: 12px;">
            Este es un mensaje automático de ${base.organization}.<br>
            Por favor no respondas a este correo.
          </p>
        </div>
      </div>
    `;
  }
  generarPlantillaEvaluacionCompletada({ evaluacion, evaluador, destinatario }) {
    const base = this.getBaseTemplate();
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
        <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">✅ Evaluación de Desempeño Completada</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
          <h2 style="color: ${base.secondaryColor}; margin-top: 0;">
            ¡Hola ${destinatario.nombre} ${destinatario.apellido}!
          </h2>
          <p style="font-size: 16px; line-height: 1.6;">
            Tu evaluación ha sido completada por <strong>${evaluador.nombre} ${evaluador.apellido}</strong>.
          </p>
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="color: #155724; margin-top: 0;">📊 Resumen de la Evaluación</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Período:</strong> ${evaluacion.periodo} - ${evaluacion.anio}</li>
              <li><strong>Evaluador:</strong> ${evaluador.nombre} ${evaluador.apellido}</li>
              <li><strong>Estado:</strong> <span style="color: #28a745;">Completada</span></li>
              <li><strong>Fecha de finalización:</strong> ${format(new Date(), 'dd/MM/yyyy')}</li>
              ${evaluacion.puntuacionTotal ? `<li><strong>Puntuación:</strong> ${evaluacion.puntuacionTotal}</li>` : ''}
              ${evaluacion.valoracion ? `<li><strong>Valoración:</strong> ${evaluacion.valoracion}</li>` : ''}
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/evaluaciones" 
               style="background-color: #28a745; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; display: inline-block; 
                      font-weight: bold; font-size: 16px;">
              Ver Resultados
            </a>
          </div>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
          <p style="margin: 0; color: #6c757d; font-size: 12px;">
            Este es un mensaje automático de ${base.organization}.<br>
            Por favor no respondas a este correo.
          </p>
        </div>
      </div>
    `;
  }
  generarPlantillaBienvenida({ usuario, passwordTemporal, loginUrl }) {
    const base = this.getBaseTemplate();
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
        <div style="background-color: ${base.primaryColor}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🎉 Bienvenido al Sistema</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
          <h2 style="color: ${base.secondaryColor}; margin-top: 0;">
            ¡Hola ${usuario.nombre} ${usuario.apellido}!
          </h2>
          <p style="font-size: 16px; line-height: 1.6;">
            Tu cuenta ha sido creada exitosamente en el Sistema de Evaluación de Desempeño.
            A continuación encontrarás tus credenciales de acceso.
          </p>
          <div style="background-color: #e3f2fd; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${base.primaryColor};">
            <h3 style="color: #1565c0; margin-top: 0; margin-bottom: 15px;">🔐 Credenciales de Acceso</h3>
            <div style="margin-bottom: 15px;">
              <p style="margin: 0 0 8px 0; font-weight: bold; color: #1565c0;">Usuario (Email):</p>
              <p style="margin: 0; padding: 8px 12px; background-color: #f8f9fa; border-radius: 4px; font-family: monospace; word-break: break-all;">${usuario.email}</p>
            </div>
            <div style="margin-bottom: 5px;">
              <p style="margin: 0 0 8px 0; font-weight: bold; color: #1565c0;">Contraseña Temporal:</p>
              <p style="margin: 0; padding: 8px 12px; background-color: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-weight: bold; letter-spacing: 1px;">${passwordTemporal}</p>
            </div>
          </div>
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f39c12;">
            <p style="margin: 0; color: #856404;">
              <strong>⚠️ Importante:</strong> Por seguridad, te recomendamos cambiar tu contraseña en tu primer inicio de sesión.
            </p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="background-color: ${base.primaryColor}; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; display: inline-block; 
                      font-weight: bold; font-size: 16px;">
              Iniciar Sesión
            </a>
          </div>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
          <p style="margin: 0; color: #6c757d; font-size: 12px;">
            Este es un mensaje automático de ${base.organization}.<br>
            Por favor no respondas a este correo.
          </p>
        </div>
      </div>
    `;
  }
  generarPlantillaProgresoEvaluacion({ evaluacion, evaluador, destinatario, formulario }) {
    const base = this.getBaseTemplate();
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
        <div style="background-color: ${base.primaryColor}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">📋 Tu Evaluación de Desempeño ha Comenzado</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
          <h2 style="color: ${base.secondaryColor}; margin-top: 0;">
            ¡Hola ${destinatario.nombre} ${destinatario.apellido}!
          </h2>
          <p style="font-size: 16px; line-height: 1.6;">
            Te informamos que tu evaluación de desempeño ha comenzado. 
            ${evaluador ? `Será evaluada por ${evaluador.nombre} ${evaluador.apellido}.` : ''}
          </p>
          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="color: #155724; margin-top: 0;">📊 Detalles de la Evaluación</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Formulario:</strong> ${formulario?.nombre || 'Evaluación de Desempeño'}</li>
              <li><strong>Período:</strong> ${evaluacion.periodo} ${evaluacion.anio}</li>
              <li><strong>Estado:</strong> <span style="color: #28a745; font-weight: bold;">En Progreso</span></li>
              <li><strong>Fecha de Inicio:</strong> ${new Date().toLocaleDateString('es-ES')}</li>
            </ul>
          </div>
          <p style="font-size: 16px; line-height: 1.6;">
            Puedes acceder al sistema para ver y completar tu evaluación en cualquier momento.
            Te recomendamos responder con honestidad y dedicación para un mejor desarrollo profesional.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
               style="background-color: ${base.primaryColor}; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; display: inline-block; 
                      font-weight: bold; font-size: 16px;">
              Acceder al Sistema
            </a>
          </div>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
          <p style="margin: 0; color: #6c757d; font-size: 12px;">
            Este es un mensaje automático de ${base.organization}.<br>
            Por favor no respondas a este correo.
          </p>
        </div>
      </div>
    `;
  }
}
module.exports = new NotificationService();